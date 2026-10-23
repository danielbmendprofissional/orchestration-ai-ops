# Como criar um projeto do zero com a orquestração

Roteiro prático, na ordem em que as coisas acontecem. Cada passo diz **onde abrir o terminal**, **o que rodar** e **o que deve existir no final**. O detalhe de cada assunto fica nos arquivos citados — este guia só amarra a ordem.

Exemplo usado: `<projeto>` = `esteira` (primeiro projeto criado seguindo este guia). Onde a Esteira está hoje: seção final.

- **Parte 1 (passos 0–13):** montar o projeto e a referência de cada etapa.
- **Parte 2:** o processo do dia a dia: o ciclo de cada fatia e onde **você** valida.
- **Parte 3:** a primeira rodada da Esteira (frontend), com o primeiro comando.

```
0. máquina pronta (uma vez)
1. GitLab: grupo + 3 repositórios
2. workspace local a partir do ai-base
3. infra do projeto (agent local-environment-config)
4. skills + MCP
5. discovery  → /grill-with-docs           (Claude Code)
6. decisões   → docs/adr/                  (Claude Code + você)
7. bootstrap dos repositórios de código     (Claude Code)               ┐ fundação: uma vez,
8. design system                            (Claude Code + impeccable)  ┘ sem spec formal
── daqui em diante, fatia a fatia ──
9. spec       → /to-spec  → issue-mãe       (Claude Code)
10. tickets   → /to-tickets → issues filhas (Claude Code)
11. execução  → pi /implement-task          (pi.dev + OmniRoute, um painel do Alethe por spec)
12. review    → /code-review → push → MR    (Claude Code, depois CI)
13. esteira   → tag vX.Y.Z-rcN → qa → hml → main
```

**Projeto que já existe** (nascido de um `ai-base` antigo, ou aplicação que nunca teve ambiente de IA): pule os passos 1 e 2 e faça o passo 3 com o caminho do projeto — o agent **recria o ambiente** em volta do código existente:

- traz `docs/agents`, hooks e `.pi/agents` do `ai-base` atual, adaptados ao layout que o projeto já tem (monorepo continua monorepo — conversão pra workspace só se você pedir);
- cria a casa do projeto na infra compartilhada (banco novo vazio — dado antigo não migra sozinho; o relatório traz o `pg_dump`/`pg_restore` se você quiser);
- **não mexe em código**: o que o código precisa mudar (connection string fora do contrato, senha versionada, `/health`, `/metrics`, log) vira a spec `specs/feature/infra/00-adequacao-ambiente.md` + uma issue `needs-triage`, que segue o fluxo normal a partir do passo 10 (tickets).

Rodar de novo depois é seguro: ele só aponta o que o template mudou desde a última recriação (guarda o sha do `ai-base` em `docs/agents/relatorio-ambiente.md`).

---

## 0. Máquina pronta (uma vez só)

Não se repete por projeto. Se já fez, pule.

- Ferramentas (Node, git, `pi`, Alethe, `glab`, Playwright via Docker): `ai-ops/docs-human/ai-base/comandos-para-rodar.md`, passos 1–7 e 10.
- Infra compartilhada no ar: `container\.env` preenchido com os logins de admin (modelo em `ai-infra\container\examples\env.example`), depois `cd ai-infra\configs\infra` → `node infra-config.mjs up`. Termina com `✔ tudo conferido` (saúde + muros entre projetos). Nunca `docker compose up` puro. Detalhe: `ai-infra/configs/infra/README.md`.
- Versão das imagens: fixa no compose; atualizar só pelo agent `ai-ops/agents/infra/infra-versions-config`.
- OmniRoute (gateway de modelos do `pi`) configurado: `cd ai-infra\configs\omniroute` → `node omniroute-config.mjs diff` (limpo = ok) → `apply` se precisar. Sem OmniRoute o `pi` fica sem modelo.
- `GITLAB_TOKEN` definido no Windows (variável de usuário) — usado pelo `glab` e pelo MCP do GitLab.

**Pronto quando:** `glab auth status` mostra logado, `pi` abre e `/model` lista os combos `omniroute/pi-exec`, `pi-light`, `pi-quality`.

## 1. GitLab: grupo e repositórios

Um **grupo** por projeto, três projetos dentro (padrão em `ai-base/docs/agents/workspace.md`):

