# Como usar a orquestração

Guia curto. Cada seção termina com o link do detalhe. Todos os comandos: [glossário](docs-human/ai-base/glossario-de-comandos.md).

> **Perdeu o fio?** Abra o Claude na raiz do workspace e digite **`/proximo`**. Ele diz onde você está, o seu próximo passo e de onde vem cada fatia.

## Começar a desenvolver — checklist do dia

Sempre que for trabalhar, nesta ordem. **Todos os comandos no PowerShell.** Exemplo com a Esteira; troque pelos caminhos do seu projeto.

| # | O que abrir | Como | Pronto quando |
|---|---|---|---|
| 1 | **Docker Desktop** | abrir o aplicativo | ícone verde, "running" |
| 2 | **Infra compartilhada** (Postgres, Redis, RabbitMQ, Keycloak, observabilidade, OmniRoute) | `cd <raiz-do-workspace>\ai-infra\configs\infra` e `node infra-config.mjs up` | termina com `✔ tudo conferido` (nunca `docker compose up` puro) |
| 3 | **Conferir a infra** nas URLs abaixo | abrir no navegador | cada uma abre |
| 4 | **Editor** | `code <raiz-do-workspace>\ai-pipeline\esteira` (VS Code, com o profile `dotnet-backend` para a API e `angular-frontend` para o front). Outro editor, como o Codex: abra a mesma pasta do **workspace** | a pasta do workspace aberta |
| 5 | **Claude** (na raiz do workspace) | `cd <raiz-do-workspace>\ai-pipeline\esteira` e `claude` (ou `claude-pago` / `claude-free`; no Alethe, um painel por fatia) | abre o prompt |
| 6 | **Situação do git** | no Claude: `/situacao`, e peça *"pode alinhar e limpar"* para ele rodar os comandos de alinhar e limpar | "Pronto para começar a próxima fatia? SIM" |
| 7 | **Próximo passo** | no Claude: `/proximo` | você sabe o que fazer |
| 8 | **API** | `cd ...\esteira\esteira-api` e `dotnet run --project src\Esteira.Api --launch-profile http` | `http://localhost:5105/health` responde |
| 9 | **Frontend** | `cd ...\esteira\esteira-frontend` e `npm start` | `http://localhost:4200` abre |
| 10 | **GitLab** | abas abaixo | você vê issues e MRs |

