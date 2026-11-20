# Kubernetes local (k3d) — procedimento do agente

Valida cluster + operators + GitLab Agent conectado, na máquina local, zero custo de nuvem. Não é a arquitetura de produção (AWS/EC2/Let's Encrypt — fora do escopo de qualquer agent, decisão/execução do humano). Não deploya aplicação — isso é a esteira do `template-ci` (`deploy/kubernetes.yml`).

Pré-requisito: Docker Desktop rodando. **Checar via processo, nunca via `docker info` direto** (`docker info` pode levar minutos tentando conectar se o app estiver fechado — ver `docs/infra/container-bootstrap.md`, item 0):

```powershell
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
```

Não retornou nada: **parar aqui**, devolver pro humano — não tentar abrir o app sozinho (GUI). Retornou: só então confirmar com `docker info` que o daemon já respondeu.

## 1. Verificar o que já está instalado

```powershell
k3d version
kubectl version --client
helm version
docker info
```

## 2. Instalar o que faltou (um de cada vez, confirmando antes de seguir)

**`k3d` e `helm`: nunca `winget install`** — nesta máquina, sem Developer Mode/admin, o passo de registrar PATH desses pacotes "portable" pode falhar em silêncio (binário fica instalado, comando não é encontrado). Baixar o binário oficial direto e registrar o PATH manualmente, mesmo padrão do RTK (`docs/tools/rtk.md`) e do `glab` (`docs/enviroment/glab.md`) — sem privilégio elevado:

```powershell
$binDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# k3d — asset já vem como .exe único, sem versão no nome (alias "latest" do GitHub funciona)
Invoke-WebRequest -Uri "https://github.com/k3d-io/k3d/releases/latest/download/k3d-windows-amd64.exe" -OutFile "$binDir\k3d.exe"

# helm — não fica hospedado nos assets do GitHub release, só em get.helm.sh; precisa da tag exata primeiro
$helmTag = (Invoke-RestMethod "https://api.github.com/repos/helm/helm/releases/latest").tag_name
Invoke-WebRequest -Uri "https://get.helm.sh/helm-$helmTag-windows-amd64.zip" -OutFile "$env:TEMP\helm.zip"
Expand-Archive -Path "$env:TEMP\helm.zip" -DestinationPath "$env:TEMP\helm-extract" -Force
Copy-Item "$env:TEMP\helm-extract\windows-amd64\helm.exe" "$binDir\helm.exe" -Force
Remove-Item "$env:TEMP\helm.zip", "$env:TEMP\helm-extract" -Recurse -Force

if (($env:Path -split ';') -notcontains $binDir) {
    [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";$binDir", "User")
}
```

**`kubectl`: `winget install Kubernetes.kubectl`** continua — não apresentou esse problema até agora nesta máquina, mas é o mesmo risco em tese; se `where.exe kubectl` falhar depois de reaberto o terminal, trocar pro mesmo padrão acima usando `https://dl.k8s.io/release/$(Invoke-RestMethod https://dl.k8s.io/release/stable.txt)/bin/windows/amd64/kubectl.exe`.
```powershell
winget install Kubernetes.kubectl
```

**Verificação do PATH não é possível nesta sessão** (regra do `CLAUDE.md`, Fluxo obrigatório item 6, caso "depende de PATH") — confirmar só que `$binDir\k3d.exe` e `$binDir\helm.exe` existem em disco (isso é verificável aqui), e reportar ao humano: "binários instalados, PATH escrito, confirme com `k3d version` / `helm version` / `kubectl version --client` **num terminal novo de verdade**" — nunca como "concluído" sem essa ressalva.

## 3. Confirmar com o humano antes de consumir recurso real

Antes de criar cluster: avisar que isso consome RAM/CPU real enquanto estiver de pé (dois clusters + operators; a memória real nunca foi medida), e os nomes que serão usados: **`esteira-nao-prod`** e **`esteira-prd-local`** (ADR-0020 da Esteira; os dois clusters são da máquina, não de um projeto). Só depois da confirmação, seguir.

## 4. Criar os 2 clusters (não-produção e produção, isolados)

`esteira-nao-prod` hospeda os namespaces `qa`, `hml`, `preview` (nginx do preview estático, 7 dias, até 5 ao mesmo tempo) e `review-<fatia>` (só app real de Fatia de `risco: alto`, até 2 ao mesmo tempo; criados e destruídos pelo `template-ci`, nunca por este agent). **Não existe namespace `dev`.** `esteira-prd-local` é só produção (Destino `local`; trocar para `aws` é mudar o Destino na Esteira).

```powershell
k3d cluster create esteira-nao-prod --agents 1
k3d cluster create esteira-prd-local --agents 1
kubectl config get-contexts
kubectl --context k3d-esteira-nao-prod create namespace qa
kubectl --context k3d-esteira-nao-prod create namespace hml
kubectl --context k3d-esteira-nao-prod create namespace preview
```

Troca de contexto: `kubectl config use-context k3d-esteira-nao-prod` (ou `k3d-esteira-prd-local`).

## 5. cert-manager, Issuer self-signed (sem domínio público, sem Let's Encrypt)

Repetir em cada cluster (trocar contexto antes):

```powershell
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
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

Traefik já vem de fábrica no k3d/k3s — não instalar separado.

## 6. Os 4 operators — repetir em cada cluster

Confirmar versão/URL mais recente na doc oficial de cada operator antes de rodar — isso muda com frequência, não travar num link antigo por estar escrito aqui.

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

Depois de cada operator instalado: criar 1 CR mínimo (`Cluster`/`Redis`/`RabbitmqCluster`/`Keycloak`, 1 réplica) só pra confirmar que o operator provisiona de verdade.

O review com app real usa estes serviços **compartilhados no `esteira-nao-prod`, com isolamento lógico por Fatia** (banco, vhost e prefixo Redis por Fatia; realm Keycloak compartilhado). O contrato de chaves (`ConnectionStrings:Postgres`, `RabbitMQ:*`, `Keycloak:*`, `Redis:KeyPrefix`) não muda.

## 6b. NetworkPolicy (só `esteira-nao-prod`)

Uma política por namespace (`qa`, `hml`, `preview`, `review-*`) que **bloqueia tráfego vindo de outros namespaces** e libera só o próprio namespace e o Traefik (`kube-system`). Manifesto versionado: [`manifests/networkpolicy-isolamento.yaml`](manifests/networkpolicy-isolamento.yaml). Aplicar esse arquivo em cada namespace (no `review-<fatia>` quem aplica é o `template-ci`), nunca à mão. A política é só de entrada: o app precisa alcançar Postgres, Redis, RabbitMQ e Keycloak. **O ZAP não entra**: ele roda no runner, fora do cluster, e alcança o ambiente pela `APP_URL` (Ingress); o alcance dele é o alvo da varredura. **Conferir ao subir o cluster** (não foi testado) que o controlador de NetworkPolicy do k3s está ligado e que o Traefik está em `kube-system`. Produção nunca divide cluster com o que sofre DAST.

## 7. GitLab Kubernetes Agent — sempre parar aqui

Token de registro só sai clicando na UI do GitLab (projeto → Operate → Kubernetes clusters → Connect a cluster). Não usar Personal Access Token pra isso via API mesmo sendo tecnicamente possível — escopo largo demais pra um agent segurar. **Parar aqui**, pedir pro humano gerar 1 token por cluster (2: `esteira-nao-prod` e `esteira-prd-local`) e colar de volta.

No repo do próprio projeto (não em `ai-infra`):
```yaml
# .gitlab/agents/esteira-nao-prod/config.yaml
ci_access:
  projects:
    - id: <namespace>/<projeto>
```

Instalar o agent dentro de cada cluster correspondente, com o token daquele cluster (o exemplo é o `esteira-nao-prod`; repetir para o `esteira-prd-local` com o nome e o token dele). O **runner** do GitLab roda na mesma máquina dos clusters (executor Docker) e o deploy passa pelo Agent, que é conexão de saída — nada da máquina é exposto:
```powershell
helm repo add gitlab https://charts.gitlab.io
helm repo update
helm upgrade --install esteira-nao-prod gitlab/gitlab-agent --namespace gitlab-agent --create-namespace --set config.token=<TOKEN_GERADO_NO_GITLAB> --set config.kasAddress=wss://kas.gitlab.com
```

Confirmar: `kubectl get nodes` aparece na aba Kubernetes do projeto no GitLab (conexão de saída, sem porta nenhuma aberta no roteador).

## 8. Relatório final

O que foi instalado no passo 2, os 2 clusters no ar (nomes), os 4 operators confirmados (`kubectl get deploy`/`get pods` de cada namespace), Falco (se aplicável a esse contexto) subiu ou ficou de fora, confirmação dos 2 GitLab Agents conectados.

## Derrubar tudo (só sob pedido explícito)

```powershell
k3d cluster delete esteira-nao-prod
k3d cluster delete esteira-prd-local
```