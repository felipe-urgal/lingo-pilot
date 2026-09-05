# Estratégia de Qualidade — LingoPilot

## 1. Objetivo

Qualidade no LingoPilot cobre quatro dimensões:

1. comportamento de software;
2. integridade de dados;
3. experiência do aluno;
4. qualidade pedagógica/IA.

Nenhuma dessas dimensões deve depender somente de teste manual.

## 2. Pirâmide de testes

### Unitários

Foco em regras puras:

- eligibility;
- mastery;
- SRS;
- session planner;
- normalização de respostas;
- completion rules;
- validators.

Devem ser rápidos e numerosos.

### Integração

Foco em fronteiras reais:

- repositories PostgreSQL;
- migrations;
- transactions;
- auth adapters;
- storage adapters com fake/local quando apropriado;
- content import.

### Componentes

Foco em comportamento perceptível:

- feedback;
- forms;
- states;
- keyboard interaction;
- recorder/player wrappers.

### E2E

Cobrir somente fluxos críticos e caros de quebrar:

- onboarding;
- abrir Today;
- iniciar/retomar sessão;
- concluir lesson;
- responder exercício;
- revisar itens;
- autenticação;
- speaking happy path quando estável.

## 3. Testes de regressão

Todo bug relevante deve gerar teste automatizado no nível mais baixo capaz de reproduzi-lo.

Se não for automatizável, documentar motivo e procedimento manual.

## 4. Test clock

Learning Engine depende fortemente de tempo. Testes devem usar relógio injetável/fake.

Nunca espalhar `new Date()` em regras de domínio.

Casos:

- midnight local;
- DST quando aplicável;
- timezone change;
- overdue windows;
- review intervals;
- session date.

## 5. Property/invariant tests

Para algoritmos críticos, considerar testes baseados em propriedades:

- scheduler nunca produz due date no passado após sucesso, salvo regra explícita;
- planner não seleciona conteúdo locked;
- submit idempotente não duplica attempt/progress;
- mastery permanece dentro do domínio permitido;
- conteúdo published possui references válidas.

## 6. Contract tests

Adapters externos devem respeitar contratos definidos.

Exemplos:

- AI provider returns validated envelope;
- storage returns private asset reference;
- auth resolves user identity;
- repository enforces expected transaction behavior.

## 7. Testes de conteúdo

Conteúdo deve ser tratado como código quando a alteração tocar esse domínio.

Validar:

- schema;
- referências;
- IDs;
- prerequisitos;
- cycles;
- cobertura de objectives por activities;
- locale;
- asset links;
- revision rules.

## 8. AI evals

Evals são testes de comportamento probabilístico, separados de unit tests.

Cada feature de IA deve manter dataset versionado com:

- input;
- contexto pedagógico;
- propriedades esperadas;
- respostas proibidas quando relevante;
- scorer determinístico e/ou revisão humana amostral.

Evals não devem fazer PR normal depender de provider pago sem estratégia específica. Use fixtures/fakes no CI rápido e pipeline separado para eval online.

## 9. Visual regression

Adicionar somente após design system ter estabilidade suficiente.

Prioridades futuras:

- Today;
- Lesson Player;
- feedback states;
- progress;
- responsive breakpoints.

## 10. Accessibility testing

Camadas:

- lint/semântica;
- automated axe-like checks quando stack estiver configurada;
- keyboard manual em PR relevante;
- leitor de tela amostral nos fluxos críticos;
- contraste e reduced motion.

Automação não substitui auditoria manual.

## 11. Performance quality

Estabelecer budgets após shell inicial:

- bundle JS por rota crítica;
- LCP/INP/CLS alvos;
- latency de `Today`;
- latency de submit;
- p95 de AI features separado do core.

Não otimizar algoritmos sem profiling, exceto problemas óbvios de complexidade/N+1.

## 12. CI gates

A interface canônica obrigatória antes do PR é:

```bash
pnpm check
```

Ela executa:

```text
lint
-> typecheck
-> test
-> content:validate
-> build
```

`pnpm test` inclui testes unitários/estruturais e integration tests PostgreSQL. O CI usa PostgreSQL efêmero e o mesmo `pnpm check`, evitando manter listas paralelas entre package scripts, documentação e workflow.

A simplificação do CI de 2026-09-04 removeu deliberadamente formatação automática, `format:check`, `env:check`, `db:smoke`, `db:check` e o pipeline E2E/build separado do custo fixo de todo PR. Esses comandos continuam disponíveis e devem ser usados quando o escopo proteger seus contratos:

- `pnpm format:check`: auditoria explícita de formatação;
- `pnpm env:check`: mudanças de configuração/runtime;
- `pnpm db:check` / `pnpm db:smoke`: mudanças de schema, migrations ou infraestrutura de banco;
- `pnpm test:e2e`: fluxos browser-first críticos.

Para tornar a evidência E2E reproduzível sem reintroduzir esse custo global, `.github/workflows/e2e.yml` oferece execução opt-in. Um PR pode solicitá-la com `[e2e]` no título ou com a label `run-e2e`; também existe `workflow_dispatch`. O job valida explicitamente o `head.sha` do PR e publica o contexto especializado `E2E / e2e`. Esse contexto não faz parte do ruleset obrigatório da `main` e só deve ser exigido pela revisão/DoD quando o risco do escopo justificar navegador real.

Evals online, performance/a11y avançados e verificações operacionais seguem o mesmo princípio proporcional ao risco.

Nenhum check obrigatório deve ser ignorado por conveniência; ao mesmo tempo, um diagnóstico especializado não deve voltar ao gate global sem decisão explícita.

## 13. Flaky tests

Flaky test é defeito.

Ao detectar:

- investigar causa;
- corrigir isolamento/tempo/concorrência;
- quarentena somente com issue vinculada e prazo;
- não adicionar retry global para esconder instabilidade.

## 14. Test data

- usar factories;
- nomes sintéticos;
- nenhuma PII real;
- seed determinístico quando possível;
- factories respeitam invariantes do domínio.

## 15. Database tests

Testes de integration devem rodar contra PostgreSQL compatível com produção, não SQLite se comportamento divergir.

Cobrir:

- constraints;
- indexes quando relevantes;
- transactions;
- uniqueness/idempotency;
- ownership queries;
- migrations from previous state.

## 16. Manual exploratory checklist

Para mudanças de fluxo:

- caminho feliz;
- voltar/refresh;
- duplo clique;
- rede lenta;
- erro do servidor;
- sessão expirada;
- mobile viewport;
- keyboard;
- conteúdo vazio;
- dados no limite.

## 17. Code review quality bar

Review não é aprovação de estilo. Deve buscar defeitos e riscos.

Se PR muda algoritmo crítico, revisor deve entender exemplos de entrada/saída e não aprovar somente por cobertura verde.

## 18. Cobertura

Coverage é diagnóstico, não objetivo percentual nem gate por si só.

Use `pnpm test:coverage` quando a análise de cobertura ajudar a identificar lacunas, especialmente em regras críticas. Não adicionar testes apenas para elevar porcentagem global e não afrouxar assertions corretas para preservar um número. O critério principal continua sendo comportamento, invariantes e risco real.

## 19. Release confidence

Antes de release relevante:

- `pnpm check`/CI verde no head final;
- checks especializados aplicáveis executados;
- migrations verificadas quando houver mudança de schema;
- smoke flow executado;
- rollback conhecido;
- observabilidade disponível;
- flags para features de risco quando necessário;
- docs/release notes atualizadas.

## 20. Definition of Done

A estratégia de teste é apenas uma parte. Consulte `DEFINITION_OF_DONE.md` para conclusão integral e `DEVELOPMENT.md` para o fluxo operacional canônico.
