# ai-ops

Repo geral de AI apartados de projetos, inclui agents, skills, instructions que eu mesmo fiz, documentação (docs-human) referente a ai-base, infra, template, conceitos

## Arquivos da raiz

- `COMO-CRIAR-UM-PROJETO.md` — roteiro humano, do zero até a esteira (a IA não lê).
- `PENDENCIAS.md` — pendências do ecossistema (ai-base, ai-infra, ai-ops, OmniRoute, Kubernetes). Pendência de um projeto fica no repo do projeto.

## Estrutura - Agents

Cada agent vive na sua própria pasta, organizada por domínio:

```
ai-ops/
  agents/
    <domínio>/
      <nome-do-agent>/
        README.md      → o que o agent faz, como rodar, o que ele NÃO faz
        CLAUDE.md       → (se o agent roda em Claude Code) instrução carregada automaticamente
```

Cada pasta de agent tem seu próprio `README.md` — este arquivo aqui é só o índice, não descreve o funcionamento de agent nenhum.

## Agents disponíveis

| Agent | Domínio | Ferramenta | Onde |
|---|---|---|---|
| `local-environment-config` | infra | Claude Code | `agents/infra/local-environment-config/` |
| `infra-versions-config` | infra | Claude Code | `agents/infra/infra-versions-config/` |

Ver o `README.md` de cada pasta pra detalhe de uso.

## Ferramentas (`tools/`)

Scripts de apoio que não são agents — rodados pelo humano.

| Ferramenta | O que faz | Onde |
|---|---|---|
| `omniroute-eval` | Ranking empírico dos modelos do OmniRoute pros modos `claude-pago`/`claude-free` (tool calling, edição, escrita de teste) | `tools/omniroute-eval/` |
