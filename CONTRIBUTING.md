# Contribuindo com o LingoPilot

Este projeto trata qualidade de engenharia, produto e pedagogia como partes do mesmo trabalho. Toda contribuição deve começar por uma issue clara e terminar com um PR revisável, testado e documentado.

## Fluxo padrão

1. Escolha ou crie uma issue.
2. Confirme critérios de aceite, dependências e riscos.
3. Crie uma branch a partir da `main` atualizada.
4. Implemente o menor conjunto coeso de mudanças que resolve a issue.
5. Rode os checks locais aplicáveis.
6. Faça auto code review do diff.
7. Atualize documentação.
8. Abra PR usando o template oficial.
9. Corrija feedback e checks de CI.
10. Merge somente quando todos os critérios da Definition of Done estiverem atendidos.

## Branches

Use nomes curtos e descritivos:

```text
feature/daily-study-session
bugfix/review-queue-order
hotfix/auth-data-leak
docs/content-model
refactor/session-planner
test/lesson-player-e2e
```

## Commits

Preferir Conventional Commits:

```text
feat: add daily study session planner
fix: prevent duplicate review submissions
docs: document content versioning
refactor: extract mastery calculation
test: cover lesson completion rollback
chore: configure CI typecheck
```

Commits devem ser semanticamente úteis. Evite sequências de commits como `fix`, `fix2`, `try again` em PR pronto para revisão.

## Pull Requests

Um PR deve ser pequeno o suficiente para permitir revisão cuidadosa e grande o suficiente para entregar uma unidade coerente de valor.

Evite:

- feature + refactor não relacionado;
- múltiplas issues sem relação;
- formatação massiva junto de mudança funcional;
- migration de banco sem descrição de compatibilidade;
- UI sem evidência visual;
- mudança estrutural sem documentação.

## Critérios mínimos de revisão

O revisor deve procurar:

- correção do comportamento;
- alinhamento com critérios da issue;
- riscos de dados;
- autenticação e autorização;
- tratamento de falhas;
- acessibilidade;
- legibilidade;
- duplicação;
- testes significativos;
- observabilidade adequada;
- impacto pedagógico;
- atualização de docs.

## Arquitetura

Não introduza novos frameworks, bancos, providers de autenticação, providers de IA, filas ou serviços externos sem registrar a decisão quando houver impacto estrutural.

Mudanças de alto custo de reversão devem receber ADR em `docs/ADR/`.

## Documentação

Documentação não é uma etapa opcional posterior. Se a implementação altera um contrato, a documentação muda no mesmo PR.

## Segurança

Nunca commite:

- `.env` real;
- tokens;
- API keys;
- credenciais de banco;
- áudio ou dados pessoais de usuários reais;
- dumps de produção.

Use fixtures sintéticas em testes.

## Definition of Done

Consulte `docs/DEFINITION_OF_DONE.md`. Uma issue só deve ser fechada quando o comportamento estiver implementado, validado e documentado.