```powershell
# grupo (ou crie pela interface: Create subgroup dentro de orchestration-ai/...)
glab api -X POST groups -f name=<projeto> -f path=<projeto> -f parent_id=<id-do-grupo-pai> -f visibility=private

# id do grupo novo
glab api "groups/<caminho%2Fcompleto%2Fdo%2Fgrupo>" | Select-String '"id"'

# os três projetos
glab api -X POST projects -f name=<projeto>-workspace -f namespace_id=<id-do-grupo> -f visibility=private
glab api -X POST projects -f name=<projeto>-api       -f namespace_id=<id-do-grupo> -f visibility=private
glab api -X POST projects -f name=<projeto>-frontend  -f namespace_id=<id-do-grupo> -f visibility=private
```

**Pronto quando:** o grupo mostra `<projeto>-workspace`, `<projeto>-api`, `<projeto>-frontend`.

## 2. Workspace local a partir do ai-base

O workspace é o `ai-base` copiado (só arquivos versionados) — regras, `.claude/`, `.pi/`, `docs/`. O código mora nos repositórios de componente, dentro dele, ignorados pelo `.gitignore`.

```powershell
cd <pasta-pai>                                   # ex: ...\orquestracao-ai\ai-pipeline
mkdir <projeto>; cd <projeto>
git -C ..\..\ai-base archive HEAD | tar -x       # caminho relativo até o ai-base
git init -b main
git remote add origin https://gitlab.com/<grupo>/<projeto>-workspace.git

git clone https://gitlab.com/<grupo>/<projeto>-api.git
git clone https://gitlab.com/<grupo>/<projeto>-frontend.git
```

Ajustar no workspace:
- `README.md` — o que é o projeto e o mapa dos repositórios (o do `ai-base` é genérico).
- `CONTEXT-MAP.md` — componentes, como conversam, linguagem do domínio.
- `.mcp.json` — já vem com o bloco do GitLab (`disabled: true`, usa `GITLAB_PERSONAL_ACCESS_TOKEN`).
- `CLAUDE.md` — **não editar**: é o processo do `ai-base`. Regra de stack de cada componente vai num `CLAUDE.md` dentro do repositório do componente (`<projeto>-frontend/CLAUDE.md`), criado no passo 7.

```powershell
git add -A; git commit -m "chore: workspace a partir do ai-base"
git push -u origin main
```

**Pronto quando:** `git status` na raiz não mostra `<projeto>-api/` nem `<projeto>-frontend/` (ignorados) e o workspace está no GitLab.

## 3. Infra do projeto (agent `local-environment-config`)

A "casa" do projeto em cada ferramenta da infra compartilhada, sem enxergar a de nenhum outro projeto:

| Ferramenta | O que o projeto ganha |
|---|---|
| Postgres | banco `<projeto>`, roles `<projeto>_owner` (migrations) e `<projeto>_app` (runtime, só DML) |
| RabbitMQ | vhost `<projeto>` + usuário `<projeto>` |
| Redis | usuário `<projeto>`, só chaves/canais `<projeto>:*` |
| Keycloak | realm `<projeto>`, client confidencial `<projeto>-api` (BFF: Authorization Code + PKCE), usuário de teste `dev` |
| Observabilidade | `/metrics` da API raspado pelo Prometheus; logs com rótulo `project=<projeto>` no Grafana |

Tudo nasce de **uma entrada** no manifesto `ai-infra/configs/infra/projects.json` + `node infra-config.mjs apply`, e o `verify` prova os muros. O app recebe as credenciais pelo contrato de nomes de `ai-base/docs/agents/infra-local.md` (`ConnectionStrings:Postgres`, `RabbitMQ:*`, `Keycloak:*`...), gerado em `ai-infra/container/generated/projects/<projeto>.secrets.json`.

**Não faça na mão** — é pra isso que o agent existe (e é um bom teste dele):

```powershell
cd C:\Users\danib\source\repos\orquestracao-ai\ai-ops\agents\infra\local-environment-config
claude
```

Pedir: *"configura o projeto em `<caminho completo do workspace>`"*. Ele lê o projeto (ADRs, `CONTEXT-MAP.md`) pra saber o que ele usa (ex. Esteira: Postgres, RabbitMQ, Redis, Keycloak com callback `http://localhost:4200/api/v1/auth/callback`, `/metrics` na 5105), propõe a entrada do manifesto, e depois de aprovado roda `apply` + `verify` e carrega as credenciais no user-secrets da API:

```powershell
node ai-infra\configs\infra\infra-config.mjs secrets <projeto> --csproj=<csproj da API>
```

