# Workflow de Desenvolvimento — LingoPilot

## 1. Objetivo

Este processo existe para manter velocidade sem perder disciplina. Toda mudança relevante deve ser rastreável da necessidade ao merge.

## 2. Estados de trabalho

Fluxo conceitual:

```text
Backlog → Ready → In Progress → Review → Ready to Merge → Done
```

Como o repositório pode não possuir GitHub Projects inicialmente, a issue e o PR devem registrar claramente o estado por comentários/labels disponíveis.

## 3. Issue antes de código

Features, bugs relevantes e refactors estruturais devem nascer de issue.

Issue implementável contém:

- contexto;
- problema;
- objetivo;
- escopo;
- fora de escopo;
- critérios de aceite;
- requisitos técnicos;
- testes esperados;
- documentação;
- dependências;
- riscos.

## 4. Refinamento

Antes de marcar uma issue como pronta:

- requisitos não contraditórios;
- dependências conhecidas;
- UX definida o suficiente;
- schema/contratos críticos entendidos;
- tamanho revisável;
- critérios de aceite verificáveis.

Se uma issue exigir vários PRs, ela deve ser épico ou ser quebrada.

## 5. Branch

Criar a partir de `main` atualizada.

Padrão:

```text
feature/<slug>
bugfix/<slug>
hotfix/<slug>
docs/<slug>
refactor/<slug>
test/<slug>
```

Uma branch deve ter um propósito principal.

## 6. Implementação

Sequência recomendada:

1. escrever/ajustar teste da regra quando adequado;
2. implementar domínio/use case;
3. implementar adapter/persistência;
4. implementar delivery/UI;
5. cobrir estados de erro;
6. atualizar observabilidade;
7. atualizar documentação;
8. executar suite aplicável;
9. revisar diff inteiro.

Nem toda feature exige essa ordem literal, mas regras não devem nascer escondidas na UI.

## 7. Commits

Durante desenvolvimento, commits intermediários são aceitáveis. Antes do merge, o histórico do PR deve ser compreensível; squash merge pode consolidar quando apropriado.

Commits não devem incluir secrets ou artefatos gerados desnecessários.

### Formatação automática

`pnpm install` executa o script `prepare`, que instala de forma idempotente um hook local gerenciado de `pre-commit`. O hook executa `pnpm format:staged` usando a versão de Prettier fixada no repositório.

`format:staged` formata o snapshot que já está no index do Git em vez de executar `git add` sobre o arquivo inteiro. Assim partial staging não incorpora silenciosamente mudanças que ainda estavam fora do commit. Quando o conteúdo do working tree é exatamente igual ao staged, o arquivo local também é sincronizado com a versão formatada.

Se já existir um `.git/hooks/pre-commit` não gerenciado pelo LingoPilot, a instalação automática não sobrescreve o hook existente e apenas emite um aviso. Nesse caso, o desenvolvedor continua responsável por integrar `pnpm format:staged` ao hook próprio ou executar `pnpm format` antes do commit.

O hook é conveniência local, não substitui o gate `pnpm format:check` do CI.

## 8. PR

Abrir PR como draft quando implementação ainda estiver em andamento e houver benefício de visibilidade.

Marcar Ready somente quando:

- escopo concluído;
- testes locais aplicáveis passam;
- auto-review feito;
- descrição completa;
- screenshots/evidência adicionadas;
- docs atualizadas;
- migration/rollback documentados.

## 9. Tamanho de PR

Não existe limite rígido de linhas, mas PR deve ser revisável em uma sessão razoável.

Sinais de que precisa quebrar:

- altera vários domínios independentes;
- mistura bootstrap + feature complexa;
- reviewer precisa entender muitos contratos novos ao mesmo tempo;
- descrição precisa justificar mudanças não relacionadas.

## 10. Auto code review

Antes de review externo:

- ler Files Changed do início ao fim;
- procurar código temporário;
- conferir error paths;
- conferir autorização;
- conferir transações/idempotência;
- conferir mobile/a11y se UI;
- comparar com critérios da issue;
- verificar docs.

O agente/autor deve corrigir problemas encontrados antes de pedir revisão.

## 11. Review humano/segundo agente

Severity sugerida:

- **blocker:** segurança, perda/corrupção de dados, requisito central não atendido;
- **major:** bug real, arquitetura problemática, lacuna de teste importante;
- **minor:** clareza, manutenção, melhoria localizada;
- **nit:** preferência não bloqueante.

Comentários devem explicar impacto, não apenas prescrever código.

