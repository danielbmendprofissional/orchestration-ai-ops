# Recriar o ambiente de IA de um projeto existente

Roda na Etapa 2 quando o projeto **já existe** — tanto o que nasceu de um `ai-base` antigo (valuto, esteira) quanto o que nunca teve ambiente de IA (código que existia antes da orquestração). Objetivo: deixar o projeto exatamente como estaria se nascesse hoje do `ai-base` — **sem mexer no código, na estrutura de repositório nem nos dados**. É idempotente: rodar de novo num projeto já recriado só aponta o que o template mudou desde a última vez.

Decisões fixas (2026-10-21, não reabrir sem o humano pedir):
- **Estrutura do repositório fica como está.** Monorepo (`backend/` + `frontend/` num git só, caso do valuto) não é convertido pra workspace (`<projeto>-api`/`-frontend`). O ambiente se adapta ao layout. Converter é outra conversa, só se o humano pedir.
- **Código não é tocado por este agent.** Tudo que exige mudar código/config do app (chaves fora do contrato, senha versionada, `/health`, `/metrics`, log) vira **uma spec de adequação + issue**, implementada depois pelo fluxo normal (Claude Code → `pi /implement-task` → `/code-review`).
- **Dados não migram.** O projeto ganha a casa nova vazia na infra compartilhada e roda as próprias migrations. Se o humano quiser os dados antigos, o relatório traz o dump/restore guiado — ele executa.

## 0. Pré-requisitos

- Caminho completo do projeto informado pelo humano (regra do `CLAUDE.md`).
- `git status` limpo em cada repositório do projeto (`git -C <pasta> status --short`). Sujo: parar e pedir pro humano commitar ou guardar antes — o resultado deste fluxo tem que ser revisável num `git diff` só dele.
- Infra verde: `node ai-infra/configs/infra/infra-config.mjs verify`.

## 1. Inventário (só leitura)

Montar e mostrar ao humano esta tabela antes de qualquer plano:

| Item | Como descobrir |
|---|---|
| **Layout** | `workspace` (tem `<projeto>-api/`/`-frontend/` com `.git` próprio), `monorepo` (um `.git` na raiz, código em pastas como `backend/`, `frontend/`, `src/`), `componente-unico` (o repo é só a API ou só o front) |
| **Componentes de código** | `*.sln`/`*.slnx`/`*.csproj` (.NET, caminho do csproj da API), `angular.json` (Angular), `package.json`, outros. Caminho de cada um |
| **Origem do ambiente de IA** | `ai-base-atual` (`CLAUDE.md` com a seção "Papéis fixos das ferramentas" e `docs/agents/infra-local.md` com "Contrato de configuração"), `ai-base-antigo` (tem `CLAUDE.md`/`.pi/agents` ou `.claude/agents`/`docs/agents`, mas sem o contrato — `.pi/` de pi.dev antigo é removido na recriação), `nenhum` (sem `CLAUDE.md` nem `.claude/agents/`) |
| **Arquivos de IA presentes** | `CLAUDE.md` (raiz e por componente), `.claude/` (hooks, settings, skills, agents, commands), `docs/agents/`, `docs/design/`, `DESIGN.md`, `.mcp.json`, `skills-lock.json`, `CONTEXT.md`/`CONTEXT-MAP.md`, `docs/adr/`, `specs/` |
| **Infra que o código usa hoje** | `appsettings*.json`, `launchSettings.json`, `docker-compose*.yml` e `.env` do próprio projeto, `proxy.conf.json`. Pra cada serviço: host/porta, usuário (superusuário? `guest`? `postgres`?), banco/vhost/realm/client, prefixo Redis, porta do `/metrics`. **Senha versionada: reportar só "senha em `<arquivo>:<linha>`", nunca o valor** |
| **Observabilidade no código** | `/health` (HealthChecks), `/metrics` (`prometheus-net`), Serilog JSON, exportador OTLP |
| **Esteira** | `.gitlab-ci.yml` de cada repositório: `include` do template-ci e `ref` |
| **Recriação anterior** | `docs/agents/relatorio-ambiente.md` → "Base do template" (sha do `ai-base` usado da última vez) |

Inventário é mecânico: dúvida (ex.: não sei qual csproj é a API) → perguntar, nunca supor.

## 2. Plano — quatro blocos

