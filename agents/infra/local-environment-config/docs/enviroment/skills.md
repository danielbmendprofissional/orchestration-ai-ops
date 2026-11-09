# Skills base de projeto — procedimento do agente (idempotente)

Roda dentro da pasta do projeto sendo configurado — `.claude/skills/` não é versionado no git, então cada projeto precisa rodar isso, mesmo que outro projeto já tenha rodado antes:

```powershell
npx skills add https://github.com/mattpocock/skills -s '*' -a claude-code -y
npx skills add https://github.com/angular/skills -s '*' -a claude-code -y
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
npm install -g ui-ux-pro-max-cli
uipro init --ai claude
```

Os dois últimos instalam a `ui-ux-pro-max-skill` (direção de design, primeiro passo da cadeia de `docs/design/principios.md` e usada pelo `/design-init`). O `npm install -g` é na máquina (idempotente: se `uipro --version` já responde, pule); o `uipro init --ai claude` roda **dentro da pasta do projeto**, porque grava a skill no projeto.

Reinstala/atualiza, nunca duplica. Confirmar de verdade (não só pelo código de saída): `uipro --version` responde; o arquivo da skill existe em `.claude/skills/` do projeto (`ls .claude/skills`); dentro de uma sessão Claude Code, `/skills` lista as quatro. Se o `uipro init` gravar a skill em outro caminho, reportar o caminho real e o `grep` de `disable-model-invocation` como no passo 3 de `security-skills.md`.

**Terceiro que o classificador pode bloquear:** `npm install -g` e `uipro init` de pacote de terceiro podem ser recusados como o `git clone` abaixo. Mesmo tratamento: não contornar, entregar o comando pronto pro humano (pasta, comando e teste, tudo junto).

## Se o `git clone` do `avoid-ai-design` for bloqueado pelo classificador de Auto Mode

`git clone` de repositório de terceiro pode ser recusado pelo classificador ("Untrusted Code Integration") mesmo sendo exatamente este procedimento documentado — e não deve ser contornado (nem pedindo pra liberar a regra de permissão sozinho, isso também é bloqueado). Nesse caso, **entregar o tutorial completo pronto pro humano copiar e colar**, não só avisar que travou:

```powershell
cd "<caminho do projeto>"
git clone https://github.com/funboy322/avoid-ai-design.git .claude/skills/avoid-ai-design
```

Teste de confirmação (dentro de uma sessão Claude Code aberta no projeto): `/skills` deve listar `avoid-ai-design` junto das outras.

Reportar assim: comando pra rodar, pasta onde rodar, comando de teste — tudo junto, de uma vez, sem o humano precisar pedir cada pedaço separado.