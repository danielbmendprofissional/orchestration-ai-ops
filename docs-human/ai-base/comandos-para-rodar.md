# Comandos pra rodar na sua máquina
---

## 1. Conferir pré-requisitos

**Terminal: "PowerShell" (normal, sem Administrador)**

```powershell
node -v
npm -v
git --version
```

Os três precisam responder com um número de versão (não "comando não encontrado"). Se algum faltar, me avisa antes de continuar — o resto dos comandos assume que os três já existem, já que você usa o OpenCode e o GitLab.

---

## 2. Claude Code e os modos pago/free

O Claude Code é a única ferramenta de IA (o `pi.dev` saiu em 2026-10-24). Instalar, se ainda não tiver:

```powershell
irm https://claude.ai/install.ps1 | iex
claude --version
```

Os modos `claude-pago` e `claude-free` (o mesmo Claude Code usando os combos do OmniRoute, pra quando o plano apertar) dependem do OmniRoute de pé — quem configura é o agent `local-environment-config` (`docs/enviroment/claude-modos.md`): cria `~/.claude/modos/pago.json` e `free.json` e os atalhos no seu perfil do PowerShell. Depois, num terminal novo:

```powershell
claude-pago -p "responda ok"
```

Tem que responder e avisar que outra fonte de autenticação tem precedência sobre o login do claude.ai — é a prova de que **não** usou o seu plano.

---

## 3. Autenticar Deepseek e GPT-5.6 Luna

Você vai precisar das chaves de API de cada provedor (não confundir com a assinatura que você já paga — isso aqui é a chave pra usar programaticamente):

- Deepseek: https://platform.deepseek.com/api_keys
- OpenAI (é lá que o GPT-5.6 Luna mora): https://platform.openai.com/api-keys

**Terminal: "PowerShell" (normal)** — grava a chave permanentemente pro seu usuário do Windows:

```powershell
setx DEEPSEEK_API_KEY "cole-sua-chave-deepseek-aqui"
setx OPENAI_API_KEY "cole-sua-chave-openai-aqui"
```

Importante: `setx` não afeta o PowerShell que já está aberto — **feche essa janela e abra uma nova** depois de rodar isso.

Quem usa essas chaves é o OmniRoute (modos `claude-pago`/`claude-free`): elas também entram no `ai-infra/container/.env` (`ai-infra/configs/omniroute/README.md`).

---

## 4. Instalar o Alethe (o app dos 4 painéis)

**Sem terminal — é um instalador gráfico.**

1. Abra: https://github.com/Kc1t/alethe-agents/releases/latest
2. Baixe o arquivo `Alethe_<versão>_x64-setup.exe` (o mais recente da lista "Assets")
3. Dê duplo-clique e siga o instalador. Não deve pedir Administrador (é instalador por-usuário), mas se aparecer um aviso do Windows Defender SmartScreen ("Windows protegeu seu PC"), clique em "Mais informações" → "Executar assim mesmo" — é normal pra apps novos sem muitas instalações ainda, o projeto é open source e a release vem assinada.

---

## 5. Instalar o glab (CLI do GitLab)

Vai precisar disso mais pra frente, pro fluxo de issues/merge request funcionar de verdade (`docs/agents/issue-tracker.md`).

**Terminal: "PowerShell" (normal)**

```powershell
winget install GLab.GLab
```

**Autenticar** (mesmo terminal, depois de instalar — abre o navegador pra você logar):

```powershell
glab auth login
```

