# Runbook: do zero até publicado (incluindo prática de Kubernetes local)

Sequência única, da máquina limpa até publicado de verdade. Cada passo aponta pro arquivo que tem o comando/detalhe completo — isso aqui só amarra a ordem.

## 1. Instalar as ferramentas (uma vez só, por máquina)

`docs-human/comandos-para-rodar.md`, passos 1 a 10: Node/npm/git, Claude Code + modos `claude-pago`/`claude-free`, chaves Deepseek/GPT-5.6 Luna (OmniRoute), Alethe (os painéis), `glab`, testar o `/implement-task` num workspace, montar os painéis no Alethe, skills (Matt Pocock, Angular, avoid-ai-design), Playwright via Docker.

## 2. Subir a infra compartilhada local

Uma vez só por máquina, fica rodando pra todo projeto. Repo `ai-infra`, sempre pelo script (nunca `docker compose up` puro):

```powershell
cd ai-infra\configs\infra
node infra-config.mjs up
```

Sobe na ordem certa, configura todos os projetos do manifesto e termina com `verify` (`✔ tudo conferido`). Portas só em `127.0.0.1`: Postgres `5432`, pgAdmin `15432`, Keycloak `8080`, Redis `6379`, RabbitMQ `5672`/`15672`, Grafana `3000`, Prometheus `9090`. Falco fica num perfil desligado (não roda no Docker Desktop). Detalhe: `ai-infra/configs/infra/README.md`.

## 3. Criar o repo do projeto a partir do `ai-base`

Copiar a estrutura do template pro repo novo (`docs/`, `docs-human/`, `.claude/`, `.gitlab-ci.yml`).

## 4. Apontar pra infra compartilhada (nascimento de projeto)

Entrada `<projeto>` em `ai-infra/configs/infra/projects.json` → `node infra-config.mjs apply` → `verify` (passo 11 de `comandos-para-rodar.md`). Cria banco + roles owner/app, vhost + usuário, realm + client `<projeto>-api` + usuário `dev`, usuário Redis em `<projeto>:*` — cada um sem enxergar os outros projetos. Senhas geradas no `ai-infra/container/.env`; o app lê `generated/projects/<projeto>.secrets.json` (contrato em `ai-base/docs/agents/infra-local.md`).

## 5. Configurar a API .NET pros pontos fixos de infra

Regra do `ai-base` (`docs/agents/infra-local.md`, `docs/agents/observabilidade-backup.md`), independente da arquitetura interna que o projeto escolher:
- `/health` via `Microsoft.Extensions.Diagnostics.HealthChecks`, checando Postgres/Redis/RabbitMQ/Keycloak.
- `/metrics` via `prometheus-net.AspNetCore`.
- Log em JSON no console (Serilog ou equivalente) — é o que o Grafana Alloy espera pra indexar.

## 6. Registrar o projeto no Prometheus

Campo `"metrics": "host.docker.internal:<porta>"` do projeto no `projects.json` + `apply`. Nunca editar `prometheus.yml` por projeto.

## 7. Ligar a esteira de CI/CD

Em cada repositório de código do workspace (`<projeto>-api`, `<projeto>-frontend` — ver `docs/agents/workspace.md`), `.gitlab-ci.yml` copiado de `templates/` do `ai-base`: `include` do `template-ci` (`ref: v2.0.0`), `APP_TECHNOLOGY` + variáveis da tecnologia, `REVIEW_GATE_ENABLED: "true"` (gate de `feature/*` → MR pra `dev`, precisa de `GITLAB_TOKEN` no projeto). Setup único (runner privileged, GitLab Agent, pull secret, Secret do banco, variáveis por ambiente) no `template-ci/README.md` — ver `docs/agents/orchestration.md` e `docs/agents/esteira-deploy.md` pro fluxo completo (tag `vX.Y.Z-rcN`, promoção dev→qa→hml→main).

**Ainda não validado no GitLab real:** o `template-ci` v2 (deploy em Kubernetes, gate de review, scanners) foi testado localmente em Docker, mas o encadeamento completo de pipelines ainda não rodou no gitlab.com — primeiro projeto real é o teste ponta a ponta.

Autenticar `glab` no runner se ainda não tiver feito (passo 5 de `comandos-para-rodar.md`).

## 8. Gerar o design system real do projeto

