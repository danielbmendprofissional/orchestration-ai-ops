# Modos do Claude Code (`claude-pago` / `claude-free`) — procedimento do agente

O Claude Code é a única ferramenta de IA dos projetos. Por padrão (`claude`) ele usa a assinatura do humano, direto na Anthropic. Os modos `claude-pago` e `claude-free` abrem o **mesmo** Claude Code apontado pro OmniRoute (`docs/infra/omniroute.md`), com os apelidos de modelo dos subagentes (`opus`/`sonnet`/`haiku`) mapeados pros combos. Por quê e mapeamento: `ai-base/docs/agents/orchestration.md` ("Três modos").

**Regra fixa:** a assinatura do Claude nunca passa pelo OmniRoute — nunca cadastrar Claude/Anthropic como provider lá, nunca copiar token de login do Claude pra outro programa. Os modos usam só a key de cliente `pi` do OmniRoute (`OMNIROUTE_API_KEY`), lida na hora pelo `apiKeyHelper`; nenhuma chave fica gravada em arquivo.

Pré-requisito: `claude --version` responde; OmniRoute saudável com os combos `pi-code`/`pi-quality`/`pi-exec`/`pi-light` (`node omniroute-config.mjs diff` limpo); `OMNIROUTE_API_KEY` definida no Windows (variável de usuário, `apply --setx`).

## 1. Arquivos em `~/.claude/modos/` — agent executa

`get-omniroute-key.cmd` (lê a variável, nunca o valor no arquivo):

```
@powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('OMNIROUTE_API_KEY','User')"
```

`pago.json` (em `free.json`: `pi-exec` no lugar de `pi-code`/`pi-quality`, `pi-light` no lugar de `pi-exec`):

```json
{
  "apiKeyHelper": "C:/Users/<usuario>/.claude/modos/get-omniroute-key.cmd",
  "model": "pi-code",
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:20128",
    "ANTHROPIC_MODEL": "pi-code",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "pi-quality",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "pi-code",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "pi-exec",
    "MAX_THINKING_TOKENS": "0",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "DISABLE_TELEMETRY": "1",
    "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL": "0"
  }
}
```

- `MAX_THINKING_TOKENS: 0` — DeepSeek e Luna só aceitam o histórico um do outro sem raciocínio (`ai-infra/configs/omniroute/combos.md`).
- `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL: 0` — neutraliza a flag se ela estiver ligada no `~/.claude/settings.json`: o OmniRoute nunca pode ser tratado como a Anthropic.
- `~/.claude/settings.json` (RTK, login, preferências) **não é alterado**.

## 2. Atalhos no perfil do PowerShell — agent executa

Em `$PROFILE.CurrentUserAllHosts` (criar se não existir; acrescentar, nunca sobrescrever; em PowerShell 7 também no perfil do `pwsh`):

```powershell
# Modos do Claude Code via OmniRoute (ai-ops/agents/infra/local-environment-config/docs/enviroment/claude-modos.md)
function claude-pago { claude --settings "$HOME\.claude\modos\pago.json" @args }
function claude-free { claude --settings "$HOME\.claude\modos\free.json" @args }
```

Confirmar: `powershell -NoProfile -Command ". '<perfil>'; (Get-Command claude-pago, claude-free).Name"`.

## 3. Verificar de verdade — agent executa

Numa pasta temporária (fora de projeto):

```powershell
claude --settings "$HOME\.claude\modos\pago.json" -p "Responda apenas: funcionando" --output-format json
```

- Tem que aparecer o aviso *"another auth source is set and takes precedence over your claude.ai login"* — prova de que **não** usou a assinatura.
- `docker logs --since 2m omniroute` tem que mostrar `Model deepseek/deepseek-v4-flash succeeded`.
- Subagente: criar `.claude/agents/escritor.md` com `model: haiku` e pedir pra ele criar um arquivo; o log tem que mostrar `pi-code` pro pai e `pi-exec` pro subagente.
- O "custo" que o Claude Code mostra nesses modos é estimativa pela tabela da Anthropic — o real está no painel do OmniRoute.

Falhou com 401: `OMNIROUTE_API_KEY` ausente ou de outra instância (`apply --setx` de novo). Sem resposta: OmniRoute fora (`infra-config.mjs up`).
