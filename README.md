# ai-ops

Repo geral de AI apartados de projetos, inclui agents, skills, instructions que eu mesmo fiz, documentação (docs-human) referente a ai-base, infra, template, conceitos

## Estrutura - Agents

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