Ele devolve um **plano** → você aprova → ele executa → relatório com onde ficou cada credencial (nunca o valor; as senhas são geradas pelo script em `ai-infra/container/.env`, `PROJECT_<PROJETO>_*`). Sempre abrir o `claude` **dentro da pasta do agent**, nunca dentro do projeto (`ai-ops/agents/infra/local-environment-config/README.md`).

**Pronto quando:** `node infra-config.mjs verify` termina com `✔ tudo conferido` mostrando os muros do projeto, e a API lê as chaves do contrato (nada de superusuário, `guest` ou senha em `appsettings` versionado).

## 4. Skills e MCP

As skills não são versionadas (só o `skills-lock.json`). Na **raiz do workspace**:

```powershell
npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y   # grill-me, to-spec, to-tickets, implement, tdd, code-review...
npx skills add https://github.com/angular/skills    -s '*' -a claude-code -y   # angular-developer, angular-new-app
# avoid-ai-design e skills de segurança: comandos-para-rodar.md, seções 8 e 13
```

As de design (`ui-ux-pro-max`, `impeccable`) só depois que existir app Angular rodando (passo 8).

MCP do GitLab: no Claude Code, `/mcp` deve mostrar `gitlab` conectado. Se aparecer `CONNECTION_CLOSED`, quase sempre é o nome da variável — o servidor `@zereight/mcp-gitlab` só lê `GITLAB_PERSONAL_ACCESS_TOKEN` (não `GITLAB_TOKEN`). Fallback sem MCP: `glab` (`docs/agents/issue-tracker.md`).

**Pronto quando:** `/grill-with-docs` aparece no autocomplete do Claude Code e `/mcp` mostra o GitLab verde.

## 5. Discovery — `/grill-with-docs`

A partir daqui o trabalho é **sempre na raiz do workspace**:

```powershell
cd <workspace>
claude
```

O `/grill-with-docs` não segue pauta sozinho: a árvore de decisões cresce a partir do que você fala. Por isso a abertura é fixa, com a pauta:

```
/grill-with-docs <o que é o projeto, 2-3 frases>.
Pauta obrigatória — não encerre com nenhum item em aberto:
1. Domínio: termos, regras, o que fica de fora → CONTEXT-MAP.md (nunca GLOSSARY.md)
2. Arquitetura e padrões: confirmar docs/agents/padrao-frontend.md e padrao-api.md; ADR só pro que diverge ou é do domínio
3. Direção de design: referências e tom → docs/referencias/visual/
4. Mapa de fatias: ordem e dependências → specs/README.md
Leia antes: CONTEXT-MAP.md, docs/adr/, docs/agents/padrao-*.md, docs/referencias/
```

Pra uma fatia específica depois do discovery do projeto, o grill é curto e só sobre o que está aberto nela (Parte 2).

O Claude entrevista você (uma pergunta por vez) até fechar as lacunas: regras, termos do domínio, o que fica de fora. Termos vão pro `CONTEXT.md`/`CONTEXT-MAP.md`. Responda com o que você sabe; "não sei, recomende" é resposta válida.

O discovery do projeto fecha **decisões**, não código:
- **Domínio:** termos, regras e o que fica de fora → `CONTEXT-MAP.md`.
- **Arquitetura e padrões:** stack, camadas, contrato de API (paginação, erros), autenticação e padrões de código já vêm prontos em `docs/agents/padrao-frontend.md` e `padrao-api.md` — o discovery só confirma. ADR (passo 6) é pro que diverge desses padrões e pras decisões do domínio.
- **Direção de design:** referências visuais e o tom (ex.: "maduro, nível GitLab") → `docs/referencias/visual/` (local, fora do git: material de terceiros). Os tokens e o tema em si nascem no passo 8.
- **Mapa de fatias:** a ordem e as dependências → `specs/README.md`.

- Trabalho grande demais pra uma sessão → `/wayfinder` antes (mapa + tickets filhos).
- Dúvida de qual skill usar → `/ask-matt`.

**Pronto quando:** não sobra pergunta aberta sobre arquitetura, padrões e direção de design, e o mapa de fatias existe.

## 6. Decisões — `docs/adr/`

Toda decisão que vale além de uma fatia (padrão de API, autenticação, stack, convenção) vira ADR curta em `docs/adr/NNNN-nome.md`: **decisão**, **por quê**, **impacto**. A spec cita a ADR em vez de repetir. Decisão de um componente só pode ir no `CLAUDE.md` dele.

**Pronto quando:** nenhuma spec precisa "decidir" algo transversal no meio do texto.

## 7. Bootstrap dos repositórios de código