Clonar o `ai-base` atual numa pasta temporária, read-only (`git clone --depth 1 git@gitlab.com:orchestration-ai/ai-base.git <tmp>`), anotar o sha (`git -C <tmp> rev-parse --short HEAD`), e montar o plano. Cada item com ação + motivo. Ações: **Adicionar**, **Modificar**, **Remover** (só candidato), **Revisar manualmente**, **Spec** (vai pra spec de adequação), **Depende do humano**.

### Bloco A — ambiente de IA (arquivos de processo)

Escopo e regras de comparação (iguais pra qualquer origem):
- `docs/agents/*.md`, `.claude/hooks/`, `.claude/agents/*.md`, `.claude/commands/`, `docs/design/*.md` — processo fixo, sem motivo pra divergir do template. Exceções: `tokens.md` sai do diff se existir `DESIGN.md`; campo `model:` de `.claude/agents` diferente é sempre "Depende do humano" (custo).
- **Nunca compara:** código, `CONTEXT.md`, `docs/adr/` existentes, `specs/` existentes, `.claude/skills/` (instala por comando, passo 3 dos "Passos"), `.mcp.json` (passo 2 dos "Passos").
- `templates/*.gitlab-ci.yml` vs `.gitlab-ci.yml` de cada repositório: só `include` (`project`/`ref`) e variáveis fixas.

Por origem:
- **`ai-base-atual`/`ai-base-antigo`:** diff dos arquivos acima. `CLAUDE.md` da raiz = **Revisar manualmente**, mas com a lista concreta do que falta comparado ao template (ex.: "falta a seção Infra", "seção Estrutura descreve layout diferente") — nunca sobrescrever.
- **`nenhum`:** tudo do escopo é **Adicionar**. `CLAUDE.md` da raiz = Adicionar a partir do template, já com a seção "Estrutura" reescrita pro layout real (passo abaixo) — humano revisa antes de aceitar. `CONTEXT.md`/`CONTEXT-MAP.md`/`docs/adr/` não são inventados: nascem vazios com o cabeçalho do template e ficam pro `/domain-modeling`.

Layout diferente de `workspace` (decisão fixa: manter):
- Seção "Estrutura" do `CLAUDE.md` e `CONTEXT-MAP.md` descrevem as pastas reais (`backend/ → API .NET`, `frontend/ → Angular`), não `<projeto>-api/`.
- `docs/agents/workspace.md` do template **não** é copiado como está (descreve outro layout): Adicionar uma versão curta que diz o layout real, que git roda na raiz (um repositório só), e que branch/MR é uma por mudança. Marcar no relatório.
- `CLAUDE.md` por componente (`backend/CLAUDE.md`, `frontend/CLAUDE.md`): só Adicionar se não existir, com a stack detectada no inventário; existindo, Revisar manualmente.
- Registrar a decisão no próprio projeto, pra próxima rodada não propor conversão de novo: Adicionar `docs/adr/<numeração do projeto>-layout-repositorio.md` — "Layout <monorepo|componente-unico> mantido; ambiente de IA adaptado; converter pra workspace exige decisão explícita". Se já existir ADR sobre layout, não duplicar.

### Bloco B — infra (casa na infra compartilhada)

Igual a `project-provisioning.md` (manifesto → `diff` → `apply` → `verify` → user-secrets), com o inventário como fonte do que o projeto usa:
- Projeto que cria as próprias roles por SQL (achou script de init com `CREATE ROLE`): `postgres.roles: "project"`, `memberPattern` das roles dele, script copiado pra `ai-infra/banco/<projeto>/init-db.sql` + `initScript`. Usa só migrations (EF etc.): padrão (`"postgres": {}`).
- Keycloak: `redirectUris`/roles/service account tirados do código e das ADRs do projeto; faltou → perguntar.
- `docker-compose*.yml` do próprio projeto subindo Postgres/Redis/RabbitMQ/Keycloak: **Remover** (candidato, confirmação nominal) — a regra é infra compartilhada. Serviço que o `ai-infra` não tem (ex.: MongoDB): **Depende do humano** (vira pedido de infra, não some).
- **Dados antigos:** não migram (decisão fixa). Se o inventário achou banco com dado (outro container, outra porta), o relatório traz o roteiro pro humano executar, sem rodar nada:
  ```powershell
  # origem → arquivo (ajustar host/porta/usuário da origem)
  pg_dump -h <host-origem> -p <porta> -U <usuario> -d <banco> -F c -f <projeto>-origem.dump
  # arquivo → casa nova, como dono do banco (senha: PROJECT_<P>_PG_OWNER_PASSWORD no ai-infra/container/.env)
  pg_restore -h localhost -p 5432 -U <projeto>_owner -d <projeto> --no-owner --role=<projeto>_owner <projeto>-origem.dump
  ```

