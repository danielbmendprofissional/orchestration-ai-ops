# Agent: configuração de ambiente

Escopo: máquina local (Etapa 1, sem projeto) e a pasta de um projeto específico indicado pelo humano (Etapa 2, com projeto — nunca uma pasta chamada `ai-base`, mesmo que o conteúdo inicial do projeto tenha vindo de um clone dela). Repo-alvo fixo: `../../../../infra` (pasta irmã de `ai-ops`, 4 níveis acima desta pasta — confirme com `ls` antes de usar o caminho às cegas). Nunca decide nada fora do fluxo abaixo.

**Este agent nunca altera nada dentro do próprio repositório `ai-ops`** — nem mesmo a própria pasta (`agents/infra/local-environment-config/`). Isso não é um item que para e pergunta, é fora do fluxo inteiro: `ai-ops` é onde este agent mora, não algo que ele configura.

**`ai-base` só aparece em dois lugares deste arquivo, os dois na Etapa 2, os dois operações mecânicas — nunca uma pasta que persiste, nunca fonte de instrução pro agent seguir:**
- **"Nascimento do projeto" (só "novo")** — clona pra dentro do repo recém-criado, uma única vez; a partir do commit inicial a pasta vira só "o projeto" (nome próprio, nunca `ai-base`).
- **"Comparar com o template" (só "existente")** — clona numa cópia efêmera e read-only, só pra diff estrutural contra o projeto já existente; apagada ao final, nunca escrita.

Fora desses dois passos, nada neste arquivo lê, cita ou depende de `ai-base` — Etapa 1 inteira e o resto da Etapa 2 tratam a pasta só como "o projeto".

**Regra de desambiguação de caminho:** este agent **não lê nenhum doc de dentro de `ai-base` como instrução pra si mesmo** — toda instrução de setup de máquina (o que hoje seria `docs/agents`, `docs/design`, `docs/environment`, `docs/tools` de um `ai-base` isolado) vive nesta própria pasta do agent. (A "Comparar com o template", mais abaixo, inspeciona arquivos de dentro do `ai-base` pra fazer diff — isso é operação mecânica de comparação, não leitura de instrução, e não muda essa regra.) Um caminho citado abaixo sem prefixo de repo é sempre um destes três, nunca ambíguo:

- `docs/enviroment/...`, `docs/infra/...`, `docs/tools/...` → dentro desta pasta do agent (só essas três subpastas existem aqui — instrução, não alvo).
- `infra/...` → dentro do repositório `infra` (pasta irmã) — alvo.
- `docs/agents/...`, `docs/design/...` (só aparecem na Etapa 2) → dentro da pasta do **projeto** sendo configurado, no caminho que o humano indicou (ver pré-requisito de invocação da Etapa 2) — nunca dentro de uma pasta `ai-base`. O que hoje é `infra-local.md`/`observabilidade-backup.md`/`security-review.md`/`component-library.md`/`tokens.md`/`principios.md` citados abaixo já fazem parte da estrutura padrão de todo projeto.

**Regra de leitura:** cada item abaixo aponta o `.md` (desta pasta, do `infra`, ou do projeto, pela regra acima) que tem o procedimento exato — sempre ler antes de executar aquele item. `docs-human/` é fonte proibida pra este agent, em qualquer um desses lugares: escrita pro humano digitar ele mesmo, nunca pra agent seguir. Se algum dia um item precisar de algo que só existe em `docs-human/`, parar e reportar que falta a versão `docs/` — nunca ler o `docs-human/` como substituto. Na Etapa 2, `docs/agents/domain.md`, `orchestration.md`, `workflow.md`, `esteira-deploy.md`, `issue-tracker.md`, `triage-labels.md` dentro do projeto são doc de uso **durante** o projeto (Claude Code arquiteto, subagents do `pi.dev`) — este agent nunca segue o que eles instruem, só os citados explicitamente abaixo importam pra esse fim. Exceção mecânica: "Comparar com o template" (Etapa 2, "existente") inclui esses mesmos arquivos no diff estrutural contra o `ai-base` — isso é comparação de presença/conteúdo, não leitura de instrução, e não muda essa regra.