## 12. CI

Checks obrigatórios devem bloquear merge.

Falha de CI deve ser investigada. Não desabilitar check sem issue/decisão explícita.

O workflow `Format` roda em PRs de branches do próprio repositório antes dos gates finais. Ele executa `pnpm format` e, quando houver diff exclusivamente resultante da formatação, cria um commit `style: apply prettier` na branch do PR. O push feito com `GITHUB_TOKEN` não deve ser usado como substituto do `format:check`; o check permanece obrigatório e valida o head final.

PRs originados de forks não recebem push automático por segurança/permissão. Nesses casos o autor corrige a formatação localmente e o CI continua reportando qualquer divergência.

CI/Preview não podem usar credenciais nem banco de Production. O contrato completo de ambientes e promoção está em `docs/PRODUCTION_DEPLOYMENT.md`.

## 13. Migrations

PR com migration descreve:

- mudança;
- compatibilidade;
- backfill;
- impacto de lock/performance quando relevante;
- rollback ou forward-fix strategy;
- ordem de deploy se aplicação e schema precisarem coexistir.

Produção segue `docs/PRODUCTION_DEPLOYMENT.md`:

- build/deploy da aplicação não executa migration;
- migration já aplicada é imutável;
- preferir `expand → deploy → contract`;
- schema exigido por código novo deve ficar compatível antes da promoção do código;
- migration destrutiva exige checkpoint/backup e recovery plan;
- rollback da aplicação só é seguro depois de validar compatibilidade com o schema já aplicado.

## 14. Feature flags

Usar flag quando:

- feature é arriscada;
- rollout gradual traz benefício;
- precisa deployar infraestrutura antes da UI;
- AI/provider precisa ser desligável.

Não criar sistema de flags antes de haver necessidade; quando existir, flags precisam de owner e plano de remoção.

## 15. Documentação

No mesmo PR, atualizar documentos impactados.

Criar ADR quando decisão:

- é estrutural;
- possui alternativas relevantes;
- será difícil/caro reverter;
- futuros agentes precisam entender contexto.

Mudanças que alterem hosting, banco de produção, política de migration, estratégia de promoção, health/readiness, backup/restore ou recovery devem revisar `docs/PRODUCTION_DEPLOYMENT.md` e o ADR de topologia vigente.

## 16. Release

`main` é a branch de produção e deve permanecer deployable.

A topologia inicial usa Vercel + Neon e promoção Git-managed. O fluxo completo, incluindo migration-before-code, health/readiness, backup e recovery, está em `docs/PRODUCTION_DEPLOYMENT.md`.

Antes de release/redeploy importante:

- CI verde no head final;
- revision/commit identificado;
- migrations compatíveis e aplicadas na ordem correta quando necessárias;
- backup/checkpoint quando o risco exigir;
- deploy marker/version identificável;
- readiness e smoke definidos;
- rollback/forward-fix conhecido;
- nenhuma Preview/CI apontando para Production.

`READY` do provider não encerra a validação: a aplicação precisa passar pelo smoke/readiness próprio.

## 17. Hotfix

Hotfix é exceção de urgência, não atalho de qualidade.

Fluxo:

1. issue/incidente;
2. branch `hotfix/`;
3. menor correção segura;
4. teste de regressão;
5. PR prioritário;
6. merge/deploy conforme `docs/PRODUCTION_DEPLOYMENT.md`;
7. smoke/readiness;
8. follow-up de causa raiz se necessário.

Hotfix não autoriza migration destrutiva improvisada, uso de banco de produção em local/Preview ou rollback de código sem conferir compatibilidade de schema.

## 18. Débito técnico

Se uma decisão temporária for necessária:

- explicitar no PR;
- criar issue quando houver trabalho futuro concreto;
- não usar `TODO` sem referência quando a dívida puder ser esquecida.

## 19. Dependências

Antes de adicionar pacote:

- problema não é trivial sem ele?
- manutenção ativa?
- licença compatível?
- impacto de bundle/runtime?
- vulnerabilidades conhecidas?
- lock-in?
- existe dependência já instalada que resolve?

## 20. Atualização de stack

Atualizações grandes de framework/ORM devem ser PRs próprios quando possível, com migration guide e testes.

Mudança de provider de hosting/banco que altere a topologia aprovada exige revisão do ADR correspondente quando houver trade-off estrutural ou lock-in material.

## 21. Done

Issue fecha depois do merge e validação aplicável, não quando o primeiro código foi escrito.

Consultar `DEFINITION_OF_DONE.md`.
