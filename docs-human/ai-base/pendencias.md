# Pendências (docs-human — a IA não precisa ler isto)

## Falta executar (tudo já decidido/desenhado — só aplicar)

3. Configurar o template, kubernetes deploy, etc

5. **Kubernetes:** zero implementado. Arquitetura 100% decidida (`docs-human/infra.md`), não falta decisão, só execução — kit de bootstrap pronto (k3s → cert-manager → GitLab Agent → 4 operators). Decisão real ainda em aberto (separada dessa arquitetura): política de rede/enforcement no cluster (NetworkPolicy, OPA/Gatekeeper ou Kyverno) — ver `docs-human/kubernetes-security.proposto.md`, não decidido ainda.


6. **Runbook único de nascimento de projeto:** não iniciado — amarrar esteira + infra + observabilidade numa sequência só. Deixado pro fim de propósito.

## Decisões suas, pendentes

- `pgdsat` (CIS PostgreSQL Benchmark scanner): rodar manual ou como job agendado?
## OmniRoute (decidido em 2026-10-18 — ver `infra/configs/omniroute/combos.md`)

- **Migração pra config-as-code (`infra/configs/omniroute/`):** (1) você roda `export --harvest-secrets --ask-password` contra a instância npm atual → commit do snapshot; (2) aplicar as decisões do `combos.md` em `config/*.json` → commit; (3) parar a instância npm, `docker compose up -d omniroute`, `apply --setx`, `diff` limpo; (4) só então: apagar `omniroute-export-*`, `npm uninstall -g omniroute`, apagar `~/.omniroute`. Recarga automática DeepSeek/OpenAI desligada.
- **Backup do `infra/container/.env`** (única peça do OmniRoute que não se reconstrói — chaves de provider).
- **Rodar o eval** (`ai-ops/tools/omniroute-eval`) e reordenar os combos com o ranking real.
- **Combo `harness` (DeepSeek Harness, código do trabalho):** revisar — código profissional não deve passar por provider free que treina com prompt. Não usar até decidir.
- **IA no CI (anotado, não fazer agora):** review barato no pipeline via OmniRoute free. Exige runner self-hosted na máquina (runner do gitlab.com não enxerga `localhost`) ou OmniRoute exposto com auth.
- **`SELF_SIGNED_CERT_IN_CHAIN`** em mistral/groq/glm nos testes de 2026-10-12 (sem antivírus/proxy na máquina): reavaliar depois da migração pro Docker.
