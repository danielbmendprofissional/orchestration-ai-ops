# Alethe (app dos painéis) — procedimento do agente (sempre parar)

Instalador gráfico, sem CLI. Pedir pro humano: baixar `Alethe_<versão>_x64-setup.exe` em `https://github.com/Kc1t/alethe-agents/releases/latest`, instalar (SmartScreen do Windows pode avisar — "Mais informações" → "Executar assim mesmo", normal pra release nova e assinada). Confirmar que abriu.

Organizar o layout de 4 painéis dentro do Alethe (grid 2x2, cada painel rodando `claude`, `claude-pago` ou `claude-free` na raiz de um workspace — uma spec por painel) também é ação manual dentro do app — não automatizável, mas não bloqueia o resto da configuração.