Escolha `gitlab.com`, depois "Login with a web browser" (ou "Token" se preferir colar um personal access token gerado em https://gitlab.com/-/user_settings/personal_access_tokens).

---

## 6. Testar tudo junto: uma sessão no workspace

**Terminal: "PowerShell" (normal)**, na raiz de um workspace (ex.: `ai-pipeline\esteira`):

```powershell
claude
```

Digite `/imp` + Tab: tem que aparecer `implement-task`. `/agents` lista os subagentes do projeto (`data`, `backend`, `front`, `ui`, `tests`, `security`, `review`, `qa`). Saia com `/exit`.

---

## 7. Montar os painéis no Alethe

**Dentro do app Alethe (não é terminal solto)**

1. Abra o Alethe.
2. Crie um layout de grid (2x2, por exemplo) — um painel por spec que vai rodar em paralelo.
3. Em cada painel, na raiz do workspace, abra o modo que quiser:

```powershell
cd "C:\Users\danib\source\repos\orquestracao-ai\ai-pipeline\<projeto>"
claude          # seu plano
claude-pago     # OmniRoute, DeepSeek → Luna
claude-free     # OmniRoute, só gratuitos
```

Cada painel é uma sessão independente. Com specs prontas e desbloqueadas no mapa (`specs/README.md`), rode `/implement-task` (ou `/implement-task #<issue-mãe>`) em painéis diferentes — a branch de feature ele mesmo cria. Ver `docs/agents/orchestration.md`.

---

## 8. Instalar as skills — Matt Pocock, Angular, avoid-ai-design

Nenhuma dessas skills é escrita à mão neste repo: todas vêm de fora e são reinstaláveis por comando. Por isso `.claude/skills/*` não é versionado (ver `.gitignore`) — o que fica commitado é só o `skills-lock.json` (registra origem + hash de cada uma, pra reinstalar/atualizar de forma reprodutível). Rodar de novo estes comandos é sempre seguro: reinstala/atualiza, não duplica.

**Terminal: "PowerShell" (normal)**, dentro da pasta do repo:

```powershell
cd "C:\Users\danib\source\repos\orquestracao-ai\ai-base"
```

**Matt Pocock (25 skills de engenharia — discovery, spec, tickets, TDD, review, apoio: debug, merge conflicts, retro, handoff) — ✅ já instalado, ver `docs/log-execucao.md`:**

```powershell
npx skills add https://github.com/mattpocock/skills
```

**Angular (`angular-developer`, `angular-new-app`) — ✅ executado em 2026-09-05, ver `docs/log-execucao.md`:**

```powershell
npx skills add https://github.com/angular/skills
```

Os dois comandos acima são interativos (perguntam quais skills e qual agente-alvo) — escolha "Select All" e "Claude Code". Pra automação sem prompt (o jeito que rodou de fato em 2026-09-05, ver o log): `npx skills add <repo> -s '*' -a claude-code -y`.

**`avoid-ai-design`** (audita/reescreve UI que caiu em padrão genérico de IA) — não usa o instalador `skills`, é `git clone` direto — ✅ já instalado, ver `docs/log-execucao.md`:

```powershell
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Depois de qualquer um desses comandos, confirme dentro de uma sessão Claude Code:

```
/skills
```

Deve listar as skills instaladas.

## 9. Cadeia de design anti-ai-slop — instala por PROJETO REAL, não aqui no template

Os dois comandos abaixo só fazem sentido dentro de um projeto Angular de verdade (com `npm start`/`ng serve` rodando em localhost), não dentro do `ai-base` (que não é uma aplicação). Guardo aqui só pra não perder o comando na hora certa.

**`ui-ux-pro-max-skill`** (motor de direção de design, 22 frameworks incluindo Angular):

```powershell
npm install -g ui-ux-pro-max-cli
uipro init --ai claude
```

**`impeccable.style`** (Node 22.12+ necessário — `node -v` deve mostrar 22.12 ou mais novo; se não, atualiza o Node antes):

```powershell
npx impeccable install
```

Depois, dentro de uma sessão do Claude Code aberta naquele projeto:

```
/impeccable init
/impeccable detect
/impeccable audit
```

E os comandos de correção conforme o `audit` indicar: `/impeccable adapt`, `/impeccable harden`, `/impeccable polish`.

**Tailwind CSS 4** (base do spartan/ui e do layout — Angular 20+ tem suporte oficial; também por projeto, não aqui):

```powershell
ng add tailwindcss
```

Se o `ng add` não existir ainda na versão do CLI do projeto, o caminho manual é `npm install tailwindcss @tailwindcss/postcss postcss` seguido da configuração descrita em `angular.dev/guide/tailwind` — mas tenta o `ng add` primeiro.

**spartan/ui** (biblioteca de componentes Angular default — o PrimeNG 22 deixou de ser MIT):

```powershell
npm install @spartan-ng/brain
npm install -D @spartan-ng/cli
npx ng g @spartan-ng/cli:init
npx ng g @spartan-ng/cli:ui button   # um por componente; o helm vai pra src/app/shared/ui
```

O `init` cria o `components.json` (caminho `src/app/shared/ui`, alias `@spartan-ng/helm`). Depois, mapear os tokens no `src/styles.css` (`@theme` + variáveis do helm no `:root`) — ver `docs/design/component-library.md`.

## 10. Playwright (E2E/smoke test do agente `qa`) — via Docker

Decidido: roda em container, imagem oficial (já vem com todos os browsers instalados, nada pra instalar no Windows). Precisa do Docker Desktop rodando.

**Terminal: "PowerShell" (normal)**, dentro do projeto real (não no `ai-base`):

```powershell
docker pull mcr.microsoft.com/playwright:v1.48.0-noble
```

(Confira a tag mais recente em https://mcr.microsoft.com/en-us/product/playwright/tags antes de rodar, pra não ficar presa numa versão velha.)

**Rodar os testes** (exemplo, a partir da pasta com os testes Playwright do projeto):

```powershell
docker run --rm -v "${PWD}:/work" -w /work mcr.microsoft.com/playwright:v1.48.0-noble npx playwright test
```

O agente `qa` (`.claude/agents/qa.md`) usa esse mesmo `docker run` por baixo quando roda via `bash` — não precisa de Playwright instalado fora do container.

## 11. Nascimento de projeto novo — apontar pra infra compartilhada

Sem comando solto (era aqui que o RabbitMQ dava permissão pro `guest`, que nem existe). O projeto vira uma entrada no manifesto e o script cria tudo, já com os muros entre projetos:

1. Acrescentar `<projeto>` em `ai-infra/configs/infra/projects.json` (só o que ele usa — formato e opções em `ai-infra/configs/infra/README.md`).
2. Aplicar e conferir:

   ```powershell
   cd ai-infra\configs\infra
   node infra-config.mjs diff     # o que vai ser criado
   node infra-config.mjs apply
   node infra-config.mjs verify   # "✔ tudo conferido"
   ```

3. Carregar no projeto (dev .NET):

   ```powershell
   node infra-config.mjs secrets <projeto> --csproj=<csproj da API>
   ```

   (Não usar `Get-Content ... | dotnet user-secrets set`: no PowerShell 5.1 o pipe põe BOM e o `dotnet` recusa o JSON.)

Senhas do projeto: geradas pelo script em `ai-infra/container/.env` (`PROJECT_<PROJETO>_*`). Normalmente quem faz isso é o agent `local-environment-config` (`COMO-CRIAR-UM-PROJETO.md`, seção A2).

## 12. Google Drive for Desktop (destino do backup)

**Sem terminal — é um instalador gráfico.**

1. Baixe em https://www.google.com/drive/download/
2. Instale e logue com sua conta Google.
3. Confirme que a pasta sincronizada é `G:\My Drive\ia` (já criada) — é pra dentro dela que a rotina de backup salva os dumps.

Se você tiver Google AI Plus, já vem com 2TB — dump de Postgres pessoal não chega perto de encostar nesse limite. Sem o plano pago, o grátis (15GB) também é suficiente.

## 13. Skills de segurança — auditoria manual (Claude Code)

Pra rodar por sua conta, quando quiser auditar um projeto — não fazem parte automática de nenhum ticket (ver `docs/agents/security-review.md` pro fluxo completo: as camadas, e o que fazer quando um achado aparece).

**Terminal: "PowerShell" (normal)**, dentro do repo do projeto que você quer auditar (não precisa ser dentro do `ai-base`):

**Núcleo — instala uma vez, roda contra qualquer projeto:**

```powershell
npx skills add getsentry/skills -s 'security-review,gha-security-review,skill-scanner' -a claude-code -y
npx skills add briiirussell/cybersecurity-skills -s 'owasp-audit,api-audit,dependency-audit,secrets-audit,crypto-audit' -a claude-code -y
```

**Atenção pro `-s` seletivo, não "Select All":** o `getsentry/skills` tem 27 skills no total, incluindo `code-review`, `commit`, `pr-writer`, `find-bugs` — essas colidem/duplicam com o `/code-review` que já vem do `mattpocock/skills` (passo 8) e é o que `docs/workflow.md` usa oficialmente. "Select All" nesse repo especificamente instalaria um segundo `/code-review` concorrente sem querer. Instale só as skills de segurança listadas acima. `django-access-review` eu deixei de fora do comando — só instale se o projeto realmente for Django (não é o caso do `valuto`, que é .NET).

**Depois de instalar, confirme o `disable-model-invocation` (exceto nas peças internas — skills chamadas por outra skill, como `grilling`, `domain-modeling`, `tdd`, `codebase-design`, `code-review`, que ficam SEM a flag; lista e comando em `ai-ops/agents/infra/local-environment-config/docs/enviroment/security-skills.md`, passo 3):** nenhum dos dois repositórios de origem documenta esse campo no `SKILL.md` de cada skill (diferente do que o `CLAUDE.md` do `ai-base` promete pra tudo que está em `.claude/skills/`). Abra o `SKILL.md` de cada skill instalada (`.claude/skills/<nome>/SKILL.md`) e confirme/adicione `disable-model-invocation: true` no frontmatter — senão essa skill pode disparar sozinha por bater com o contexto, quebrando a garantia que o resto do repo depende.

**Situacional — só instala quando o projeto real tiver aquele escopo regulatório específico** (a maioria não tem nenhum destes; decisão de nascimento de projeto, ver `docs-human/runbook.md`):

```powershell
npx skills add briiirussell/cybersecurity-skills -s 'privacy-engineering' -a claude-code -y   # GDPR/CCPA/CPRA
npx skills add briiirussell/cybersecurity-skills -s 'hipaa-audit' -a claude-code -y            # saúde, dado clínico
npx skills add briiirussell/cybersecurity-skills -s 'pci-audit' -a claude-code -y              # cartão/pagamento
npx skills add briiirussell/cybersecurity-skills -s 'csf-mapping' -a claude-code -y            # postura NIST CSF 2.0
npx skills add briiirussell/cybersecurity-skills -s 'ai-risk-management' -a claude-code -y     # produto com IA embarcada
```

Depois de qualquer um desses comandos, confirme dentro de uma sessão Claude Code:

```
/skills
```

Deve listar as skills instaladas.

## O que eu NÃO coloquei aqui

`git push` continua proibido até você aprovar o que já foi commitado (`git log --oneline` mostra os commits locais). Nenhum comando desta lista dá push em nada.