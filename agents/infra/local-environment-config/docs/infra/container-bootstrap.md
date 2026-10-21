# Subir a infra compartilhada local — procedimento do agente

Todos os caminhos abaixo são dentro do repositório `ai-infra` (não deste agent). Ler antes `ai-infra/configs/infra/README.md`. `ai-infra/container/.env` guarda segredo real (mesmo que só de dev) — nunca ler o conteúdo dele em voz alta (log, relatório, chat) e nunca preencher valor sozinho.

## 0. Docker Desktop está rodando?

**Sempre checar antes de qualquer comando `docker` daqui pra baixo** — se o Docker Desktop não estiver aberto, o CLI pode levar minutos tentando conectar. Checar primeiro o **processo** (instantâneo):

```powershell
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
```

Não retornou nada: **parar aqui**, pedir pro humano abrir o Docker Desktop (GUI, nunca abrir sozinho) e confirmar quando estiver pronto. Retornou: `docker info` pra confirmar que o daemon respondeu; erro com o processo de pé = ainda inicializando, pedir pro humano confirmar quando o ícone mostrar "Docker Desktop is running".

## 1. Verificar o `.env`

`ai-infra/container/.env` existe? Se não: **parar**, copiar `ai-infra/container/examples/env.example` pra `ai-infra/container/.env` só como esqueleto e devolver pro humano preencher os logins de admin direto no arquivo — nunca inventar senha.

Se existe: confirmar que as chaves de `examples/env.example` estão todas presentes (só presença, nunca valor). As senhas de máquina (`PG_*`, `REDIS_*`, `PROJECT_*`) **não** são checadas aqui: o script gera as que faltarem — é esperado que não existam numa máquina nova.

## 2. Subir, configurar e verificar

**Nunca `docker compose up` direto** numa máquina nova (Redis não sobe sem o `.acl` gerado, Keycloak precisa da role/banco que o script cria). Um comando faz tudo, na ordem certa:

```powershell
cd ai-infra\configs\infra
node infra-config.mjs up
```

Ele gera os segredos de máquina que faltam, gera `container/generated/`, sobe Postgres+Redis, cria roles/bancos/muros, sobe o resto, cria vhosts/realms/usuários de cada projeto do manifesto, recarrega pgAdmin/Prometheus/Alloy e termina com `verify`. Não tem perfil "essencial/completo": a stack é uma só (o Falco fica fora, num perfil desligado — não é erro).

Resultado esperado: última linha `✔ tudo conferido`. `! prometheus projects (<projeto>): down` é aviso, não erro (API do projeto não está rodando). Qualquer `✘` = erro (regra do item 8 do Fluxo obrigatório): parar e reportar a saída inteira.

Infra já de pé (rodada seguinte, idempotente): `node infra-config.mjs verify`. Só se algo estiver vermelho por configuração (não por container caído), `node infra-config.mjs diff` e, com aprovação, `apply`.

## 3. Devolver pro humano

Relatório curto: resultado do `verify`, o que precisou de intervenção (chave de admin faltando no `.env`), quais segredos de máquina foram gerados (só os **nomes**, que o script imprime), e URL de cada serviço — todos só em `127.0.0.1`:

| Serviço | Acesso |
|---|---|
| Postgres | `localhost:5432` · pgAdmin http://localhost:15432 |
| Keycloak | http://localhost:8080 |
| Redis | `localhost:6379` (sem UI) |
| RabbitMQ | `localhost:5672` · UI http://localhost:15672 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Loki / Alloy | `localhost:3100` · UI http://localhost:12345 · OTLP `localhost:4317`/`4318` |
| OmniRoute | http://localhost:20128 — configuração: `docs/infra/omniroute.md` |

Lembrar o humano: **backup do `ai-infra/container/.env`** (as senhas de máquina se regeneram com `apply`; as chaves de provider do OmniRoute, não).
