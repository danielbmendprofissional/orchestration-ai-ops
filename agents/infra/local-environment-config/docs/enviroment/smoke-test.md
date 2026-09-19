# Testar tudo junto — procedimento do agente

Roda dentro da pasta do projeto sendo configurado — o teste depende de `.pi/agents/*.md` existir dentro dela, então não roda antes da Etapa 2 nem pode ser reaproveitado de outro projeto.

**Custa dinheiro de verdade** (chamada real às APIs pagas do DeepSeek/OpenAI, uma por modelo configurado) — **sempre pedir confirmação explícita antes de rodar**, mesmo que o resto do plano já tenha sido aprovado: "posso rodar o smoke test? é uma chamada curta por modelo configurado em `.pi/agents/*.md`, custo mínimo mas real." Nunca rodar junto do resto do plano sem esse aviso à parte.

**`pi` interativo não funciona nesta sessão** — esta é uma sessão sem TTY real; alimentar `/model` via pipe não reproduz o comportamento de uma sessão `pi` de verdade (pode até cair num modelo padrão interno não relacionado ao projeto). Em vez de simular a sessão interativa, testar cada modelo configurado direto, não-interativo:

```powershell
pi -p "say ok" --provider <provider> --model <model>
```

Uma chamada por linha `model:` distinta encontrada em `.pi/agents/*.md` (hoje: `deepseek/deepseek-v4-flash`, `openai/gpt-5.6-luna` — ler o valor real do projeto, nunca fixar esses dois como se fossem sempre os mesmos). Resposta curta e sem erro de auth = prova que a chave de API daquele provider funciona pros modelos que o projeto realmente usa.

**Sempre documentar as duas formas no relatório final:**
- O resultado deste teste não-interativo (o que foi provado).
- O comando convencional (`pi` interativo + `/model`) pro humano confirmar visualmente, se quiser — isso é o jeito "normal" de usar, mesmo que este agent não consiga reproduzi-lo de dentro de uma sessão sem TTY.
