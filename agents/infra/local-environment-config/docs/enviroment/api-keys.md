# Chaves de API — procedimento do agente (sempre parar)

Variáveis necessárias: `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`. Verificar presença (nunca o valor). Faltando: pedir pro humano cadastrar com `setx DEEPSEEK_API_KEY "valor"` / `setx OPENAI_API_KEY "valor"` e reabrir o terminal. Nunca aceitar o valor colado no chat.

Com o OmniRoute (`docs/infra/omniroute.md`), as chaves DeepSeek/OpenAI entram **também** no `ai-infra/container/.env` como `OMNIROUTE_KEY_DEEPSEEK`/`OMNIROUTE_KEY_OPENAI` (é pelo OmniRoute que os modos `claude-pago`/`claude-free` chegam nelas). `DEEPSEEK_API_KEY`/`OPENAI_API_KEY` como variável ficam pra teste direto no provider. `OMNIROUTE_API_KEY`/`OMNIROUTE_EVAL_KEY` não são pedidas ao humano: o `apply` do OmniRoute cria as keys e grava as duas variáveis com `--setx` (valor gerado pelo servidor, nunca passa por esta sessão). As chaves de provider do OmniRoute ficam em `ai-infra/container/.env`, não no Windows.
