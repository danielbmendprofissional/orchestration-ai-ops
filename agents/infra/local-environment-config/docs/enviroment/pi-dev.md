# `pi.dev` + adapter de MCP — procedimento do agente

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Erro de permissão (`EACCES`/`EPERM`/"Access is denied") → **parar aqui**, pedir pro humano rodar esse mesmo comando 1x num PowerShell como Administrador. Depois volta a ser tudo por conta do agent.

Confirmar: `pi --version` responde um número de versão.

```powershell
pi install npm:pi-mcp-adapter
```

Reiniciar `pi`. Confirmar que `/mcp` aparece como comando dentro de uma sessão `pi` — se não aparecer, o adapter não instalou, não seguir sem isso.