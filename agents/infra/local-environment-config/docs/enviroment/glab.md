# `glab` (CLI do GitLab) — procedimento do agente

**Nunca `winget install GLab.GLab`** — o instalador não garante entrada no PATH de forma confiável nesta máquina (sem Developer Mode/admin, o passo de PATH pode falhar em silêncio, ficando "instalado" sem o comando funcionar). Baixar o binário oficial direto e registrar o PATH manualmente, mesmo padrão usado pro RTK (`docs/tools/rtk.md`) — sem precisar de nenhum privilégio elevado:

```powershell
$binDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$tag = (Invoke-RestMethod "https://gitlab.com/api/v4/projects/gitlab-org%2Fcli/releases")[0].tag_name
$version = $tag.TrimStart('v')
$zipUrl = "https://gitlab.com/gitlab-org/cli/-/releases/$tag/downloads/glab_${version}_windows_amd64.zip"

Invoke-WebRequest -Uri $zipUrl -OutFile "$env:TEMP\glab.zip"
Expand-Archive -Path "$env:TEMP\glab.zip" -DestinationPath "$env:TEMP\glab-extract" -Force
Copy-Item "$env:TEMP\glab-extract\bin\glab.exe" "$binDir\glab.exe" -Force
Remove-Item "$env:TEMP\glab.zip", "$env:TEMP\glab-extract" -Recurse -Force

if (($env:Path -split ';') -notcontains $binDir) {
    [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";$binDir", "User")
}
```

**Verificação do PATH não é possível nesta sessão** (regra do `CLAUDE.md`, Fluxo obrigatório item 6, caso "depende de PATH") — uma nova chamada de ferramenta nesta sessão herda o ambiente já carregado, nunca vê a mudança de PATH recém-escrita no registro. Não tentar `where.exe glab` aqui. Em vez disso: confirmar que `$binDir\glab.exe` existe em disco (isso sim é verificável na sessão) e reportar exatamente isso ao humano.

**Parar aqui.** Pedir pro humano, **num terminal novo de verdade** (não uma nova chamada desta sessão):
1. `where.exe glab` — confirma que o PATH pegou.
2. `glab auth login` — escolher `gitlab.com` + "Login with a web browser" (ou colar um personal access token); autenticação abre navegador.
3. `glab auth status` — confirma a autenticação.

Reportar como "binário instalado, PATH escrito, aguardando confirmação do humano num terminal novo" — nunca como "concluído".