Feito pelo **Claude Code** (não pelo `pi`), direto de `docs/agents/padrao-frontend.md`/`padrao-api.md` + ADRs do projeto, **sem spec formal nem tickets**: é fundação, não tem regra de negócio pra virar EARS. O "pronto quando" abaixo é o checklist. Vem antes do design system porque o tema é código (`@theme` do Tailwind + variáveis do helm do spartan no `src/styles.css`) e o `impeccable` valida contra o app rodando.

- **Frontend:** `ng new` na versão estável, Tailwind 4 + spartan/ui (`@spartan-ng/cli:init`, helm em `src/app/shared/ui`), Vitest + Playwright + axe, estrutura de `padrao-frontend.md`, `core/config` lendo `/config.json`, `proxy.conf.json` de `/api`, `nginx/` copiado de `template-ci/examples/angular/nginx`, `.gitlab-ci.yml` copiado de `ai-base/templates/frontend.gitlab-ci.yml` (`ANGULAR_DIST_PATH`, `TEST_COMMAND`), `public/config.json` de dev, `package-lock.json` commitado, `<projeto>-frontend/CLAUDE.md` com a stack.
- **API:** `.gitlab-ci.yml` de `ai-base/templates/api.gitlab-ci.yml`, `/health`, `/metrics`, log JSON + OTLP (`ai-base/docs/agents/observabilidade-backup.md`), configuração só pelas chaves do contrato (`ai-base/docs/agents/infra-local.md`, via user-secrets em dev), porta do `/metrics` no campo `metrics` do projeto em `ai-infra/configs/infra/projects.json`.

**Pronto quando:** `ng serve`/`dotnet run` sobem, `npm test` roda, estrutura bate com a ADR, e a branch está **mergeada em `dev`** (o fechamento de fatia de `ai-base/docs/workflow.md` vale aqui também).

## 8. Design system

Logo depois do bootstrap, antes de qualquer spec com tela. Também **sem spec formal**: a direção veio do discovery e a validação é você aprovando a página de amostra. Na raiz do `<projeto>-frontend`, com `ng serve` rodando:

```powershell
npm install -g ui-ux-pro-max-cli; uipro init --ai claude
npx impeccable install
```

No Claude Code:
1. `ui-ux-pro-max` → direção de design (perfil `dashboard`/`app-component` pra sistema interno).
2. `/impeccable init` → gera `DESIGN.md`/`PRODUCT.md`, usando `docs/design/tokens.md` como semente.
3. Mapear os tokens no `src/styles.css`: `@theme` do Tailwind e, no `:root`, as variáveis do helm do spartan (`--primary`, `--background`…) apontando pros mesmos valores. Tema de fábrica (spartan `stone`/`zinc`, paleta default do Tailwind) é P0.
4. Referências visuais: `docs/design/referencias.md` (Aceternity, 21st.dev, bklit — só inspiração, reimplementa em Angular; `interfaces.rauno.me` como checklist).

**Pronto quando:** uma página de amostra (botões, tabela, formulário, badges de status, estados vazio/erro) sai com a cara do projeto, **você aprovou**, a branch está **mergeada em `dev`** e o `<projeto>-frontend/CLAUDE.md` aponta pro `DESIGN.md`. Daí em diante toda spec com tela cita o `DESIGN.md` em vez de repetir decisão visual.

## 9. Spec — `/to-spec`

Você não precisa montar o prompt: o `CLAUDE.md` do workspace manda o `/to-spec` seguir `docs/agents/spec-format.md`, que faz o trabalho de pesquisa sozinho — acha a fatia no `specs/README.md`, confere o gate com `git` (dependências mergeadas em `dev`), lê as ADRs que tratam do assunto, os padrões do ai-base e o código atual dos repositórios tocados, e **só pergunta o que nenhum desses responde**. Fatia toda decidida em ADR sai sem pergunta nenhuma; fatia com lacuna vira um grill curto ali mesmo.

Na raiz do workspace, sessão nova:

```
/to-spec                 # a próxima fatia desbloqueada do mapa
/to-spec B1 B2           # fatias específicas (um arquivo + uma issue-mãe por fatia)
/to-spec A1 — o aprovador de negócio não precisa de conta no GitLab
                         # o que vier depois do travessão é contexto seu que não está em lugar nenhum
```

O que esperar, em ordem: qual fatia ele achou e por quê → gate (ok, ou o que falta e para) → as perguntas abertas, uma por vez, com recomendação (ou "nenhuma") → o arquivo escrito + resumo da Ideia e dos critérios pra você aprovar → só então a issue-mãe e o link no mapa.

