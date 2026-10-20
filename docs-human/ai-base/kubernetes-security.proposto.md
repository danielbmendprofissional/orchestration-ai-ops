# Segurança de Kubernetes — não se aplica ainda

Este arquivo é sobre o estágio que **ainda não existe**: o `ai-base`/`ai-infra` hoje roda em Docker Compose local (ver `docs/agents/infra-local.md`), o Kubernetes é kit de bootstrap decidido mas não implementado (`docs-human/pendencias.md`, seção Kubernetes: A) EC2+k3s, B) cert-manager, C) GitLab Kubernetes Agent, D) os 4 operators). Nada aqui deve ser executado antes do passo D daquele kit estar de pé — isso é o passo seguinte, não paralelo.

## Por que isso é um arquivo separado, e não uma seção do `infra-local.md`

`infra-local.md` descreve o que já está rodando de verdade. Misturar "o que existe" com "o que vai existir quando o cluster nascer" confunde tanto humano quanto agente sobre o que pode ser executado hoje — mesmo motivo de `docs/design/tokens.md` ter perdido a seção de bootstrap de projeto pra `docs-human/runbook.md` numa rodada anterior de revisão deste repo.

## O que entra aqui quando o cluster existir

**`kube-bench`** (Aqua Security, mesmo fabricante do Trivy já usado no `Security-Scanner`) — roda o CIS Kubernetes Benchmark contra o cluster de verdade (control plane, kubelet, etcd — configuração real, não manifesto YAML antes do deploy, isso o Checkov já cobre hoje). Normalmente roda como Job/CronJob dentro do próprio cluster, com acesso de leitura aos componentes que audita. Ponto de entrada natural: depois do passo D do kit de bootstrap (`docs-human/pendencias.md`), antes do primeiro deploy real de aplicação — pega configuração insegura do cluster em si antes de colocar carga real nele.

**Falco em modo DaemonSet** — no Docker Compose de hoje (`docs/agents/infra-local.md`) o Falco roda como 1 serviço monitorando o host via `docker.sock`. Em Kubernetes o padrão é DaemonSet (1 pod Falco por nó, cobrindo todos os containers daquele nó) — muda o mecanismo de deploy, não o propósito. Falco tem chart Helm oficial (`falcosecurity/falco`), mesma família de instalação dos 4 operators já decididos.

**pgAudit fica mais barato aqui.** Se a migração pra Postgres via CloudNativePG (já decidido em `docs-human/pendencias.md`) usar as imagens padrão do operator, `pgaudit` costuma vir empacotado — ligar means só `shared_preload_libraries: "pgaudit"` no manifesto `Cluster` do CNPG, sem precisar de imagem customizada (diferente de hoje no Docker Compose puro, ver `docs/agents/infra-local.md`). **Confirmar isso na hora de implementar** — não travar essa afirmação como garantida sem checar a versão da imagem que o CNPG estiver publicando no momento.

**Avaliar, não decidido ainda:** políticas de rede (`NetworkPolicy` nativo do Kubernetes) restringindo quem fala com quem dentro do cluster — hoje, no Docker Compose, tudo que está na mesma `infra-network` se enxerga sem restrição. Também avaliar OPA/Gatekeeper ou Kyverno como camada de *policy enforcement* (bloquear deploy que não segue regra, não só alertar depois) — não pesquisei fundo o suficiente pra recomendar um dos dois, fica registrado como próxima pergunta a responder quando chegar a hora, não como decisão tomada.

## Quando ativar este arquivo

Mover a discussão daqui pra dentro de `infra-local.md` (ou criar a seção lá) só depois que o passo D do kit de bootstrap rodar de verdade e o cluster existir — até lá, isso fica registrado aqui como plano, igual `docs-human/pendencias.md` já faz pro resto do Kubernetes.