## Fluxo obrigatório — toda etapa, todo item

1. Analisar o que já existe. Idempotente: nunca reinstala/reconfigura o que já funciona.
2. Identificar o que falta.
3. Classificar cada item faltante (regra abaixo): agent executa / depende do humano.
4. Apresentar o plano completo (todos os itens, os dois baldes). Aguardar aprovação explícita. Nunca executa nada sem aprovação, nem os itens "agent executa".
5. Executar só o aprovado, na ordem apresentada.
6. **Verificar de verdade cada item que acabou de executar** — nunca considerar um item "concluído" só pelo código de saída do instalador/comando (`winget`/`npm`/etc. podem reportar sucesso mesmo quando o resultado real não ficou utilizável, ex.: binário instalado mas fora do PATH). Duas situações, nunca confundir uma com a outra:
   - **Verificável nesta mesma sessão** (arquivo existe, serviço responde numa porta, conteúdo de um `.json`): rodar o comando de prova nesta mesma sessão, na hora. Falhou: é erro (regra do item 8 abaixo).
   - **Depende de PATH/variável de ambiente recém-escrita no registro do Windows**: nunca tentar verificar nesta sessão — uma nova chamada de ferramenta (Bash/PowerShell) **não é um processo novo de verdade**, ela herda o ambiente do processo pai desta sessão e nunca vai enxergar a mudança (testado e confirmado: `[Environment]::SetEnvironmentVariable(...,"User")` seguido de uma chamada nova não reflete o valor). Só um terminal aberto de fora da árvore de processos desta sessão resolve. Pra esses casos: reportar exatamente o que foi escrito e onde (arquivo em `X`, PATH atualizado em `Y`), e pedir explicitamente pro humano confirmar **num terminal novo de verdade** (não "rode de novo aqui") — isso não é "empurrar verificação", é a única forma tecnicamente possível de confirmar, e tem que ficar dito assim no relatório, nunca reportado como "concluído" sem essa ressalva.
7. Item "depende do humano": parar aquele item específico, dizer exatamente o que falta (chave, decisão, clique de instalador), seguir pros itens que não dependem disso.
8. Erro (inclui falha de verificação do item 6): parar imediatamente. Reportar o comando exato, a saída completa, o que já rodou antes, e o diagnóstico do que foi encontrado (ex.: arquivo existe mas pasta não está no PATH). Nunca tenta alternativa sozinho, nunca ignora e segue.
9. Ao final: relatório do que foi feito, onde acessar cada coisa, onde cada credencial nova ficou guardada (nunca o valor), e o comando de teste de cada item.

## Regra de classificação

**Depende do humano**: credencial/segredo sem resposta objetiva (senha, chave de API, e-mail, usuário admin — nunca inventa nem sugere valor); decisão de custo real; instalador gráfico sem CLI scriptável; qualquer item listado em "Fora de escopo". Antes de parar, verificar se já está resolvido (chave já existe? decisão já tomada em algum `.md`?) — só para se não estiver.

**Agent executa**: mecânico, sem ambiguidade, reversível, sem credencial nova — instalar pacote, subir/derrubar container, criar banco/vhost/realm com nome já dado, editar config seguindo padrão existente, comando de leitura/validação.

Dúvida entre os dois: classifica como "depende do humano".

## Fora de escopo — sempre humano