`/grill-with-docs` antes do `/to-spec` só quando a fatia ainda é ideia solta (não está no mapa, ou a linha dela é uma frase vaga) — aí o grill decide o escopo e o `/to-spec` vem na mesma sessão.

Formato: arquivo `specs/feature/<área>/NN-nome.md` como fonte de verdade, `## Contexto necessário` no topo, Ideia · Dados · Backend · Frontend · Infra · Testes ("N/A" no que não se aplica), critérios em EARS (checklist em fatia de fundação/limpeza), issue-mãe só com link + resumo.

Fatia = entrega fina **ponta a ponta**, nunca "só o backend". Exceção: fatias de infra/bootstrap (sem EARS de domínio, viram checklist).

**Pronto quando:** você leu a spec e concorda com cada EARS — ela vira o contrato dos testes.

## 10. Tickets — `/to-tickets`

```
/to-tickets
```

Quebra a spec em issues filhas (labels `backend`/`frontend` + `ready-for-agent`), cada uma declarando o que bloqueia e o que é bloqueado. Labels: `docs/agents/triage-labels.md`.

**Pronto quando:** as issues estão no GitLab com dependências e a primeira está desbloqueada.

## 11. Execução — `pi` + OmniRoute

Uma sessão `pi` por spec (um painel do Alethe cada, em paralelo se quiser), **na raiz do workspace**:

```powershell
cd <workspace>
git -C <projeto>-frontend switch -c feature/<n>-<nome-curto> dev   # mesma branch em cada repositório tocado
pi
```

```
/implement-task Implementar a issue <grupo>/<projeto>-workspace#<n> — spec specs/feature/<área>/NN-nome.md
```

O `pi` é o agente-pai e encadeia os subagents (`.pi/agents/*.md`): `data` → `backend` → `front` → `ui` → `tests` → `security` → `review`, pulando os que não se aplicam (nunca pula `tests`/`security`/`review`). Cada um usa um combo do OmniRoute (`docs/agents/orchestration.md`).

O que observar (é o teste da orquestração):
- cada subagent devolve **Completado / Arquivos alterados / Suposições / Para o pai**;
- `tests` escreve o teste **antes** e ele fica congelado — se alguém mexer em asserção pra passar, é bloqueio;
- `review` reprova → o pai corrige; reprovou de novo → ele **reporta**, não fica tentando modelo até passar;
- OmniRoute fora → o `pi` para; contingência é trocar o `model:` só localmente.

**Pronto quando:** `review` dá PASS e o pai faz commit na branch de feature.

## 12. Review — `/code-review` → push → MR

Numa sessão **interativa** do Claude Code (nunca headless/CI), na raiz do workspace:

```
/code-review
```

Avalia o diff contra os padrões do repositório e contra a spec (inclui o diff dos testes). Diff com UI → também `/skill:avoid-ai-design detect`; superfície sensível → skills de segurança (`docs/agents/security-review.md`). PASS grava `<projeto>-frontend/.pi/code-review-ok.json` com o sha.

```powershell
git -C <projeto>-frontend add -A; git -C <projeto>-frontend commit -m "..."
git -C <projeto>-frontend push -u origin feature/<n>-<nome-curto>
```

O CI (`verify-code-review`) confere o sha e **abre a MR pra `dev` sozinho**. A MR fecha a issue com `Closes <grupo>/<projeto>-workspace#<n>`. Você aprova o merge.

## 13. Esteira — tag e promoção

Quando todas as specs da rodada estiverem em `dev`: tag `vX.Y.Z-rcN` → `dev → qa` (merge direto por tag) → agente `qa` testa → MR `qa → hml` (aprovação humana) → MR `hml → main` + tag final `vX.Y.Z`. Detalhe: `ai-base/docs/agents/esteira-deploy.md` e `ai-pipeline/template-ci/docs/fluxo-de-tags.md`. API promove antes (ou junto) do frontend que depende dela.

---

# Parte 2 — O processo: o ciclo de cada fatia

Os passos 0–4 se fazem **uma vez por projeto**. Daqui pra frente, todo trabalho é o mesmo ciclo, repetido fatia por fatia. O que muda entre fatias é só o conteúdo, nunca a ordem.

## Quem faz o quê

| Quem | Papel | Onde |
|---|---|---|
| **Você** | Decide, aprova e valida. É o único que aprova spec, merge e design | — |
| **Claude Code** | Pensa: discovery, arquitetura, ADR, spec, tickets, bootstrap, design system, review | `claude` na raiz do workspace |
| **`pi` (agente-pai)** | Executa uma spec: encadeia os subagents, commita na branch de feature | `pi` na raiz do workspace, um painel do Alethe por spec |
| **Subagents** | `data`, `backend`, `front`, `ui`, `tests`, `security`, `review`, cada um num combo do OmniRoute | chamados pelo `pi`, nunca por você |