Antes da primeira task com fatia de UI — o `tokens.md` do template (`docs/design/tokens.md`) é só um seed, não a fonte de verdade final:

1. Rodar a cadeia descrita em `docs/design/principios.md`: `ui-ux-pro-max-skill` pra direção inicial, depois `/impeccable init` pra gerar o `DESIGN.md`/`PRODUCT.md` reais do projeto, usando os valores de `docs/design/tokens.md` como seed consciente em vez de deixar a ferramenta partir do zero.
2. Mapear os valores pro `src/styles.css` do projeto: `@theme` do Tailwind 4 (utilitários) e, no mesmo arquivo, as variáveis do helm do spartan (`--primary`, `--background`…) no `:root` apontando pros mesmos tokens (ver `docs/design/component-library.md`).
3. Registrar no `CONTEXT.md` do projeto que os tokens vivem no `DESIGN.md`/`src/styles.css` dali pra frente — `docs/design/tokens.md` do template deixa de ser a fonte de verdade assim que isso acontecer.

## 9. Primeiro ciclo de desenvolvimento (local, sem nuvem)

Nada abaixo precisa de Kubernetes nem AWS — roda tudo local, em cima do que os passos 2-6 já deixaram de pé:
- Specs viram issues no GitLab (`docs/agents/issue-tracker.md`).
- O Claude Code executa via `/implement-task` (modo `claude`, `claude-pago` ou `claude-free`), um painel do Alethe por spec (`docs/agents/orchestration.md`).
- `/code-review` manual (sua sessão Claude Code, seu Pro) antes de cada push de `feature/*`.
- Esteira dev→qa→hml→main entra em jogo quando você decidir publicar de verdade (setup único no `template-ci/README.md`).

Auditoria manual de segurança quando quiser (não é automática): skills do passo 13 de `comandos-para-rodar.md`, fluxo completo em `docs/agents/security-review.md`.

## 10. Praticar Kubernetes local (k3d) — opcional, zero custo, antes de ir pra nuvem

Isso valida o desenho de Kubernetes (os 4 operators, GitLab Agent conectado) sem gastar nada de AWS. **Não substitui o passo 11** — é treino, cluster descartável, sem TLS real. Passo a passo completo: `docs-human/kubernetes-local.md`.

Resumo da ordem lá dentro: instalar `k3d` → subir 2 clusters (`qa`/`hml` locais) → cert-manager com `ClusterIssuer` self-signed (sem Let's Encrypt, sem domínio público) → os 4 operators (CloudNativePG, Redis Operator, RabbitMQ Cluster Operator, Keycloak Operator) em cada cluster → registrar o GitLab Kubernetes Agent em cada um.

**Importante:** isso só valida cluster + operators + Agent conectado. Pra publicar a aplicação nesses clusters pela esteira: `KUBE_CONTEXT`/`K8S_NAMESPACE`/`APP_URL` por ambiente no projeto (ver `template-ci/README.md`).

## 11. Publicar pela primeira vez — nuvem de verdade (AWS)

Aqui entra o Kubernetes de produção. Kit de bootstrap completo (comandos exatos) em `docs-human/infra.md` + `ai-ops/PENDENCIAS.md`, seção Kubernetes:
- A) Criar EC2 + instalar k3s.
- B) cert-manager + `ClusterIssuer` Let's Encrypt (domínio público de verdade, diferente do self-signed do passo 10).
- C) Registrar o GitLab Kubernetes Agent (novo registro — o do passo 10 era local, não migra).
- D) Instalar os 4 operators (mesmos manifests/Helm charts do passo 10, sem mudar nada).

Repete A→B→C→D pra cada cluster — 1 por projeto × ambiente (`qa`, `hml`, `master`), conforme Opção 3 decidida. Dados não vêm do cluster local automaticamente — se quiser levar algo, é `pg_dump`/restore manual.

## 12. Segurança

Os scanners por assinatura (Trivy/Opengrep/Checkov/BetterLeaks/ZAP) rodam no stage `security` da esteira (`template-ci`), com gate por severidade. Pra rodar fora da esteira, o CLI do `Security-Scanner` gera o relatório consolidado (JSON/PDF) local. Camadas completas de segurança (mecânica automática + skills manuais + scanner de infra + Kubernetes futuro) em `docs/agents/security-review.md` e `docs/agents/kubernetes-security.md`.