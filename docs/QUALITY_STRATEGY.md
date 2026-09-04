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

O PR normal usa um gate enxuto e previsível:

1. instalação com lockfile congelado;
2. lint, incluindo o guard arquitetural `check:workspace`;
3. typecheck;
4. testes unitários e de integração;
5. build.

Validações adicionais são proporcionais ao risco da mudança. E2E, content validation, checks de banco/ambiente, format check, evals e verificações operacionais continuam disponíveis, mas não devem virar custo fixo de todo PR quando não protegem o escopo alterado.

Nenhum check obrigatório deve ser ignorado por conveniência. Ao mesmo tempo, um teste ou gate só deve ser obrigatório quando protege um contrato material.

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

- CI verde;
- migrations verificadas;
- smoke flow executado;
- rollback conhecido;
- observabilidade disponível;
- flags para features de risco quando necessário;
- docs/release notes atualizadas.

## 20. Definition of Done

A estratégia de teste é apenas uma parte. Consulte `DEFINITION_OF_DONE.md` para conclusão integral.
