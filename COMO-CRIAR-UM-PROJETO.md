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
9. spec       → /to-spec B2       → issue-mãe "B2 — …"          (Claude Code)
10. tickets   → /to-tickets B2    → filhas "B2.1 — …"           (Claude Code)
11. execução  → /implement-task B2 → tasks + review + MR pra dev (Claude Code + subagentes, um painel do Alethe por fatia)
12. você      → revisa a MR no GitLab e mergeia                 (fechamento da fatia é automático)
13. esteira   → tag vX.Y.Z-rcN → qa → hml → main
```

**Projeto que já existe** (nascido de um `ai-base` antigo, ou aplicação que nunca teve ambiente de IA): pule os passos 1 e 2 e faça o passo 3 com o caminho do projeto — o agent **recria o ambiente** em volta do código existente:

- traz `docs/agents` e `.claude/` (hooks, agents, commands) do `ai-base` atual, adaptados ao layout que o projeto já tem (monorepo continua monorepo — conversão pra workspace só se você pedir);
- cria a casa do projeto na infra compartilhada (banco novo vazio — dado antigo não migra sozinho; o relatório traz o `pg_dump`/`pg_restore` se você quiser);
- **não mexe em código**: o que o código precisa mudar (connection string fora do contrato, senha versionada, `/health`, `/metrics`, log) vira a spec `specs/feature/infra/00-adequacao-ambiente.md` + uma issue `needs-triage`, que segue o fluxo normal a partir do passo 10 (tickets).

Rodar de novo depois é seguro: ele só aponta o que o template mudou desde a última recriação (guarda o sha do `ai-base` em `docs/agents/relatorio-ambiente.md`).

---

## 0. Máquina pronta (uma vez só)

Não se repete por projeto. Se já fez, pule.

- Ferramentas (Node, git, Claude Code, Alethe, `glab`, Playwright via Docker): `ai-ops/docs-human/ai-base/comandos-para-rodar.md`, passos 1–7 e 10.
- Infra compartilhada no ar: `container\.env` preenchido com os logins de admin (modelo em `ai-infra\container\examples\env.example`), depois `cd ai-infra\configs\infra` → `node infra-config.mjs up`. Termina com `✔ tudo conferido` (saúde + muros entre projetos). Nunca `docker compose up` puro. Detalhe: `ai-infra/configs/infra/README.md`.
- Versão das imagens: fixa no compose; atualizar só pelo agent `ai-ops/agents/infra/infra-versions-config`.
- OmniRoute (gateway dos modos `claude-pago`/`claude-free`) configurado: `cd ai-infra\configs\omniroute` → `node omniroute-config.mjs diff` (limpo = ok) → `apply` se precisar. Sem OmniRoute só o modo `claude` (plano) funciona.
- Modos do Claude Code: `~/.claude/modos/pago.json`/`free.json` e os atalhos `claude-pago`/`claude-free` no perfil do PowerShell (`ai-ops/agents/infra/local-environment-config/docs/enviroment/claude-modos.md`).
- `GITLAB_TOKEN` definido no Windows (variável de usuário) — usado pelo `glab` e pelo MCP do GitLab.

**Pronto quando:** `glab auth status` mostra logado, `claude` abre, e `claude-pago -p "responda ok"` responde com o log do OmniRoute mostrando `deepseek/deepseek-v4-flash succeeded`.

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

O workspace é o `ai-base` copiado (só arquivos versionados) — regras, `.claude/`, `docs/`. O código mora nos repositórios de componente, dentro dele, ignorados pelo `.gitignore`.

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

Feito pelo **Claude Code** (sessão normal, sem `/implement-task`), direto de `docs/agents/padrao-frontend.md`/`padrao-api.md` + ADRs do projeto, **sem spec formal nem tickets**: é fundação, não tem regra de negócio pra virar EARS. O "pronto quando" abaixo é o checklist. Vem antes do design system porque o tema é código (`@theme` do Tailwind + variáveis do helm do spartan no `src/styles.css`) e o `impeccable` valida contra o app rodando.

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
/to-tickets B2
```

Quebra a spec em tickets e mostra a quebra pra você aprovar. Publica cada um como **Task filha da issue-mãe** (aparece em "Child items" da mãe), título `B2.1 — …`, `B2.2 — …` na ordem de execução, com label de área + `ready-for-agent` e `Blocked by:` no topo. Como: `docs/agents/issue-tracker.md` ("Tickets de uma spec"); labels: `docs/agents/triage-labels.md`.

