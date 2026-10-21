# Como criar um projeto do zero com a orquestração

Roteiro prático, na ordem em que as coisas acontecem. Cada passo diz **onde abrir o terminal**, **o que rodar** e **o que deve existir no final**. O detalhe de cada assunto fica nos arquivos citados — este guia só amarra a ordem.

Exemplo usado: `<projeto>` = `esteira` (primeiro projeto criado seguindo este guia). Onde a Esteira está hoje: seção final.

```
0. máquina pronta (uma vez)
1. GitLab: grupo + 3 repositórios
2. workspace local a partir do ai-base
3. infra do projeto (agent local-environment-config)
4. skills + MCP
5. discovery  → /grill-with-docs           (Claude Code)
6. decisões   → docs/adr/                  (Claude Code + você)
7. spec       → /to-spec  → issue-mãe       (Claude Code)
8. tickets    → /to-tickets → issues filhas (Claude Code)
9. bootstrap dos repositórios de código     (Claude Code)
10. design system                           (Claude Code + skills de design)
11. execução  → pi /implement-task          (pi.dev + OmniRoute, um painel do Alethe por spec)
12. review    → /code-review → push → MR    (Claude Code, depois CI)
13. esteira   → tag vX.Y.Z-rcN → qa → hml → main
```

**Projeto que já existe** (nascido de um `ai-base` antigo, ou aplicação que nunca teve ambiente de IA): pule os passos 1 e 2 e faça o passo 3 com o caminho do projeto — o agent **recria o ambiente** em volta do código existente:

- traz `docs/agents`, hooks e `.pi/agents` do `ai-base` atual, adaptados ao layout que o projeto já tem (monorepo continua monorepo — conversão pra workspace só se você pedir);
- cria a casa do projeto na infra compartilhada (banco novo vazio — dado antigo não migra sozinho; o relatório traz o `pg_dump`/`pg_restore` se você quiser);
- **não mexe em código**: o que o código precisa mudar (connection string fora do contrato, senha versionada, `/health`, `/metrics`, log) vira a spec `specs/feature/infra/00-adequacao-ambiente.md` + uma issue `needs-triage`, que segue o fluxo normal a partir do passo 8.

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
- `CLAUDE.md` — **não editar**: é o processo do `ai-base`. Regra de stack de cada componente vai num `CLAUDE.md` dentro do repositório do componente (`<projeto>-frontend/CLAUDE.md`), criado no passo 9.

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
Get-Content ai-infra\container\generated\projects\<projeto>.secrets.json | dotnet user-secrets set --project <csproj da API>
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

As de design (`ui-ux-pro-max`, `impeccable`) só depois que existir app Angular rodando (passo 10).

MCP do GitLab: no Claude Code, `/mcp` deve mostrar `gitlab` conectado. Se aparecer `CONNECTION_CLOSED`, quase sempre é o nome da variável — o servidor `@zereight/mcp-gitlab` só lê `GITLAB_PERSONAL_ACCESS_TOKEN` (não `GITLAB_TOKEN`). Fallback sem MCP: `glab` (`docs/agents/issue-tracker.md`).

**Pronto quando:** `/grill-with-docs` aparece no autocomplete do Claude Code e `/mcp` mostra o GitLab verde.

## 5. Discovery — `/grill-with-docs`

A partir daqui o trabalho é **sempre na raiz do workspace**:

```powershell
cd <workspace>
claude
```

```
/grill-with-docs <o que você quer construir, em 2-3 frases>
```

O Claude entrevista você (uma pergunta por vez) até fechar as lacunas: regras, termos do domínio, o que fica de fora. Termos vão pro `CONTEXT.md`/`CONTEXT-MAP.md`. Responda com o que você sabe; "não sei, recomende" é resposta válida.

- Trabalho grande demais pra uma sessão → `/wayfinder` antes (mapa + tickets filhos).
- Dúvida de qual skill usar → `/ask-matt`.

**Pronto quando:** não sobra pergunta aberta sobre o escopo da fatia.

## 6. Decisões — `docs/adr/`

Toda decisão que vale além de uma fatia (padrão de API, autenticação, stack, convenção) vira ADR curta em `docs/adr/NNNN-nome.md`: **decisão**, **por quê**, **impacto**. A spec cita a ADR em vez de repetir. Decisão de um componente só pode ir no `CLAUDE.md` dele.

**Pronto quando:** nenhuma spec precisa "decidir" algo transversal no meio do texto.

## 7. Spec — `/to-spec`

```
/to-spec
```

Transforma a conversa do discovery numa spec formal. Formato (o mesmo do Valuto):

