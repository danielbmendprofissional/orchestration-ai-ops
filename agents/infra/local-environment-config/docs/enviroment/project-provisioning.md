# Provisionar um projeto na infra compartilhada

Banco, vhost, realm, usuário Redis e alvo de métricas de um projeto **não são criados com comando solto**: o projeto é declarado no manifesto `ai-infra/configs/infra/projects.json` e o `infra-config.mjs` cria/ajusta tudo, com os muros entre projetos. Ler antes `ai-infra/configs/infra/README.md` (manifesto, opções, segredos) e o contrato do lado do projeto em `docs/agents/infra-local.md` (dentro da pasta do projeto).

Pré-requisito: infra de pé e verde (`docs/infra/container-bootstrap.md` deste agent). Todos os comandos abaixo rodam dentro de `ai-infra/configs/infra/`.

## 1. Levantar o que o projeto usa

Do próprio projeto (nunca adivinhar): Postgres? RabbitMQ? Redis? Keycloak? Porta do `/metrics` da API? Fontes: `CONTEXT-MAP.md`, ADRs (`docs/adr/`), `appsettings*.json`, `launchSettings.json`. Pro Keycloak: caminho do callback de login (ADR de autenticação — padrão BFF: `<frontend>/api/.../auth/callback`), roles, se a API usa Admin API (service account). Faltou informação → item "depende do humano", perguntar.

Nome do projeto: só minúsculas e dígitos (vira banco/role/vhost/realm/prefixo).

## 2. Editar o manifesto (agent executa)

Acrescentar a entrada `<projeto>` em `projects.json` com só o que o projeto usa — formato e opções no `README.md` de lá. Projeto que cria as próprias roles por SQL (estilo Valuto): `postgres.roles: "project"`, `memberPattern` e `initScript` (`banco/<projeto>/init-db.sql` dentro do `ai-infra`). Projeto novo comum: `"postgres": {}` (owner + app padrão), sem pasta em `banco/`.

Mostrar o diff do `projects.json` ao humano.

## 3. Aplicar

```powershell
node infra-config.mjs diff      # mostrar ao humano o que vai ser criado
node infra-config.mjs apply
node infra-config.mjs verify    # tem que terminar com "✔ tudo conferido"
```

Senhas do projeto: geradas pelo `apply` no `ai-infra/container/.env` (`PROJECT_<PROJETO>_*`) — nunca o agent gera/escreve/lê valor. Relatar só **onde** ficaram.

`verify` vermelho = erro (regra do item 8 do Fluxo obrigatório): parar e reportar a saída inteira.

## 4. Ligar o projeto (dentro da pasta do projeto)

O app lê as chaves do contrato (`docs/agents/infra-local.md` do projeto), que o `apply` gravou em `ai-infra/container/generated/projects/<projeto>.secrets.json`. Em dev, .NET via user-secrets — **agent executa** se o `.csproj` da API já existe:

```powershell
node infra-config.mjs secrets <projeto> --csproj=<caminho completo do csproj da API>
```

Grava direto no `secrets.json` do user-secrets (mescla, sem BOM, nunca imprime valor). **Nunca** `Get-Content ... | dotnet user-secrets set`: no PowerShell 5.1 o pipe põe BOM e o `dotnet` recusa o JSON. Sem `<UserSecretsId>` no csproj, o comando para e pede `dotnet user-secrets init --project <csproj>` — isso muda o csproj (arquivo do projeto): item com confirmação nominal. Verificar: `dotnet user-secrets list --project <csproj>` mostra as chaves do contrato (conferir só os nomes, nunca imprimir valores no relatório).

**Projeto "existente" com config apontando pra outra coisa** (superusuário do Postgres, `guest` do RabbitMQ, vhost `/`, Redis sem usuário, connection string em `appsettings.Development.json` versionado, nome de chave fora do contrato): candidato a "Modificar" — confirmação nominal item por item, nunca sobrescrever sozinho. É mudança de código/config do projeto; se precisar renomear chave lida pelo código, vira pendência pro humano/Claude Code, não deste agent.

## 5. Acessos pro relatório

| Serviço | Onde | Usuário | Onde está a senha |
|---|---|---|---|
| Postgres | `localhost:5432`, banco `<projeto>` (pgAdmin http://localhost:15432, grupo `<projeto>`) | `<projeto>_owner` / `<projeto>_app` | `.env`: `PROJECT_<P>_PG_OWNER_PASSWORD` / `_PG_APP_PASSWORD` |
| RabbitMQ | `localhost:5672`, vhost `<projeto>` (UI http://localhost:15672 com o admin) | `<projeto>` | `.env`: `PROJECT_<P>_RABBITMQ_PASSWORD` |
| Redis | `localhost:6379`, prefixo `<projeto>:` | `<projeto>` | `.env`: `PROJECT_<P>_REDIS_PASSWORD` |
| Keycloak | http://localhost:8080/admin → realm `<projeto>`; client `<projeto>-api`; usuário de teste `dev` | — | `.env`: `PROJECT_<P>_KEYCLOAK_CLIENT_SECRET` / `_KEYCLOAK_DEV_PASSWORD` |
| Logs/métricas | Grafana http://localhost:3000, pasta `infra`, filtro Projeto = `<projeto>` | admin do Grafana | `.env`: `GF_SECURITY_ADMIN_PASSWORD` |

Teste por item = a linha correspondente do `verify` (muros do Postgres/Redis/RabbitMQ, realm e segredo do Keycloak, alvo `projects (<projeto>)` no Prometheus — `down` é esperado enquanto a API não estiver rodando).
