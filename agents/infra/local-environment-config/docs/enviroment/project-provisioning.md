# Nascimento de projeto novo — provisionar na infra compartilhada

Roda toda vez que um projeto novo precisa apontar pra infra compartilhada (repositório `infra`, containers já de pé — ver `docs/infra/container-bootstrap.md` deste agent). `<projeto>` = nome do projeto.

**Postgres** — criar o banco:
```powershell
docker exec -it <container-postgres> psql -U postgres -c "CREATE DATABASE <projeto>;"
```
Depois criar `infra/banco/<projeto>/init-db.sql` (dentro do repositório `infra`, não deste agent — organização interna do banco é decisão do projeto, sem padrão obrigatório aqui).

**RabbitMQ** — criar o vhost:
```powershell
docker exec -it <container-rabbitmq> rabbitmqctl add_vhost <projeto>
docker exec -it <container-rabbitmq> rabbitmqctl set_permissions -p <projeto> guest ".*" ".*" ".*"
```

**Keycloak** — criar o realm:
```powershell
docker exec -it <container-keycloak> /opt/keycloak/bin/kcadm.sh create realms -s realm=<projeto> -s enabled=true
```

**Redis** — criar o ACL user restrito ao prefixo do projeto (senha gerada aqui: nunca hardcoded, avisar onde ficou guardada — nunca o valor em texto):
```powershell
docker exec -it <container-redis> redis-cli ACL SETUSER <projeto> on ">senha-do-projeto" "~<projeto>:*" "+@all" "-@dangerous"
```