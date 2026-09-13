# Runbook: do zero até publicado (incluindo prática de Kubernetes local)

Sequência única, da máquina limpa até publicado de verdade. Cada passo aponta pro arquivo que tem o comando/detalhe completo — isso aqui só amarra a ordem.

## 1. Instalar as ferramentas (uma vez só, por máquina)

`docs-human/comandos-para-rodar.md`, passos 1 a 10: Node/npm/git, `pi.dev`, autenticar Deepseek/GPT-5.6 Luna, Alethe (os 4 painéis), `glab`, testar `pi` no `ai-base`, montar os painéis no Alethe, skills (Matt Pocock, Angular, avoid-ai-design), Playwright via Docker.

## 2. Subir a infra compartilhada local

Uma vez só por máquina, fica rodando pra todo projeto. Repo `infra`, dentro de `container/`:

```powershell
docker compose up -d --build
```

`--build` é obrigatório — o Postgres não é mais imagem pronta, builda local com pgAudit (`files/postgres/Dockerfile`). Primeira subida demora mais por causa disso; o `defectdojo-initializer` também demora (roda migration + cria usuário admin).

Confere que subiu: Postgres (`5432`), pgAdmin (`15432`), Keycloak (`8080`), Redis (`6379`), RabbitMQ (`15672`), DefectDojo (`8443`), Grafana (`3000`), Prometheus (`9090`). Se o serviço `falco` não subir (risco conhecido em Docker Desktop/WSL2), comenta ele no `docker-compose.yml` e segue — não bloqueia o resto.

## 3. Criar o repo do projeto a partir do `ai-base`

Copiar a estrutura do template pro repo novo (`docs/`, `docs-human/`, `.pi/agents/`, `.claude/`, `.gitlab-ci.yml`).

## 4. Apontar pra infra compartilhada (nascimento de projeto)

Rodar os comandos do passo 11 de `comandos-para-rodar.md`:
- Postgres: criar banco `<projeto>` + `infra/banco/<projeto>/init-db.sql` (organização interna — schema por módulo ou não — é decisão do projeto).
- RabbitMQ: criar vhost `<projeto>`.
- Keycloak: criar realm `<projeto>`.
- Redis: criar ACL user `<projeto>` restrito a `<projeto>:*`.

Guardar as senhas geradas do jeito que você já guarda as outras (nunca versionado).

## 5. Configurar a API .NET pros pontos fixos de infra

Regra do `ai-base` (`docs/agents/infra-local.md`, `docs/agents/observabilidade-backup.md`), independente da arquitetura interna que o projeto escolher:
- `/health` via `Microsoft.Extensions.Diagnostics.HealthChecks`, checando Postgres/Redis/RabbitMQ/Keycloak.
- `/metrics` via `prometheus-net.AspNetCore`.
- Log em JSON no console (Serilog ou equivalente) — é o que o Grafana Alloy espera pra indexar.

## 6. Registrar o projeto no Prometheus

Adicionar 1 linha nova em `infra/container/prometheus.yml`, apontando pro `/metrics` da API do projeto.

## 7. Ligar a esteira de CI/CD

No `.gitlab-ci.yml` do projeto (herdado do template): confirmar que o include do `/review/code-review-verify.yml` está lá, os jobs `verify-code-review`/`abrir-mr-dev`, e a regra `feature/*` no `workflow.rules` — ver `docs/agents/orchestration.md` e `docs/agents/esteira-deploy.md` pro fluxo completo (tag `vX.Y.Z-rcN`, promoção dev→qa→hml→master).

**Gap conhecido (você corrige direto no `template-ci`, não é regra pronta ainda):** hoje o `include` do `code-review-verify.yml` não existe em lugar nenhum do pipeline, e o `template-ci` não tem job de deploy em Kubernetes (`deploy-dotnet`/`deploy-angular-apache` usam `msdeploy`/`rsync`, não `kubectl`). Isso trava só a esteira automatizada — não trava o passo 9 (desenvolvimento local).

Autenticar `glab` no runner se ainda não tiver feito (passo 5 de `comandos-para-rodar.md`).