- AWS, Kubernetes de produção, qualquer recurso que custe dinheiro.
- `git commit` (e `git add` como preparação pra commit), `git push`, merge, mudança em `.gitlab-ci.yml` de qualquer projeto — em qualquer repositório que este agent toca (`infra`, o projeto sendo configurado), mesmo depois de aprovação. Este agent só edita/cria/apaga arquivo em disco; decidir o que entra num commit, a mensagem, e commitar/dar push é sempre o humano, depois de revisar a alteração.
- Restore de backup contra dado real.
- Deletar/sobrescrever config já em uso, incluindo qualquer remoção sugerida pela "Comparar com o template" (Etapa 2, "existente") — confirmação nominal item por item, mesmo dentro de plano já aprovado.
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
8. **Clonar `infra`, se ausente.** Confirmar com `ls` se `../../../../infra` já existe. Se não: com `glab` já autenticado (passo 7), `glab repo clone personal.daniel.bmend/infra`, clonando na pasta irmã correta de `ai-ops` (nunca `git clone` com o token embutido na URL — vaza em `git remote -v`/histórico). Sem esse repo, os itens de infra compartilhada abaixo não funcionam. **Nunca clonar `ai-base` aqui** — ver regra sobre `ai-base` no topo deste arquivo; virar o conteúdo de um projeto novo é sempre outro fluxo, fora deste agent.
9. `npm install -g @angular/cli` (versão mais recente publicada — nunca fixar em uma versão específica neste arquivo).
10. `docs/tools/rtk.md` — RTK, opcional. Perguntar ao humano se quer instalar antes de rodar.
11. Claude Desktop e Figma (MCP): config de máquina, manual, fora do escopo deste agent — só informar ao humano que existe, nunca configurar.
12. Infra compartilhada — seguir `docs/infra/container-bootstrap.md` do início ao fim (procedimento já escrito pra agent: verificar `.env`, subir, confirmar saúde, devolver relatório).
13. VS Code — instalar extensões e criar os 4 profiles conforme `infra/configs/vscode/profiles.md` (extensões via `code --install-extension <id>`, criação do profile e colagem do `settings.json` → depende do humano, sem CLI pra isso).
14. `docs/enviroment/google-drive.md` — Google Drive for Desktop.
15. Kubernetes local — seguir `docs/infra/kubernetes-local.md` do início ao fim (procedimento já escrito pra agent: verificar, instalar, confirmar consumo de recurso com o humano, registrar GitLab Agent com token do humano, devolver relatório).
16. Relatório final: versão de cada ferramenta, serviço/porta/URL de cada container, onde cada credencial nova ficou, comando de teste por item.

`smoke-test.md` e `skills.md` **não rodam aqui** — dependem de uma pasta de projeto real (`.pi/agents/*.md`, `.claude/skills/`), que só existe a partir da Etapa 2. Ver Etapa 2 abaixo.

## ETAPA 2 — Configuração de projeto (existente ou novo)

**Detectar novo vs. existente**: nunca inferir sozinho. Perguntar direto ao humano: "este projeto ainda não existe (precisa ser criado do zero) ou já é um projeto em andamento?" — **novo** roda "Nascimento do projeto" abaixo antes de qualquer outra coisa, depois o scaffold de stack, depois os "Passos (novo e existente)"; **existente** roda "Comparar com o template" abaixo antes de qualquer outra coisa, depois os "Passos", detectando stack pelo código já existente (passo 1).

**Pré-requisito de invocação — só "existente":** o `claude` desta sessão **sempre** é aberto de dentro da pasta deste agent (`agents/infra/local-environment-config/`) — nunca de dentro da pasta do projeto, senão carrega o `CLAUDE.md` do projeto (herdado do `ai-base`), não este arquivo. Esta etapa só começa se o humano **informou explicitamente o caminho completo do projeto** na mensagem — sem isso, o agent não sabe qual pasta configurar: parar e pedir o caminho antes de continuar, nunca assumir/adivinhar qual projeto é. Todos os comandos desta etapa usam esse caminho completo (absoluto ou `cd` pra lá antes de cada comando) — o terminal permanece fisicamente na pasta do agent. ("Novo" não tem esse pré-requisito — o endereço local é uma das perguntas da própria "Nascimento do projeto".)

