# Testar tudo junto — procedimento do agente

Roda dentro da pasta do projeto sendo configurado — o teste depende de `.pi/agents/*.md` existir dentro dela, então não roda antes da Etapa 2 nem pode ser reaproveitado de outro projeto:

```powershell
pi
```

Dentro da sessão: `/model`, confirmar que os modelos configurados em `.pi/agents/*.md` (hoje `deepseek-v4-flash` e `gpt-5.6-luna`) aparecem na lista — prova que as chaves de API estão funcionando. Sair com `/exit`.