Os passos 8 e 9 só se for testar no navegador. Precisa de login? Veja [Acessos e senhas](#acessos-e-senhas-de-desenvolvimento).

**URLs para ver o estado (infra e app):**

| O que | URL |
|---|---|
| App (frontend) | `http://localhost:4200` |
| API: saúde · métricas · documentação | `http://localhost:5105/health` · `/metrics` · `/scalar/v1` |
| Keycloak (administração) | `http://localhost:8080/admin` |
| pgAdmin (banco) | `http://localhost:15432` |
| RabbitMQ (filas) | `http://localhost:15672` |
| Grafana (logs e métricas) | `http://localhost:3000` |
| Prometheus (alvos) | `http://localhost:9090` |
| OmniRoute (só para `claude-pago`/`claude-free`) | `http://localhost:20128` |
| Redis | sem interface: `docker ps` mostra o contêiner `redis` saudável |

**GitLab (grupo `orchestration-ai/ai-pipeline/esteira`) — abra como abas:**

| O que | URL |
|---|---|
| Issues do workspace (mães e tickets) | `https://gitlab.com/orchestration-ai/ai-pipeline/esteira/esteira-workspace/-/issues` |
| **O que está em execução** (board por label `em-execucao`) | `https://gitlab.com/orchestration-ai/ai-pipeline/esteira/esteira-workspace/-/boards` |
| MRs da API | `https://gitlab.com/orchestration-ai/ai-pipeline/esteira/esteira-api/-/merge_requests` |
| MRs do frontend | `https://gitlab.com/orchestration-ai/ai-pipeline/esteira/esteira-frontend/-/merge_requests` |
| Pipelines (API · frontend) | `.../esteira-api/-/pipelines` · `.../esteira-frontend/-/pipelines` |
| MRs/issues do `ai-infra`, `ai-base`, `ai-ops`, `template-ci` (melhorias) | `https://gitlab.com/orchestration-ai/<repo>/-/issues` |

Os tickets de uma fatia aparecem como **Child items** dentro da issue-mãe. Fim do dia: nada solto — rode `/situacao` de novo.

## Acessos e senhas de desenvolvimento

**As senhas não ficam anotadas em lugar nenhum: foram geradas pelo script da infra.** Onde achar:

| O que | Onde |
|---|---|
| **todas as senhas e usuários** (admin e de cada projeto) | `ai-infra\container\.env` (fora do git; nunca cole no chat nem commite) |
| o que a API lê em dev (connection strings, client do Keycloak…) | user-secrets da API, regravados por `node infra-config.mjs secrets <projeto> --csproj=<caminho>`; cópia em `ai-infra\container\generated\projects\<projeto>.secrets.json` |
| **quais acessos existem** (URL, usuário, qual variável tem a senha), sem os valores | `docs/agents/relatorio-ambiente.md` do projeto |

Variáveis do projeto no `.env` têm o nome em maiúsculas: para o projeto `esteira`, `PROJECT_ESTEIRA_…`.

| Acesso | URL | Usuário | Variável da senha |
|---|---|---|---|
| **Login do app em dev** (Keycloak) | abre pelo app: `http://localhost:4200` | `dev` (com permissões) · `dev-sem-papel` (sem) | `PROJECT_<PROJETO>_KEYCLOAK_DEV_PASSWORD` (a mesma para os dois) |
| Keycloak (administração) | `http://localhost:8080/admin` | variável `KEYCLOAK_ADMIN` | `KEYCLOAK_ADMIN_PASSWORD` |
| pgAdmin | `http://localhost:15432` | variável `PGADMIN_DEFAULT_EMAIL` | `PGADMIN_DEFAULT_PASSWORD` |
| Postgres do projeto | `localhost:5432` | `<projeto>_owner` (migrations) · `<projeto>_app` (runtime) | `PROJECT_<PROJETO>_PG_OWNER_PASSWORD` · `PROJECT_<PROJETO>_PG_APP_PASSWORD` |
| RabbitMQ | `http://localhost:15672` | variável `RABBITMQ_DEFAULT_USER` | `RABBITMQ_DEFAULT_PASS` |
| Grafana | `http://localhost:3000` | variável `GF_SECURITY_ADMIN_USER` | `GF_SECURITY_ADMIN_PASSWORD` |
| Redis | `localhost:6379` | ACL user `<projeto>` | `PROJECT_<PROJETO>_REDIS_PASSWORD` |

**Comandos — todos no PowerShell** (Windows Terminal ou terminal do VS Code). No CMD não há equivalente simples: use o PowerShell.

```powershell
# copiar uma senha para a área de transferência, SEM mostrar na tela (troque o nome da variável)
(Get-Content <raiz-do-workspace>\ai-infra\container\.env | Where-Object { $_ -match '^PROJECT_ESTEIRA_KEYCLOAK_DEV_PASSWORD=' }) -replace '^[^=]+=','' | Set-Clipboard

# listar só os NOMES das variáveis de um projeto (sem valores)
Select-String -Path <raiz-do-workspace>\ai-infra\container\.env -Pattern '^PROJECT_ESTEIRA_' | ForEach-Object { ($_.Line -split '=')[0] }
```

Depois é só colar (Ctrl+V) no campo de senha. Se o valor estiver entre aspas no `.env`, abra o arquivo no VS Code e copie sem elas.

**Subir o projeto para testar em dev** (dois terminais PowerShell):

```powershell
cd <workspace>\<projeto>-api
dotnet run --project src\<Projeto>.Api --launch-profile http     # perfil http, NÃO https: o login depende da mesma origem

cd <workspace>\<projeto>-frontend
npm start                                                         # o ng está dentro do projeto; "ng serve" solto pode não existir
```

Abra `http://localhost:4200` (nunca direto a porta da API). Reiniciou a infra ou rodou o `secrets`? Reinicie a API.

## Quero…

| Quero | Vá para |
|---|---|
| **começar a desenvolver (o que abrir, em ordem)** | **[Checklist do dia](#começar-a-desenvolver--checklist-do-dia)** |
| **achar uma senha/acesso de desenvolvimento** | **[Acessos](#acessos-e-senhas-de-desenvolvimento)** |
| preparar a máquina | [A1](#a1-máquina) |
| criar um projeto novo, ou trazer um que já existe | [A2](#a2-projeto-novo-ou-existente) |
| entender o que o discovery gera (e o que não gera) | [A3](#a3-discovery-e-decisões) |
| **conferir se o mapa está completo** | **[Conferir o mapa](#conferir-o-mapa)** |
| **saber quantas fatias faltam e como o fluxo anda** | **[Como o fluxo anda](#como-o-fluxo-anda)** |
| fazer a próxima fatia | [Parte B](#parte-b-rotina-por-fatia) |
| saber quando as specs são geradas | [B2](#b2-quando-as-specs-são-geradas) |
| **não gostei da implementação / a spec estava errada / refazer** | **[Como corrigir uma fatia](#como-corrigir-uma-fatia)** |
| a execução parou (`PAROU`) | [Quando para](#quando-ele-para) |
| rodar várias fatias ao mesmo tempo | [Paralelismo](#paralelismo) |
| a spec ficou velha | [Spec velha](#spec-velha) |
| **saber em que branch cada repositório está e o que commitar, mergear ou apagar** | **[Situação do git](#situação-do-git)** |
| um agent sugeriu melhorar a infra, o template ou o processo | [Melhorias na orquestração](#melhorias-na-orquestração) |
| onde está o glossário (`CONTEXT`) e os outros arquivos | [Onde fica cada coisa](#onde-fica-cada-coisa) |
| ver o estado da Esteira | [Estado da Esteira](#estado-da-esteira) |

## Visão geral

```
UMA VEZ      máquina → projeto (agent) → discovery → fundação (bootstrap + design)
POR FATIA    /proximo → /fatia B3 → ✋ você aprova a spec → (automático) → ✋ você revisa e mergeia a MR
DEPOIS       tag → qa → hml → main   (esteira de deploy)
```

✋ = só você decide. Tudo o mais é automático: tickets, TDD, review, correção de achados, push e MR.

---

# Parte A — Montar o projeto (uma vez)

## A1 Máquina

**Quem faz: o agent `local-environment-config`.** Abra o Claude **dentro da pasta dele** e peça a Etapa 1:

```powershell
cd ai-ops\agents\infra\local-environment-config
claude
```
```
Etapa 1: configuração inicial da máquina.
```

Ele verifica o que já existe, mostra o plano, **espera o seu ok**, executa e verifica. Instala Claude Code, `glab` e Angular CLI, sobe a infra compartilhada (`ai-infra`), o OmniRoute e os modos `claude-pago`/`claude-free`.

**Você faz** (o agent nunca faz): instalar Node, Git, VS Code e Docker Desktop; cadastrar chaves (`setx NOME "valor"`); instalar o Alethe; criar os profiles do VS Code; criar a **chave SSH** do GitLab (`ssh-keygen -t ed25519`, colar a `.pub` em GitLab → Preferences → SSH Keys, testar com `ssh -T git@gitlab.com`). Todos os remotes são **SSH** (`git@gitlab.com:…`), nunca HTTPS: sem pedido de login a cada push.

**Pronto quando:** o relatório final não tem pendência e `claude-pago -p "responda ok"` responde.
Detalhe: [agent](agents/infra/local-environment-config/CLAUDE.md), Etapa 1.

## A2 Projeto novo ou existente

**Quem faz: o mesmo agent, Etapa 2.** Nada de criar repositório, clonar `ai-base`, banco ou skill na mão. Na mesma sessão do agent:

**Projeto novo:**
```
Etapa 2, projeto NOVO. Grupo no GitLab: <grupo>. Nome: <projeto>.
Componentes: api e frontend. Visibilidade: <private>. Pasta local: <caminho>.
```

**Projeto que já existe:**
```
Etapa 2, projeto EXISTENTE em <caminho completo da pasta>.
```

O agent mostra o plano e, com o seu ok, faz tudo isto:
- cria `<projeto>-workspace`, `<projeto>-api` e `<projeto>-frontend` no GitLab;
- monta o workspace a partir do `ai-base` (regras, comandos, agentes, scripts) e as pastas dos componentes com o `.gitlab-ci.yml`;
- cria a casa do projeto na infra compartilhada (banco, vhost, Redis, realm Keycloak) pelo manifesto;
- configura `.mcp.json`, skills, `impeccable` e skills de segurança, e roda o smoke test;
- escreve `docs/agents/relatorio-ambiente.md` com acessos e pendências.

**Projeto existente** não tem o código tocado: o agent só recria o ambiente e gera uma spec de adequação (`specs/feature/infra/00-adequacao-ambiente.md`), que você executa depois como uma fatia comum.

**Você faz:** aprovar o plano, **commitar e dar push** (o agent nunca faz) e decidir o que ele marcar como "depende de você".

**Pronto quando:** `relatorio-ambiente.md` sem pendência e os três repositórios com o primeiro push.
Detalhe: [agent](agents/infra/local-environment-config/CLAUDE.md), Etapa 2 · [recriar projeto existente](agents/infra/local-environment-config/docs/enviroment/recriar-projeto.md).

## A3 Discovery e decisões

Na **raiz do workspace** (daqui em diante é sempre lá):

```powershell
cd <workspace>
claude
```
```
/grill-with-docs <o que é o projeto, em 2-3 frases>.
Pauta obrigatória, sem item em aberto:
1. Domínio: termos, regras, o que fica de fora → CONTEXT-MAP.md
2. Arquitetura: confirmar docs/agents/padrao-*.md; ADR só para o que diverge ou é do domínio
3. Direção de design: referências e tom → docs/referencias/visual/
4. Mapa de fatias: ordem e dependências → specs/README.md
```

Ele entrevista, uma pergunta por vez. "Não sei, recomende" é resposta válida.

**O que sai do discovery:**

| Arquivo | O que é |
|---|---|
| `docs/adr/NNNN-*.md` | decisões que valem além de uma fatia (decisão, porquê, impacto) |
| `CONTEXT-MAP.md` | glossário do domínio + mapa dos componentes |
| `specs/README.md` | **o mapa: uma linha por fatia** (status, ordem, repositório, depende de, toca em) |

> **O discovery NÃO gera as specs.** O mapa lista **todas** as fatias, mas cada **spec** só é escrita quando chega a vez dela (ver [B2](#b2-quando-as-specs-são-geradas)). Mapa com 14 linhas e 5 specs é o normal.

Trabalho grande demais para uma sessão: `/wayfinder` antes. Em dúvida de qual skill usar: `/ask-matt`.

**Pronto quando:** não sobra pergunta aberta, o mapa existe **e o `/mapa` não aponta item sem fatia** (próxima seção).

## A4 Fundação bootstrap e design

Feita pelo Claude Code direto das ADRs e dos `padrao-*.md`, **sem spec nem tickets** (não há regra de negócio para virar EARS). Sessão normal na raiz do workspace:

1. **Bootstrap** de `<projeto>-frontend` (`ng new`, Tailwind, spartan/ui, estrutura, `nginx/`, `proxy.conf.json`) e de `<projeto>-api` (`/health`, `/metrics`, log JSON, chaves do contrato de infra).
   Peça: `Faça o bootstrap do <projeto>-frontend direto das ADRs e de docs/agents/padrao-frontend.md. Mostre o plano antes do ng new.`
2. **Design system**, antes de qualquer spec com tela: `/impeccable init`, tokens em `src/styles.css`, uma página de amostra que **você aprova**.
   Peça: `Faça o design system do <projeto>-frontend. Direção em docs/referencias/visual/. Quero uma página de amostra para aprovar.`

**Pronto quando:** `ng serve`/`dotnet run` sobem, `npm test` roda, o design está aprovado e as branches estão **mergeadas em `dev`**.
Detalhe: [padrão do frontend](../ai-base/docs/agents/padrao-frontend.md) · [padrão da API](../ai-base/docs/agents/padrao-api.md) · [infra local](../ai-base/docs/agents/infra-local.md).

## Conferir o mapa

O mapa envelhece: protótipo, ADR e `docs/mudancas-*.md` aparecem depois do discovery, e nada garante que viraram fatia. **Rode no fim do discovery, e de novo sempre que o `/proximo` avisar** ("ADR/protótipo/mudança alterados depois do último ajuste do mapa").

```
/mapa
```

Ele cruza tudo que o projeto já definiu — telas dos protótipos, ADRs, `mudancas-template`/`mudancas-infra`, pendências, glossário — com as linhas do `specs/README.md` e responde:

```
Cobertura do mapa: 42 itens · 25 cobertos · 9 parciais · 8 sem fatia
Fatias grandes demais: E1 (6 assuntos), E2 (4)
```

Cada item aponta a origem (arquivo e seção) e a fatia que o cobre, ou "sem fatia". Ao final ele **propõe as linhas** que mudam. O que você faz com o resultado:

| Resultado | O que você faz |
|---|---|
| tudo coberto, nenhuma fatia grande demais | nada; siga com `/proximo` |
| item **sem fatia** ou **parcial** | aprove a linha proposta (ou diga qual muda) e rode `/mapa aplicar` |
| fatia **grande demais** | aprove o corte proposto (`E1` vira `E1a`, `E1b`…) e `/mapa aplicar` |
| item que **nenhuma ADR cobre** | `/grill-with-docs` sobre ele antes de virar fatia |

O `/mapa` nunca altera nada sozinho; `aplicar` só depois do seu ok, e a mudança vai no próximo commit de docs. Detalhe: [`/mapa`](../ai-base/.claude/commands/mapa.md).

---

# Como o fluxo anda

O **mapa** (`specs/README.md`) é o placar: uma linha por fatia, com Status, "Depende de" e "Toca em". Ele nasce inteiro no discovery (digamos, 50 fatias). As **specs** nascem uma a uma, na vez de cada fatia. Então "tenho 7 specs e faltam 43" é o estado normal, e o `/proximo` mostra isso na primeira linha:

```
Mapa: 50 fatias · 7 feitas · 1 em execução · 1 spec aguardando seu ok · 41 sem spec (3 livres agora, 38 bloqueadas)
```

- **sem spec** = a linha existe no mapa, a spec ainda não foi escrita;
- **livres** = todas as dependências já estão em `dev`: podem receber `/fatia` agora;
- **bloqueadas** = esperam alguma fatia ainda não feita (o `/proximo` diz quais bloqueiam mais, ex.: "B3 libera 4").

Ao terminar a 7ª e digitar `/proximo`, ele atualiza o placar, diz qual é a **próxima livre** e o que você faz (`/fatia B8`). Cada fatia feita **libera** outras, e o número de "livres" sobe e desce.

```
terminou a fatia → /proximo → "Mapa: 50 · 8 feitas · … 4 livres" → /fatia <próxima> → aprova a spec → MR → merge → /proximo …
```

O mapa também pode **mudar**: escopo novo ou correção ([caso 5](#caso-5-já-mergeou-e-apareceu-problema)) entra como linha nova; o `/proximo` avisa (`+2 fatias novas`). O que nunca acontece é o sistema gerar as 50 specs de uma vez, porque spec escrita antes da vez dela envelhece ([spec velha](#spec-velha)).

---

# Parte B Rotina por fatia

| # | Passo | Comando | Quem |
|---|---|---|---|
| 1 | descobrir a próxima | `/proximo` | você |
| 2 | spec | `/fatia B3` | Claude escreve e **para** |
| 3 | **aprovar a spec** | responder "aprovo" | ✋ você |
| 4 | tickets, TDD, review, MR | (segue sozinho) | automático |
| 5 | **revisar e mergear a MR** | no GitLab | ✋ você |
| 6 | fechar a fatia | (CI, ou no próximo comando) | automático |

## B1 Descobrir a próxima

```
/proximo          # visão geral
/proximo B3       # a ficha de uma fatia: de onde vem, o que depende dela, o que ler
```

Mostra o seu próximo passo, a origem da fatia (linha do mapa, ADR), se alguma ADR já cobre o assunto ou se precisa de grill, o que pode rodar em paralelo e se alguma spec ou o mapa estão velhos.

## B2 Quando as specs são geradas

**Uma spec por vez, na vez da fatia.** A spec cita o código que a fatia anterior deixou em `dev`; escrita antes, nasce velha. Por isso:

- o **mapa** nasce inteiro no discovery; as **specs**, não;
- a spec de uma fatia só é escrita quando todas as dependências dela estão **mergeadas em `dev`** (o `/fatia` confere e para se não estiver);
- você dispara com `/fatia B3` (o `/proximo` diz qual é a próxima); nunca gere as specs adiantado;
- fatias independentes podem ter spec juntas: `/to-spec B1 B2`.

```
/fatia B3                          # a spec e, depois do seu ok, a execução inteira
/fatia                             # a próxima fatia livre
/fatia B3 — <contexto seu>         # o que não está em nenhum documento
```

O `/fatia` pesquisa sozinho (mapa, ADRs, código) e **só pergunta o que nenhum deles responde**. Escreve `specs/feature/<área>/NN-nome.md` e **para**. Fatia ainda é ideia solta, fora do mapa? `/grill-with-docs` antes.

Detalhe: [formato da spec](../ai-base/docs/agents/spec-format.md).

## B3 Aprovar a spec

É a **única** leitura antes do código. Confira:
- cada critério EARS é **testável** ("Quando X, o sistema deve Y"); vago ("deve ser bonito") volta;
- o **fora do escopo** está certo;
- o **`risco`** (`alto` = auth, sessão, segredo, permissão, migração, dependência nova).

| Você responde | Efeito |
|---|---|
| `aprovo` | abre a mãe, cria os tickets e executa |
| `ajuste: <o que mudar>` | ele corrige a spec e mostra de novo (ainda não existe ticket) |
| `não aprovo: <motivo>` | ele para; vira conversa ou grill |

`risco: alto` mostra também os tickets antes de executar.

## B4 Execução automática

Branch `feature/b3-…` → cada ticket com TDD e um commit → suite completa → `/code-review` → corrige os achados sozinho (até 2 rodadas) → push → MR para `dev` → relatório + notificação. A mãe fica com o label `em-execucao`.

**Acompanhar sem o terminal:** board de issues do workspace por label `em-execucao`; na descrição da mãe, o painel **Execução** (área, modo, **quem executou cada ticket**, suite, review, MR).

Detalhe: [`/implement-task`](../ai-base/.claude/commands/implement-task.md) · [orquestração](../ai-base/docs/agents/orchestration.md).

### Quando ele para

O relatório diz o motivo e a decisão que falta. Você resolve e roda de novo (`/implement-task B3`): ele retoma de onde parou.

| Motivo | O que você faz |
|---|---|
| working tree sujo | comita ou descarta o que é seu |
| ticket bloqueado por outra fatia | faça a outra fatia antes (`/proximo`) |
| review FAIL após 2 rodadas | spec ambígua → corrija a spec ([caso 3](#caso-3-a-spec-estava-errada)); discorda do achado → `/implement-task B3 — <sua decisão>` |
| spec ambígua / contrato inventado | responda a pergunta exata do relatório |

## B5 Revisar a MR e mergear

No GitLab, MR `B3 — …` do repositório (uma por repositório tocado):
1. Leia a descrição: tickets, commits, **executores**, suposições, achados não corrigidos.
2. Teste pelo "Como testar": `git -C <repo> switch feature/b3-…`, suba e percorra os critérios da spec. Com tela: `/impeccable critique|audit <url>`.
3. **Está bom** → aprove e **mergeie em `dev`** (API antes do frontend).
   **Não está bom** → [Como corrigir uma fatia](#como-corrigir-uma-fatia).

## B6 Depois do merge

Nada a fazer. O CI fecha a mãe e os tickets quando o job `fechar-fatia` está ligado; sem ele, o próximo `/fatia`, `/implement-task` ou `/to-spec` fecha. O **Status** do mapa vira `feito` no commit de docs da próxima spec. Rode `/proximo`.

Quando todas as fatias da rodada estiverem em `dev`: tag `vX.Y.Z-rcN` → qa → hml → main. Detalhe: [esteira de deploy](../ai-base/docs/agents/esteira-deploy.md) · [fluxo de tags](../ai-pipeline/template-ci/docs/fluxo-de-tags.md).

---

# Como corrigir uma fatia

Escolha o caso. Em todos, rode na raiz do workspace (ou na área da fatia, ver [Paralelismo](#paralelismo)).

| # | Situação | O que digitar |
|---|---|---|
| 1 | [MR aberta, o código tem um problema](#caso-1-problema-no-código) | comentário na MR + `/implement-task B3` |
| 2 | [MR aberta, sem querer comentar no GitLab](#caso-2-corrigir-sem-comentar-no-gitlab) | `/implement-task B3 — corrigir: <o que>` |
| 3 | [O código faz o que a spec diz, mas a spec estava errada](#caso-3-a-spec-estava-errada) | ajustar a spec + `/implement-task B3 — a spec mudou: …` |
| 4 | [Descartar tudo e refazer do zero](#caso-4-descartar-e-refazer) | apagar a branch (no seu terminal) + `/implement-task B3` |
| 5 | [Já mergeou e apareceu problema](#caso-5-já-mergeou-e-apareceu-problema) | nova fatia no mapa + `/fatia` |

### Caso 1 Problema no código
Comente **na MR**, no código ou na conversa, uma coisa por comentário. Depois:
```
/implement-task B3
```
Ele lê os comentários não resolvidos, corrige com TDD, roda o review de novo, dá push na mesma MR e responde cada comentário com o sha. Você confere e resolve os comentários.

### Caso 2 Corrigir sem comentar no GitLab
```
/implement-task B3 — corrigir: o botão "Nova aplicação" aparece para quem não é MOR (critério 4)
```
Cite o critério da spec quando houver. Mesmo efeito do caso 1.

### Caso 3 A spec estava errada
Não corrija o código primeiro: o teste foi escrito contra a spec e continuaria passando.
```
Ajuste a spec B3: <o que muda; cite o critério>. Mostre o antes e o depois.
```
Com o seu ok na spec:
```
/implement-task B3 — a spec mudou: <resumo>. Ajuste os testes e o código dos critérios afetados.
```
Critério **novo** (sem ticket que o cubra): rode antes `/to-tickets B3` e confira com `node .claude/scripts/check-tickets.mjs B3 <spec> <grupo>/<projeto>-workspace`.

### Caso 4 Descartar e refazer
1. No GitLab, feche a MR sem mergear.
2. **No seu terminal** (o hook impede o Claude de fazer isto): apague a branch nos repositórios tocados.
   ```powershell
   git -C <repo> switch dev
   git -C <repo> branch -D feature/b3-<slug>
   git -C <repo> push origin --delete feature/b3-<slug>
   ```
3. ```
   /implement-task B3
   ```
   Sem a branch, nenhum ticket conta como feito: ele refaz tudo a partir de `origin/dev`.

### Caso 5 Já mergeou e apareceu problema
Fatia entregue não se reescreve. Duas saídas:
- **Reverter:** botão *Revert* na MR mergeada no GitLab (abre uma MR de reversão para `dev`).
- **Corrigir para frente:** adicione ao `specs/README.md` uma linha nova (`B3b — Correção de <problema>`, depende de B3) e rode `/fatia B3b`.

# Spec velha

Spec escrita antes da vez dela envelhece (o código em `dev` mudou). O `/proximo` avisa (`A1: ⚠ desatualizada`) e o `/fatia` faz uma **revalidação**, não uma spec nova: mostra o que mudou, atualiza as referências e pede o seu ok. A checagem é o script `check-spec-drift.mjs`: compara a linha `base:` da spec com o `dev` de agora; spec sem `base:` conta como velha. Ele mede código e ADRs; se **a sua decisão de produto** mudou, é você quem avisa.

```
/fatia A1 — refaça a spec sobre o código atual de dev e me mostre o que mudou
```

# Paralelismo

Fatias que **não se tocam** ("Depende de" feito e "Toca em" sem cruzar, ambos no mapa) rodam juntas, **um painel do Alethe por fatia**. Comece com 2.

```powershell
node .claude/scripts/worktree-fatia.mjs B2 <slug>     # cria a área <workspace>.wt\b2\
cd <workspace>.wt\b2; claude                           # abra o painel do Alethe aqui
/fatia B2                                              # ou /implement-task B2
node .claude/scripts/worktree-fatia.mjs --remove B2   # ao terminar
```

Cada fatia tem a sua spec, o seu review e a sua MR. Acompanhe no board por label `em-execucao` e com `/proximo` num painel livre. A mesma fatia em dois painéis é bloqueada pelo label.
Detalhe: [orquestração, "Execução paralela"](../ai-base/docs/agents/orchestration.md).

---

# Situação do git

Vários repositórios (workspace, api, frontend, áreas paralelas, `ai-base`/`ai-infra`/`ai-ops`/`template-ci`) e várias branches: é fácil deixar algo solto. Um comando mostra tudo e diz o que fazer:

```
/situacao
```

Ele (somente leitura; faz `git fetch`) lista, por repositório, a branch atual e o estado de cada branch (mergeada, com MR aberta, sem MR, nunca enviada) e termina com **O QUE FAZER**, em ordem:

| # | O que é | Quem |
|---|---|---|
| 1 | **Commitar / subir:** arquivo alterado e não comitado, commit não enviado, branch nunca enviada, commit local na `dev`/`main` | você |
| 2 | **Mergear** MR aberta, ou **abrir MR** de branch que está no GitLab sem MR | você, no GitLab |
| 3 | **Alinhar:** `switch` para `dev`/`main` e `pull --ff-only` | seguro |
| 4 | **Limpar:** apagar branch **já mergeada** (`git branch -d`, que recusa se não estiver mergeada) | seguro |

E a última linha: **"Pronto para começar a próxima fatia?"** `SIM` · `QUASE` (só alinhar) · `NÃO` (há pendência sua).

**Quando rodar:** depois de mergear uma MR, antes de cada `/fatia`, ou quando não souber o que ficou solto. O `/proximo` avisa quando precisa.

**O que você faz com o resultado:** resolva as prioridades 1 e 2 (são suas). Para 3 e 4, diga ao Claude *"pode alinhar e limpar"*: ele roda só `pull --ff-only` e `branch -d`, **nunca apaga branch remota nem força** sem o seu ok item a item. Branch à frente da base e sem MR (um commit solto) é decisão sua: ele mostra o commit e pergunta se é para entregar ou apagar.

Sem o Claude, o script roda sozinho no PowerShell, da raiz do workspace:

```powershell
node .claude/scripts/situacao.mjs            # tudo
node .claude/scripts/situacao.mjs --sem-mr   # sem consultar o GitLab (mais rápido)
```

---

# Melhorias na orquestração

Durante o trabalho, um agent pode perceber que falta ou está errado algo **fora do projeto**: no `ai-infra` (ex.: o `verify` não prova uma configuração), no `ai-base` (processo, comandos), no `ai-ops` (guias, agents) ou no `template-ci` (pipeline). Ele **não contorna em silêncio nem edita lá de dentro do projeto**:

| # | Quem | O que acontece |
|---|---|---|
| 1 | agent | **propõe**: o quê, em qual repositório, por quê, e se **bloqueia** a fatia atual (com a recomendação dele) |
| 2 | ✋ você | responde: `sim`, `não` ou ajusta ("abra, mas não bloqueia") |
| 3 | agent | com o sim, **abre a issue** no repositório certo (label `melhoria`, `origem:<projeto>`, e `bloqueia:<projeto>` se bloqueia) e diz o efeito na fatia |
| 4 | ✋ você | quando quiser resolver, **abre o repositório** e roda o comando abaixo |
| 5 | agent | lê a issue, mostra o plano, faz numa branch e abre a MR |
| 6 | ✋ você | revisa e **mergeia** a MR; o merge fecha a issue |

**Executar a issue** (passo 4): abra o Claude na pasta do repositório, não do projeto.

```powershell
cd <orquestracao-ai>\ai-infra       # ou ai-base, ai-ops, ai-pipeline\template-ci
claude
```
```
/issue-ai 7
```

Ele mostra o plano e **pergunta antes** de qualquer coisa ambígua ou que mexa em algo em execução (ex.: `apply` na infra). Nunca mergeia.

**Como o agent do projeto trata isso:**
- **Bloqueia** → ele para naquele ponto e diz o que dá para fazer até o merge. A fatia bloqueada não é recomendada pelo `/proximo` enquanto a issue não fechar.
- **Não bloqueia** → ele segue, e a issue fica listada no `/proximo` com a fatia sugerida para resolvê-la antes.
- O `/proximo` mostra as issues abertas (`ai-infra#7 — … · MR !3 aberta`) e o próximo passo seu (abrir o repositório e `/issue-ai 7`, ou mergear a MR).

Melhoria do **produto** (uma tela, uma regra que falta) não é isto: vai para o mapa de fatias ([Conferir o mapa](#conferir-o-mapa)).
Detalhe: [processo](../ai-base/docs/agents/melhoria-orquestracao.md) · [comando](../ai-base/.claude/commands/issue-ai.md).

---

# Onde fica cada coisa

| O que | Onde | Observação |
|---|---|---|
| **Glossário do domínio** | `CONTEXT-MAP.md` (raiz do workspace) | **Não é o `CLAUDE.md`.** `CONTEXT.md` por componente só existe se o `/domain-modeling` criar; na Esteira hoje há só o `CONTEXT-MAP.md` |
| Instruções para o Claude | `CLAUDE.md` (workspace e de cada componente) | regras do processo e da stack, não glossário |
| Decisões | `docs/adr/` | |
| Mapa de fatias e status | `specs/README.md` | coluna **Status** sempre a primeira |
| Specs | `specs/feature/<área>/NN-nome.md` | só das fatias que já tiveram a vez |
| Comandos e agentes do projeto | `.claude/commands/`, `.claude/agents/`, `.claude/scripts/` | vêm do `ai-base` |
| Relatório do ambiente | `docs/agents/relatorio-ambiente.md` | escrito pelo agent da A2 |

**Nomes:** o código da fatia liga tudo. Mãe `B3 — título` · tickets `B3.1 — …` · branch `feature/b3-<slug>` · commit `… (B3.1 · workspace#9)` · MR `B3 — título`. Você nunca precisa do número da issue.

# Estado da Esteira

| Parte | Estado |
|---|---|
| Máquina, projeto, infra, skills (A1, A2) | feitos |
| Discovery e ADRs 0001–0017, `CONTEXT-MAP.md` (A3) | feitos |
| Fundação (A4): F0 (front), M0 (API), D0 (design) | em `dev` |
| Fatias feitas | B2, B1 |
| **Em andamento** | **B3** (sessão BFF): spec escrita, aguardando seu ok |
| Próximas | F0.5 → A1 (spec antiga, será revalidada) → E1 … E5 (specs nascem na vez de cada uma) |

Para o estado de agora, não use esta tabela: rode `/proximo`.
