# Skills base de projeto — procedimento do agente (idempotente)

Roda dentro da pasta do projeto sendo configurado — `.claude/skills/` não é versionado no git, então cada projeto precisa rodar isso, mesmo que outro projeto já tenha rodado antes:

```powershell
npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y
npx skills add https://github.com/angular/skills -s '*' -a claude-code -y
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Reinstala/atualiza, nunca duplica. Confirmar dentro de uma sessão Claude Code: `/skills` lista as três.

## Se o `git clone` do `avoid-ai-design` for bloqueado pelo classificador de Auto Mode

`git clone` de repositório de terceiro pode ser recusado pelo classificador ("Untrusted Code Integration") mesmo sendo exatamente este procedimento documentado — e não deve ser contornado (nem pedindo pra liberar a regra de permissão sozinho, isso também é bloqueado). Nesse caso, **entregar o tutorial completo pronto pro humano copiar e colar**, não só avisar que travou:

```powershell
cd "<caminho do projeto>"
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Teste de confirmação (dentro de uma sessão Claude Code aberta no projeto): `/skills` deve listar `avoid-ai-design` junto das outras duas.

Reportar assim: comando pra rodar, pasta onde rodar, comando de teste — tudo junto, de uma vez, sem o humano precisar pedir cada pedaço separado.