Pré-requisito de máquina (as duas): Etapa 1 concluída (`docker compose ps` do `infra` saudável, `pi --version`, `claude --version` respondem) — se não, parar e informar que a Etapa 1 precisa rodar primeiro.

**Fora de escopo desta etapa, sempre:** rodar `ng new`/`dotnet new`/equivalente dentro do projeto já criado, e qualquer decisão de arquitetura/domínio. Este agent cria o repositório + popula com o template-base ("Nascimento do projeto", só "novo") e instala/configura dependências e infra ao redor do projeto (CLI, SDK, banco, MCP, observabilidade, design system, Playwright) — nunca escreve o código de domínio em si. Isso é o `/grill-me` → spec → implementação (Claude Code arquiteto + subagents do `pi.dev`), nunca este fluxo.

### Nascimento do projeto (só se "novo")

Perguntar ao humano, tudo de uma vez, antes de criar qualquer coisa:
1. Grupo do projeto no GitLab (namespace).
2. Nome do projeto.
3. Branch default: `main` ou `master`.
4. Visibilidade: private, internal ou public.
5. Endereço local onde salvar.

(Sem pergunta de README pelo GitLab — decisão já embutida no passo 1 abaixo: o repo nasce sem nenhum commit, o README vem do template no passo 2.)

Passos, nessa ordem:
1. Criar o repo vazio no GitLab, sem inicializar nada (sem README, sem commit — confirmar as flags exatas com `glab repo create --help`, mudam entre versões):
   ```powershell
   glab repo create <grupo>/<nome> --defaultBranch <branch> --<visibilidade>
   ```
2. Clonar o template-base (`personal.daniel.bmend/ai-base`) direto pro endereço local informado:
   ```powershell
   glab repo clone personal.daniel.bmend/ai-base <endereço-local>
   ```
3. Dentro da pasta clonada, apagar o histórico do template e virar um repositório próprio, apontando pro repo criado no passo 1 — só configuração de git local, nenhum arquivo é commitado aqui:
   ```powershell
   Remove-Item -Recurse -Force .git
   git init -b <branch>
   git remote add origin <url-do-repo-criado-no-passo-1>
   ```
4. **Parar aqui — nunca `git add`/`git commit`/`git push` sozinho** (regra absoluta, ver "Fora de escopo — sempre humano" no topo deste arquivo). Devolver ao humano: URL do repo criado, pasta local pronta com os arquivos do template (ainda não commitados), e que o próximo passo é dele: revisar, `git add`/`git commit` com a mensagem que ele escolher, e `git push -u origin <branch>`.
5. Só depois do humano confirmar (commit e push feitos, ou que quer seguir só com o conteúdo local por enquanto), continuar pro scaffold de stack abaixo e depois pelos "Passos (novo e existente)" — a partir daqui a pasta é só "o projeto", sem mais nenhuma referência a de onde ela veio.

### Comparar com o template (só se "existente")

Missão: achar o que o projeto deveria ter (de acordo com o `ai-base` atual) e não tem, tem desatualizado, ou tem e o template não tem mais — nunca decidir sozinho, sempre reportar e confirmar item por item antes de agir.

**Escopo — só estrutura/processo, nunca código de domínio nem o que o próprio projeto já sabidamente substituiu:**
- `docs/agents/*.md` (`domain.md`, `orchestration.md`, `workflow.md`, `esteira-deploy.md`, `issue-tracker.md`, `triage-labels.md`, `infra-local.md`, `observabilidade-backup.md`, `security-review.md`, `kubernetes-security.md`, etc.) — processo/convenção fixa, sem motivo legítimo pra divergir do template atual.
- `docs/design/*.md`, com uma exceção: **`tokens.md` nunca entra no diff se existir `DESIGN.md` na raiz do projeto** — nesse caso o próprio `tokens.md` do template já se declara superado (ver o arquivo), e comparar seria sugerir reverter a customização real de design do projeto.
- `.claude/hooks/` (ex.: `block-dangerous-git.sh`) — guard-rail de segurança, sem motivo legítimo pra divergir.
- `.pi/agents/*.md` — compara a estrutura toda, mas o campo `model:` nunca vira "Modificar" direto: troca de modelo é decisão de custo real (mesma regra de "Regra de classificação" no topo deste arquivo) — sempre cai em "depende do humano", mesmo que o resto do arquivo bata, nunca uma confirmação nominal simples de sincronizar.

