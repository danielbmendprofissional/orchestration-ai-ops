# Skills de segurança — instala tudo, sempre, por projeto

Não roda em Etapa 1 (é por projeto, dentro da pasta daquele projeto) — mas na Etapa 2 entra sempre como item do plano (Fluxo obrigatório do `CLAUDE.md`), não é mais preciso o humano lembrar de pedir separadamente. Como qualquer item do plano, só executa se aprovado — mas **sem menu de escolha nenhum**: é um item único (instalar tudo/skip), não uma seleção de quais repositórios/skills entram. Tudo fica com `disable-model-invocation: true` (nada dispara sozinho).

**Colisão de nome: a skill base sempre vence.** Cada skill mora em `.claude/skills/<nome>/` — duas origens com o mesmo nome **não convivem**, a última instalada sobrescreve a outra (e o `skills-lock.json` passa a apontar pra ela). Caso real (esteira, 2026-10-21): `getsentry/skills` tem `code-review` e sobrescreveu o `/code-review` do `mattpocock/skills`, que é o que o fluxo do projeto usa (`pi /implement-task` → `/code-review`). Regra fixa: skill de `docs/enviroment/skills.md` (mattpocock, angular, avoid-ai-design) nunca é substituída por skill de segurança; a de segurança com nome repetido simplesmente não fica no projeto.

**Alerta conhecido de antivírus corporativo — nunca abortar a instalação toda por causa disso:** alguns desses pacotes trazem arquivo de referência (confirmado: `security-review/references/supply-chain.md`, `raw.githubusercontent.com/getsentry/skills/main/...` — URL legítima, é o domínio oficial do GitHub pro repositório real da Sentry) que dispara falso positivo heurístico ("Trojan-Downloader") em antivírus corporativo — causa raiz confirmada: o arquivo documenta, como exemplo didático, os padrões de ataque que ele ensina a detectar (`curl ... | bash`, reverse shell, exfiltração via `requests.post`) — é o antivírus reagindo a esse texto, não execução real de nada. Se um arquivo específico for bloqueado/excluído: **seguir instalando o resto normalmente**, reportar qual arquivo/URL foi bloqueado e deixar a decisão de liberar no antivírus com o humano (ele decide se libera exceção ou convive sem aquele arquivo específico) — nunca tratar isso como erro que trava o item inteiro (exceção à regra geral de "erro para tudo" do Fluxo obrigatório, justamente porque a causa já é conhecida e não é deste agent decidir política de antivírus corporativo).

```powershell
npx skills add getsentry/skills -s '*' -a claude-code -y
npx skills add briiirussell/cybersecurity-skills -s '*' -a claude-code -y
```

`-s '*'` = tudo, incluindo as situacionais (`privacy-engineering`, `hipaa-audit`, `pci-audit`, `csf-mapping`, `ai-risk-management`). A CLI `skills` não tem opção de exclusão, então a regra de colisão é garantida **depois**:

1. Reinstalar as skills base por cima (idempotente — repõe qualquer uma que a de segurança tenha sobrescrito):
   ```powershell
   npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y
   npx skills add https://github.com/angular/skills -s '*' -a claude-code -y
   ```
   (`avoid-ai-design` vem por `git clone`, não colide com nenhuma de segurança hoje — se algum dia colidir, mesma regra.)
2. **Verificar de verdade** no `skills-lock.json`: nenhuma skill com nome igual a uma base pode estar com `source` `getsentry/skills` ou `briiirussell/cybersecurity-skills`. Hoje a única colisão conhecida é `code-review` (deve estar `mattpocock/skills`); `commit` e `pr-writer` da Sentry não colidem e ficam. Achou outra colisão nova: reportar no relatório (qual nome, quais origens) — a regra já resolveu, é só registro.
3. Abrir o `SKILL.md` de cada skill instalada (base e segurança) e confirmar/adicionar `disable-model-invocation: true` no frontmatter — os repositórios de origem não garantem esse campo sozinhos. **Exceto as peças internas** — skills que outra skill chama pelo Skill tool. Essas ficam **sem** a flag (com ela, `/grill-with-docs`, `/implement`, `/triage` etc. param de funcionar: o modelo não consegue invocar a peça). Lista atual, calculada, nunca de memória — rodar dentro de `.claude/skills/` do projeto:
   ```bash
   grep -ohE 'Skill tool (twice, )?(with|for) [`"][a-z-]+[`"]( and [`"][a-z-]+[`"])?' */SKILL.md \
     | grep -oE '[`"][a-z-]+[`"]' | tr -d '`"' | sort -u
   ```
   (em 2026-10-21: `code-review`, `codebase-design`, `domain-modeling`, `grilling`, `prototype`, `research`, `tdd`, `writing-for-agents`). Pra cada nome da lista, remover a linha `disable-model-invocation: true`:
   ```bash
   for n in $(grep -ohE 'Skill tool (twice, )?(with|for) [`"][a-z-]+[`"]( and [`"][a-z-]+[`"])?' */SKILL.md | grep -oE '[`"][a-z-]+[`"]' | tr -d '`"' | sort -u); do
     [ -f "$n/SKILL.md" ] && sed -i '/^disable-model-invocation: true\r\?$/d' "$n/SKILL.md"
   done
   ```
   Verificar: `/grill-with-docs` precisa conseguir chamar `grilling` e `domain-modeling` sem o usuário digitar as duas.

Confirmar sempre via `/skills` dentro de uma sessão Claude Code depois de instalar.