## 8. Gerar o design system real do projeto

Antes da primeira task com fatia de UI — o `tokens.md` do template (`docs/design/tokens.md`) é só um seed, não a fonte de verdade final:

1. Rodar a cadeia descrita em `docs/design/principios.md`: `ui-ux-pro-max-skill` pra direção inicial, depois `/impeccable init` pra gerar o `DESIGN.md`/`PRODUCT.md` reais do projeto, usando os valores de `docs/design/tokens.md` como seed consciente em vez de deixar a ferramenta partir do zero.
2. Mapear os valores pro preset de tema do PrimeNG (`definePreset`, `@primeng/themes`) **e** pro `tailwind.config` do projeto, com os mesmos números dos dois lados (ver `docs/design/component-library.md`).
3. Registrar no `CONTEXT.md` do projeto que os tokens vivem no `DESIGN.md`/preset dali pra frente — `docs/design/tokens.md` do template deixa de ser a fonte de verdade assim que isso acontecer.

## 9. Primeiro ciclo de desenvolvimento (local, sem nuvem)

Nada abaixo precisa de Kubernetes nem AWS — roda tudo local, em cima do que os passos 2-6 já deixaram de pé:
- Specs viram issues no GitLab (`docs/agents/issue-tracker.md`).
- `pi` executa via `/implement-task`, um painel do Alethe por spec (`docs/agents/orchestration.md`).
- `/code-review` manual (sua sessão Claude Code, seu Pro) antes de cada push de `feature/*`.
- Esteira dev→qa→hml→master só entra em jogo quando o gap do passo 7 estiver resolvido e você decidir publicar de verdade.

Auditoria manual de segurança quando quiser (não é automática): skills do passo 13 de `comandos-para-rodar.md`, fluxo completo em `docs/agents/security-review.md`.

## 10. Praticar Kubernetes local (k3d) — opcional, zero custo, antes de ir pra nuvem

Isso valida o desenho de Kubernetes (os 4 operators, GitLab Agent conectado) sem gastar nada de AWS. **Não substitui o passo 11** — é treino, cluster descartável, sem TLS real. Passo a passo completo: `docs-human/kubernetes-local.md`.

Resumo da ordem lá dentro: instalar `k3d` → subir 2 clusters (`qa`/`hml` locais) → cert-manager com `ClusterIssuer` self-signed (sem Let's Encrypt, sem domínio público) → os 4 operators (CloudNativePG, Redis Operator, RabbitMQ Cluster Operator, Keycloak Operator) em cada cluster → registrar o GitLab Kubernetes Agent em cada um.

**Importante:** isso só valida cluster + operators + Agent conectado. Não valida a esteira publicando sua aplicação de verdade — falta o job `deploy-kubernetes` no `template-ci` (gap do passo 7), que ainda não existe.

## 11. Publicar pela primeira vez — nuvem de verdade (AWS)

Aqui entra o Kubernetes de produção. Kit de bootstrap completo (comandos exatos) em `docs-human/infra.md` + `docs-human/pendencias.md`, seção Kubernetes:
- A) Criar EC2 + instalar k3s.
- B) cert-manager + `ClusterIssuer` Let's Encrypt (domínio público de verdade, diferente do self-signed do passo 10).
- C) Registrar o GitLab Kubernetes Agent (novo registro — o do passo 10 era local, não migra).
- D) Instalar os 4 operators (mesmos manifests/Helm charts do passo 10, sem mudar nada).

Repete A→B→C→D pra cada cluster — 1 por projeto × ambiente (`qa`, `hml`, `master`), conforme Opção 3 decidida. Dados não vêm do cluster local automaticamente — se quiser levar algo, é `pg_dump`/restore manual.

## 12. Segurança (quando o `DefectDojo` já estiver rodando no `infra`)

Rodar o `Security-Scanner` contra o projeto, importar achados no DefectDojo via API (ver `docs-human/pendencias.md`, checklist do DefectDojo). Camadas completas de segurança (mecânica automática + skills manuais + scanner de infra + Kubernetes futuro) em `docs/agents/security-review.md` e `docs/agents/kubernetes-security.md`.