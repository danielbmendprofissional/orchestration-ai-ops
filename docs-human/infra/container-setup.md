# Subir a infra compartilhada local — docs-human

**Os logins de admin são seus** (mesmo que só de dev). O resto, inclusive as senhas de máquina, o script faz.

## Primeira vez numa máquina nova

1. Copiar `container/examples/env.example` pra `container/.env` (o `.gitignore` já cobre, nunca vai pro git).
2. Preencher **só os logins de admin** (Postgres, pgAdmin, RabbitMQ, Keycloak, Grafana, OmniRoute). As senhas de máquina (serviço↔serviço e de cada projeto) o script gera e acrescenta no fim do `.env`.
3. Subir, configurar e verificar:
   ```powershell
   cd ai-infra\configs\infra
   node infra-config.mjs up
   ```
4. **Backup do `.env`** (Drive/gerenciador de senhas) — as senhas de máquina se regeneram com `apply` se o arquivo sumir; as chaves de provider do OmniRoute, não.

Nunca `docker compose up` puro numa máquina nova: o Redis não sobe sem o `.acl` gerado e o Keycloak precisa da role que o script cria.

## Confirma que subiu

`node infra-config.mjs verify` — termina com `✔ tudo conferido`. Prova saúde, portas só em 127.0.0.1, cada container só com os próprios segredos, e os muros entre projetos (Postgres, Redis, RabbitMQ, Keycloak). Acessos: `ai-infra/README.md`.

Falco fica no compose num perfil desligado (não roda no Docker Desktop/WSL2) — lembrete pro Kubernetes, ver `ai-ops/PENDENCIAS.md`.

## Se `.env` já existe e só precisa atualizar 1 valor

- Login de admin: edita direto e `docker compose restart <serviço>`. Grafana, Keycloak e RabbitMQ só usam o valor quando o volume nasce — trocar senha de admin que já existe é pela UI de cada um (e depois atualizar o `.env`, que os scripts usam pra logar).
- Segredo de máquina (`PG_*`, `REDIS_*`, `PROJECT_*`): apaga a linha e roda `node infra-config.mjs apply` — gera outra e reaplica em todo lugar. Depois recarregar o user-secrets do projeto.

## Atualizar versão de imagem

Só pelo agent `ai-ops/agents/infra/infra-versions-config`. Pra só olhar: `node infra-versions.mjs check`.
