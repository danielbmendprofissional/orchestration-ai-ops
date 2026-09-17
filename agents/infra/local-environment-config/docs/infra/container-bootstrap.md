# Subir a infra compartilhada local — procedimento do agente

Todos os caminhos abaixo são dentro do repositório `infra` (não deste agent). `infra/container/.env` guarda segredo real (mesmo que só de dev) — nunca ler o conteúdo dele em voz alta (log, relatório, chat) e nunca preencher valor sozinho.

## 0. Docker Desktop está rodando?

**Sempre checar antes de qualquer comando `docker`/`docker compose` daqui pra baixo** — nunca rodar `docker compose up`/`docker info` direto e ficar esperando: se o Docker Desktop não estiver aberto, o CLI do Docker no Windows pode levar minutos tentando conectar no daemon antes de desistir. Checar primeiro se o **processo** está de pé (isso é instantâneo, não toca o daemon):

```powershell
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
```

Não retornou nada (processo não existe): **Docker Desktop já deveria estar instalado** (Etapa 1, item 2 — sempre depende do humano). Se chegou até aqui e não está rodando, é só o app fechado: **parar aqui**, pedir pro humano abrir o Docker Desktop (não tentar abrir sozinho, é GUI) e confirmar quando estiver pronto. Nunca ficar tentando de novo sozinho nem esperando.

Retornou o processo: só então rodar `docker info` pra confirmar que o daemon já respondeu (pode levar alguns segundos enquanto o Docker Desktop ainda está subindo) — se der erro mesmo com o processo de pé, reportar que ainda está inicializando e pedir pro humano confirmar quando o ícone da bandeja mostrar "Docker Desktop is running".

## 1. Verificar

`infra/container/.env` existe? Se não existir: **parar aqui**, copiar `infra/container/examples/env.example` pra `infra/container/.env` só como esqueleto (valores placeholder), e devolver pro humano pedindo pra preencher os valores reais direto no arquivo (cada chave já vem comentada no próprio `env.example`) — nunca inventar senha/segredo.

Se `.env` já existe: confirmar que todas as chaves que `infra/container/docker-compose.yml` espera estão presentes (comparar com `examples/env.example` — mesmas chaves, não precisa saber os valores). Chave faltando = mesma regra acima, parar e devolver.

## 2. Subir

Dentro de `infra/container/`:
```powershell
docker compose up -d --build
```

## 3. Confirmar saúde

`docker compose ps` — todos os serviços `running`/`healthy`. Portas esperadas, uma por serviço:

- Postgres: `5432`
- pgAdmin: `15432`
- Keycloak: `8080`
- Redis: `6379`
- RabbitMQ: `15672`
- DefectDojo: `8443` (demora no primeiro boot)
- Grafana: `3000`
- Prometheus: `9090`

Exceção conhecida: `falco` pode falhar (driver eBPF, Docker Desktop/WSL2) — se falhar, comentar o serviço no `infra/container/docker-compose.yml`, registrar no relatório final, subir de novo sem ele. Não travar o resto por causa do Falco.

`defectdojo-initializer` demora (roda migration) — não é falha, é esperado no primeiro boot.

## 4. Devolver pro humano

Relatório curto: o que subiu, o que precisou de intervenção (chave faltando no `.env`, Falco fora), portas de cada serviço pra ele conferir.