# Infra — provisionamento (você, não a IA)

Detalhe de como a infra compartilhada é montada de verdade. A IA não precisa disso pra implementar uma task — ela só precisa saber pra onde apontar (ver `docs/agents/infra-local.md`). Isto aqui é o "como você monta", não "o que o código consome".

## Kubernetes

- **k3s**, não kubeadm/vanilla — distribuição leve, um binário só, já vem com Traefik e provisionamento de storage local. Mesmo Kubernetes de verdade (certificado CNCF, mesmo `kubectl`/manifests), mais simples de operar sozinho.
- **1 nó por cluster pra começar** (control-plane + worker na mesma instância EC2) — escalar pra multi-nó quando a carga pedir. Lembrete: ver `ai-ops/PENDENCIAS.md` sobre não esquecer de escalar.
- **Dois clusters, não um por ambiente** (ADR-0020 da Esteira, que **substitui a "Opção 3"** de um cluster por projeto × ambiente): `esteira-nao-prod` (namespaces `qa`, `hml`, `preview` e, só para Fatia de `risco: alto`, `review-<fatia>`; **não existe `dev`**) e `esteira-prd-local` (só produção). O isolamento entre `qa`, `hml`, `preview` e `review-*` vem de namespace e **NetworkPolicy**; produção nunca divide cluster com o que sofre DAST. Produção é um **Destino** configurável: `local` (k3d) agora, `aws` (EC2 + k3s, desenho deste arquivo) depois; trocar é mudar o Destino do Projeto na Esteira, sem mudar o pipeline. Passo a passo local: `docs-human/infra/kubernetes-local.md`.
- **Postgres/Redis/RabbitMQ/Keycloak dentro de cada cluster publicado** (não é o mesmo Docker Compose da infra de dev): os dois clusters rodam esses serviços como workload do Kubernetes. No `esteira-nao-prod` são compartilhados entre os namespaces com isolamento lógico por Fatia no review com app real (banco, vhost, prefixo Redis; realm Keycloak compartilhado). O Docker Compose compartilhado do `ai-infra` (com isolamento por banco/vhost/realm/prefixo entre projetos, ver `docs/agents/infra-local.md`) vale **só pro dev local** — nenhum ambiente publicado aponta de volta pra ele.
  - **Postgres → CloudNativePG (CNPG)** — operator, não chart Bitnami (Bitnami trancou a maioria das imagens grátis atrás de plano pago em 2025).
  - **Redis → Redis Operator (OT-ContainerKit)**.
  - **RabbitMQ → RabbitMQ Cluster Operator** — oficial do próprio time do RabbitMQ.
  - **Keycloak → Keycloak Operator** — oficial do keycloak.org.
  - Todos gratuitos, todos oficiais/mantidos pelo respectivo projeto — nenhum via Bitnami.
- **Ingress/TLS:** Traefik (já vem com k3s) + cert-manager + Let's Encrypt. Sem ALB — sem custo de rede extra.
- **Deploy via GitLab Kubernetes Agent**, não kubeconfig direto em variável de CI. O agente roda dentro do cluster e abre conexão de saída pro GitLab — o cluster nunca expõe a API do Kubernetes pra internet, e não fica um kubeconfig de vida longa guardado como secret de CI. Registro do agente vai em `.gitlab/agents/<nome>/config.yaml` — um registro por cluster (hoje 2: `esteira-nao-prod` e `esteira-prd-local`; na AWS o cluster de produção ganha um registro novo).