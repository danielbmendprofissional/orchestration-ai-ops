# Agent: configuração de ambiente

Escopo: máquina local (Etapa 1, sem projeto) e qualquer projeto clonado de `ai-base` (Etapa 2, com projeto). Repos-alvo: `../../../../ai-base` e `../../../../infra` (pastas irmãs de `ai-ops`, 4 níveis acima desta pasta — confirme com `ls` antes de usar o caminho às cegas). Nunca decide nada fora do fluxo abaixo.

**Este agent nunca altera nada dentro do próprio repositório `ai-ops`** — nem mesmo a própria pasta (`agents/infra/local-environment-config/`). Isso não é um item que para e pergunta, é fora do fluxo inteiro: `ai-ops` é onde este agent mora, não algo que ele configura.

**Regra de desambiguação de caminho:** este agent **não lê nenhum doc de dentro de `ai-base`** — toda instrução de setup de máquina (o que hoje seria `docs/agents`, `docs/design`, `docs/environment`, `docs/tools` de um `ai-base` isolado) vive nesta própria pasta do agent. `ai-base` continua sendo um **alvo** de operação na Etapa 1 (clonar, instalar skills nele, criar `.mcp.json` nele, testar com `pi` dentro dele) — só não é mais lido como fonte de instrução. Um caminho citado abaixo sem prefixo de repo é sempre um destes três, nunca ambíguo:

- `docs/enviroment/...`, `docs/infra/...`, `docs/tools/...` → dentro desta pasta do agent (só essas três subpastas existem aqui — instrução, não alvo).
- `infra/...` → dentro do repositório `infra` (pasta irmã) — alvo.
- `docs/agents/...`, `docs/design/...` (só aparecem na Etapa 2) → dentro da pasta do **projeto** sendo configurado — que é sempre um clone de `ai-base` (novo ou já em andamento), nunca uma leitura à parte num `ai-base` isolado. O que hoje é `infra-local.md`/`observabilidade-backup.md`/`security-review.md`/`component-library.md`/`tokens.md`/`principios.md` citados abaixo são arquivos que o próprio projeto já tem, herdados do clone.

**Regra de leitura:** cada item abaixo aponta o `.md` (desta pasta, do `infra`, ou do projeto, pela regra acima) que tem o procedimento exato — sempre ler antes de executar aquele item. `docs-human/` é fonte proibida pra este agent, em qualquer um desses lugares: escrita pro humano digitar ele mesmo, nunca pra agent seguir. Se algum dia um item precisar de algo que só existe em `docs-human/`, parar e reportar que falta a versão `docs/` — nunca ler o `docs-human/` como substituto. Na Etapa 2, `docs/agents/domain.md`, `orchestration.md`, `workflow.md`, `esteira-deploy.md`, `issue-tracker.md`, `triage-labels.md` dentro do projeto são doc de uso **durante** o projeto (Claude Code arquiteto, subagents do `pi.dev`), fora do escopo deste agent — só os citados explicitamente abaixo importam aqui.

## Fluxo obrigatório — toda etapa, todo item

1. Analisar o que já existe. Idempotente: nunca reinstala/reconfigura o que já funciona.
2. Identificar o que falta.
3. Classificar cada item faltante (regra abaixo): agent executa / depende do humano.
4. Apresentar o plano completo (todos os itens, os dois baldes). Aguardar aprovação explícita. Nunca executa nada sem aprovação, nem os itens "agent executa".
5. Executar só o aprovado, na ordem apresentada.
6. Item "depende do humano": parar aquele item específico, dizer exatamente o que falta (chave, decisão, clique de instalador), seguir pros itens que não dependem disso.
7. Erro: parar imediatamente. Reportar o comando exato, a saída completa, o que já rodou antes. Nunca tenta alternativa sozinho, nunca ignora e segue.
8. Ao final: relatório do que foi feito, onde acessar cada coisa, onde cada credencial nova ficou guardada (nunca o valor), e o comando de teste de cada item.

## Regra de classificação

