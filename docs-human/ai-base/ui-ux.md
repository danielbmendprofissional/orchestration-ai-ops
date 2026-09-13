# UI/UX — processo e ferramentas (humano)

## Por que PrimeNG (não outra lib Angular)

É a biblioteca Angular-nativa mais madura (não é port de algo React), cobre o catálogo inteiro que uma tela enterprise/dashboard pede (tabela com filtro/paginação/export, formulário completo, overlay, chart) e tem tema customizável via PrimeNG Themes / Ultima Design Tokens — dá pra mapear `tokens.md` direto pro tema em vez de reescrever CSS componente por componente.

## Por que Tailwind junto do PrimeNG

Angular tem suporte oficial a Tailwind desde a v20 (`angular.dev/guide/tailwind`) — não é gambiarra, é caminho suportado pelo próprio framework.

## Por que shadcn/ui (não Material UI/Chakra UI) no caso React

Material UI e Chakra UI reforçam estética de fábrica difícil de descaracterizar — shadcn/ui copia o componente pro repo (Radix por baixo), dá controle real de customização em vez de depender de um tema fechado.

## Por que a cadeia é ui-ux-pro-max-skill + impeccable (não só avoid-ai-design)

A primeira versão do fluxo usava só a skill `avoid-ai-design` (catálogo estático P0/P1/P2) rodando em modo `detect` sobre o diff — reativo, pega o "tell" óbvio depois que já foi escrito. A cadeia nova cobre as duas pontas: geração guiada por regras (`ui-ux-pro-max-skill`) E auditoria automatizada contra o app rodando de verdade (`impeccable`) — e cobre Angular explicitamente, o que a `avoid-ai-design` original (focada em HTML/React) não fazia. `avoid-ai-design` continua útil como segunda rede, mais barata.

## Ferramentas de design por custo — o que usar e quando

Você já paga por Claude Code/Claude.ai, Deepseek V4 Flash, GPT-5.6 Luna e Google AI Plus (assinatura de 1 ano). Regra: a maior parte do trabalho de design cabe dentro do que já paga — custo marginal zero. Ferramenta fora disso só entra quando cobre algo que nenhuma das já pagas cobre, começando pelas gratuitas antes de qualquer coisa com custo extra.

### Camada 0 — já pago fixo (Claude Code), custo marginal zero

- Todas as skills do Matt Pocock + `avoid-ai-design`.
- **Skill de Design do Claude Code** (canvas de artboards editável): desenhar wireframe/mockup antes de virar código Angular — substitui o papel que o Figma free-tier faria, sem sair do Claude Code e sem limite de arquivo.
- **Skill de Dataviz do Claude Code**: decidir paleta/formato/tipo de gráfico antes de implementar em PrimeNG Charts.
- Deepseek V4 Flash / GPT-5.6 Luna via pi.dev.
- PrimeNG, skills oficiais do Angular, anime.js, Motion (API vanilla) — open-source, zero custo.
- `interfaces.rauno.me` — checklist gratuito.

### Camada 1 — Google AI Plus, já pago, dentro da cota mensal

- **Nano Banana / Nano Banana Pro** (Gemini app) — geração/edição de imagem: ícone, ilustração, hero image, asset de apoio.
- **Flow + Veo 3.1 Fast** — vídeo curto de demo/teaser, ou referência de motion pra reimplementar depois com `anime.js`/`Motion` (nunca vira produto final).
- **NotebookLM** — sintetizar pesquisa (ex: `lazyweb.com`, varredura de concorrência) em resumo áudio/relatório.
- **Gemini 3 Pro (chat)** — segunda opinião de discovery/brainstorm.

Usar à vontade dentro da cota — assinatura já paga fixo, não usar é desperdício. Se a cota mensal de algo acabar antes do ciclo, espera o próximo mês em vez de forçar upgrade de tier.

### Camada 2 — gratuito, fora de qualquer assinatura

- `ui-ux-pro-max-skill` (MIT)
- `impeccable.style` (grátis hoje; tier Pro anunciado como futuro)
- `lazyweb.com` (MCP público, grátis)
- Figma tier gratuito (uso pontual)
- Skills oficiais do Angular (open source)
- **Google AI Studio** (`aistudio.google.com`) — não depende da assinatura Plus, é gratuito por conta Google separada (billing por uso de API se passar do tier free). Útil pra prototipar uma chamada de API ou testar um prompt de geração de imagem fora do fluxo do Gemini app.

### Confiança sobre o que o Plus realmente cobre

Nem tudo que aparece listado por aí como "incluído no Plus" é confiável — fontes públicas não concordam nos números exatos, a fonte de verdade é o que aparece liberado dentro da sua conta (`gemini.google.com`/`one.google.com`). Com razoável confiança, incluído: Gemini 3 Pro (contexto ~128K, teto mais baixo que Pro/Ultra), Nano Banana/Nano Banana Pro, Flow (cota de créditos mensal limitada), Veo 3.1 Fast (só a variante "Fast", cota diária baixa — a versão completa parece ficar pro Pro/Ultra), NotebookLM com limites ampliados. Google Antigravity é destaque do tier Ultra, não do Plus — fora de cogitação aqui.

### Camada 3 — custo adicional, evitar sem necessidade clara

- Créditos extra de Google AI além da cota do Plus (implicaria upgrade Pro/Ultra).
- Figma pago.
- Ver `pendencias.md` pras ferramentas com status não confirmado no seu tier (Stitch, Jules, Imagen dedicado, Whisk).

### Como decidir na prática

| Preciso de... | Uso isto primeiro |
|---|---|
| Layout de wireframe pra alinhar antes do código | Claude Design (Camada 0) |
| Ícone/ilustração/imagem de apoio pra UI | Nano Banana no Gemini (Camada 1) |
| Vídeo de demo/pitch curto | Flow + Veo 3.1 Fast (Camada 1) |
| Direção de paleta/tipografia/estilo pra uma tela nova | `ui-ux-pro-max-skill` (Camada 2) |
| Auditoria de ai-slop no app rodando | `impeccable.style` (Camada 2), com `avoid-ai-design` (Camada 0) como rede rápida no `/code-review` |
| Padrão de interação validado empiricamente | `interfaces.rauno.me` / `lazyweb.com` (Camada 0/2) |
| Gráfico/dashboard | Skill de Dataviz do Claude Code (Camada 0) pra definir, PrimeNG Charts (Camada 0) pra implementar |
| Discussão de tela com alguém não-técnico | Claude Design (Camada 0) primeiro; Figma free só se a pessoa já preferir Figma |

Regra geral fora da tabela: Camada 0 > Camada 1 > Camada 2 > Camada 3, a não ser que a ferramenta de uma camada mais cara resolva algo que nenhuma das anteriores resolve de verdade.