**Pronto quando:** as issues estão no GitLab com dependências e a primeira está desbloqueada.

### Nomes: o código da fatia liga tudo

Você nunca precisa saber o `#` de uma issue. O código da fatia no mapa (`B2`) aparece em todo lugar:

| Onde | Como aparece | Exemplo |
|---|---|---|
| GitLab, issue-mãe | `<fatia> — <título>` | `B2 — Result pattern + Problem Details (ADR-0003)` |
| GitLab, filhas (Child items da mãe) | `<fatia>.<N> — <título>` | `B2.1` … `B2.5`: a última é a de maior N |
| Branch, em cada repositório tocado | `feature/<fatia>-<slug da spec>` | `feature/b2-result-e-problem-details` |
| Commit, um por filha | `… (<fatia>.<N> · workspace#<filha>)` | `feat: VOs devolvem Result (B2.5 · workspace#8)` |
| MR pra `dev` | `<fatia> — <título>` | `B2 — Result pattern + Problem Details (ADR-0003)` |

Com 4 mães (A, B, C, D) de 5 filhas cada: `/implement-task B2` só enxerga as filhas da mãe B2, só mexe na branch `feature/b2-*`, e antes de começar imprime o cabeçalho com o que vai fazer e o que está fora:

```
Fatia B2 — Result pattern + Problem Details (workspace#2) · spec specs/feature/base/02-…md
Branch feature/b2-result-e-problem-details em esteira-api
Filhas: B2.1 #4 ✔ · B2.2 #5 ✔ · B2.3 #6 ✔ · B2.4 #7 ✔ · B2.5 #8 → agora
MR: — · Fora do escopo: tudo que não é filha de #2
```

## 11. Execução — `/implement-task B2` (Claude Code)

Uma sessão por spec (um painel do Alethe cada, em paralelo se quiser), **sempre na raiz do workspace** — de lá ela enxerga `<projeto>-api/` e `<projeto>-frontend/`. Escolha o modo ao abrir (`docs/agents/orchestration.md`):

```powershell
cd <workspace>
claude          # seu plano (padrão)
claude-pago     # quando o plano apertar: OmniRoute, DeepSeek → Luna
claude-free     # último recurso: combos gratuitos
```

**Qual fatia rodar:** o mapa, `specs/README.md` — a que tem todas as dependências feitas (mergeadas em `dev`).

```
/implement-task B2                  # a fatia inteira: o que falta, review e MR (o normal)
/implement-task B2.5                # só essa filha (refazer uma task específica)
/implement-task B2 — <instrução>    # com contexto seu (ex.: "corrigir: o critério 3 vale como na spec")
/implement-task                     # a próxima fatia desbloqueada do mapa (ele diz qual escolheu)
```

**Um comando só leva a fatia das tasks até a MR aberta.** Você não chama o `/code-review` nem repassa FAIL. O que acontece, em ordem:

1. **Fecha as fatias já mergeadas** (issues e mapa), se houver.
2. **Cabeçalho**: fatia, filhas (✔ feitas, → próxima), branch, MR e o que está fora do escopo.
3. **Branch** `feature/b2-<slug>` a partir de `origin/dev` em cada repositório que a fatia toca (ou retoma a que existe).
4. **Cada filha que falta**, na ordem do `Blocked by`: TDD (teste vermelho antes do código), testes da task com filtro, suite completa uma vez, **commit** `… (B2.N · workspace#n)` na branch e uma nota na filha no GitLab com o sha. Modo `claude`: o próprio pai implementa. Modo pago/free: subagente executor + `review` por task.
5. **`/code-review`** (Standards + Spec, contra `origin/dev`) assim que não sobra filha.
6. **FAIL → ele corrige sozinho** (commit `fix: … (B2.N · …)`) e revisa de novo, no máximo 2 rodadas.
7. **PASS → entrega**: prova `.code-review-ok.json`, **push** e **MR pra `dev`** com título `B2 — …`. A descrição traz tasks, commits, suposições e "Como testar". Ele também deixa uma nota na mãe com o link.
8. **Relatório** fixo + notificação:

```
B2 — PRONTA PARA SUA REVISÃO          (ou: B2 — PAROU: precisa de você)
MR: <link> (dev ← feature/b2-…)  · filhas B2.1–B2.5 ✔ · review PASS na rodada 1
Suposições: …
Você agora: abrir a MR, testar, aprovar e mergear — ou comentar na MR e rodar /implement-task B2
```

