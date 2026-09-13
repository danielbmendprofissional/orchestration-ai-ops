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

## 2. Instalar o pi.dev

**Terminal: "PowerShell" (normal primeiro)**

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Se der erro de permissão (`EACCES`, `EPERM`, "Access is denied"): feche esse PowerShell, abra de novo como **"PowerShell" clicando com botão direito → "Executar como administrador"**, e rode o mesmo comando só dessa vez. Depois pode voltar a usar o PowerShell normal pra tudo mais.

**Verificar que instalou** (PowerShell normal):

```powershell
pi --version
```

Precisa mostrar um número de versão (ex: `0.85.1` ou mais novo).

Depois de `pi --version` confirmar que instalou:
 
```powershell
pi install npm:pi-mcp-adapter
```
 
Reinicia o `pi` depois de instalar. Isso é o que faz o `pi` ler o `.mcp.json` de cada projeto (trechos prontos em `configs/desktop/MCP-GLOBAL.md`) — sem essa extensão, `pi` não enxerga MCP nenhum, `/mcp` nem aparece como comando.

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

Importante: `setx` não afeta o PowerShell que já está aberto — **feche essa janela e abra uma nova** depois de rodar isso, senão o `pi` não vai ver as chaves.

Alternativa (se preferir não deixar a chave salva como variável de ambiente do Windows): dentro de uma sessão `pi` aberta, rode `/login deepseek` e `/login openai` — ele guarda em `~/.pi/agent/auth.json`, também permanente, sem precisar de `setx`.

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

## 6. Testar tudo junto: rodar uma sessão `pi` no repo

**Terminal: "PowerShell" (normal)**

```powershell
cd "C:\Users\danib\source\repos\ai-base"
pi
```

Se abrir a interface do `pi` sem erro, deu tudo certo. Digite `/model` pra confirmar que `deepseek-v4-flash` e `gpt-5.6-luna` aparecem na lista (prova que a autenticação do passo 3 funcionou). Saia com `Ctrl+C` duas vezes ou `/exit`.

---

## 7. Montar os 4 painéis no Alethe

**Dentro do app Alethe (não é terminal solto)**

1. Abra o Alethe.
2. Crie um layout de grid com 4 painéis (a opção fica no menu de layout — "grid" ou "custom grid", 2x2).
3. Em cada painel, rode:

```powershell
cd "C:\Users\danib\source\repos\ai-base"
pi
```

Cada painel agora é uma sessão `pi` independente. Quando você tiver 4 specs prontas (fechadas por mim/Claude Code), abre uma branch de feature pra cada uma (`git checkout -b feature/<feature>/<spec>`) num painel diferente e usa `/implement-task <descrição da task>` — ver `docs/agents/orchestration.md` pros comandos de dentro da sessão `pi`.

---

## 8. Instalar as skills — Matt Pocock, Angular, avoid-ai-design

Nenhuma dessas skills é escrita à mão neste repo: todas vêm de fora e são reinstaláveis por comando. Por isso `.claude/skills/*` não é versionado (ver `.gitignore`) — o que fica commitado é só o `skills-lock.json` (registra origem + hash de cada uma, pra reinstalar/atualizar de forma reprodutível). Rodar de novo estes comandos é sempre seguro: reinstala/atualiza, não duplica.

**Terminal: "PowerShell" (normal)**, dentro da pasta do repo:

```powershell
cd "C:\Users\danib\source\repos\ai-base"
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

**PrimeNG** (biblioteca de componentes Angular default — também por projeto, não aqui):

```powershell
npm install primeng @primeng/themes
```

**Tailwind CSS** (default junto com o PrimeNG, pra layout/espaçamento/utilitário — Angular 20+ tem suporte oficial):

```powershell
ng add tailwindcss
```

Se o `ng add` não existir ainda na versão do CLI do projeto, o caminho manual é `npm install tailwindcss @tailwindcss/postcss postcss` seguido da configuração descrita em `angular.dev/guide/tailwind` — mas tenta o `ng add` primeiro.

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

O agente `qa` (`.pi/agents/qa.md`) usa esse mesmo `docker run` por baixo quando roda via `bash` — não precisa de Playwright instalado fora do container.

## 11. Nascimento de projeto novo — apontar pra infra compartilhada

Toda vez que nascer um projeto novo (a partir deste template), rodar isso uma vez, apontando pro `docker-compose.yml` do repo `infra` já rodando:

**Postgres** — criar o banco (dentro do container do Postgres):

```powershell
docker exec -it <container-postgres> psql -U postgres -c "CREATE DATABASE <projeto>;"
```

Depois criar `infra/banco/<projeto>/init-db.sql` (organização interna do banco — schema por módulo ou não — é decisão do projeto, não tem padrão obrigatório aqui).

**RabbitMQ** — criar o vhost:

```powershell
docker exec -it <container-rabbitmq> rabbitmqctl add_vhost <projeto>
docker exec -it <container-rabbitmq> rabbitmqctl set_permissions -p <projeto> guest ".*" ".*" ".*"
```

**Keycloak** — criar o realm (via Admin CLI dentro do container, depois de autenticar):

```powershell
docker exec -it <container-keycloak> /opt/keycloak/bin/kcadm.sh create realms -s realm=<projeto> -s enabled=true
```

**Redis** — criar o ACL user restrito ao prefixo do projeto:

```powershell
docker exec -it <container-redis> redis-cli ACL SETUSER <projeto> on ">senha-do-projeto" "~<projeto>:*" "+@all" "-@dangerous"
```

Guarda a senha gerada em cada passo do jeito que você já guarda as outras (não fica hardcoded em lugar nenhum versionado).

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

**Depois de instalar, confirme o `disable-model-invocation`:** nenhum dos dois repositórios de origem documenta esse campo no `SKILL.md` de cada skill (diferente do que o `CLAUDE.md` do `ai-base` promete pra tudo que está em `.claude/skills/`). Abra o `SKILL.md` de cada skill instalada (`.claude/skills/<nome>/SKILL.md`) e confirme/adicione `disable-model-invocation: true` no frontmatter — senão essa skill pode disparar sozinha por bater com o contexto, quebrando a garantia que o resto do repo depende.

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