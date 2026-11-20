# Kubernetes local (k3d) — prática completa, zero custo de nuvem

Este arquivo é sobre rodar o desenho decidido **na sua máquina**, sem AWS. Quando for pra nuvem de verdade, o desenho completo (EC2, Let's Encrypt, domínio real) já está em `docs-human/ai-base/infra.md` — este arquivo aqui **não substitui aquele, é o estágio atual**: produção é um **Destino** (`local` agora, `aws` depois), e trocar é mudar o Destino do Projeto na Esteira, sem mudar o pipeline.

Decisão: ADR-0020 da Esteira (`ai-pipeline/esteira/docs/adr/0020-kubernetes-local-e-validacao-por-fatia.md`), atualizada pelas ADRs 0021, 0022 e 0025. Motivo declarado: o projeto é de uma pessoa e serve também para aprender Kubernetes.

## O que este arquivo NÃO cobre (leia antes de começar)

Este arquivo cobre os clusters (k3d, operators, NetworkPolicy, GitLab Agent). O deploy da aplicação é do `template-ci` (`deploy/kubernetes.yml`: migrations + kustomize + rollout via agent) — configuração por projeto no `template-ci/README.md`.

Pré-requisito: Docker Desktop rodando.

## O desenho: dois clusters

| Cluster | Namespaces | Para quê |
|---|---|---|
| `esteira-nao-prod` | `qa`, `hml`, `preview`, `review-<fatia>` | Tudo que **não** é produção. **Não existe namespace `dev`** (ambiente não é branch). `review-<fatia>` só para Fatia de `risco: alto` (app real), no máximo 2 ao mesmo tempo. `preview` hospeda o preview estático do front (um nginx mínimo por MR, sem API nem banco; validade de 7 dias; no máximo 5 ao mesmo tempo) |
| `esteira-prd-local` | produção | Só produção. Nunca divide cluster com o que sofre DAST |

O isolamento entre `qa`, `hml`, `preview` e `review-*` vem de namespace e **NetworkPolicy** (entrada só do próprio namespace e do Traefik). O ZAP (DAST ativo no `qa`, passivo no `hml` e em produção depois da Liberação) roda no runner, fora do cluster, e alcança só a URL do ambiente alvo.

## 1. Instalar k3d

```powershell
winget install k3d
k3d version
```

## 2. Criar os 2 clusters

```powershell
k3d cluster create esteira-nao-prod --agents 1
k3d cluster create esteira-prd-local --agents 1
kubectl config get-contexts
```

Troca de contexto com `kubectl config use-context k3d-esteira-nao-prod` (ou `k3d-esteira-prd-local`).

Namespaces do cluster não-produção:

```powershell
kubectl --context k3d-esteira-nao-prod create namespace qa
kubectl --context k3d-esteira-nao-prod create namespace hml
kubectl --context k3d-esteira-nao-prod create namespace preview
```

(`review-<fatia>` é criado e destruído pelo `template-ci`, só no review com app real.)

## 3. cert-manager, com Issuer self-signed (sem Let's Encrypt)

Sem domínio público apontando pro seu IP de casa, Let's Encrypt não emite certificado nenhum — usa self-signed só pra validar o mecanismo. **Repetir nos dois clusters** (troca o contexto antes):

```powershell
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager `
  --namespace cert-manager --create-namespace `
  --set installCRDs=true
```

```yaml
# cluster-issuer-selfsigned.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned
spec:
  selfSigned: {}
```

```powershell
kubectl apply -f cluster-issuer-selfsigned.yaml
```

Traefik já vem de fábrica no k3d/k3s (não precisa instalar separado).

## 4. Os 4 operators — repetir nos dois clusters

**Aviso honesto:** URLs/versões abaixo são as mais recentes que conheço agora — confira na doc oficial de cada operator antes de rodar, isso muda com frequência e eu posso estar desatualizado.

**CloudNativePG (Postgres):**
```powershell
kubectl apply --server-side -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.24/releases/cnpg-1.24.1.yaml
kubectl get deploy -n cnpg-system
```

**Redis Operator (OT-ContainerKit):**
```powershell
helm repo add ot-helm https://ot-container-kit.github.io/helm-charts/
helm repo update
helm install redis-operator ot-helm/redis-operator --namespace redis-operator --create-namespace
```

**RabbitMQ Cluster Operator (oficial):**
```powershell
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
```

**Keycloak Operator (oficial keycloak.org):**
```powershell
kubectl create -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/main/kubernetes/keycloaks.k8s.keycloak.org-v1.yml
kubectl create -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/main/kubernetes/keycloakrealmimports.k8s.keycloak.org-v1.yml
kubectl create -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/main/kubernetes/kubernetes.yml
```

Depois de cada operator instalado, criar 1 `Cluster`/`Redis`/`RabbitmqCluster`/`Keycloak` CR mínimo (1 réplica) só pra confirmar que o operator provisiona de verdade.

**Review com app real:** os serviços (Postgres, Redis, RabbitMQ, Keycloak) são **compartilhados no cluster `esteira-nao-prod` com isolamento lógico por Fatia** — banco, vhost e prefixo Redis por Fatia; realm Keycloak compartilhado. O contrato de chaves (`ConnectionStrings:Postgres`, `RabbitMQ:*`, `Keycloak:*`, `Redis:KeyPrefix`) **não muda** (`ai-base/docs/agents/infra-local.md`).

## 5. NetworkPolicy

No cluster `esteira-nao-prod`, uma política por namespace (`qa`, `hml`, `preview`, `review-*`) que **bloqueia tráfego vindo de outros namespaces** e libera só o próprio namespace e o Traefik. Manifesto versionado em `ai-ops/agents/infra/local-environment-config/docs/infra/manifests/networkpolicy-isolamento.yaml` (não testado: conferir o controlador do k3s ao subir o cluster). Não há política para o ZAP: ele roda no runner e alcança o ambiente pela `APP_URL`. Rascunho de enforcement e alternativas: `docs-human/ai-base/kubernetes-security.proposto.md`.

## 6. GitLab Kubernetes Agent — um por cluster

No GitLab: projeto → Operate → Kubernetes clusters → Connect a cluster → escolhe/cria o nome do agent (`esteira-nao-prod` e `esteira-prd-local`). Cada um cria um token de registro.

No repo do projeto (ex: `valuto`, não `ai-base`/`ai-infra`):
```yaml
# .gitlab/agents/esteira-nao-prod/config.yaml
ci_access:
  projects:
    - id: personal.daniel.bmend/valuto
```

Instalar o agent dentro do cluster correspondente (repetir pro `esteira-prd-local`, com o agent/token dele):
```powershell
helm repo add gitlab https://charts.gitlab.io
helm repo update
helm upgrade --install esteira-nao-prod gitlab/gitlab-agent `
  --namespace gitlab-agent --create-namespace `
  --set config.token=<TOKEN_GERADO_NO_GITLAB> `
  --set config.kasAddress=wss://kas.gitlab.com
```

Confirma que funcionou: `kubectl get nodes` deve aparecer na aba Kubernetes do projeto no GitLab, mesmo sem porta nenhuma aberta no seu roteador — a conexão é de saída, do cluster pro GitLab.

**Runner:** o runner do GitLab roda **na mesma máquina dos clusters** (executor Docker), e o deploy passa pelo Agent. Nada da máquina é exposto. A confirmação final é no teste ponta a ponta da migração.

## 7. O que dá pra validar hoje vs. o que fica faltando

**Dá pra validar agora:** os 2 clusters existem e são isolados, os 4 operators sobem de verdade (não é YAML teórico), o GitLab Agent conecta nos dois e o GitLab enxerga cada cluster.

**Depois daqui:** a esteira publica a aplicação nesses clusters quando o projeto define `KUBE_CONTEXT`/`K8S_NAMESPACE`/`APP_URL` por ambiente (qa, hml, produção) e o `ci_access` do agent libera o projeto (ver `template-ci/README.md`, Setup único). A memória real da máquina (dois clusters + operators + ZAP) é medida no primeiro teste ponta a ponta; os limites de `review-*` (2) e `preview` (5) são configuração e se ajustam ali.

## 8. Quando for pra AWS de verdade

Reaproveita os manifests/Helm charts dos operators (passo 4) sem mudar nada — é o mesmo padrão. Produção troca o **Destino** de `local` para `aws`: cluster nasce em EC2 (não k3d), Let's Encrypt real (domínio público existe), e dados não vêm junto automaticamente — se quiser levar algo do cluster local, é `pg_dump`/restore manual. Desenho completo da AWS: `docs-human/ai-base/infra.md`.

## 9. Derrubar tudo

```powershell
k3d cluster delete esteira-nao-prod
k3d cluster delete esteira-prd-local
```
