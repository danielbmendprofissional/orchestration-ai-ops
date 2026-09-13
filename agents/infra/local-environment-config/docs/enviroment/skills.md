# Skills do `ai-base` — procedimento do agente (idempotente)

```powershell
cd ai-base
npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y
npx skills add https://github.com/angular/skills -s '*' -a claude-code -y
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Reinstala/atualiza, nunca duplica. Confirmar dentro de uma sessão Claude Code: `/skills` lista as três.