- arquivo `specs/feature/<área>/NN-nome.md` — **fonte de verdade**;
- topo: `## Contexto necessário` listando cada `.md` que o executor precisa ler (o `pi` não empilha `CLAUDE.md` sozinho);
- seções: Ideia · Dados · Backend · Frontend · Infra · Testes — o que não se aplica fica escrito "N/A";
- critérios de aceite em **EARS** ("QUANDO X, O SISTEMA DEVE Y");
- issue-mãe no `<projeto>-workspace` apontando pro arquivo (link + resumo, não o conteúdo).

Fatia = entrega fina **ponta a ponta**, nunca "só o backend". Exceção: fatias de infra/bootstrap (sem EARS de domínio, viram checklist).

**Pronto quando:** você leu a spec e concorda com cada EARS — ela vira o contrato dos testes.

## 8. Tickets — `/to-tickets`

```
/to-tickets
```

Quebra a spec em issues filhas (labels `backend`/`frontend` + `ready-for-agent`), cada uma declarando o que bloqueia e o que é bloqueado. Labels: `docs/agents/triage-labels.md`.

**Pronto quando:** as issues estão no GitLab com dependências e a primeira está desbloqueada.

## 9. Bootstrap dos repositórios de código

Feito pelo **Claude Code** (não pelo `pi`): é decisão de infra — runner de teste, tema, estrutura, CI. Normalmente é a "Fatia 0" de cada componente.

- **Frontend:** `ng new` na versão estável, PrimeNG + Tailwind, runner de teste, estrutura de pastas da ADR de stack, `nginx/` copiado de `template-ci/examples/angular/nginx`, `.gitlab-ci.yml` copiado de `ai-base/templates/frontend.gitlab-ci.yml` (`ANGULAR_DIST_PATH`, `TEST_COMMAND`), `public/config.json` de dev, `package-lock.json` commitado, `<projeto>-frontend/CLAUDE.md` com a stack.
- **API:** `.gitlab-ci.yml` de `ai-base/templates/api.gitlab-ci.yml`, `/health`, `/metrics`, log JSON + OTLP (`ai-base/docs/agents/observabilidade-backup.md`), configuração só pelas chaves do contrato (`ai-base/docs/agents/infra-local.md`, via user-secrets em dev), porta do `/metrics` no campo `metrics` do projeto em `ai-infra/configs/infra/projects.json`.

**Pronto quando:** `ng serve`/`dotnet run` sobem, `npm test` roda, estrutura bate com a ADR.

## 10. Design system

Antes da primeira fatia com tela. Na raiz do `<projeto>-frontend`, com `ng serve` rodando:

```powershell
npm install -g ui-ux-pro-max-cli; uipro init --ai claude
npx impeccable install
```

No Claude Code:
1. `ui-ux-pro-max` → direção de design (perfil `dashboard`/`app-component` pra sistema interno).
2. `/impeccable init` → gera `DESIGN.md`/`PRODUCT.md`, usando `docs/design/tokens.md` como semente.
3. Mapear os tokens pro **preset do PrimeNG** e pro `@theme` do Tailwind, mesmos valores dos dois lados. Tema de fábrica (Aura/Lara, paleta default do Tailwind) é P0.
4. Referências visuais: `docs/design/referencias.md` (Aceternity, 21st.dev, bklit — só inspiração, reimplementa em Angular; `interfaces.rauno.me` como checklist).

**Pronto quando:** uma tela de teste com `p-button`/`p-table` já sai com a cara do projeto.

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

## Onde a Esteira está (2026-10-21)

| Passo | Estado |
|---|---|
| 0 | ok (infra, `pi`, OmniRoute, `glab`) |
| 1 | ok — `esteira-workspace`, `esteira-api`, `esteira-frontend` no grupo `orchestration-ai/ai-pipeline/esteira` |
| 2 | ok — workspace em `ai-pipeline/esteira/`, publicado em `main` (remote HTTPS) |
| 3 | infra criada (manifesto, `verify` verde): banco `esteira` (`esteira_owner`/`esteira_app`), vhost `esteira`, Redis `esteira:*`, realm `esteira` + client `esteira-api` + usuário `dev`, `/metrics` na 5105. **Falta no código:** `appsettings.Development.json` ainda usa `postgres`/`guest` e senha versionada — trocar pelas chaves do contrato via user-secrets |
| 4 | MCP do GitLab corrigido no `~/.claude.json` (variável `GITLAB_PERSONAL_ACCESS_TOKEN`); skills a instalar no workspace |
| 6 | ADRs 0001–0007 escritas (paginação, erros, BFF, stack do front, config em runtime, cadastro de aplicações) |
| 5/7/8 | próximo: discovery + spec das fatias B1/B2 (API) e F0 (bootstrap) — ordem em `ai-pipeline/esteira/specs/README.md` |
