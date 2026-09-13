# Pendências (docs-human — a IA não precisa ler isto)

## Falta executar (tudo já decidido/desenhado — só aplicar)

3. Configurar o template, kubernetes deploy, etc

5. **Kubernetes:** zero implementado. Arquitetura 100% decidida (`docs-human/infra.md`), não falta decisão, só execução — kit de bootstrap pronto (k3s → cert-manager → GitLab Agent → 4 operators). Decisão real ainda em aberto (separada dessa arquitetura): política de rede/enforcement no cluster (NetworkPolicy, OPA/Gatekeeper ou Kyverno) — ver `docs-human/kubernetes-security.proposto.md`, não decidido ainda.


6. **Runbook único de nascimento de projeto:** não iniciado — amarrar esteira + infra + observabilidade numa sequência só. Deixado pro fim de propósito.

## Decisões suas, pendentes

- `pgdsat` (CIS PostgreSQL Benchmark scanner): rodar manual ou como job agendado?