**Acompanhar pelo GitLab, sem olhar o terminal.** Os commits só sobem no fim, com a MR. Até lá, o andamento aparece na própria issue-mãe, que ganha este bloco na descrição, atualizado a cada passo:

```markdown
### Execução
- [x] B2.1 #4 — `0b4bd79`
- [x] B2.2 #5 — `86dd9db`
- [x] B2.3 #6 — `8707df5`
- [ ] B2.4 #7 — em andamento
- [ ] B2.5 #8
- [ ] Review
- [ ] MR
```

- Na **lista de issues** do workspace, cada mãe mostra a contagem do checklist ("3 of 7"). Com A, B, C e D rodando em paralelo, você vê as quatro numa tela só.
- Nos **Child items** da mãe, a filha que está sendo feita tem a label `em-andamento`, e cada filha terminada tem uma nota com o sha.
- Se ele **parar**, a linha vira `⚠ parou: <motivo>`: dá pra ver o problema sem abrir o terminal.

**Quando ele para e devolve pra você** (o relatório diz `PAROU` e a nota vai na mãe):

| Motivo | O que você faz |
|---|---|
| working tree sujo num repositório da fatia | comita ou descarta o que é seu, roda `/implement-task B2` de novo |
| filha bloqueada (`Blocked by` de outra fatia não feita) | roda a outra fatia antes |
| review FAIL depois de 2 rodadas de correção | lê os achados no relatório: spec ambígua → corrige a spec; achado com o qual ele discorda → decide e roda `/implement-task B2 — <decisão>` |
| spec ambígua ou contrato inventado | responde a pergunta exata do relatório |

Em qualquer caso, ele retoma de onde parou: filha feita = commit dela na branch.

O que observar durante a execução:
- teste escrito **antes** do código e congelado — asserção afrouxada pra passar é quebra de regra, interrompa;
- as **Suposições** no relatório: suposição errada é a origem da maioria dos retrabalhos;
- modo pago/free sem resposta → OmniRoute fora (`node omniroute-config.mjs diff` no `ai-infra`).

**Pronto quando:** o relatório diz `PRONTA PARA SUA REVISÃO` e a MR está aberta.

## 12. Sua revisão da MR e o merge

Tudo acontece no GitLab, na MR `B2 — …` do repositório de código (`<projeto>-api` e/ou `<projeto>-frontend`, uma MR em cada):

1. **Lê** a descrição: tasks com commits, achados de julgamento não corrigidos e suposições.
2. **Testa** pelo "Como testar" da descrição: `git -C <projeto>-api switch feature/b2-…`, sobe a aplicação e percorre os critérios da spec. Fatia com tela: `/impeccable critique|audit` contra o localhost (Parte 2, passo 8).
3. **Decide:**
   - **Está bom** → aprova e mergeia em `dev`. Fatia que toca API e front: mergeia a da API primeiro.
   - **Precisa mudar** → comenta na MR (no código ou na conversa) e roda `/implement-task B2`. Ele lê os comentários não resolvidos, corrige, revisa de novo, faz push na mesma MR e responde cada comentário com o sha. Você confere e resolve os comentários.
4. **Depois do merge, nada.** O próximo `/implement-task` ou `/to-spec` (de qualquer fatia) fecha a mãe e as filhas no GitLab e marca a fatia como feita no mapa. A MR vai pra `dev`, que não é o branch padrão, então o `Closes` do GitLab não fecharia as issues sozinho.

Próxima etapa: a próxima fatia do mapa (`/to-spec <fatia>` se ainda não tem spec, `/implement-task <fatia>` se já tem tickets). Quando todas as fatias da rodada estiverem em `dev`, passo 13.

## 13. Esteira — tag e promoção

Quando todas as specs da rodada estiverem em `dev`: tag `vX.Y.Z-rcN` → `dev → qa` (merge direto por tag) → agente `qa` testa → MR `qa → hml` (aprovação humana) → MR `hml → main` + tag final `vX.Y.Z`. Detalhe: `ai-base/docs/agents/esteira-deploy.md` e `ai-pipeline/template-ci/docs/fluxo-de-tags.md`. API promove antes (ou junto) do frontend que depende dela.

---

# Parte 2 — O processo: o ciclo de cada fatia

Os passos 0–4 se fazem **uma vez por projeto**. Daqui pra frente, todo trabalho é o mesmo ciclo, repetido fatia por fatia. O que muda entre fatias é só o conteúdo, nunca a ordem.

## Quem faz o quê

