# Limpar, remover ou recriar dados e recursos de um projeto

Roda na **Etapa 3 — Manutenção de projeto** (`CLAUDE.md`): o projeto já está provisionado na infra compartilhada e o humano quer apagar algo — tudo, só o conteúdo do banco, só os recursos de um serviço, ou refazer do zero. Tudo passa pelo `reset` do `infra-config.mjs` (README de `ai-infra/configs/infra/`, seção "Apagar dados ou recursos de um projeto"). **Nunca** `DROP`, `docker exec`, `redis-cli FLUSH*`, `rabbitmqctl` ou chamada solta ao Keycloak — mesma regra do provisionamento: o script só enxerga o que tem o nome do projeto e nunca toca em outro projeto nem na infra compartilhada.

Pré-requisito: infra de pé (`node infra-config.mjs verify`) e o projeto existir no `ai-infra/configs/infra/projects.json`. Comandos rodam em `ai-infra/configs/infra/`.

## 1. Entender o pedido (perguntar, nunca supor)

Traduzir o que o humano disse em **escopo** + **serviços**; dúvida = perguntar:

| O humano diz | Escopo | Serviços |
|---|---|---|
| "apaga tudo", "zera o projeto" | `tudo` (apaga a casa **e** os segredos; o próximo `apply` gera novos) | todos |
| "apaga tudo e recria" | `recriar` (volta vazia, mesmos segredos) | todos |
| "só o conteúdo do banco", "limpa os dados" | `dados` | `--servico=postgres` |
| "apaga o banco e as roles dele" | `recursos` | `--servico=postgres` |
| "limpa as filas" / "zera o cache" / "apaga os usuários do realm" | `dados` | `rabbitmq` / `redis` / `keycloak` |
| "apaga o realm" | `recursos` | `--servico=keycloak` |

Se o projeto tem **compose próprio** com containers/volumes (inventário do "Recriar o ambiente"): isso **não** é do `reset` — vira item "Remover candidato" com confirmação nominal, e volume/dado nunca é apagado por este agent.

## 2. Simular e mostrar

```powershell
node infra-config.mjs reset <projeto> --escopo=<escopo> [--servico=<lista>]
```

Sem `--confirmar` é só simulação. Mostrar a saída inteira ao humano (banco + tamanho, roles, nº de chaves Redis, mensagens, usuários do realm, variáveis do `.env` que sairiam).

## 3. Perguntar o backup — sempre

Se o banco do projeto entra no escopo, **perguntar explicitamente** ao humano: "quer um backup (`pg_dump`) do banco `<projeto>` antes de apagar?" — nunca decidir sozinho, nem assumir "sim" por padrão. O script recusa executar sem `--backup=sim|nao`. Avisar que só o Postgres tem backup automático (Redis, RabbitMQ e Keycloak são apagados sem cópia), e que o dump fica em `ai-infra/container/backups/` (fora do git).

## 4. Confirmar e executar

Plano completo (escopo, serviços, o que a simulação listou, backup sim/não) → **confirmação nominal** do humano (regra de "Fora de escopo": apagar config em uso). Só então:

```powershell
node infra-config.mjs reset <projeto> --escopo=<escopo> [--servico=<lista>] --confirmar=<projeto> --backup=<sim|nao>
```

(`--backup` só se o banco entra no escopo.) Erro em qualquer passo: parar e reportar (item 8 do Fluxo obrigatório) — o script apaga o banco só depois de o backup escolhido estar em disco.

## 5. Verificar de verdade (item 6 do Fluxo obrigatório)

- `dados`/`recriar`: `node infra-config.mjs verify --projeto=<projeto>` verde (o `recriar` já roda esse verify; conferir o resultado).
- `recursos`/`tudo`: o projeto fica **sem casa** de propósito — repetir o `reset` em simulação e confirmar que lista "não existe"; o `verify` do projeto vai falhar até recriar.
- Backup escolhido: conferir que o arquivo existe e não está vazio.

## 6. Depois

- `recursos`/`tudo`: dizer ao humano como voltar — `node infra-config.mjs apply` recria a casa (`tudo` gera segredos **novos**: rodar `secrets <projeto> --csproj=<csproj>` de novo, ver `project-provisioning.md` passo 4, e reabrir a API).
- Tirar o projeto do manifesto de vez = editar `projects.json` (diff mostrado ao humano) + `apply`; **não** é automático.
- **Restore** de dump é sempre do humano — nunca rodar `pg_restore`. Entregar o comando pronto (README, seção do `reset`) e parar.
- Se o projeto tem `docs/agents/relatorio-ambiente.md`, acrescentar uma linha em "O que foi feito" (data, escopo, serviços, backup sim/não e caminho do arquivo — nunca valor de credencial).
