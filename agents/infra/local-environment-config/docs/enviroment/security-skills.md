# Skills de segurança — só sob pedido explícito, por projeto

Não roda como parte padrão da configuração de máquina — só quando pedido pra auditar um projeto específico (dentro da pasta daquele projeto):

```powershell
npx skills add getsentry/skills -s 'security-review,gha-security-review,skill-scanner' -a claude-code -y
npx skills add briiirussell/cybersecurity-skills -s 'owasp-audit,api-audit,dependency-audit,secrets-audit,crypto-audit' -a claude-code -y
```

Nunca "Select All" nesses dois repositórios — `getsentry/skills` tem skills (`code-review`, `commit`, `pr-writer`) que colidem com o `/code-review` já instalado (`skills.md`). Depois de instalar, abrir o `SKILL.md` de cada skill instalada e confirmar/adicionar `disable-model-invocation: true` no frontmatter — os repositórios de origem não garantem esse campo sozinhos.

Situacional (só se o projeto tiver aquele escopo regulatório específico — decisão do humano, não do agent): `privacy-engineering`, `hipaa-audit`, `pci-audit`, `csf-mapping`, `ai-risk-management`, mesmo repositório `briiirussell/cybersecurity-skills`.

Confirmar sempre via `/skills` dentro de uma sessão Claude Code depois de instalar.