# infra-versions-config

Agent que mantém as imagens da infra compartilhada (`ai-infra/container/docker-compose.yml`) atualizadas **com segurança**: descobre versão nova, lê a release note, propõe um plano, e só depois de aprovado atualiza **uma imagem por vez**, verificando tudo (`infra-config.mjs verify`) e voltando a versão anterior sozinho se algo quebrar.

As versões ficam fixas no compose de propósito (reprodutível) — este agent é o único caminho de upgrade.

## Como rodar

```powershell
cd "<raiz-do-workspace>\ai-ops\agents\infra\infra-versions-config"
claude
```

Pedir, por exemplo:
- *"verifica se tem atualização"* — só o levantamento + plano, nada é mudado.
- *"atualiza os patches"* — plano com os patches, você aprova, ele aplica um por um.
- *"quero ir pro RabbitMQ 4"* — major: ele lê as notas, explica o que exige, e você decide.

Só pra olhar, sem agent:

```powershell
cd ai-infra\configs\infra
node infra-versions.mjs check
```

## O que ele NÃO faz

Commit/push, major sem sua decisão, restore de backup, apagar volume, mudar configuração de projeto (isso é o `local-environment-config`). Se algo der errado ele faz rollback da tag, verifica de novo e para.