| Quem | Papel | Onde |
|---|---|---|
| **Você** | Decide, aprova e valida. É o único que aprova spec, merge e design | — |
| **Claude Code** | Pensa e executa: discovery, arquitetura, ADR, spec, tickets, bootstrap, design system; na execução (`/implement-task`) é o agente-pai; depois o `/code-review` | `claude`/`claude-pago`/`claude-free` na raiz do workspace, um painel do Alethe por spec |
| **Subagentes** | `data`, `backend`, `front`, `ui`, `tests`, `security`, `review` (`.claude/agents/`), contexto limpo por task | chamados pelo `/implement-task`, nunca por você |

Regra prática: **o modo é escolha de custo, não de papel** — o processo é o mesmo em `claude`, `claude-pago` e `claude-free`.

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
 │  4. Tickets           /to-tickets B2  → filhas B2.1…B2.N no GitLab
 │     ✋ VOCÊ: confere os Child items e o "Blocked by"
 │  5–6, 9–10.           /implement-task B2             Claude + subagentes
 │     (LLM: branch feature/b2-… → filhas com TDD, commit cada → /code-review
 │      → corrige FAIL sozinho → push → MR pra dev → relatório + notificação)
 │     ✋ VOCÊ: só se ele PARAR (o relatório diz a decisão que falta)
 │  7. Ver funcionando   na branch da MR: ng serve / dotnet run
 │     ✋ VOCÊ: testa o fluxo da spec na mão
 │  8. Design (se tem tela) /impeccable critique|audit contra o localhost
 │     ✋ VOCÊ: compara com as referências e aprova o visual
 │     ✋ VOCÊ: aprova e mergeia a MR — ou comenta e roda /implement-task B2
 │     (LLM, no próximo comando: fecha mãe + filhas, marca o mapa)
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

Confira no GitLab: as tasks aparecem em "Child items" da issue-mãe, `Blocked by:` correto em cada uma, label de área e `ready-for-agent` em todas (a label diz "aprovada pra agente"; a ordem quem dá é o `Blocked by:`).

### 5–6. Execução (Claude Code)

```powershell
cd <workspace>
claude        # ou claude-pago / claude-free
```

```
/implement-task B2                  # ou vazio: próxima fatia desbloqueada do mapa
```

Ele vai do cabeçalho até a MR aberta (passo 11). O que observar em cada hop, e o que fazer:

| Sinal | O que significa | O que você faz |
|---|---|---|
| subagente devolve Completado / Arquivos / Suposições / Para o pai | normal | lê as **Suposições**: suposição errada é a origem da maioria dos retrabalhos |
| `tests` escreve teste antes do código | TDD funcionando | — |
| asserção afrouxada, `skip`, teste comentado | quebra da regra | interrompe; isso é FAIL mesmo que o `review` deixe passar |
| `review` FAIL uma vez | normal | deixa o pai reabrir o executor |
| `review` FAIL de novo | spec ou contrato ambíguo | **para**; volta pro Claude Code e corrige a spec, não o agente |
| subagent "inventou" contrato de API | falta contrato | registra no ticket; nunca aceite formato inventado |
| `claude-pago`/`claude-free` sem resposta | OmniRoute fora | `node omniroute-config.mjs diff` no `ai-infra` |

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

### 9. Review (dentro do `/implement-task`)

Você não chama. Quando não sobra filha, o `/implement-task` roda o `/code-review` em dois eixos paralelos: padrão do repositório (ADRs, `CLAUDE.md` do componente) e conformidade com a spec, incluindo o diff dos testes. O ponto fixo é `origin/dev`, ou seja, todas as filhas da fatia de uma vez. FAIL → ele corrige e revisa de novo (até 2 rodadas); só depois disso para e te devolve. Superfície sensível (auth, sessão, segredo, dependência nova) → `/security-review` também. Quer revisar à mão? `/code-review B2` na raiz do workspace.

### 10. Entrega

- PASS → o próprio Claude Code grava a prova, faz push da branch e abre a MR `B2 — …` pra `dev` (sem template-ci). Você não roda git nenhum. Com o template-ci ligado, o job `verify-code-review` confere a prova e quem abre a MR é o CI.
- Você revisa, testa e mergeia (passo 12). Depois do merge, a fatia fecha sozinha no próximo comando.
- Publicação (tags/qa/hml/prod) é o passo 13 e só entra quando você decidir.

### 11. Retro

Depois de cada fatia, nos primeiros projetos sempre: `/retro`. O que falhou vira ajuste **no lugar certo**: regra de processo → `ai-base`; prompt de subagente → `.claude/agents/*.md` (e depois no `ai-base`); decisão do projeto → ADR. Nunca corrigir só "na conversa".

