# Subir a infra compartilhada local — procedimento do agente

`container/.env` guarda segredo real (mesmo que só de dev) — nunca ler o conteúdo dele em voz alta (log, relatório, chat) e nunca preencher valor sozinho.

## 1. Verificar

`container/.env` existe? Se não existir: **parar aqui**, copiar `container/examples/env.example` pra `container/.env` só como esqueleto (valores placeholder), e devolver pro humano pedindo pra preencher os valores reais direto no arquivo (cada chave já vem comentada no próprio `env.example`) — nunca inventar senha/segredo.

Se `.env` já existe: confirmar que todas as chaves que `docker-compose.yml` espera estão presentes (comparar com `examples/env.example` — mesmas chaves, não precisa saber os valores). Chave faltando = mesma regra acima, parar e devolver.

## 2. Subir

Dentro de `container/`:
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

Exceção conhecida: `falco` pode falhar (driver eBPF, Docker Desktop/WSL2) — se falhar, comentar o serviço no `docker-compose.yml`, registrar no relatório final, subir de novo sem ele. Não travar o resto por causa do Falco.

`defectdojo-initializer` demora (roda migration) — não é falha, é esperado no primeiro boot.

## 4. Devolver pro humano

Relatório curto: o que subiu, o que precisou de intervenção (chave faltando no `.env`, Falco fora), portas de cada serviço pra ele conferir.