Regra prática: **se exige julgamento, é Claude Code; se é mecânico com contrato fechado, é `pi`**.

## Quanto especificar de uma vez

Só o **mapa** nasce inteiro. Spec, tickets e testes nascem na hora em que vão ser usados, uma fatia por vez. O que se aprende implementando uma fatia muda as seguintes. Spec escrita cedo demais é retrabalho e token gasto à toa.

| O quê | Quando | Por quê |
|---|---|---|
| Mapa de fatias (`specs/README.md`), ADRs, `CONTEXT-MAP.md` | tudo, logo depois do discovery | barato (uma linha por fatia); dá ordem e dependências |
| Spec detalhada (EARS) | só a próxima fatia, no máximo as duas seguintes | a fatia N muda a N+1 |
| Tickets | só da spec recém-aprovada | dependem do código que já existe |
| Testes | por ticket, durante a execução (vermelho primeiro, TDD) | os EARS já são o contrato; o teste é escrito contra o código real do momento |

- Antes de especificar a próxima fatia, releia a linha dela no mapa e ajuste o que a anterior mudou.
- Fatia entregue não se reescreve: a mudança vira fatia nova no mapa ou ADR nova ("Substitui ADR-000X").
- Fatias sem dependência entre si podem ser especificadas juntas (ex.: B1 e B2 da Esteira).

## O ciclo (com os pontos onde você valida)

```
 ┌─ 1. Discovery         /grill-with-docs              Claude Code ─┐
 │  2. Arquitetura       ADR (se for decisão transversal)            │  você responde
 │  3. Spec              /to-spec <fatia>                            │
 │     ✋ VOCÊ: lê cada EARS e aprova                                ─┘
 │  4. Tickets           /to-tickets  → issues no GitLab
 │     ✋ VOCÊ: confere dependências e o "ready-for-agent"
 │  5. Branch            git -C <repo> switch -c feature/<n>-<nome> dev
 │  6. Execução          pi → /implement-task ...       pi + subagents
 │     ✋ VOCÊ: acompanha o painel; lê o "Para o pai" de cada hop
 │  7. Ver funcionando   ng serve / dotnet run, abrir no navegador
 │     ✋ VOCÊ: testa o fluxo da spec na mão
 │  8. Design (se tem tela) /impeccable critique|audit contra o localhost
 │     ✋ VOCÊ: compara com as referências e aprova o visual
 │  9. Review            /code-review                  Claude Code
 │     ✋ VOCÊ: lê os achados; FAIL volta pro passo 6
 │ 10. Entrega           commit → push → MR pra dev
 │     ✋ VOCÊ: aprova o merge
 └─11. Retro (opcional)  /retro → ajusta skill/agent/ADR que falhou
```

### 1–3. Discovery, arquitetura e spec (Claude Code)

```powershell
cd <workspace>; claude
```

```
/to-spec <ID da fatia>
```

Ele pesquisa sozinho e pergunta só o que falta (passo 9). Fatia que ainda é ideia solta, fora do mapa: `/grill-with-docs Quero a fatia <nome>: <o que entrega, 2-3 frases>.` primeiro, `/to-spec` na mesma sessão.

- Ele pergunta uma coisa por vez. "Não sei, recomende" é resposta válida; a recomendação dele passa a ser decisão só quando você aceita.
- Decisão que vale pra mais de uma fatia → peça "registra isso como ADR". Decisão só da fatia fica na spec.
- Questão de arquitetura de código (camadas, onde algo mora) → `/codebase-design` ou `/improve-codebase-architecture`.
- Você aprova o resumo → ele grava `specs/feature/<área>/NN-nome.md`, abre a issue-mãe e linka no mapa.

**Como validar a spec:** cada EARS tem que ser testável ("QUANDO a lista carrega sem fluxos, O SISTEMA DEVE mostrar o estado vazio"). EARS vago ("deve ser bonito") volta pro grill. O `## Contexto necessário` precisa listar tudo o que o executor tem que ler, inclusive referências visuais. Aprovou a spec, ela vira o contrato dos testes.

### 4. Tickets (Claude Code)

```
/to-tickets specs/feature/<área>/NN-nome.md
```

