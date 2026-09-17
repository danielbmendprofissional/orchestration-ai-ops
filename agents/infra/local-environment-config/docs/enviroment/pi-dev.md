# `pi.dev` + adapter de MCP — procedimento do agente

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Erro de permissão (`EACCES`/`EPERM`/"Access is denied") → **parar aqui**, pedir pro humano rodar esse mesmo comando 1x num PowerShell como Administrador. Depois volta a ser tudo por conta do agent.

Confirmar: `pi --version` responde um número de versão.

```powershell
pi install npm:pi-mcp-adapter
```

**Verificar de verdade antes de declarar concluído** (regra do `CLAUDE.md`, Fluxo obrigatório item 6 — caso verificável nesta mesma sessão, não depende de PATH): `pi install` grava a intenção em `~/.pi/agent/settings.json` (`"packages": ["npm:pi-mcp-adapter"]`) mesmo que a instalação real do pacote via `npm` falhe por trás — instalação global de `npm` no Windows falha de forma intermitente e silenciosa (antivírus travando arquivo recém-escrito, cache corrompido). `settings.json` dizer que o pacote está registrado não prova que ele existe. Confirmar:

```powershell
npm list -g pi-mcp-adapter
```

Não apareceu / deu erro: rodar `pi install npm:pi-mcp-adapter` de novo (idempotente, seguro repetir) e verificar de novo. Falhou duas vezes seguidas: é erro de verdade (regra do `CLAUDE.md`, item 8) — parar e reportar, nunca tentar uma terceira vez sozinho.

Confirmado que `npm list -g pi-mcp-adapter` resolve: reiniciar `pi` (fechar e abrir de novo a sessão `pi` — não só o terminal) e confirmar que `/mcp` aparece como comando. Não aparecer mesmo com o pacote instalado: problema diferente (versão do adapter incompatível com a versão de `pi`, por exemplo) — reportar como erro, não seguir sem isso.