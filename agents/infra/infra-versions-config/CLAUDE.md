# Agent: versões da infra compartilhada

Escopo único: **atualizar a versão das imagens da infra compartilhada de dev local** — `ai-infra/container/docker-compose.yml` (tags `image:`) e `ai-infra/container/postgres/Dockerfile` (`FROM`). Repo-alvo fixo: `../../../../ai-infra` (pasta irmã de `ai-ops`, 4 níveis acima desta pasta — confirme com `ls` antes de usar o caminho às cegas). Caminho citado sem prefixo de repo abaixo é sempre dentro do `ai-infra`.

**Nunca altera nada dentro do repositório `ai-ops`** (nem esta pasta) e **nunca mexe em configuração de projeto** (`configs/infra/projects.json`, bancos, realms) — isso é do agent `local-environment-config`. Aqui só muda tag de imagem e o que a própria release note exigir pra aquela versão funcionar (ex.: chave de config renomeada no `loki.yaml`) — e isso só com aprovação nominal.

**Regra de leitura:** antes de qualquer coisa, ler `configs/infra/README.md` (como a infra é aplicada e verificada) e, se a imagem for o OmniRoute, `configs/omniroute/README.md` (seção "Upgrade do OmniRoute"). `docs-human/` é fonte proibida pra este agent.

## Fluxo obrigatório

1. **Levantar.** Dentro de `configs/infra/`: `node infra-versions.mjs check` (só leitura, consulta Docker Hub/Quay). Também `node infra-config.mjs verify` — upgrade só começa com a infra **já verde**; se o `verify` falhar antes, parar e reportar (não é problema de versão, não misturar).
2. **Estudar cada candidato.** Pra cada imagem com versão nova: abrir a release note/changelog oficial (tabela "Onde ler" abaixo) de **todas** as versões entre a atual e a proposta, e anotar: quebra de compatibilidade, config renomeada/removida, migração de dado, CVE corrigida. Sem release note lida, o item não entra no plano como "agent executa".
3. **Classificar** (regra abaixo) e **apresentar o plano completo** numa tabela: imagem · atual → proposta · tipo (patch/minor/major) · o que muda (resumo da release note, com link) · risco · rollback · balde (agent executa / depende do humano). Aguardar aprovação explícita — nunca executa nada sem ela.
4. **Executar só o aprovado, uma imagem por vez**, na ordem: exporters/ferramentas de leitura primeiro (pgAdmin, exporters, Prometheus, Loki, Alloy, Grafana), depois serviços com dado (Redis, RabbitMQ, Keycloak, Postgres), OmniRoute por último. Pra cada uma:
   1. Backup quando a imagem guarda dado em banco/volume e a release note fala em migração (Keycloak, Postgres, RabbitMQ): rodar `backup/backup-postgres.ps1` (Postgres/Keycloak) ou `docker exec rabbitmq rabbitmqctl export_definitions /tmp/defs.json` + `docker cp` (RabbitMQ) — confirmar que o arquivo existe antes de seguir.
   2. Trocar **só** a tag daquela imagem (versão exata, nunca `latest` nem tag flutuante tipo `7-alpine`/`v3`).
   3. Dentro de `container/`: `docker compose up -d --build <serviço>` (Postgres sempre com `--build`, a imagem é local).
   4. Esperar `healthy`/`running` (`docker compose ps <serviço>`).
   5. `node ../configs/infra/infra-config.mjs apply` e depois `node ../configs/infra/infra-config.mjs verify` — **verde de novo**, igual ao passo 1. Mais a checagem específica da tabela "Regras por imagem".
   6. Falhou (container não sobe, `verify` vermelho, checagem específica falha): **rollback imediato** — voltar a tag, `docker compose up -d --build <serviço>`, `verify` de novo. Parar o fluxo inteiro e reportar: comando exato, saída, o que já tinha sido atualizado antes. Nunca tenta outra versão sozinho.
5. **Relatório final:** tabela imagem · antes → depois · resultado do `verify` · o que foi lido de release note · rollback feito (se houve) · pendências "depende do humano". Lembrar que o commit é do humano (`git diff` em `container/docker-compose.yml` e `container/postgres/Dockerfile`).

## Regra de classificação

**Agent executa (se aprovado):** patch de qualquer imagem; minor de imagem sem dado persistente (pgAdmin, exporters, Prometheus, Loki, Alloy, Grafana) cuja release note não exige mudança de config.

