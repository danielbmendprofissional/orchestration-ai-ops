# Propor melhoria na ferramenta ou no processo

Vale quando, no meio de uma etapa, este agent percebe que falta ou está errado algo em um repositório compartilhado do grupo `orchestration-ai` — o `ai-infra` (manifesto, `infra-config.mjs`, `verify`), o `ai-ops` (os próprios agents e guias), o `ai-base` (template do workspace) ou o `template-ci`. Código da ferramenta já é "depende do humano" (ver "Fora de escopo"): em vez de só registrar, o agent **propõe e, com o sim, abre a issue**. Nunca implementa a melhoria.

## 1. Propor

Diga ao humano, em poucas linhas: **o quê e em qual repositório**; **por quê** (a lacuna concreta, com o arquivo ou comando onde apareceu); **bloqueia o que está sendo feito agora?** (sim/não, com a sua recomendação); o **contorno** enquanto não for feita. Pergunte: **"Abro a issue no `<repositório>`?"** Sem resposta clara, não abra.

## 2. Abrir (com o sim)

```powershell
glab label create -R orchestration-ai/<repo> --name melhoria --color "#5f6fb3"            # só se não existir
glab label create -R orchestration-ai/<repo> --name "origem:<projeto>" --color "#999999"   # idem
glab label create -R orchestration-ai/<repo> --name "bloqueia:<projeto>" --color "#d9534f" # idem, só se bloqueia
glab issue create -R orchestration-ai/<repo> --title "[<projeto>] <resumo>" --label "melhoria,origem:<projeto>[,bloqueia:<projeto>]" --description "<corpo>"
```

`<repo>`: `ai-infra`, `ai-ops`, `ai-base` ou `ai-pipeline/template-ci`. Corpo (sempre estes campos): **Origem** (projeto, etapa, agent) · **Problema** · **Proposta** · **Fora do escopo** · **Critérios de aceite** (`- [ ]`) · **Bloqueio** (`bloqueia <etapa> até mergear` | `não bloqueia — sugestão: antes de <etapa>`) · **Contorno enquanto isso**.

Depois de abrir, entregue o link e o efeito: se bloqueia, pare naquele item e diga o que dá para seguir; se não, siga e registre a issue no relatório. Quem executa a issue é o humano, abrindo o Claude dentro do repositório e rodando `/issue-ai <n>` — não este agent.