## Paralelismo

Specs sem dependência entre si rodam ao mesmo tempo, uma sessão do Claude Code por spec no Alethe, cada uma na sua branch. Você continua sendo o gargalo das aprovações. Comece com uma de cada vez até confiar nos sinais da tabela acima.

---

# Parte 3 — Primeira rodada da Esteira: frontend

Objetivo desta rodada: **testar o processo** (grill, arquitetura, orquestração com subagentes, review, design) construindo o frontend. Sem template-ci, sem publicação.

Material que já existe no workspace (`ai-pipeline/esteira/`):
- `docs/adr/0001`–`0007`: decisões tomadas (paginação, erros, BFF, stack e arquitetura do front, config em runtime, cadastro de aplicações).
- `docs/referencias/tce-fluxo-deploy/`: telas e código do fluxo-deploy do TCE (o que você me mandou na conversa de 2026-10-21), com o que manter e o que não copiar.
- `specs/README.md`: ordem das fatias.

Ordem:

| # | Fatia | Quem | O que você testa nela |
|---|---|---|---|
| 1 | **F0 — Bootstrap do frontend** (fundação, passo 7) | Claude Code | sem spec: direto das ADRs; Claude faz `ng new` (Angular 22, zoneless, Vitest, spartan/ui, Tailwind 4, estrutura da ADR-0005, `public/config.json`, `proxy.conf.json` pra `/api`, `esteira-frontend/CLAUDE.md`) |
| 2 | **D0 — Design system** (fundação, passo 8) | Claude Code + `impeccable` | `/impeccable init` com a direção de `docs/referencias/visual/` (maduro, nível GitLab; as telas do TCE são só referência funcional); tokens no `src/styles.css` (`@theme` + variáveis do spartan); uma página de amostra pra você aprovar |
| 3 | **F0.5 — Shell + sessão** | `/implement-task` (`front`, `ui`, `review`) | **primeira orquestração**: layout (sidebar + header da tela 01), `auth.service`, guards, interceptors de sessão e erro |
| 4 | **F1 — Lista e criação de fluxo** | `/implement-task` | spec com EARS de domínio; smart/dumb; tabela paginada (ADR-0002) |
| 5 | **F2 — Detalhe + steps-bar + rotas por etapa** | `/implement-task` | componente dumb puro, serviço com escopo de rota |
| 6 | **F3 — Deploys, análises e modal de artefatos** | `/implement-task` | densidade de dashboard, design das severidades |

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

Depois, na mesma sessão, o design system (passo 8) e a página de amostra para você aprovar. Só então começam as specs: F0.5 primeiro (primeira orquestração com `/implement-task`).

---

## Onde a Esteira está (2026-10-23)

| Passo | Estado |
|---|---|
| 0 | ok (infra, Claude Code + modos, OmniRoute, `glab`; `pi.dev` removido em 2026-10-24) |
| 1 | ok — `esteira-workspace`, `esteira-api`, `esteira-frontend` no grupo `orchestration-ai/ai-pipeline/esteira` |
| 2 | ok — workspace em `ai-pipeline/esteira/`, publicado em `main` (remote HTTPS) |
| 3 | infra criada (manifesto, `verify` verde): banco `esteira` (`esteira_owner`/`esteira_app`), vhost `esteira`, Redis `esteira:*`, realm `esteira` + client `esteira-api` + usuário `dev`, `/metrics` na 5105. Código adequado ao contrato na fatia 00 (mergeada em `dev` da `esteira-api`) |
| 4 | ok — skills instaladas no workspace (`.claude/skills`, `impeccable`); MCP do GitLab conectado |
| 6 | ADRs 0001–0016 (0015: spartan/ui no lugar do PrimeNG); referências do TCE em `docs/referencias/tce-fluxo-deploy/` |
| 7 | F0 (frontend) mergeada em `dev`; M0 (API) mergeada em `dev` |
| 8 | D0 feito (`DESIGN.md`, `PRODUCT.md`, tokens no `styles.css`, protótipos em `docs/design/prototipos/`). **Falta:** mergear `feature/d0-tema` (frontend) em `dev` e `docs/d0-prototipos` (workspace) em `main` |
| 9+ | specs de B1 (#3) e B2 (#2) escritas, com tickets. **B2 em execução**: B2.1–B2.4 comitadas em `feature/b2-result-e-problem-details` (`esteira-api`), falta B2.5 → `/implement-task B2` leva até a MR. Depois: B1 → B3 → F0.5 |
