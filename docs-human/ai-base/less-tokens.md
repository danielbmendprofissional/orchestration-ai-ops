# Menos tokens — práticas, benchmarks e configuração aprovada

Consolidação de tudo que discutimos sobre economia real de tokens no Claude Code e no OpenCode: o que os benchmarks independentes mediram, a configuração de RTK/Caveman aprovada pelos seus cenários de uso, e as práticas gerais que mais pesam de verdade.

Para instalação e configuração técnica de RTK/Caveman, ver o arquivo separado **`caveman-rtk.md`**.

---

## 1. O hype vs. a realidade medida (benchmarks independentes)

Números de marketing (60-90% no RTK, 65% no Caveman) não se sustentam em teste controlado com faturamento real, e isso não é uma fonte isolada — convergem pelo menos três apurações independentes:

| Fonte | Metodologia | RTK | Caveman |
|---|---|---|---|
| JetBrains (SkillsBench, ~425 execuções, ~$320, custo de fatura real) | A/B pareado, Claude Code + Sonnet 5 | **+7,6% mais caro** em esforço baixo (p=0,004); ~0% em esforço alto | **8,5%** de redução real (vs. 65% anunciado) |
| Badgerworks (logs de uso real, terceiro independente) | observação de produção | painel do RTK reportou 96,2M tokens "economizados" enquanto **fatura real subiu**; mesma ferramenta variou de 43% a 91% dependendo só da mistura de comandos daquela sessão | não teve foco específico, corrobora o padrão |
| Sua própria sessão (`/caveman-stats`, 6 turnos) | dado real, sem intermediário | — | líquido **negativo** (-6.480), a própria ferramenta recomendou desligar |

**Por que a distância é tão grande:** a maior parte do consumo de tokens em codificação agenteira vem de ler arquivos, raciocinar, chamar ferramentas e gerar código — não de prosa conversacional. Caveman ataca a fatia menor (prosa); RTK só filtra saída de bash que ele consegue interceptar (Read/Grep nativos do Claude Code passam por fora do hook). Some a isso um problema estrutural: as duas ferramentas **se autoavaliam contra a própria baseline**, não contra a fatura real da Anthropic — então o painel interno (`rtk gain`, `/caveman-stats`) é um sinal útil, mas não é prova de economia de fatura.

Nem tudo nesse nicho é igual: a JetBrains testou também o concorrente **Ponytail** e achou efeito real (não zero) em tarefas abertas — a categoria como um todo não é fraude, é que o número de marketing sempre vem de um cenário favorável, não da média do uso real.

---

## 2. Configuração aprovada — os 3 cenários de uso do Daniel

Decisão fechada, baseada nos benchmarks acima e nos testes reais feitos nesta conversa.

### Cenário 1 — Grill-me, arquitetura, montagem de specs, discovery (100% Claude Code)

- **RTK:** manter ligado (baixo risco, pouco bash/grep envolvido nesse tipo de sessão).
- **Caveman:** **ligar**. No início da sessão:
  ```
  /caveman full
  ```
  É o perfil prosa-pesada, pouco código, onde o número de 65% do marketing se originou de verdade (conversas em Q&A). Confirmar com `/caveman-stats` no fim da sessão.

### Cenário 2 — Escrita de código, automação, execução (Deepseek, Luna, etc. via OpenCode)

- **RTK:** manter ligado — é o cenário onde ele tem chance real de ajudar (grep/read de logs, saída de comandos de automação).
- **Caveman:** **manter desligado**. É o perfil código-pesado onde tanto a JetBrains quanto a sessão real do Daniel mediram líquido negativo/quase nulo. A skill do Caveman (a que dá `/caveman`) só foi instalada e confirmada no Claude Code até agora — não foi verificada no OpenCode.

### Cenário 3 — Design, review, testes (Claude Code)

- **RTK:** manter ligado.
- **Caveman:** **misto, por sub-atividade**:
  - Discussão de review/design (prosa) → `/caveman full`
  - Execução de bateria de testes (saída técnica) → `/caveman off`
  Confirmar com `/caveman-stats` no fim de cada bloco, não por suposição.

### Regra prática geral (vale para os 3 cenários)

Tratar `rtk gain` e `/caveman-stats` como termômetro, não como fatura real. De tempos em tempos, comparar o custo real da conta (console da Anthropic / custo reportado pelo Claude Code) numa semana com as ferramentas ligadas vs. uma semana sem.

---

## 3. Práticas gerais no Claude Code (fonte: doc oficial "Manage costs effectively")

Em ordem de impacto real, do que a própria documentação recomenda:

**`/clear` entre tarefas não relacionadas** — o item de maior impacto. Contexto velho é reprocessado a cada mensagem nova. Use `/rename` antes de `/clear`, assim dá pra achar a sessão de novo com `/resume` se precisar.

**Escolher o modelo certo pra tarefa** — Sonnet resolve a maioria do trabalho de código por menos custo que Opus; reserve Opus pra decisão arquitetural complexa. `/model` troca no meio da sessão, `/config` define padrão.

