# infra-setup

Agent de configuração da infra compartilhada (repo `ai-infra`). Roda com **Claude Code** — o `CLAUDE.md` desta pasta é carregado automaticamente como instrução de sistema quando você abre uma sessão aqui dentro. 

## Como rodar

1. Abre um terminal **dentro desta pasta** (não na raiz do `ai-ops`, não dentro de `ai-infra`):
   ```powershell
   cd "C:\Users\danib\source\repos\orquestracao-ai\ai-ops\agents\infra\local-environment-config"
   claude
   ```
2. Descreve o pedido — três casos:
   - **Projeto que ainda não existe:** "quero criar um projeto novo".
   - **Projeto que já existe** (inclusive aplicação antiga, sem ambiente de IA ou com `ai-base` velho): "configura o projeto em `<caminho completo>`" — ele **recria o ambiente**: inventário, docs/agents/hooks do template atual adaptados ao layout do projeto (que nunca é convertido), casa na infra compartilhada, e uma spec + issue de adequação pro que for código (ele não mexe em código nem migra dados). Procedimento: `docs/enviroment/recriar-projeto.md`. — **sempre** com o `claude` aberto dentro desta pasta (passo 1), nunca de dentro da pasta do projeto: abrir `claude` lá carregaria o `CLAUDE.md` do próprio projeto (herdado do `ai-base`), não este agent.
   - **Necessidade específica de infra:** descreve o que falta (ex: "esse projeto precisa de um serviço X a mais no infra").
3. O agent responde com um **plano detalhado**, item por item. Lê com atenção.
4. Aprova (ou pede ajuste) — só depois disso ele executa.
5. Ele te devolve um relatório: o que foi configurado, onde acessar cada coisa, e onde cada credencial nova foi guardada (nunca o valor da credencial em texto — só a localização).

## O que ele NÃO faz

Nada de AWS, Kubernetes, `git push`, merge, `.gitlab-ci.yml`, restore de backup contra dado real, `ng new`/`dotnet new` ou decisão de arquitetura/domínio, ou sobrescrever projeto já em uso sem confirmação item por item. Se der erro no meio do caminho, ele para e te avisa — não tenta contornar sozinho.

## Sobre os caminhos relativos

Esta pasta fica 4 níveis abaixo da raiz do `ai-ops` (`agents/infra/local-environment-config/`). `ai-infra` é pasta irmã da raiz do `ai-ops`, não desta pasta — o caminho relativo daqui até ela é `../../../../ai-infra`. A pasta de projeto que o agent configura na Etapa 2 não tem caminho fixo — é sempre a que o humano indicar, com nome próprio (ex. `projeto-x`, nunca `ai-base`). Ver `CLAUDE.md` pra como o agent usa isso, inclusive o único ponto em que ele lida com `ai-base` (nascimento de projeto novo).