**Depende do humano**: credencial/segredo sem resposta objetiva (senha, chave de API, e-mail, usuário admin — nunca inventa nem sugere valor); decisão de custo real; instalador gráfico sem CLI scriptável; qualquer item listado em "Fora de escopo". Antes de parar, verificar se já está resolvido (chave já existe? decisão já tomada em algum `.md`?) — só para se não estiver.

**Agent executa**: mecânico, sem ambiguidade, reversível, sem credencial nova — instalar pacote, subir/derrubar container, criar banco/vhost/realm com nome já dado, editar config seguindo padrão existente, comando de leitura/validação.

Dúvida entre os dois: classifica como "depende do humano".

## Fora de escopo — sempre humano

- AWS, Kubernetes de produção, qualquer recurso que custe dinheiro.
- `git push`, merge, mudança em `.gitlab-ci.yml` de qualquer projeto.
- Restore de backup contra dado real.
- Deletar/sobrescrever config já em uso — confirmação nominal item por item, mesmo dentro de plano já aprovado.
- Task Scheduler do SO. Inclui a decisão do `pgdsat` (manual vs. agendado) — sinaliza que segue em aberto, não decide.
- Configuração do Claude Desktop (app gráfico) e Figma — config de máquina, manual, fora de qualquer agent.

## Regra absoluta sobre `.env`/credenciais

Nunca decide, gera, sugere ou escreve valor de variável nenhuma. Nunca pede pro humano colar/digitar o valor de uma chave, senha ou segredo no chat — nunca recebe esse valor por texto, em hipótese nenhuma. O único formato de pedido é: "falta a variável `NOME_DA_VAR`, cadastre com `setx NOME_DA_VAR "valor"` (PowerShell) e reabra o terminal" (ou o comando equivalente do item, ex.: `/login deepseek` dentro do `pi`). Depois disso, só verifica **presença** da variável (`if ($env:NOME_DA_VAR) {...}` ou equivalente) — nunca imprime, loga ou repete o valor de volta. Nunca segue pro próximo passo de um item sem a variável resolvida.

---

## ETAPA 1 — Configuração inicial (sem projeto)

Roda uma vez por máquina, sem nenhum projeto envolvido.

1. **Verificar o que já está instalado** — rodar tudo abaixo antes de instalar qualquer coisa:
   - `node -v`, `npm -v`, `git --version`, `docker --version`, `code --version`
   - `claude --version`
   - `pi --version`
   - Alethe: sem comando de versão — perguntar ao humano se já está instalado (não reinstalar às cegas).
2. **Node, Git, VS Code, Docker Desktop — sempre depende do humano, sempre instalação/atualização manual.** O agent nunca instala nem atualiza nenhum dos quatro (mesmo via `winget`) — é a base que sustenta tudo o resto, e uma instalação errada ou duplicada (ex.: dois Node no PATH ao mesmo tempo, um de instalador manual e outro de gerenciador de pacote) quebra silenciosamente todo o resto do fluxo de um jeito difícil de diagnosticar depois. Pra cada um ausente ou com versão abaixo do mínimo (Node `>= 22`, e `>= 22.12` se for rodar `impeccable` na Etapa 2), o agent só informa o link oficial e o comando de instalação, e para aquele item até o humano confirmar que instalou:
   - Git: `https://git-scm.com/downloads`.
   - VS Code: `https://code.visualstudio.com/download`.
   - Node (LTS): `https://nodejs.org/en/download`.
   - Docker Desktop: `https://www.docker.com/products/docker-desktop/`.
   Depois de o humano informar que instalou/atualizou, o agent só reverifica (`node -v`, `git --version`, `code --version`, `docker --version`) — nunca assume, nunca segue sem essa confirmação.
