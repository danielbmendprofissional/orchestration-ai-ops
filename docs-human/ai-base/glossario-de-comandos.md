# Glossário de comandos

Tudo que você pode digitar na orquestração, num lugar só. Para o **fluxo** (a ordem das coisas), siga o `ai-ops/COMO-CRIAR-UM-PROJETO.md`. Aqui é consulta rápida: "qual comando faz o quê, e quando".

Os comandos `/…` rodam dentro do Claude Code, na **raiz do workspace** (ou na área isolada da fatia, quando há painéis em paralelo). Fonte de cada um: `.claude/commands/` (comandos do projeto) e `.claude/skills/` (skills instaladas).

## 1. O dia a dia — os 3 que você mais usa

| Comando | Para quê | Quando | Você aprova |
|---|---|---|---|
| **`/proximo`** | Tutor, somente leitura: onde você está, qual o **seu** próximo passo, de onde vem a próxima fatia (mapa, ADR, spec), o que ela destrava, o que pode rodar em paralelo, se precisa de grill | A qualquer hora; depois de dormir, de trocar de assunto, ao terminar uma fatia | — |
| **`/situacao`** | Estado do git de **todos** os repositórios (workspace, api, frontend, áreas paralelas, `ai-base`/`ai-infra`/`ai-ops`/`template-ci`): em que branch cada um está e **o que fazer** — commitar, subir, mergear MR, alinhar, apagar branch já mergeada. Termina com "pronto para a próxima fatia? SIM / QUASE / NÃO". Somente leitura (faz `fetch`) | Depois de mergear, antes de cada `/fatia`, ou quando não souber o que ficou solto | Mergear MRs e commitar; limpar é seguro |
| **`/mapa`** | Confere o mapa de fatias contra tudo que o projeto já definiu (telas dos protótipos, ADRs, `mudancas-*`, pendências, glossário): lista o que está **sem fatia** ou **parcial**, fatias **grandes demais** e inconsistências, e propõe as linhas novas. Somente leitura; `/mapa aplicar` edita depois do seu ok | Ao fim do discovery; quando o `/proximo` avisar que ADR ou protótipo é mais novo que o mapa; antes de começar uma rodada nova | A proposta de mapa |
| **`/fatia B3`** | Leva a fatia do zero à MR: spec → **[você aprova]** → tickets automáticos → execução → review → MR. Retoma de onde parou se for rodado de novo | Quando o `/proximo` disser que a fatia está livre | A spec; depois a MR |
| **`/implement-task B3`** | Só a execução (tasks com TDD, suite, `/code-review`, correção, push, MR). Já usado pelo `/fatia` | Spec e tickets prontos; ou para corrigir a MR depois de um comentário seu | A MR |

Variações:

```
/proximo B3                      # ficha completa de uma fatia
/fatia                           # a próxima fatia livre do mapa
/fatia B3 — <instrução>          # contexto seu que não está em nenhum documento
/implement-task B3.5             # só uma filha
/implement-task B3 — <decisão>   # retoma depois de PAROU, com a sua decisão
/implement-task                  # a próxima fatia livre (o que cada painel paralelo roda)
```

## 2. Discovery e especificação

| Comando | Para quê | Quando |
|---|---|---|
| `/grill-with-docs` | Entrevista até fechar decisões e **grava** ADRs e termos (`CONTEXT.md`) | Ideia solta, fora do mapa; decisão que nenhuma ADR cobre |
| `/grill-me` | A mesma entrevista, sem gravar documentos | Pensar em voz alta antes de decidir |
| `/domain-modeling` | Afinar o glossário/modelo de domínio | Termo do domínio confuso ou novo |
| `/wayfinder` | Mapa de tickets de decisão para trabalho grande demais para uma sessão | Antes do `/to-spec`, quando o escopo é multi-sessão |
| `/prototype` | Protótipo descartável para validar uma ideia de UI ou lógica | Antes de comprometer com uma spec |
| `/to-spec` | Escreve a spec da fatia (formato `docs/agents/spec-format.md`), para e pede o seu ok. Já embutido no `/fatia` | Só se quiser separar o passo |
| `/to-tickets` | Cria as filhas `B3.1 — …` com `Blocked by` e `Cobre:`. Já embutido no `/fatia`; roda **depois** da spec aprovada | Só se quiser separar o passo |

## 3. Execução e review

| Comando | Para quê | Quando |
|---|---|---|
| `/code-review B3` | Revisa o diff da fatia contra `origin/dev` (padrões do repositório + conformidade com a spec). Não pergunta o ponto fixo | Normalmente nem é chamado à mão: o `/implement-task` roda, corrige e entrega |
| `/security-review` | Revisão de segurança do diff | Fatia que toca auth, sessão, segredo, dependência |
| `/owasp-audit` · `/dependency-audit` · `/secrets-audit` | Auditorias específicas (OWASP Top 10, dependências/CVE, segredos) | Segunda camada em superfície sensível (`docs/agents/security-review.md`) |
| `/tdd` | Test-first avulso (red-green-refactor) | Fora do `/implement-task` |
| `/diagnosing-bugs` | Loop disciplinado de diagnóstico | Algo quebrou fora do fluxo normal |

## 4. Design (fatia com tela)

