# omniroute-eval

Ranking empírico dos modelos do OmniRoute pros modos `claude-pago`/`claude-free` do Claude Code (executores e subagentes). Substitui a ordem estimada dos combos em `ai-infra/configs/omniroute/combos.md` por dado real.

## O que mede

Três tarefas, cada uma testando algo que um subagente do Claude Code precisa fazer:

| Tarefa | Testa | Passa quando |
|---|---|---|
| `tool-read` | tool calling multi-turn (`list_dir` → `read_file` → resposta) | responde `8743` (e não a porta do banco, que é a armadilha) |
| `fix-bug` | editar o arquivo certo via `write_file` seguindo uma spec | o código escrito passa num teste oculto |
| `write-test` | escrever teste que pega bug (TDD) | o teste passa na implementação correta **e** falha em pelo menos 2 de 3 mutantes |

Responder sem usar tool é sempre falha — o Claude Code depende de tool call.

Duas notas por modelo, separadas de propósito:
- **Qualidade**: pass / (pass + fail), só sobre tentativas que chegaram ao modelo.
- **Disponibilidade**: quantas tentativas chegaram ao modelo (429 e erro HTTP derrubam). Modelo bom que vive em 429 serve pro pool, mas não como primeiro da fila.

O código gerado pelo modelo roda com `node --permission` (sem escrita em disco, sem rede, sem child process, leitura só na pasta temporária), timeout de 10s.

## Como rodar

Pré-requisitos: Node 22+, OmniRoute de pé (`docker compose ps` no `ai-infra/container`), API key de cliente `eval` — criada pelo `apply` do `ai-infra/configs/omniroute` (com `--setx`, já grava `OMNIROUTE_EVAL_KEY` no Windows).

```powershell
# OMNIROUTE_EVAL_KEY já vem do apply --setx (terminal novo)
cd ai-ops\tools\omniroute-eval
node eval.mjs                      # todos os modelos de models.txt, 2 runs por tarefa
node eval.mjs --runs=1 --task=tool-read
node eval.mjs --model=groq/openai/gpt-oss-120b
node eval.mjs --base-url=http://localhost:20128/v1 --timeout=180000
```

Resultado: tabela no terminal + `results/<timestamp>.md` e `.json` (fora do git).

**Custo:** modelos free não custam dinheiro, mas gastam cota diária — rodar fora do horário de trabalho com os modos pago/free. Os pagos estão comentados em `models.txt`; descomentar só pra ter referência de qualidade (custo real, pequeno: ~6 chamadas curtas por tarefa).

**Rodar sequencial é intencional:** um modelo por vez, pra não confundir 429 do próprio teste com limite real do provider.

## Depois de rodar

1. Modelo com qualidade baixa (< 50%): sai do `pool-exec-free`; se for rápido, candidato a `omni-light`.
2. Ordenar o `pool-exec-free` por qualidade, desempate por disponibilidade.
3. Atualizar a seção "Ranking" de `ai-infra/configs/omniroute/combos.md` com a tabela e aplicar a ordem no dashboard.
4. Rodar de novo quando entrar modelo novo ou a cada ~2 semanas — free tier muda sem aviso.
