# Workflow de Desenvolvimento — LingoPilot

Este documento descreve disciplina de issue/branch/PR. A receita operacional para instalar, subir, testar e validar localmente é [`DEVELOPMENT.md`](DEVELOPMENT.md).

## 1. Fluxo

```text
Backlog -> Ready -> In Progress -> Review -> Ready to Merge -> Done
```

Mudanças relevantes devem permanecer rastreáveis da issue ao merge.

## 2. Issue antes de código

Features, bugs relevantes e refactors estruturais devem nascer de issue com:

- contexto e problema;
- objetivo/escopo/fora de escopo;
- critérios de aceite;
- requisitos técnicos;
- testes esperados;
- documentação;
- dependências e riscos.

Se uma issue exigir vários PRs independentes, trate-a como épico ou quebre-a.

## 3. Branch

Criar a partir de `main` atualizada.

```text
feature/<slug>
bugfix/<slug>
hotfix/<slug>
docs/<slug>
refactor/<slug>
test/<slug>
```

Uma branch deve ter um propósito principal.

## 4. Implementação

Sequência recomendada:

1. escrever/ajustar teste quando adequado;
2. implementar domínio/use case;
3. implementar adapter/persistência;
4. implementar delivery/UI;
5. cobrir estados de erro;
6. atualizar observabilidade;
7. atualizar documentação;
8. subir a aplicação e validar manualmente o fluxo alterado quando aplicável;
9. executar `pnpm check`;
10. executar `pnpm test:e2e` quando o risco justificar;
11. revisar a diff inteira.

Nem toda feature exige essa ordem literal, mas regras não devem nascer escondidas na UI.

## 5. Commits e formatação

`pnpm install` executa `prepare`, que instala de forma idempotente o hook local gerenciado de `pre-commit`. O hook usa `pnpm format:staged` com a versão de Prettier fixada no repositório.

O hook é conveniência local. O gate autoritativo continua sendo `pnpm format:check`, já incluído em `pnpm check`.

Commits não devem incluir secrets, logs temporários ou artefatos gerados desnecessários.

## 6. PR

Marcar Ready somente quando:

- escopo concluído;
- `pnpm check` passa no head atual;
- checks direcionados aplicáveis foram executados;
- auto-review foi feito;
- descrição está completa;
- evidência visual foi adicionada quando houver UI;
- docs foram atualizadas;
- migration/rollback foram documentados quando aplicável.

PR deve permanecer revisável em uma sessão razoável. Evite misturar refactor amplo com feature sem necessidade.

## 7. Auto code review

Antes de pedir review:

- ler Files Changed do início ao fim;
- procurar código temporário;
- conferir error paths;
- conferir autorização;
- conferir transações/idempotência;
- conferir mobile/a11y se UI;
- comparar com critérios da issue;
- verificar docs, migrations e rollback.

Findings relevantes devem ser corrigidos antes de considerar o PR pronto. Qualquer push posterior invalida a validação final anterior.

## 8. CI

O workflow obrigatório atual expõe:

```text
CI / quality
```

O job usa instalação frozen, PostgreSQL efêmero e executa:

```bash
pnpm check
```

O ruleset da `main` exige o contexto `quality` e branch atualizada antes do merge.

E2E é direcionado por risco/escopo e não é hoje um status obrigatório separado. Não documente ou crie job extra apenas para satisfazer checklist genérico.

CI/Preview nunca podem usar credenciais nem banco de Production.

Governança completa: [`REPOSITORY_GOVERNANCE.md`](REPOSITORY_GOVERNANCE.md).

## 9. Migrations

PR com migration descreve:

- mudança;
- compatibilidade;
- backfill;
- impacto de lock/performance quando relevante;
- rollback ou forward-fix;
- ordem de deploy.

Produção segue [`PRODUCTION.md`](PRODUCTION.md):

- build/deploy não executa migration;
- migration aplicada é imutável;
- preferir `expand -> deploy -> contract`;
- schema exigido por código novo deve ficar compatível antes da promoção;
- migration destrutiva exige backup/checkpoint e recovery plan;
- rollback da aplicação só é seguro com schema compatível.

## 10. Feature flags

Use flag somente quando houver benefício real de rollout/isolamento de risco. Não crie sistema de flags antecipadamente; toda flag deve ter owner e plano de remoção.

## 11. Documentação

Documentação é parte da implementação. As entradas operacionais canônicas são:

- [`DEVELOPMENT.md`](DEVELOPMENT.md) para setup, execução local e gate de PR;
- [`PRODUCTION.md`](PRODUCTION.md) para preflight, migration, promoção e verify.

Docs especializadas devem ser atualizadas no mesmo PR quando seus contratos mudarem.

Criar ADR quando a decisão for estrutural, difícil de reverter ou possuir alternativas relevantes.

## 12. Release

`main` é a branch de produção e deve permanecer deployable.

Antes de release/redeploy importante:

- CI verde no head final;
- revision/commit identificado;
- migrations compatíveis na ordem correta;
- backup/checkpoint quando o risco exigir;
- readiness/smoke definidos;
- rollback/forward-fix conhecido;
- nenhuma Preview/CI apontando para Production.

`READY` do provider não encerra a validação: siga [`PRODUCTION.md`](PRODUCTION.md) e execute `prod:verify`.

## 13. Hotfix

Hotfix é urgência, não atalho de qualidade:

1. issue/incidente;
2. branch `hotfix/`;
3. menor correção segura;
4. teste de regressão;
5. `pnpm check`;
6. PR prioritário;
7. promoção conforme [`PRODUCTION.md`](PRODUCTION.md);
8. smoke/readiness;
9. follow-up de causa raiz quando necessário.

## 14. Débito e dependências

Decisão temporária deve ficar explícita no PR e virar issue quando houver trabalho futuro concreto.

Antes de adicionar pacote, avalie necessidade, manutenção, licença, impacto de bundle/runtime, vulnerabilidades e lock-in.

Atualizações grandes de framework/ORM devem ser PRs próprios quando possível.

## 15. Done

Issue fecha depois do merge e validação aplicável. Consulte [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md).