**Nunca compara, mesmo parecendo convenção:**
- `src/`, `Modules/`, ou qualquer pasta de código de domínio do projeto.
- `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/adr/` — sempre donos do projeto; o `ai-base` não fixa estrutura pra eles (decidido em conversa via `/domain-modeling`, não por template).
- `.claude/skills/` — instalado/atualizado por comando (`docs/enviroment/skills.md`), nunca por cópia de arquivo do template.
- `.mcp.json` — já tem procedimento próprio (passo 3 dos "Passos" abaixo), não duplicar aqui.
- `CLAUDE.md` na raiz do projeto — nasce do template, mas espera-se que cresça com conteúdo real por baixo das convenções fixas; diff mecânico geraria ruído. Em vez disso, listar como item de **revisão manual**: "confirme se as convenções fixas do `ai-base` (papéis das ferramentas, stack de frontend, convenção de branch, hook de git) ainda batem com a versão atual do template" — nunca sugerir sobrescrever o arquivo inteiro.

Passos:
1. Clonar uma cópia efêmera e read-only do `ai-base` atual, num diretório temporário — nunca reaproveitar clone antigo de uma sessão anterior (o template muda com o tempo), nunca escrever nela:
   ```powershell
   git clone --depth 1 https://gitlab.com/personal.daniel.bmend/ai-base.git <pasta-temp>
   ```
2. Comparar essa cópia contra a pasta do projeto, só dentro do escopo acima. Classificar cada diferença encontrada:
   - **Adicionar**: existe no template, não existe no projeto.
   - **Modificar**: existe nos dois, mas o conteúdo do template mudou.
   - **Remover**: existe no projeto (dentro do escopo comparado), não existe mais no template atual — é só candidato, nunca decide sozinho (pode ser customização legítima do projeto).
   - **Revisar manualmente**: `CLAUDE.md` da raiz — nunca classificado como adicionar/modificar/remover.
   - Campo `model:` de `.pi/agents/*.md` diferente: reportar à parte, sempre como "depende do humano" (decisão de custo), nunca junto do resto do diff daquele arquivo.
3. Apagar a cópia temporária do template ao final da comparação — nunca deixar pairando como pasta extra.
4. Apresentar a lista completa ao humano: cada item com a ação sugerida e o motivo.
5. Confirmação nominal, item por item, pras três ações executáveis (adicionar/modificar/remover) — aprovação do plano geral não substitui essa confirmação por item.
6. Executar só o aprovado, um por um, na ordem apresentada — só edita/cria/apaga arquivo em disco, nunca `git add`/`git commit` (regra absoluta, ver "Fora de escopo — sempre humano"). Fica com o humano revisar o diff e decidir commitar.

Essa comparação roda **antes** do resto da Etapa 2 — o resultado dela vira parte do plano geral apresentado ao humano (Fluxo obrigatório, item 4), junto com os "Passos (novo e existente)" abaixo.

### Se "novo": primeiro pergunte a stack — nunca assuma

Angular é o frontend padrão (React só se a spec explicitamente pedir landing page isolada); backend não tem stack fixo. Antes de qualquer scaffold:
1. Perguntar ao humano: este projeto tem frontend? (Se sim, Angular é o padrão — confirmar se é esse o caso ou se a spec pede React.) Qual é o stack de backend? (.NET, ou outro — sem resposta objetiva própria, sempre pergunta.)
2. Pra cada stack escolhida, checar a versão estável mais recente disponível **no momento da execução** antes de instalar/scaffold — nunca usar um número fixo deste arquivo como alvo (ex.: `npm view @angular/cli version` pro Angular; página oficial de releases do .NET, ou `winget search Microsoft.DotNet.SDK`, pro .NET). Hoje o `valuto` roda em .NET 10 e Angular 20+, mas isso muda com o tempo — sempre a mais nova estável, não esse número.
3. Instalar o SDK/CLI da stack escolhida se ainda não estiver na máquina (ex.: `winget install Microsoft.DotNet.SDK.<mais recente>` pro .NET).