Confira no GitLab: uma issue por fatia vertical fina, `blocks`/`blocked by` corretos, label de área e `ready-for-agent` só na que está desbloqueada.

### 5–6. Execução (pi)

```powershell
cd <workspace>
git -C <projeto>-frontend switch -c feature/<n>-<nome-curto> dev
pi
```

```
/implement-task Implementar <grupo>/<projeto>-workspace#<n>. Spec: specs/feature/<área>/NN-nome.md.
Leia o "Contexto necessário" da spec antes de começar.
```

O que observar em cada hop, e o que fazer:

| Sinal | O que significa | O que você faz |
|---|---|---|
| hop devolve Completado / Arquivos / Suposições / Para o pai | normal | lê as **Suposições**: suposição errada é a origem da maioria dos retrabalhos |
| `tests` escreve teste antes do código | TDD funcionando | — |
| asserção afrouxada, `skip`, teste comentado | quebra da regra | interrompe; isso é FAIL mesmo que o `review` deixe passar |
| `review` FAIL uma vez | normal | deixa o pai reabrir o hop |
| `review` FAIL de novo | spec ou contrato ambíguo | **para**; volta pro Claude Code e corrige a spec, não o agente |
| subagent "inventou" contrato de API | falta contrato | registra no ticket; nunca aceite formato inventado |
| `pi` sem modelo | OmniRoute fora | `node omniroute-config.mjs diff` no `ai-infra` |

### 7. Ver funcionando

- Frontend: `cd <projeto>-frontend; npm start` → `http://localhost:4200`. API: `dotnet run` (credenciais via user-secrets, passo 3).
- Percorra cada EARS da spec na mão. Testes verdes não substituem isso.
- `npm test` e `npm run e2e` (quando houver) precisam passar localmente.

### 8. Design (fatia com tela)

Com o app rodando, no Claude Code:

```
/impeccable critique http://localhost:4200/<rota>
/impeccable audit http://localhost:4200/<rota>
```

- `critique` = avaliação de UX/hierarquia; `audit` = acessibilidade, contraste, estados. Correções: `/impeccable adapt|harden|polish|layout|typeset`.
- `/skill:avoid-ai-design detect` como rede de segurança contra cara de "template de IA".
- Compare com as referências do projeto (`docs/referencias/`, `docs/design/referencias.md`). Referência é inspiração: nunca copiar pacote React.
- Aprovado o visual, o que for padrão (cor, espaçamento, componente) sobe pro `DESIGN.md`/`src/styles.css`, nunca fica só na tela.

### 9. Review (Claude Code, sessão interativa)

```
/code-review
```

Dois eixos em paralelo: padrão do repositório (ADRs, `CLAUDE.md` do componente) e conformidade com a spec, incluindo o diff dos testes. Superfície sensível (auth, sessão, segredo, dependência nova) → `/security-review` também. PASS grava `<repo>/.pi/code-review-ok.json`.

### 10. Entrega

```powershell
git -C <projeto>-frontend push -u origin feature/<n>-<nome-curto>
```

- Com o template-ci ligado: o job `verify-code-review` confere o sha e abre a MR pra `dev`.
- **Sem template-ci (fase de testes):** abra a MR na mão: `glab mr create -R <grupo>/<projeto>-frontend --source-branch feature/<n>-<nome-curto> --target-branch dev --title "..." --description "Closes <grupo>/<projeto>-workspace#<n>"`.
- Você aprova o merge. Publicação (tags/qa/hml/prod) é o passo 13 e só entra quando você decidir.

### 11. Retro

Depois de cada fatia, nos primeiros projetos sempre: `/retro`. O que falhou vira ajuste **no lugar certo**: regra de processo → `ai-base`; prompt de subagent → `.pi/agents/*.md` (e depois no `ai-base`); decisão do projeto → ADR. Nunca corrigir só "na conversa".

## Paralelismo

Specs sem dependência entre si rodam ao mesmo tempo, uma sessão `pi` por spec no Alethe, cada uma na sua branch. Você continua sendo o gargalo das aprovações. Comece com uma de cada vez até confiar nos sinais da tabela acima.

---

# Parte 3 — Primeira rodada da Esteira: frontend

Objetivo desta rodada: **testar o processo** (grill, arquitetura, orquestração `pi`, review, design) construindo o frontend. Sem template-ci, sem publicação.

Material que já existe no workspace (`ai-pipeline/esteira/`):
- `docs/adr/0001`–`0007`: decisões tomadas (paginação, erros, BFF, stack e arquitetura do front, config em runtime, cadastro de aplicações).
- `docs/referencias/tce-fluxo-deploy/`: telas e código do fluxo-deploy do TCE (o que você me mandou na conversa de 2026-10-21), com o que manter e o que não copiar.
- `specs/README.md`: ordem das fatias.

