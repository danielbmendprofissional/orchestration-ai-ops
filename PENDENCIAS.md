# Pendências do ecossistema (ai-base, ai-infra, ai-ops, OmniRoute, Kubernetes) — humano; a IA não precisa ler isto. Pendência de um projeto fica no repo dele.

## Falta executar (tudo já decidido/desenhado — só aplicar)

3. Configurar o template, kubernetes deploy, etc

5. **Kubernetes:** zero implementado. Arquitetura 100% decidida (`docs-human/infra.md`), não falta decisão, só execução — kit de bootstrap pronto (k3s → cert-manager → GitLab Agent → 4 operators). Decisão real ainda em aberto (separada dessa arquitetura): política de rede/enforcement no cluster (NetworkPolicy, OPA/Gatekeeper ou Kyverno) — ver `docs-human/kubernetes-security.proposto.md`, não decidido ainda.


6. **Runbook único de nascimento de projeto:** não iniciado — amarrar esteira + infra + observabilidade numa sequência só. Deixado pro fim de propósito.

## Decisões suas, pendentes

- `pgdsat` (CIS PostgreSQL Benchmark scanner): rodar manual ou como job agendado?

## Infra compartilhada (config-as-code desde 2026-10-21 — ver `ai-infra/configs/infra/README.md`)

- **Falco:** está no `docker-compose.yml` num perfil desligado (`profiles: ["falco"]`), só como lembrete. Não roda no Docker Desktop/WSL2 (precisa de driver de kernel/eBPF). Reavaliar quando o cluster Kubernetes existir — lá ele roda como DaemonSet e entra junto da decisão de enforcement (`kubernetes-security.proposto.md`). Ao ligar: fixar versão (hoje `latest`) e decidir pra onde vão os alertas.
- **Upgrades disponíveis em 2026-10-21** (`node infra-versions.mjs check`): patch em Grafana, Loki, Prometheus, OmniRoute; minor em pgAdmin, Keycloak (26.0 → 26.8), Alloy, redis_exporter; **major** em Redis (7 → 8, muda licença), RabbitMQ (3.13 → 4.x, 3.13 já fora de suporte) e Postgres (17 → 18, exige dump/restore). Rodar o agent `ai-ops/agents/infra/infra-versions-config`.
- **Projetos apontando errado:** `esteira-api` usa `Username=postgres` e RabbitMQ `guest`/vhost `/` no `appsettings.Development.json` (com senha versionada). Trocar pelas chaves do contrato (`ai-base/docs/agents/infra-local.md`) via user-secrets e tirar a senha do arquivo. Valuto: carregar `generated/projects/valuto.secrets.json` quando a API tiver `appsettings`.
- **Cópias de `docs/agents/infra-local.md` e `observabilidade-backup.md` nos projetos** (valuto, esteira) estão na versão antiga — o agent `local-environment-config` ("Comparar com o template") sincroniza.
- **Cluster kind `valuto-local`** (teste de Kubernetes, ~620 MB de RAM): pode apagar quando quiser — `kind delete cluster --name valuto-local`.
- **Volumes vazios órfãos** `infra_loki_data` e `infra_alloy_data` (criados por engano num teste; os de verdade são `infra_infra_*`): `docker volume rm infra_loki_data infra_alloy_data`.
- **Backup do `.env`** agora inclui as senhas de máquina geradas (`PG_*`, `REDIS_*`, `PROJECT_*`) — mesma urgência do item do OmniRoute abaixo.

## OmniRoute (decidido em 2026-10-18 — ver `ai-infra/configs/omniroute/combos.md`)

- **Migração pra config-as-code (`ai-infra/configs/omniroute/`):** (1) você roda `export --harvest-secrets --ask-password` contra a instância npm atual → commit do snapshot; (2) aplicar as decisões do `combos.md` em `config/*.json` → commit; (3) parar a instância npm, `docker compose up -d omniroute`, `apply --setx`, `diff` limpo; (4) só então: apagar `omniroute-export-*`, `npm uninstall -g omniroute`, apagar `~/.omniroute`. Recarga automática DeepSeek/OpenAI desligada.
- **Backup do `ai-infra/container/.env`** (única peça do OmniRoute que não se reconstrói — chaves de provider).
- **Rodar o eval** (`ai-ops/tools/omniroute-eval`) e reordenar os combos com o ranking real.
- **Combo `harness` (DeepSeek Harness, código do trabalho):** revisar — código profissional não deve passar por provider free que treina com prompt. Não usar até decidir.
- **IA no CI (anotado, não fazer agora):** review barato no pipeline via OmniRoute free. Exige runner self-hosted na máquina (runner do gitlab.com não enxerga `localhost`) ou OmniRoute exposto com auth.
- **`SELF_SIGNED_CERT_IN_CHAIN`** em mistral/groq/glm nos testes de 2026-10-12 (sem antivírus/proxy na máquina): reavaliar depois da migração pro Docker.
