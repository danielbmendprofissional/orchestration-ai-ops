# ai-ops

Repo separado do `ai-base` (template, copiado por projeto) e do `infra` (serviço rodando de verdade). Guarda automação que não pertence a nenhum projeto específico e não deve ser multiplicada por N cópias — agents que operam sobre `ai-base`/`infra`/outros repos, não código de aplicação.

Precisa estar clonado como pasta irmã de `ai-base` e `infra` (mesma pasta pai) — os agents daqui leem regra de um e escrevem no outro por caminho relativo.

## Estrutura

Cada agent vive na sua própria pasta, organizada por domínio:

```
ai-ops/
  agents/
    <domínio>/
      <nome-do-agent>/
        README.md      → o que o agent faz, como rodar, o que ele NÃO faz
        CLAUDE.md       → (se o agent roda em Claude Code) instrução carregada automaticamente
        ...             → (se o agent roda em pi.dev) frontmatter próprio, ver convenção do pi
```

Cada pasta de agent tem seu próprio `README.md` — este arquivo aqui é só o índice, não descreve o funcionamento de agent nenhum.

## Agents disponíveis

| Agent | Domínio | Ferramenta | Onde |
|---|---|---|---|
| `local-environment-config` | infra | Claude Code | `agents/infra/local-environment-config/` |

Ver o `README.md` de cada pasta pra detalhe de uso.