| Comando | Para quê |
|---|---|
| `/impeccable init` | Gera `DESIGN.md`/`PRODUCT.md` do projeto (uma vez) |
| `/impeccable critique <url>` · `audit <url>` | Avalia UX/hierarquia · acessibilidade e estados, contra o localhost |
| `/impeccable adapt\|harden\|polish\|layout\|typeset` | Corrige o que a crítica apontou |
| `/skill:avoid-ai-design detect` | Rede de segurança contra cara de "template de IA" |

## 5. Manutenção do processo

| Comando | Para quê | Quando |
|---|---|---|
| `/retro` | Retrospectiva: o que falhou vira ajuste no lugar certo (ai-base, agente, ADR) | Depois de cada fatia, nos primeiros projetos |
| `/triage` | Move issues pelo vocabulário de labels (`docs/agents/triage-labels.md`) | Issues fora do fluxo de fatia |
| `/improve-codebase-architecture` · `/codebase-design` | Varredura de arquitetura · vocabulário de módulos | A cada N dias ou sprints, não por ticket |
| `/issue-ai <n>` | Executa uma issue de melhoria do `orchestration-ai` (plano, branch, implementação, MR; nunca mergeia). **Dentro da pasta de `ai-base`, `ai-infra`, `ai-ops` ou `template-ci`**, não do projeto | Quando um agent propôs uma melhoria, você disse sim e ele abriu a issue ([guia](../../COMO-CRIAR-UM-PROJETO.md#melhorias-na-orquestração)) |
| `/handoff` | Compacta a conversa para outro agente ou sessão continuar | Antes de trocar de modo ou encerrar uma sessão longa |
| `/ask-matt` | Roteador: qual skill serve para a sua situação | Quando não souber qual usar |

`/resolving-merge-conflicts` está citado no `docs/workflow.md`, mas não está instalado no workspace da Esteira; confira o `skills-lock.json` antes de contar com ele.

## 6. Abrir a sessão (PowerShell)

| Comando | Modo | Quando |
|---|---|---|
| `claude` | seu plano (padrão) | Sempre que possível |
| `claude-pago` | OmniRoute, DeepSeek → Luna | Quando o plano apertar |
| `claude-free` | OmniRoute, combos gratuitos | Último recurso |

O modo é escolha de custo; o processo é o mesmo nos três. Trocar de modo = fechar a sessão e abrir outra, nunca no meio de uma conversa (`docs/agents/orchestration.md`).

## 7. Scripts (terminal, raiz do workspace)

| Comando | Para quê |
|---|---|
| `node .claude/scripts/worktree-fatia.mjs B3 <slug>` | Cria a área isolada da fatia (`<workspace>.wt/b3/`): um painel do Alethe por fatia em paralelo. Depois: `cd` lá e `claude` |
| `node .claude/scripts/worktree-fatia.mjs --remove B3` | Remove a área ao fim (as branches continuam) |
| `node .claude/scripts/check-tickets.mjs B3 <spec.md> <grupo>/<projeto>-workspace` | Confere se cada critério da spec virou ticket (o `/fatia` já roda) |
| `node .claude/scripts/situacao.mjs [--sem-mr] [--so-projeto]` | O que o `/situacao` roda. Exit 1 se há pendência sua (prioridade 1 ou 2) |
| `node .claude/scripts/check-spec-drift.mjs [<spec>]` | Diz se uma spec **envelheceu** (commits novos em `dev` que tocam o que ela cita; sem linha `base:` = velha). Sem argumento: todas as pendentes. O `/proximo` e o `/fatia` já rodam |
| `node .claude/scripts/check-spec-drift.mjs --stamp <spec>` | Grava a linha `base:` (sha de `dev` de agora) na spec. O `/fatia` faz ao aprovar |
| `node .claude/scripts/check-escopo.mjs <repo> <base> --allow … --deny …` | Confere o diff de uma task: fora do escopo, teste apagado, `skip`/`only` (o `/implement-task` já roda) |
| `node omniroute-config.mjs diff` (no `ai-infra`) | Diagnóstico quando `claude-pago`/`claude-free` não respondem |

## 8. Quem entra sozinho (você não chama)

- **Subagentes** (`.claude/agents/`): `data`, `backend`, `front`, `ui` (executores no modo pago/free), `tests`, `security`, `review`, `qa`. Chamados pelo `/implement-task`.
- **Hook** `block-dangerous-git.sh`: bloqueia push direto em `main`/`dev`/`qa`/`hml`, `--force`, `reset --hard`, `clean -f`, `branch -D`. Vale para toda sessão e subagente.
- **CI (template-ci):** `verify-code-review` (confere a prova do review e abre a MR), `fechar-fatia` (fecha mãe e filhas no merge; quando ligado).

## 9. Onde olhar no GitLab

| O quê | Onde |
|---|---|
| O que está rodando agora | Board de issues do workspace por label `em-execucao` |
| Progresso de uma fatia | Descrição da issue-mãe (bloco **Execução**: área, modo, quem executou cada filha, suite, review, MR) |
| Aguardando você | MRs abertas `B3 — …` nos repositórios de código |
| Fatia pronta | Mãe e filhas fechadas; coluna Status do `specs/README.md` = `feito` |