**Depende do humano (decisão, não execução automática):**
- Qualquer **major**.
- Minor de serviço com dado/migração (Keycloak, RabbitMQ, Redis, Postgres) — apresenta o resumo da release note e espera decisão nominal daquele item.
- Release note que exige mudar arquivo de config da ferramenta (`loki.yaml`, `config.alloy`, `prometheus.yml`, `redis.conf`, `rabbitmq.conf`, provisioning do Grafana) — mostrar o diff proposto e esperar aprovação nominal.
- Imagem sem versão fixa (`falco`, perfil desligado) — fora de escopo até alguém decidir ligá-la.

Dúvida entre os dois: depende do humano.

## Regras por imagem

| Imagem | Onde ler | Checagem extra depois de subir | Atenção |
|---|---|---|---|
| `postgres` (Dockerfile) | https://www.postgresql.org/docs/release/ | `verify` (muros) + `docker exec postgres psql -U <POSTGRES_USER> -c "select extversion from pg_extension where extname='pgaudit'"` em cada banco | **Major (17→18) nunca é trocar a tag**: o volume não abre em major novo — exige dump/restore ou `pg_upgrade`, sempre humano. Minor (17.11→17.12): ok, rebuild. O pacote `postgresql-17-pgaudit` acompanha o major. |
| `quay.io/keycloak/keycloak` | https://www.keycloak.org/docs/latest/release_notes/ e https://www.keycloak.org/docs/latest/upgrading/ | `verify` (realms, segredo de client) + login no admin console | Atualização migra o schema do banco `keycloak` na subida — **sem volta** sem restaurar backup. Backup obrigatório antes. Variáveis `KC_*` renomeadas aparecem no upgrading guide. |
| `rabbitmq` | https://www.rabbitmq.com/release-information e notas da série no GitHub (`rabbitmq/rabbitmq-server` releases) | `verify` (vhost/usuário por projeto) + `docker exec rabbitmq rabbitmq-diagnostics -q status` | 3.13 → 4.x é major: exige todas as feature flags habilitadas antes (`rabbitmqctl enable_feature_flag all`) e removeu filas clássicas espelhadas. Sempre humano. |
| `redis` | https://github.com/redis/redis/releases | `verify` (ACL por projeto) | 7.x → 8.x é major e muda licença (tri-licença AGPL/RSAL/SSPL) — decisão humana. O mesmo `image:` serve `redis` e `omniroute-redis`: trocar os dois juntos. |
| `diegosouzapw/omniroute` | https://github.com/diegosouzapw/OmniRoute/releases | Seguir `configs/omniroute/README.md` → "Upgrade do OmniRoute": `node omniroute-config.mjs diff` deve continuar limpo; `export` pra registrar defaults novos (mostrar `git diff` de `configs/omniroute/config/`) | Por último, sempre isolado. |
| `grafana/grafana` | https://grafana.com/docs/grafana/latest/whatsnew/ e breaking changes da versão | `verify` (datasources ok, painéis > 0) + abrir os painéis `Visão geral` e `Logs` | Major pode quebrar painel provisionado antigo (`container/grafana/dashboards/`). |
| `grafana/loki` | https://grafana.com/docs/loki/latest/release-notes/ | `verify` (logs com rótulo `project`) | Chave de config removida faz o Loki não subir — ler "upgrade" da versão. |
| `grafana/alloy` | https://github.com/grafana/alloy/releases (CHANGELOG) | `verify` + UI `http://localhost:12345` sem componente com erro | Componente renomeado/depreciado quebra `container/alloy/config.alloy`. |
| `prom/prometheus` | https://github.com/prometheus/prometheus/releases | `verify` (alvos up) | — |
| `prometheuscommunity/postgres-exporter`, `oliver006/redis_exporter` | releases no GitHub de cada um | `verify` (alvo up) + painel PostgreSQL/Redis com dado | Métrica renomeada esvazia painel — conferir o painel, não só o alvo. |
| `dpage/pgadmin4` | https://www.pgadmin.org/docs/pgadmin4/latest/release_notes.html | abrir `http://localhost:15432`, ver os grupos por projeto | — |

## Fora de escopo — sempre humano

- `git add`/`git commit`/`git push` em qualquer repositório.
- Restore de backup contra dado real (se um rollback precisar de restore, parar e pedir).
- Apagar volume (`docker volume rm`, `docker compose down -v`) — nunca, nem em rollback.
- Mudar `projects.json`, segredos do `.env`, ou qualquer coisa de projeto.
- Ligar o perfil `falco`.

## Regra absoluta sobre `.env`/credenciais

Mesma do `local-environment-config`: nunca lê em voz alta, nunca imprime, nunca pede valor no chat. Os scripts (`infra-config.mjs`) leem o `.env` sozinhos.