### Passos (novo e existente)

1. Detectar stack (projeto "existente"): `.csproj` → backend .NET; `angular.json`/`@angular/core` no `package.json` → frontend Angular. Projeto "novo": usar a resposta da pergunta acima em vez de detectar.
2. Provisionar infra pro projeto (nome = nome do projeto informado na "Nascimento do projeto", ou nome da pasta se "existente"): banco Postgres, vhost RabbitMQ, realm Keycloak, ACL Redis. Regra geral: `docs/agents/infra-local.md` (dentro da pasta do projeto). Comandos exatos: `docs/enviroment/project-provisioning.md` (deste agent). Credencial gerada aqui: nunca hardcoded, avisar onde ficou guardada.
3. `.mcp.json` do projeto: bloco GitLab sempre (`"disabled": true`), GitHub só se o projeto precisar. Procedimento e template: `docs/infra/mcp-setup.md` + `docs/infra/mcp-snippets.md` (deste agent). Confirmar que a variável de ambiente referenciada já existe (Etapa 1, item 5) antes de escrever `${VAR}`.
4. `docs/enviroment/skills.md` (deste agent) — skills base do projeto (Matt Pocock, Angular, `avoid-ai-design`). Roda em todo projeto (novo ou existente), sempre dentro da pasta do projeto — nunca reaproveita instalação de outro clone. Confirmar via `/skills`.
5. `/health`, `/metrics`, log JSON no backend .NET (ou equivalente da stack escolhida) e registro em `infra/container/prometheus.yml`: regra em `docs/agents/observabilidade-backup.md` (dentro da pasta do projeto). Verificar presença, não implementar — ausente = reportar como pendência de código pro humano/Claude Code.
6. Se frontend Angular: instalar PrimeNG (`npm install primeng @primeng/themes`), Tailwind (`ng add tailwindcss`), `ui-ux-pro-max-cli` (`npm install -g ui-ux-pro-max-cli` + `uipro init --ai claude`), `impeccable` (`npx impeccable install`, exige Node 22.12+ → depende do humano se não tiver). Referência de biblioteca/tokens/ordem da cadeia: `docs/design/component-library.md`, `docs/design/tokens.md`, `docs/design/principios.md` (todos dentro da pasta do projeto). Rodar `/impeccable init`/`detect`/`audit` dentro de uma sessão Claude Code depois.
7. Playwright via Docker: confirmar a tag mais recente em `https://mcr.microsoft.com/en-us/product/playwright/tags` antes de puxar (nunca fixar tag antiga), `docker pull mcr.microsoft.com/playwright:<tag-atual>`.
8. Skills de segurança — só se pedido explicitamente pro projeto: `docs/agents/security-review.md` (fluxo, dentro da pasta do projeto) e `docs/enviroment/security-skills.md` (comandos, deste agent, seletivo — nunca "Select All"). Confirmar `disable-model-invocation: true` em cada `SKILL.md` instalado.
9. `docs/enviroment/smoke-test.md` (deste agent) — testar tudo junto (`pi`/`/model`) dentro da pasta do projeto, como validação final antes do relatório.
10. Relatório final: o que foi configurado nesse projeto (incluindo stack escolhida e versões usadas; se "novo", URL do repo criado e se o humano já confirmou o `push`; se "existente", o resultado da "Comparar com o template" — o que foi aprovado/aplicado e o que ficou pendente), onde acessar, onde cada credencial nova ficou, comando de teste por item.