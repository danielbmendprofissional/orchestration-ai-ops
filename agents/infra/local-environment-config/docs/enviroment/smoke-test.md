# Testar tudo junto — procedimento do agente

Roda dentro da pasta do projeto sendo configurado — o teste depende de `.claude/agents/*.md` e `.claude/commands/implement-task.md` existirem dentro dela, então não roda antes da Etapa 2 nem pode ser reaproveitado de outro projeto.

**Pode custar dinheiro de verdade** — o modo pago usa DeepSeek e Luna (pagos). **Sempre pedir confirmação explícita antes de rodar**, mesmo que o resto do plano já tenha sido aprovado: "posso rodar o smoke test? é uma chamada curta no modo pago e uma no free; o pago custa centavos, mas é real." Nunca rodar junto do resto do plano sem esse aviso à parte. O modo Claude (assinatura) **não** é testado por este agent — sessão `-p` não interativa consome o plano do humano.

Pré-requisito: Etapa 1 com os modos prontos (`docs/enviroment/claude-modos.md`).

Na raiz do projeto, não interativo:

```powershell
claude --settings "$HOME\.claude\modos\pago.json" -p "Liste os subagentes disponíveis em .claude/agents e responda só os nomes." --output-format json
claude --settings "$HOME\.claude\modos\free.json" -p "Responda apenas: ok" --output-format json
```

- A primeira prova que o projeto carrega os subagentes (os 8 nomes: `data`, `backend`, `front`, `ui`, `tests`, `security`, `review`, `qa`) e que o modo pago responde.
- `docker logs --since 5m omniroute` mostra quem respondeu (`Model … succeeded`) — registrar no relatório.
- `/implement-task` aparece no autocomplete de uma sessão interativa — pedir pro humano confirmar com `/imp` + Tab.

**Sempre documentar no relatório final:** o resultado dos dois comandos e o comando de uso normal (`claude`, `claude-pago`, `claude-free` na raiz do workspace).
