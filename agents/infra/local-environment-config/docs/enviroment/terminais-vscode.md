# Terminais de desenvolvimento do VS Code — procedimento do agente

Objetivo: ao abrir a pasta do workspace no VS Code, abrir sozinhos os terminais do dia, nomeados, com o comando já rodando (infra, Claude nos três modos, API, frontend). Vive na pasta do projeto: `.vscode/tasks.json` + `.claude/scripts/dev.ps1`. Roda em todo projeto (novo ou existente), na Etapa 2.

**Isto liga coisas sozinhas, toda vez que o humano abrir a pasta** (sobe a infra no Docker, inicia a API e o front, abre sessões do Claude). Por isso o humano tem de estar a par e aprovar de forma explícita: nunca gravar sem o "sim" a este item específico, mesmo que o resto do plano já tenha sido aprovado.

## 1. Inventário (só leitura)

- `.claude/scripts/dev.ps1` existe? (vem do template; em projeto "existente" pode faltar — é bloco A de "Recriar o ambiente".) Se faltar, copiar do template do projeto (`templates/` e `.claude/scripts/` já fazem parte da estrutura padrão) só depois de aprovado.
- `.vscode/tasks.json` existe? Se existir, é **config em uso**: nunca sobrescrever. Mostrar o diff entre o que existe e o que seria gravado, e pedir confirmação nominal por task (mesma regra de "deletar/sobrescrever config já em uso").
- Layout do projeto: pastas `*-api` e `*-frontend` dentro do workspace? `src\*.Api` na API? `package.json` com script `start` no front? Monorepo ou componente único?
- Onde está o `ai-infra` (5 níveis acima do workspace, `ai-infra\configs\infra\infra-config.mjs`).

## 2. Perguntar ao humano (uma pergunta por vez, com a sua recomendação)

1. **Quais componentes este projeto tem?** só front · só API · API + front · outro (worker etc.). Quem não tem API não ganha terminal de API, nem o de Infra se o projeto não usa a infra compartilhada.
2. **Confirmar os caminhos encontrados**, um a um, mostrando o que achou: pasta da API, projeto `*.Api` e comando (`dotnet run --project src\<Projeto>.Api --launch-profile http`), pasta do front e comando (`npm start`). Divergência (outro nome de pasta, outro comando, monorepo) → o humano corrige e o agent grava com `-Pasta` e `-Comando` na task (o `dev.ps1` aceita os dois). Nunca assumir.
   **Nome do projeto na infra:** o terminal Infra roda `node infra-config.mjs verify --projeto=<nome>`, que confere a infra compartilhada e só a casa deste projeto (nunca a dos outros). Confirmar o nome com o humano contra as chaves de `ai-infra/configs/infra/projects.json`; sem `-Projeto`, o `dev.ps1` usa o nome da pasta do workspace sem o sufixo `-workspace`. Nome diferente → gravar `"-Projeto", "<nome>"` nos `args` da task Infra. Projeto que não está no manifesto → a task Infra não deve existir (ou o projeto precisa antes do passo 1 dos "Passos").
3. **Quais terminais ligar:** Infra, Claude, Claude pago, Claude free, API, Frontend (marcar só os que existem para este projeto). Recomendação padrão: todos os que se aplicam.
4. **Aviso e aprovação, em texto claro**, antes de gravar:

   > Vou gravar `.vscode/tasks.json` com os terminais: <lista>. A partir daí, **toda vez que você abrir esta pasta no VS Code** eles abrem sozinhos e **rodam**: <para cada um, a pasta e o comando>. O terminal Infra só sobe o que não estiver no ar (confere antes). A API e os modos pago/free do Claude esperam a infra e o OmniRoute. O VS Code vai perguntar "Allow Automatic Tasks" na primeira vez. Para desligar: apague a task do `tasks.json` ou o arquivo. Aprova?

   Sem "sim" explícito, não grava nada e registra como pendência.

## 3. Gravar (só depois do sim)

- Base: `templates/vscode-tasks.json` do projeto. Manter só as tasks escolhidas; nas que fogem do padrão acrescentar `"-Pasta", "<relativa ao workspace>"` e/ou `"-Comando", "<comando>"` nos `args`.
- Não alterar `dev.ps1` por projeto (se o layout exige algo que ele não cobre, é melhoria no `ai-base`: propor, ver "Melhoria na ferramenta ou no processo" do `CLAUDE.md`).
- Nunca `git add`/`commit` (regra do topo do `CLAUDE.md`). O humano decide se `.vscode/` entra no repositório ou no `.gitignore`.

## 4. Verificar de verdade

- `tasks.json` é JSON válido (remover os comentários `//` antes de parsear, ou usar o parser do VS Code) e cada `label` escolhida aparece.
- `dev.ps1` com sintaxe válida: `[System.Management.Automation.Language.Parser]::ParseFile(...)` sem erros.
- Cada pasta e cada projeto citados existem em disco.
- O que **não** dá para verificar nesta sessão: o VS Code abrindo os terminais. Dizer isso no relatório e pedir ao humano que **feche e reabra a pasta no VS Code** e confirme que os terminais abriram com os nomes certos (e que respondeu "Allow" ao aviso).

## 5. Relatório

Em `docs/agents/relatorio-ambiente.md`: quais terminais foram configurados (nome, pasta, comando), que abrem sozinhos ao abrir a pasta, como desligar, e o que o humano ainda confirma (reabrir a pasta e o "Allow Automatic Tasks").
