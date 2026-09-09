# ai-ops

Repo separado do `ai-base` (template, copiado por projeto) e do `infra` (serviço rodando de verdade). Este aqui guarda automação que não pertence a nenhum projeto específico e não deve ser multiplicada por N cópias — hoje só o agent `infra-setup`.

## Estrutura

```
ai-ops/
  .pi/agents/infra-setup.md   → o agent
  README.md                   → este arquivo
```

Precisa estar na mesma pasta pai que `ai-base` e `infra` (pastas irmãs), porque o agent lê regra de um e escreve no outro por caminho relativo (`../ai-base`, `../infra`).

## Como rodar

1. Abre um terminal na pasta `ai-ops` (não dentro de `ai-base` nem `infra`):
   ```powershell
   cd "C:\Users\danib\source\repos\ai-ops"
   pi
   ```
2. Descreve o pedido — dois casos:
   - **Nascimento de projeto novo:** "prepara a infra pro projeto `<nome>`" — ele vai criar banco/vhost/realm/ACL padrão.
   - **Necessidade específica:** descreve o que o projeto precisa de diferente (ex: "esse projeto precisa de um serviço X a mais no infra") — ele avalia contra a regra do `ai-base` e monta o plano em cima disso.
3. O agent responde com um **plano detalhado**, item por item. Lê com atenção.
4. Aprova (ou pede ajuste) — só depois disso ele executa.
5. Ele te devolve um relatório: o que foi configurado, onde acessar cada coisa, e onde cada credencial nova foi guardada (nunca o valor da credencial em texto — só a localização).

## O que ele NÃO faz

Nada de AWS, Kubernetes, `git push`, `.gitlab-ci.yml`, restore de backup contra dado real, ou sobrescrever projeto já em uso sem confirmação item por item. Se der erro no meio do caminho, ele para e te avisa — não tenta contornar sozinho.