Ordem:

| # | Fatia | Quem | O que você testa nela |
|---|---|---|---|
| 1 | **F0 — Bootstrap do frontend** (fundação, passo 7) | Claude Code | sem spec: direto das ADRs; Claude faz `ng new` (Angular 22, zoneless, Vitest, spartan/ui, Tailwind 4, estrutura da ADR-0005, `public/config.json`, `proxy.conf.json` pra `/api`, `esteira-frontend/CLAUDE.md`) |
| 2 | **D0 — Design system** (fundação, passo 8) | Claude Code + `impeccable` | `/impeccable init` com a direção de `docs/referencias/visual/` (maduro, nível GitLab; as telas do TCE são só referência funcional); tokens no `src/styles.css` (`@theme` + variáveis do spartan); uma página de amostra pra você aprovar |
| 3 | **F0.5 — Shell + sessão** | `pi` (`front`, `ui`, `tests`, `security`, `review`) | **primeira orquestração**: layout (sidebar + header da tela 01), `auth.service`, guards, interceptors de sessão e erro |
| 4 | **F1 — Lista e criação de fluxo** | `pi` | spec com EARS de domínio; smart/dumb; tabela paginada (ADR-0002) |
| 5 | **F2 — Detalhe + steps-bar + rotas por etapa** | `pi` | componente dumb puro, serviço com escopo de rota |
| 6 | **F3 — Deploys, análises e modal de artefatos** | `pi` | densidade de dashboard, design das severidades |

**Uma decisão de mapa (se o discovery não fechou):** as fatias B1–B3 (paginação, erros, sessão BFF na `esteira-api`) ainda não existem. Pra não travar o frontend: (a) o front roda contra **fixtures/mock em dev** que já seguem o contrato das ADRs, e troca pra API real quando B1–B3 entrarem; ou (b) faz B1–B3 primeiro, em paralelo com a fundação (bom teste do subagent `backend`). Recomendação: **(b) em paralelo**, e mock só onde a API ainda não chegou.

**Primeiro comando:**

```powershell
cd C:\Users\danib\source\repos\orquestracao-ai\ai-pipeline\esteira
claude
```

```
Faça o bootstrap do esteira-frontend (fundação, passo 7 do ai-ops/COMO-CRIAR-UM-PROJETO.md),
direto das ADR-0005 e ADR-0006. Sem spec formal: o checklist é o "Pronto quando" do passo 7.
Leia antes: CONTEXT-MAP.md, docs/adr/, docs/referencias/. Me mostre o plano antes de rodar o ng new.
```

Depois, na mesma sessão, o design system (passo 8) e a página de amostra para você aprovar. Só então começam as specs: F0.5 primeiro (primeira orquestração pelo `pi`).

---

## Onde a Esteira está (2026-10-23)

| Passo | Estado |
|---|---|
| 0 | ok (infra, `pi`, OmniRoute, `glab`) |
| 1 | ok — `esteira-workspace`, `esteira-api`, `esteira-frontend` no grupo `orchestration-ai/ai-pipeline/esteira` |
| 2 | ok — workspace em `ai-pipeline/esteira/`, publicado em `main` (remote HTTPS) |
| 3 | infra criada (manifesto, `verify` verde): banco `esteira` (`esteira_owner`/`esteira_app`), vhost `esteira`, Redis `esteira:*`, realm `esteira` + client `esteira-api` + usuário `dev`, `/metrics` na 5105. Código adequado ao contrato na fatia 00 (mergeada em `dev` da `esteira-api`) |
| 4 | ok — skills instaladas no workspace (`.claude/skills`, `impeccable` em `.pi/skills`); MCP do GitLab conectado |
| 6 | ADRs 0001–0016 (0015: spartan/ui no lugar do PrimeNG); referências do TCE em `docs/referencias/tce-fluxo-deploy/` |
| 7 | F0 (frontend) mergeada em `dev`; M0 (API) mergeada em `dev` |
| 8 | D0 feito (`DESIGN.md`, `PRODUCT.md`, tokens no `styles.css`, protótipos em `docs/design/prototipos/`). **Falta:** mergear `feature/d0-tema` (frontend) em `dev` e `docs/d0-prototipos` (workspace) em `main` |
| 9+ | **próximo:** grill + spec de B1 e B2 juntas (API, só dependem da M0) → B3 → F0.5 |
