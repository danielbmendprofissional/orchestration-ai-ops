# RTK — instalação (procedimento do agente)

Ferramenta de economia de token, opcional — perguntar ao humano se quer instalar antes de rodar qualquer coisa deste arquivo. Comandos assumem Windows/PowerShell.

## Instalar o binário

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.local\bin"
Invoke-WebRequest -Uri "https://github.com/rtk-ai/rtk/releases/latest/download/rtk-x86_64-pc-windows-msvc.zip" -OutFile "$env:USERPROFILE\.local\bin\rtk.zip"
Expand-Archive -Path "$env:USERPROFILE\.local\bin\rtk.zip" -DestinationPath "$env:USERPROFILE\.local\bin" -Force
Remove-Item "$env:USERPROFILE\.local\bin\rtk.zip"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.local\bin", "User")
```

PATH novo só é lido num terminal novo → **parar aqui**, pedir pro humano fechar e abrir o PowerShell de novo. Confirmar depois: `rtk --version` (exigir >= 0.37.2 — versão com hook nativo binário).

```powershell
rtk init -g
rtk init -g --opencode
```

Confirmar: `rtk init --show` (hook nativo, `RTK.md`, `settings.json`).

## Bug conhecido (Windows) — não é falha de instalação se acontecer

Hook do RTK pode desaparecer de `settings.json` depois do primeiro comando (Claude Code reescreve o arquivo) — reinstalar (`rtk init -g`) resolve. `ls`, `wc`, `dir`, `echo` podem falhar via RTK no PowerShell (são aliases/built-ins).

