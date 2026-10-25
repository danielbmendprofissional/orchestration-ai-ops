# OmniRoute (gateway de LLM dos modos `claude-pago`/`claude-free`) — procedimento do agente

OmniRoute é o gateway (OpenAI e Anthropic-compatible) que fica na frente dos modelos que não são a assinatura do Claude: nos modos `claude-pago`/`claude-free`, o Claude Code usa combos dele (`omni-pago`, `omni-review`, `omni-free`, `omni-light` — nomes históricos), nunca provider direto. Serviço `omniroute` em `ai-infra/container/docker-compose.yml`.

**Configuração é código:** tudo (providers, combos, settings, keys) vive em `ai-infra/configs/omniroute/config/*.json` (git, sem segredo) + `ai-infra/container/.env` (segredos), aplicado por `ai-infra/configs/omniroute/omniroute-config.mjs`. Ler `ai-infra/configs/omniroute/README.md` (como funciona) e `combos.md` (por quê) antes deste procedimento. O agent **nunca configura pelo dashboard** — só pelo script, que é idempotente e tem `diff` (dry-run).

Roda depois de `docs/infra/container-bootstrap.md` (o container sobe junto no `infra-config.mjs up`).

## 1. Instância antiga fora do Docker (migração, uma vez só)

Perguntar ao humano se já existe OmniRoute rodando fora do Docker (npm global, dados em `~/.omniroute`). Se existir e `ai-infra/configs/omniroute/config/` ainda não tiver `providers.json`, a configuração dele precisa virar código **antes** de subir o container (mesma porta `20128`, os dois juntos conflitam):

1. **Depende do humano:** subir a instância antiga (`omniroute serve`, se não estiver rodando) e, **no terminal dele** (a senha do dashboard antigo é dele, nunca passa por esta sessão):
   ```powershell
   cd infraconfigsomniroute
   node omniroute-config.mjs export --harvest-secrets --ask-password
   ```
   Isso grava `config/*.json` (estado atual) e as chaves de provider no `ai-infra/container/.env` — o agent nunca vê os valores. Pedir pro humano commitar esse snapshot como está (baseline: o `git diff` das decisões fica legível depois).
2. **Agent executa:** aplicar em `config/*.json` as decisões do `combos.md` que ainda não estiverem lá (combos `pool-exec-free`/`omni-pago`/`omni-free`/`omni-light`/`omni-review`, Caveman off, semantic cache off, providers `deepseek`/`openai`, keys `claude-modos`/`eval` com `windowsEnv`) — só edição de arquivo, mostrar o diff, humano revisa e commita. Combo antigo fora do `combos.md` (ex.: `pi.dev`): perguntar nominalmente se remove.
3. **Depende do humano:** parar a instância antiga. Só depois disso subir o container (passo 3).

Desinstalar o npm global e apagar `~/.omniroute`/pasta de export antiga: só depois do passo 6 (prova ponta a ponta) passar, e sempre o humano.

## 2. Senha inicial do dashboard

`OMNIROUTE_INITIAL_PASSWORD` em `ai-infra/container/.env` (já coberto pela checagem de chaves do `container-bootstrap.md`, item 1 — chave nova em `examples/env.example`). Faltando: parar, pedir pro humano preencher direto no arquivo. Nunca gerar nem ler o valor.

## 3. Saúde

```powershell
docker compose ps omniroute          # dentro de ai-infra/container — esperar "healthy"
curl.exe -s -o NUL -w "%{http_code}" http://localhost:20128/
```

`healthy` + HTTP 200/302/307 = de pé. Confirmar também que a porta **não** está exposta na rede (o compose prende em `127.0.0.1`):

```powershell
Get-NetTCPConnection -LocalPort 20128 -State Listen | Select-Object LocalAddress
```

`LocalAddress` diferente de `127.0.0.1` = erro (regra do item 8 do Fluxo obrigatório): parar e reportar — gateway com chave de provider aberto na rede.

## 4. Aplicar a configuração — agent executa (depois do diff aprovado)

Chaves que o `apply` precisa no `ai-infra/container/.env`: uma por provider em `config/providers.json` (nome = o placeholder `${ENV:...}` de cada um). Faltando alguma: **depende do humano** — "falta `OMNIROUTE_KEY_<PROVIDER>` no `ai-infra/container/.env`, preencha direto no arquivo" (nunca pelo chat). Contas DeepSeek/OpenAI com recarga automática desligada — o saldo pré-pago é o teto de gasto (decisão do humano, só lembrar).

```powershell
cd infraconfigsomniroute
node omniroute-config.mjs diff        # mostrar o plano ao humano, aguardar aprovação
node omniroute-config.mjs apply --setx
node omniroute-config.mjs diff        # verificação: tem que sair "0 mudança(s)"
```

`--setx` grava no Windows as keys de cliente recém-criadas (`claude-modos` → `OMNIROUTE_API_KEY`, `eval` → `OMNIROUTE_EVAL_KEY`) sem o valor passar pelo terminal. `--prune` (remover o que está na instância e não no git) só com confirmação nominal do humano — é remoção de config em uso.

Saída com "Pendências" (segredo ausente, erro de API): regra do item 8 do Fluxo obrigatório — parar e reportar, nunca contornar. Segundo `diff` diferente de 0: erro, reportar o que sobrou.

Variável nova no registro não aparece nesta sessão (Fluxo obrigatório, item 6) — pedir confirmação num terminal novo de verdade.

## 5. Cliente: modos do Claude Code

O cliente do OmniRoute é o Claude Code nos modos `claude-pago`/`claude-free` (o OmniRoute fala o formato da Anthropic em `/v1/messages`). Configuração do lado do cliente: `docs/enviroment/claude-modos.md` — roda depois deste arquivo.

## 6. Prova ponta a ponta

Só depois do humano confirmar a `OMNIROUTE_API_KEY` num terminal novo. Pedir confirmação antes (gasta cota free; não é dinheiro):

```powershell
$k = [Environment]::GetEnvironmentVariable('OMNIROUTE_API_KEY','User')
Invoke-RestMethod http://localhost:20128/v1/messages -Method Post -Headers @{ 'x-api-key' = $k; 'anthropic-version' = '2023-06-01' } -ContentType 'application/json' -Body '{"model":"omni-light","max_tokens":20,"messages":[{"role":"user","content":"say ok"}]}'
```

`omni-pago`/`omni-review` (pagos) ficam pro `claude-modos.md` e pro `smoke-test.md` da Etapa 2.

## 7. Relatório

Dashboard `http://localhost:20128` (senha: `ai-infra/container/.env`, campo `OMNIROUTE_INITIAL_PASSWORD` — não trocar pelo dashboard, o `apply` loga com ela), endpoint `http://localhost:20128/v1`, variáveis `OMNIROUTE_API_KEY`/`OMNIROUTE_EVAL_KEY` (só presença), resultado do `diff` final, pendências do `apply`, lembrete de backup do `ai-infra/container/.env` (única peça não reconstruível), e o próximo passo recomendado: rodar `ai-ops/tools/omniroute-eval` pra ordenar os combos com dado real (o humano roda, fora deste agent — fica em `ai-ops`, que este agent nunca altera).
