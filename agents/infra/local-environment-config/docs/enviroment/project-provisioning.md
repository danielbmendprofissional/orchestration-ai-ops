# Nascimento de projeto novo — provisionar na infra compartilhada

Roda toda vez que um projeto novo precisa apontar pra infra compartilhada (repositório `ai-infra`, containers já de pé — ver `docs/infra/container-bootstrap.md` deste agent). `<projeto>` = nome do projeto.

**Nunca `-it`** — essas chamadas passam o comando inteiro como argumento (não abrem shell interativo), e `-it` pede um TTY que este agent não tem, podendo travar ou dar erro sem motivo aparente. Confirmar nome real do container antes de rodar, se tiver dúvida:
```powershell
docker compose -f ../../../../ai-infra/container/docker-compose.yml ps --format "{{.Name}}"
```

**Nunca assumir usuário/senha de admin fixo (`postgres`, admin default, etc.)** — ler `POSTGRES_USER`/`KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` de `ai-infra/container/.env` antes de qualquer comando abaixo. Esta infra, por exemplo, usa um usuário Postgres/Keycloak customizado, não o default de fábrica — comando com usuário errado falha (`role "postgres" does not exist`) ou, no caso do Keycloak, precisa de login explícito antes.

**Postgres** — criar o banco (`$pgUser` = valor de `POSTGRES_USER` no `.env`):
```powershell
docker exec <container-postgres> psql -U $pgUser -c "CREATE DATABASE <projeto>;"
```
Depois criar `ai-infra/banco/<projeto>/init-db.sql` (dentro do repositório `ai-infra`, não deste agent — organização interna do banco é decisão do projeto, sem padrão obrigatório aqui). Acesso: pgAdmin em `http://localhost:15432` (perfil completo) ou `psql`/qualquer client em `localhost:5432`, banco `<projeto>`, usuário `$pgUser`.

**RabbitMQ** — criar o vhost:
```powershell
docker exec <container-rabbitmq> rabbitmqctl add_vhost <projeto>
docker exec <container-rabbitmq> rabbitmqctl set_permissions -p <projeto> guest ".*" ".*" ".*"
```
Acesso: management UI em `http://localhost:15672` (login conforme `.env` do `ai-infra`), vhost `<projeto>` no seletor.

**Keycloak** — fazer login como admin antes (`kcadm.sh` não mantém sessão entre containers reiniciados), depois criar o realm (`$kcUser`/`$kcPass` = `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD` no `.env`):
```powershell
docker exec <container-keycloak> /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user $kcUser --password $kcPass
docker exec <container-keycloak> /opt/keycloak/bin/kcadm.sh create realms -s realm=<projeto> -s enabled=true
```
Acesso: admin console em `http://localhost:8080` → login com `$kcUser` → seletor de realm no canto superior esquerdo → `<projeto>`.

**Redis** — criar o ACL user restrito ao prefixo do projeto. **Gerar a senha de verdade antes de rodar o comando** (nunca deixar um placeholder tipo `senha-do-projeto` literal no comando — isso não é um valor que o humano fornece, é gerado aqui, mesma regra de "credencial gerada aqui: nunca hardcoded, avisar onde ficou guardada, nunca o valor em texto"):
```powershell
$senha = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 24 | ForEach-Object {[char]$_})
docker exec <container-redis> redis-cli ACL SETUSER <projeto> on ">$senha" "~<projeto>:*" "+@all" "-@dangerous"
```
Guardar `$senha` onde as outras credenciais geradas já ficam guardadas (nunca versionado, nunca no chat) — só reportar o **local** onde foi guardada, nunca o valor. Acesso: sem UI própria; testar com `docker exec <container-redis> redis-cli -u redis://<projeto>:<senha>@localhost:6379 PING` (comando de teste, não expõe a senha no relatório, só na hora de rodar).

## Correção pra projeto "existente" com config apontando errado

Se o projeto já tiver connection string/config (appsettings, `.env`, etc.) apontando pra um Postgres/Redis/RabbitMQ/Keycloak que não é este `ai-infra` compartilhado local (outra instância, `localhost` com porta diferente, container antigo) — isso é candidato a "Modificar", mesma confirmação nominal item por item da "Comparar com o template" no `CLAUDE.md`. Nunca sobrescrever esse valor sem aprovação explícita e nominal daquele item específico, mesmo que o resto do plano já tenha sido aprovado.
