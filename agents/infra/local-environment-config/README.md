# infra-setup

Agent de configuração da infra compartilhada (repo `infra`). Roda com **Claude Code** — o `CLAUDE.md` desta pasta é carregado automaticamente como instrução de sistema quando você abre uma sessão aqui dentro. 

## Como rodar

1. Abre um terminal **dentro desta pasta** (não na raiz do `ai-ops`, não dentro de `ai-base` nem `infra`):
   ```powershell
   cd "C:\Users\danib\source\repos\ai-ops\agents\infra\local-environment-config"
   claude
   ```
2. Descreve o pedido — dois casos:
   - **Nascimento de projeto novo:** "prepara a infra pro projeto `<nome>`" — ele vai criar banco/vhost/realm/ACL padrão.
   - **Necessidade específica:** descreve o que o projeto precisa de diferente (ex: "esse projeto precisa de um serviço X a mais no infra") — ele avalia contra a regra do `ai-base` e monta o plano em cima disso.
3. O agent responde com um **plano detalhado**, item por item. Lê com atenção.
4. Aprova (ou pede ajuste) — só depois disso ele executa.
5. Ele te devolve um relatório: o que foi configurado, onde acessar cada coisa, e onde cada credencial nova foi guardada (nunca o valor da credencial em texto — só a localização).

## O que ele NÃO faz

Nada de AWS, Kubernetes, `git push`, `.gitlab-ci.yml`, restore de backup contra dado real, ou sobrescrever projeto já em uso sem confirmação item por item. Se der erro no meio do caminho, ele para e te avisa — não tenta contornar sozinho.
S
## Sobre os caminhos relativos

Esta pasta fica 4 níveis abaixo da raiz do `ai-ops` (`agents/infra/local-environment-config/`). `ai-base` e `infra` são pastas irmãs da raiz do `ai-ops`, não desta pasta — o caminho relativo daqui até elas é `../../../../ai-base` e `../../../../infra`. Ver `CLAUDE.md` pra como o agent usa isso.