**Ajustar o esforço de raciocínio** (`/effort`, ou dentro de `/model`) — extended thinking vem ligado por padrão e é cobrado como token de saída, podendo ser dezenas de milhares de tokens por resposta. Pra tarefa simples, baixar o effort ou desligar thinking em `/config` economiza mais que qualquer proxy externo.

**CLAUDE.md enxuto, abaixo de 200 linhas** — carrega inteiro toda sessão. Instrução específica de workflow deveria virar uma skill, que só carrega quando invocada.

**Desligar MCP server que você não usa** — `/mcp` mostra os configurados; cada um ligado adiciona listagem de ferramentas ao contexto mesmo sem ser chamado. Prefira CLI direto (`gh`, `aws`, `gitlab-cli`) quando disponível.

**Hooks pra filtrar saída verbosa antes do modelo ver** — é, na prática, o que o RTK tenta fazer de forma genérica (com resultado fraco, seção 1). Um hook seu, específico pro seu caso (ex: filtrar só `FAIL`/`ERROR` de saída de teste), é mais confiável que ferramenta genérica de terceiro.

**Subagents pra operação verbosa** — rodar teste, ler log grande, buscar documentação: delega pra um subagent, só o resumo volta pro contexto principal.

**Prompt específico em vez de vago** — "melhora esse código" dispara varredura ampla; "adiciona validação de input na função de login em auth.ts" já direciona sem exploração cara.

---

## 4. Práticas no OpenCode

Sem CLAUDE.md, mas o `AGENTS.md` cumpre o mesmo papel — mesma regra de manter enxuto vale lá.

Rodar `opencode stats --models` de vez em quando pra flagrar qual provider está pesando mais. Nos seus próprios testes, o Deepseek-v4-flash é o que mais consome tokens de input (60,5K em 8 mensagens), mas ainda é o mais barato por token. Vale usar o modelo local (Qwen via Ollama) pros passos mais repetitivos/mecânicos do cenário 2 (custo zero), e reservar Deepseek/GPT-Luna pra quando precisar de qualidade maior.

Lembrete de confiabilidade: o campo `cost` que o OpenCode grava internamente vem `0` — pra número em dólar real, usar `npx ccusage@latest opencode daily`, que recalcula a partir da contagem de tokens.

---

## 5. Suas duas estratégias — validação

**Inglês:** economia real. Texto em inglês tokeniza de forma mais eficiente que português na maioria dos modelos (tokenizer treinado majoritariamente em inglês), sem o problema de overhead de instrução extra que vimos no Caveman — não tem custo fixo por turno, é só a língua em que você escreve.

**Chats pequenos + clear + delete:** correto, e é a recomendação nº1 oficial do Claude Code (seção 3). Dois complementos:
- `/rename` antes do `/clear`, senão você perde a capacidade de retomar a sessão depois.
- Se o objetivo é realmente não guardar rastro, `CLAUDE_CODE_SKIP_PROMPT_HISTORY=1` evita até escrever o transcript, em vez de escrever e depois apagar.

---

## 6. Rotina de monitoramento sugerida

Semanalmente: `/usage` (Claude Code) + `opencode stats --days 7` (OpenCode) pra pegar tendência recente.

Mensalmente: `/insights` (Claude Code) + `opencode stats` all-time, cruzando com o custo real da conta Anthropic — fecha o ciclo do que aprendemos aqui: os painéis internos das ferramentas (RTK, Caveman, e o próprio OpenCode com seu `cost: 0` disfarçado) nem sempre batem com o que sai da fatura.

---

## 7. Fontes (práticas, benchmarks, análise)

- [Manage costs effectively — Claude Code Docs (oficial)](https://code.claude.com/docs/en/costs)
- [Explore the .claude directory — Claude Code Docs (oficial)](https://code.claude.com/docs/en/claude-directory)
- [Use Claude's chat search and memory — Anthropic Help Center (oficial)](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)
- [CLI — OpenCode Docs (oficial)](https://opencode.ai/docs/cli/)
- [ccusage — OpenCode guide](https://ccusage.com/guide/opencode/)
- [JetBrains — rtk Claude Code Token Savings benchmark](https://blog.jetbrains.com/ai/2026/07/rtk-claude-code-token-savings/)
- [JetBrains — Caveman benchmark](https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/)
- [JetBrains — Ponytail benchmark](https://blog.jetbrains.com/ai/2026/07/ponytail-skill-claude-tested/)
- [Badgerworks — Caveman, rtk, Ponytail: token savings tested](https://www.badgerworks.co.uk/posts/saving-token-spend/)
- [InfoWorld — 'Talk like a caveman' prompts save tokens, but far less than promised](https://www.infoworld.com/article/4193775/talk-like-a-caveman-prompts-save-tokens-but-far-less-than-promised.html)
- [Tech Times — rtk Raises Claude Code Costs at Low Effort](https://www.techtimes.com/articles/321223/20260721/rtk-raises-claude-code-costs-low-effort-jetbrains-benchmark-debunks-6090-claim.htm)
- [Issue #3157 — README desatualizado do RTK](https://github.com/rtk-ai/rtk/issues/3157)