### Bloco C — spec de adequação do código (não executa nada no código)

Tudo do inventário que exige mudar código/config do app vira **uma spec só**, `specs/feature/infra/00-adequacao-ambiente.md` (seguir a pasta de specs que o projeto já usa, se for outra), no formato de `docs/workflow.md` do template — fatia de infra, então **checklist** em vez de EARS de domínio:

```markdown
# 00 — Adequação do ambiente à infra compartilhada

## Contexto necessário
- docs/agents/infra-local.md (contrato de chaves)
- docs/agents/observabilidade-backup.md
- docs/agents/relatorio-ambiente.md (o que já foi provisionado)

## Ideia
O projeto passa a usar a casa dele na infra compartilhada (`<projeto>`), lendo só as chaves do contrato.

## Checklist
- [ ] `<arquivo>:<linha>` — `<chave atual>` → `<chave do contrato>` (uma linha por ocorrência do inventário)
- [ ] Remover senha versionada de `<arquivo>` (valor nunca na spec) — e avaliar rotação se a senha era real
- [ ] `UserSecretsId` no csproj da API; dev carrega `generated/projects/<projeto>.secrets.json`
- [ ] Redis: toda chave/canal com `Redis:KeyPrefix`; nada de `KEYS`/`SCAN`
- [ ] RabbitMQ: vhost `<projeto>`, usuário `<projeto>` (não `guest`, não `/`)
- [ ] Runtime com `ConnectionStrings:Postgres` (`<projeto>_app`), migrations com `PostgresMigrations`
- [ ] `/health` checando Postgres/Redis/RabbitMQ/Keycloak
- [ ] `/metrics` (`prometheus-net.AspNetCore`) na porta registrada no manifesto
- [ ] Log JSON no console + OTLP (`OTEL_*` do contrato)
(só os itens que o inventário mostrou faltando)

## Testes
- `node ai-infra/configs/infra/infra-config.mjs verify` com a API rodando: alvo `projects (<projeto>)` up
- API sobe só com user-secrets (sem connection string em appsettings) e `/health` responde Healthy
```

Depois de aprovado, abrir a issue-mãe no repositório de issues do projeto (`docs/agents/issue-tracker.md`: workspace, ou o próprio repo no layout monorepo), com link pra spec + resumo, labels `needs-triage` + área (`backend`/`frontend`). O humano triageia; `/to-tickets` quebra se precisar. Se já existir `docs/adr/adr-observability-pendente.md` de rodada anterior, a spec absorve o conteúdo e o ADR vira "Substituído por specs/feature/infra/00-adequacao-ambiente.md".

Spec que já existe de rodada anterior: Modificar (atualizar checklist — marcar o que o código já resolveu, acrescentar o que é novo), nunca duplicar.

### Bloco D — ferramental

Os "Passos (novo e existente)" 2 a 8 do `CLAUDE.md` (`.mcp.json`, skills, impeccable, Playwright, skills de segurança, smoke test) — sem mudança.

## 3. Executar

- Apagar a cópia temporária do `ai-base` ao final da montagem do plano.
- Aprovação do plano geral + **confirmação nominal item por item** pra Modificar/Remover/arquivo novo de layout. "Depende do humano" não executa.
- Ordem: Bloco A → B → C → D. Só edita/cria arquivo e roda os comandos do plano. **Nunca** `git add`/`commit`/`push`, nunca apaga dado/volume, nunca toca código.
- Verificação de verdade (Fluxo obrigatório, item 6): `verify` verde, arquivos criados existem, issue aberta (URL).

## 4. Relatório

`docs/agents/relatorio-ambiente.md` (formato do `CLAUDE.md`) ganha, além do de sempre:

```markdown
## Recriação
- Data: <data> · Base do template: ai-base@<sha> · Origem: <ai-base-atual|ai-base-antigo|nenhum> · Layout: <workspace|monorepo|componente-unico> (mantido)
- Ambiente de IA: <adicionados/modificados/pendentes de revisão manual>
- Spec de adequação: specs/feature/infra/00-adequacao-ambiente.md · issue <URL>
- Dados antigos: <não havia | roteiro de dump/restore abaixo, não executado>
```

O sha é o que a próxima rodada usa pra dizer "o template mudou desde a última recriação".