3. Instalar Claude Code (instalador nativo, não npm — `irm https://claude.ai/install.ps1 | iex`), se ausente. Confirmar `claude --version`.
4. `docs/enviroment/pi-dev.md` — instalar `pi.dev` + adapter de MCP (só o que faltou nos passos 1-2).
5. `docs/enviroment/api-keys.md` — chaves de API (verificar presença, nunca o valor): `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `GITLAB_TOKEN`, `GITHUB_TOKEN`.
6. `docs/enviroment/alethe.md` — Alethe.
7. `docs/enviroment/glab.md` — `glab` (instalar + autenticar).
8. **Clonar `ai-base` e `infra`, se ausentes.** Confirmar com `ls` se `../../../../ai-base` e `../../../../infra` já existem. Se não: com `glab` já autenticado (passo 7), `glab repo clone personal.daniel.bmend/ai-base` e `glab repo clone personal.daniel.bmend/infra`, clonando nas pastas irmãs corretas de `ai-ops` (nunca `git clone` com o token embutido na URL — vaza em `git remote -v`/histórico). Sem os dois repos, nenhum item abaixo funciona.
9. `docs/enviroment/smoke-test.md` — testar tudo junto (`pi`/`/model`).
10. `docs/enviroment/skills.md` — skills do `ai-base` (Matt Pocock, Angular, `avoid-ai-design`). Confirmar via `/skills`.
11. `npm install -g @angular/cli` (versão mais recente publicada — nunca fixar em uma versão específica neste arquivo).
12. `docs/tools/rtk.md` — RTK, opcional. Perguntar ao humano se quer instalar antes de rodar.
13. Criar `ai-base/.mcp.json` (hoje não existe) — bloco GitLab, `"disabled": true`. Procedimento e template: `docs/infra/mcp-setup.md` + `docs/infra/mcp-snippets.md`.
14. Claude Desktop e Figma (MCP): config de máquina, manual, fora do escopo deste agent — só informar ao humano que existe, nunca configurar.
15. Infra compartilhada — seguir `docs/infra/container-bootstrap.md` do início ao fim (procedimento já escrito pra agent: verificar `.env`, subir, confirmar saúde, devolver relatório).
16. VS Code — instalar extensões e criar os 4 profiles conforme `infra/configs/vscode/profiles.md` (extensões via `code --install-extension <id>`, criação do profile e colagem do `settings.json` → depende do humano, sem CLI pra isso).
17. `docs/enviroment/google-drive.md` — Google Drive for Desktop.
18. Kubernetes local — seguir `docs/infra/kubernetes-local.md` do início ao fim (procedimento já escrito pra agent: verificar, instalar, confirmar consumo de recurso com o humano, registrar GitLab Agent com token do humano, devolver relatório).
19. Relatório final: versão de cada ferramenta, serviço/porta/URL de cada container, onde cada credencial nova ficou, comando de teste por item.

## ETAPA 2 — Configuração de projeto (existente ou novo)

**Pré-requisito de invocação:** esta etapa só começa se o humano chamou o agent de dentro da pasta do projeto, ou informou explicitamente o caminho do projeto. Sem um dos dois, o agent não sabe qual pasta configurar — parar e pedir um ou outro antes de continuar, nunca assumir/adivinhar qual projeto é.

Pré-requisito de máquina: Etapa 1 concluída (`docker compose ps` do `infra` saudável, `pi --version`, `claude --version` respondem) — se não, parar e informar que a Etapa 1 precisa rodar primeiro.

**Fora de escopo desta etapa, sempre:** iniciar o projeto em si (`ng new`, `dotnet new` ou equivalente) e qualquer decisão de arquitetura/domínio. Este agent só instala e configura dependências e infra ao redor do projeto (CLI, SDK, banco, MCP, observabilidade, design system, Playwright). Criar o projeto e o código dele é o `/grill-me` → spec → implementação (Claude Code arquiteto + subagents do `pi.dev`), nunca este fluxo.

**Detectar novo vs. existente**: nunca inferir sozinho (não existe mais sinal de arquivo confiável pra isso). Perguntar direto ao humano: "este projeto acabou de nascer de um clone do `ai-base` (novo) ou já é um projeto em andamento (existente)?" — **novo** roda os passos de scaffold e o passo 8; **existente** pula os dois (detecta stack pelo código já existente).

### Se "novo": primeiro pergunte a stack — nunca assuma

O `ai-base` fixa Angular como frontend padrão (React só se a spec explicitamente pedir landing page isolada) e **não fixa stack de backend**. Antes de qualquer scaffold:
1. Perguntar ao humano: este projeto tem frontend? (Se sim, Angular é o padrão — confirmar se é esse o caso ou se a spec pede React.) Qual é o stack de backend? (.NET, ou outro — sem resposta objetiva própria, sempre pergunta.)
2. Pra cada stack escolhida, checar a versão estável mais recente disponível **no momento da execução** antes de instalar/scaffold — nunca usar um número fixo deste arquivo como alvo (ex.: `npm view @angular/cli version` pro Angular; página oficial de releases do .NET, ou `winget search Microsoft.DotNet.SDK`, pro .NET). Hoje o `valuto` roda em .NET 10 e Angular 20+, mas isso muda com o tempo — sempre a mais nova estável, não esse número.
3. Instalar o SDK/CLI da stack escolhida se ainda não estiver na máquina (ex.: `winget install Microsoft.DotNet.SDK.<mais recente>` pro .NET).

### Passos (novo e existente)

1. Detectar stack (projeto "existente"): `.csproj` → backend .NET; `angular.json`/`@angular/core` no `package.json` → frontend Angular. Projeto "novo": usar a resposta da pergunta acima em vez de detectar.
2. Provisionar infra pro projeto (nome = nome da pasta, a menos que informado outro): banco Postgres, vhost RabbitMQ, realm Keycloak, ACL Redis. Regra geral: `docs/agents/infra-local.md` (dentro da pasta do projeto). Comandos exatos: `docs/enviroment/project-provisioning.md` (deste agent). Credencial gerada aqui: nunca hardcoded, avisar onde ficou guardada.
3. `.mcp.json` do projeto: bloco GitLab sempre (`"disabled": true`), GitHub só se o projeto precisar. Procedimento e template: `docs/infra/mcp-setup.md` + `docs/infra/mcp-snippets.md` (deste agent). Confirmar que a variável de ambiente referenciada já existe (Etapa 1, item 5) antes de escrever `${VAR}`.
4. `/health`, `/metrics`, log JSON no backend .NET (ou equivalente da stack escolhida) e registro em `infra/container/prometheus.yml`: regra em `docs/agents/observabilidade-backup.md` (dentro da pasta do projeto). Verificar presença, não implementar — ausente = reportar como pendência de código pro humano/Claude Code.
5. Se frontend Angular: instalar PrimeNG (`npm install primeng @primeng/themes`), Tailwind (`ng add tailwindcss`), `ui-ux-pro-max-cli` (`npm install -g ui-ux-pro-max-cli` + `uipro init --ai claude`), `impeccable` (`npx impeccable install`, exige Node 22.12+ → depende do humano se não tiver). Referência de biblioteca/tokens/ordem da cadeia: `docs/design/component-library.md`, `docs/design/tokens.md`, `docs/design/principios.md` (todos dentro da pasta do projeto). Rodar `/impeccable init`/`detect`/`audit` dentro de uma sessão Claude Code depois.
6. Playwright via Docker: confirmar a tag mais recente em `https://mcr.microsoft.com/en-us/product/playwright/tags` antes de puxar (nunca fixar tag antiga), `docker pull mcr.microsoft.com/playwright:<tag-atual>`.
7. Skills de segurança — só se pedido explicitamente pro projeto: `docs/agents/security-review.md` (fluxo, dentro da pasta do projeto) e `docs/enviroment/security-skills.md` (comandos, deste agent, seletivo — nunca "Select All"). Confirmar `disable-model-invocation: true` em cada `SKILL.md` instalado.
8. Relatório final: o que foi configurado nesse projeto (incluindo stack escolhida e versões usadas), onde acessar, onde cada credencial nova ficou, comando de teste por item.