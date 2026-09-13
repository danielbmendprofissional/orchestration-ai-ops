# Testar tudo junto — procedimento do agente

Roda dentro da pasta de um projeto real (clone de `ai-base` — não existe uma pasta `ai-base` fixa e persistente pra rodar isso uma vez só; o teste depende de `.pi/agents/*.md` existir, e isso só existe dentro de um clone):

```powershell
pi
```

Dentro da sessão: `/model`, confirmar que os modelos configurados em `.pi/agents/*.md` (hoje `deepseek-v4-flash` e `gpt-5.6-luna`) aparecem na lista — prova que as chaves de API estão funcionando. Sair com `/exit`.