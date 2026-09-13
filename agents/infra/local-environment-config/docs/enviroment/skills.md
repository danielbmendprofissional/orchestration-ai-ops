# Skills base de projeto — procedimento do agente (idempotente)

Roda dentro da pasta do projeto sendo configurado (todo projeto é um clone de `ai-base` — não existe uma pasta `ai-base` fixa pra instalar isso uma vez só e valer pra sempre; `.claude/skills/` não é versionado no git, então cada clone precisa rodar isso de novo):

```powershell
npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y
npx skills add https://github.com/angular/skills -s '*' -a claude-code -y
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Reinstala/atualiza, nunca duplica. Confirmar dentro de uma sessão Claude Code: `/skills` lista as três.