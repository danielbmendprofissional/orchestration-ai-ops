# Subir a infra compartilhada local — procedimento do agente

Todos os caminhos abaixo são dentro do repositório `ai-infra` (não deste agent). `ai-infra/container/.env` guarda segredo real (mesmo que só de dev) — nunca ler o conteúdo dele em voz alta (log, relatório, chat) e nunca preencher valor sozinho.

## 0. Docker Desktop está rodando?

**Sempre checar antes de qualquer comando `docker`/`docker compose` daqui pra baixo** — nunca rodar `docker compose up`/`docker info` direto e ficar esperando: se o Docker Desktop não estiver aberto, o CLI do Docker no Windows pode levar minutos tentando conectar no daemon antes de desistir. Checar primeiro se o **processo** está de pé (isso é instantâneo, não toca o daemon):

```powershell
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
```

Não retornou nada (processo não existe): **Docker Desktop já deveria estar instalado** (Etapa 1, item 2 — sempre depende do humano). Se chegou até aqui e não está rodando, é só o app fechado: **parar aqui**, pedir pro humano abrir o Docker Desktop (não tentar abrir sozinho, é GUI) e confirmar quando estiver pronto. Nunca ficar tentando de novo sozinho nem esperando.

Retornou o processo: só então rodar `docker info` pra confirmar que o daemon já respondeu (pode levar alguns segundos enquanto o Docker Desktop ainda está subindo) — se der erro mesmo com o processo de pé, reportar que ainda está inicializando e pedir pro humano confirmar quando o ícone da bandeja mostrar "Docker Desktop is running".

## 1. Verificar

`ai-infra/container/.env` existe? Se não existir: **parar aqui**, copiar `ai-infra/container/examples/env.example` pra `ai-infra/container/.env` só como esqueleto (valores placeholder), e devolver pro humano pedindo pra preencher os valores reais direto no arquivo (cada chave já vem comentada no próprio `env.example`) — nunca inventar senha/segredo.

Se `.env` já existe: confirmar que todas as chaves que `ai-infra/container/docker-compose.yml` espera estão presentes (comparar com `examples/env.example` — mesmas chaves, não precisa saber os valores). Chave faltando = mesma regra acima, parar e devolver.

## 2. Perguntar: tudo ou só o essencial?

**Sempre perguntar antes de subir** — não assumir "tudo" por padrão. Dois perfis:

- **Essencial** (`postgres`, `redis`, `rabbitmq`, `keycloak`, `omniroute`): cobre o que um projeto realmente depende pra rodar localmente — `omniroute` entra aqui porque sem ele o `pi` fica sem modelo (ver `docs/infra/omniroute.md`). Indicado pra máquina com pouca RAM ou uso curto (notebook secundário, sessão de um dia).
- **Completo** (todos os serviços do `docker-compose.yml`, incluindo `pgadmin`, `prometheus`/`grafana`/`loki`/`alloy`, `falco`, exporters): observabilidade e segurança completas, mais pesado.

## 3. Subir

Dentro de `ai-infra/container/`:
```powershell
# Completo
docker compose up -d --build

# Só essencial
docker compose up -d --build postgres redis rabbitmq keycloak omniroute
```

## 4. Confirmar saúde

`docker compose ps` — todos os serviços que você pediu pra subir devem estar `running`/`healthy`. Portas esperadas, uma por serviço:

- Postgres: `5432`
- pgAdmin: `15432` (só no perfil completo)
- Keycloak: `8080`
- Redis: `6379`
- OmniRoute: `20128` (dashboard + `/v1`, só em `127.0.0.1`) — configuração depois de subir: `docs/infra/omniroute.md`
- RabbitMQ: `15672`
- Grafana: `3000` (só no perfil completo)
- Prometheus: `9090` (só no perfil completo)

Exceção conhecida (perfil completo): `falco` pode falhar (driver eBPF, Docker Desktop/WSL2) — se falhar, comentar o serviço no `ai-infra/container/docker-compose.yml`, registrar no relatório final, subir de novo sem ele. Não travar o resto por causa do Falco.


## 5. Devolver pro humano

Relatório curto: qual perfil subiu (essencial/completo), o que precisou de intervenção (chave faltando no `.env`, Falco fora), porta **e URL de acesso** de cada serviço pra ele conferir (ex.: Keycloak admin em `http://localhost:8080`, pgAdmin em `http://localhost:15432`, RabbitMQ management em `http://localhost:15672`).