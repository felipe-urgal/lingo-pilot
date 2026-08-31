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

## 13. Migrations

PR com migration descreve:

- mudança;
- compatibilidade;
- backfill;
- impacto de lock/performance quando relevante;
- rollback ou forward-fix strategy;
- ordem de deploy se aplicação e schema precisarem coexistir.

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

## 16. Release

No início, `main` deve permanecer deployable.

Antes de release/redeploy importante:

- CI verde;
- migrations compatíveis;
- smoke test;
- deploy marker;
- rollback conhecido.

## 17. Hotfix

Hotfix é exceção de urgência, não atalho de qualidade.

Fluxo:

1. issue/incidente;
2. branch `hotfix/`;
3. menor correção segura;
4. teste de regressão;
5. PR prioritário;
6. merge/deploy;
7. follow-up de causa raiz se necessário.

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

## 21. Done

Issue fecha depois do merge e validação aplicável, não quando o primeiro código foi escrito.

Consultar `DEFINITION_OF_DONE.md`.
