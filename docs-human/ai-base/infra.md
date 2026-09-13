# Infra — provisionamento (você, não a IA)

Detalhe de como a infra compartilhada é montada de verdade. A IA não precisa disso pra implementar uma task — ela só precisa saber pra onde apontar (ver `docs/agents/infra-local.md`). Isto aqui é o "como você monta", não "o que o código consome".

## DefectDojo

Vive dentro do mesmo `docker-compose.yml` do `infra`, junto de Postgres/Redis/RabbitMQ/Keycloak — não como compose separado do `django-DefectDojo`. Compartilha a mesma instância de Postgres (banco `defectdojo` próprio, mesmo padrão de banco-por-projeto) e a mesma instância de Redis (fila do Celery) — nada de instância dedicada só pra ele.

## Kubernetes

- **k3s**, não kubeadm/vanilla — distribuição leve, um binário só, já vem com Traefik e provisionamento de storage local. Mesmo Kubernetes de verdade (certificado CNCF, mesmo `kubectl`/manifests), mais simples de operar sozinho.
- **1 nó por cluster pra começar** (control-plane + worker na mesma instância EC2) — escalar pra multi-nó quando a carga pedir. Lembrete: ver `pendencias.md` sobre não esquecer de escalar.
- **Um cluster por projeto × ambiente** (Opção 3, decidida): cada projeto tem `qa`, `hml` e `master` isolados de verdade — cluster próprio, EC2 própria, nada compartilhado nem entre ambientes do mesmo projeto nem entre projetos diferentes. Isso escala N projetos × 3 ambientes = 3N clusters — aceito conscientemente, é o trade-off de ter isolamento total em todo lugar.
- **Postgres/Redis/RabbitMQ/Keycloak dentro de cada cluster publicado** (não é o mesmo Docker Compose da infra de dev): cada cluster `qa`/`hml`/`master` roda sua própria cópia desses serviços como workload do Kubernetes, dedicados só àquele projeto+ambiente. O Docker Compose compartilhado do `infra` (com isolamento por banco/vhost/realm/prefixo entre projetos, ver `docs/agents/infra-local.md`) vale **só pro dev local** — nenhum ambiente publicado aponta de volta pra ele.
  - **Postgres → CloudNativePG (CNPG)** — operator, não chart Bitnami (Bitnami trancou a maioria das imagens grátis atrás de plano pago em 2025).
  - **Redis → Redis Operator (OT-ContainerKit)**.
  - **RabbitMQ → RabbitMQ Cluster Operator** — oficial do próprio time do RabbitMQ.
  - **Keycloak → Keycloak Operator** — oficial do keycloak.org.
  - Todos gratuitos, todos oficiais/mantidos pelo respectivo projeto — nenhum via Bitnami.
- **Ingress/TLS:** Traefik (já vem com k3s) + cert-manager + Let's Encrypt. Sem ALB — sem custo de rede extra.
- **Deploy via GitLab Kubernetes Agent**, não kubeconfig direto em variável de CI. O agente roda dentro do cluster e abre conexão de saída pro GitLab — o cluster nunca expõe a API do Kubernetes pra internet, e não fica um kubeconfig de vida longa guardado como secret de CI. Registro do agente vai em `.gitlab/agents/<nome>/config.yaml` — um registro por cluster (então 3N registros conforme os projetos nascem).