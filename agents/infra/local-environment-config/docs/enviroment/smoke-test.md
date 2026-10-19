# Testar tudo junto — procedimento do agente

Roda dentro da pasta do projeto sendo configurado — o teste depende de `.pi/agents/*.md` existir dentro dela, então não roda antes da Etapa 2 nem pode ser reaproveitado de outro projeto.

**Pode custar dinheiro de verdade** — os subagents apontam pra combos do OmniRoute (`omniroute/pi-*`); `pi-quality` começa num modelo pago (GPT Luna), e `pi-exec` cai no DeepSeek pago se o pool free estiver esgotado — **sempre pedir confirmação explícita antes de rodar**, mesmo que o resto do plano já tenha sido aprovado: "posso rodar o smoke test? é uma chamada curta por combo configurado em `.pi/agents/*.md`; `pi-quality` usa modelo pago, custo mínimo mas real." Nunca rodar junto do resto do plano sem esse aviso à parte.

Pré-requisito: OmniRoute saudável e provider `omniroute` em `~/.pi/agent/models.json` (Etapa 1, `docs/infra/omniroute.md`). Faltando: parar e informar que a Etapa 1 precisa completar esse item.

**`pi` interativo não funciona nesta sessão** — esta é uma sessão sem TTY real; alimentar `/model` via pipe não reproduz o comportamento de uma sessão `pi` de verdade (pode até cair num modelo padrão interno não relacionado ao projeto). Em vez de simular a sessão interativa, testar cada modelo configurado direto, não-interativo:

```powershell
pi -p "say ok" --provider <provider> --model <model>
```

Uma chamada por linha `model:` distinta encontrada em `.pi/agents/*.md` (hoje: `omniroute/pi-exec`, `omniroute/pi-light`, `omniroute/pi-quality` → `--provider omniroute --model pi-exec`, etc. — ler o valor real do projeto, nunca fixar esses como se fossem sempre os mesmos). Resposta curta e sem erro de auth = prova que a `OMNIROUTE_API_KEY` funciona e que cada combo tem pelo menos um alvo vivo. Qual modelo de fato respondeu aparece no dashboard do OmniRoute (logs) — registrar no relatório.

**Sempre documentar as duas formas no relatório final:**
- O resultado deste teste não-interativo (o que foi provado).
- O comando convencional (`pi` interativo + `/model`) pro humano confirmar visualmente, se quiser — isso é o jeito "normal" de usar, mesmo que este agent não consiga reproduzi-lo de dentro de uma sessão sem TTY.
