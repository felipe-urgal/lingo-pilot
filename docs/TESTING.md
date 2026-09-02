# Testing — LingoPilot

Este guia define como executar e escolher os níveis de teste da Foundation. A estratégia de qualidade continua em `docs/QUALITY_STRATEGY.md`; o contrato de portas e ambiente local continua normativo em `docs/LOCAL_DEVELOPMENT.md`.

## Princípios

- escolha o nível mais baixo capaz de provar o comportamento;
- unit tests não dependem de PostgreSQL, rede, clock real ou provider externo;
- integration tests usam PostgreSQL real e somente `TEST_DATABASE_URL` validado;
- component tests verificam comportamento perceptível com DOM realista via Testing Library;
- E2E fica reservado para smoke/fluxos críticos e usa exclusivamente `127.0.0.1:5401`;
- fixtures, IDs, emails e demais dados de teste devem ser sintéticos; não usar PII real;
- flaky test é defeito e não deve ser escondido com retry global.

## Unit

Comando:

```bash
pnpm test:unit
```

Novos testes TypeScript de packages usam Vitest e ficam próximos ao código como `src/**/*.test.ts`. Os testes de Foundation já existentes em `tests/*.test.mjs` continuam executados pelo mesmo comando e podem ser migrados oportunisticamente, sem reescrita artificial apenas por troca de runner.

Use `@lingo-pilot/test-support` para tempo e IDs determinísticos, factories válidas por default e fakes que implementem contratos reais quando estes já existirem.

## Component

Componentes web com comportamento usam Vitest + jsdom + Testing Library.

Localização:

```text
apps/web/test/**/*.component.test.tsx
```

Priorize queries acessíveis (`role`, label, texto perceptível) em vez de selecionar detalhes internos de implementação.

## Integration

Comando:

```bash
pnpm test:integration
```

Integration tests vivem no package dono da infraestrutura, atualmente `packages/db/test/*.test.mjs`. Eles usam PostgreSQL compatível com produção e o `database-test-harness` para operações que precisam recriar/migrar o banco de teste.

`TEST_DATABASE_URL` precisa identificar explicitamente um banco de teste e não pode apontar para o mesmo banco que `DATABASE_URL`. O harness pode recriar schemas somente depois dessa validação fail-closed.

## E2E

Comando:

```bash
pnpm test:e2e
```

O fluxo:

1. valida `TEST_DATABASE_URL`;
2. recria e migra somente o banco de teste;
3. Playwright inicia `pnpm dev:e2e` em `127.0.0.1:5401`;
4. o smoke verifica uma rota básica da aplicação;
5. o processo normal de desenvolvimento em `127.0.0.1:5400` permanece independente.

`reuseExistingServer` fica desabilitado. Se `5401` estiver ocupada, o contrato de porta do LingoPilot falha explicitamente; não há tentativa silenciosa de usar `5402` ou reutilizar outro processo.

Specs E2E ficam em:

```text
tests/e2e/**/*.spec.ts
```

## Test support determinístico

`packages/test-support` contém apenas suporte reutilizável de teste:

- `FakeClock`: relógio controlável com cópia defensiva de `Date` e avanço explícito;
- `DeterministicIdGenerator`: IDs previsíveis e sequenciais;
- `buildUser`: factory sintética com defaults válidos e overrides;
- `FakeUserRepository`: fake que implementa o mesmo port do domínio;
- `ScriptedProviderFake`: fake genérico para dependências externas ainda sem contrato de produção estabelecido.

O fake genérico de provider não define arquitetura de provider. Quando um provider real ganhar contrato próprio, o fake correspondente deve implementar esse contrato em vez de criar uma API paralela.

## Coverage

Relatório informativo:

```bash
pnpm test:coverage
```

A Foundation não impõe porcentagem global arbitrária. Coverage serve para localizar lacunas; regras críticas continuam exigindo casos comportamentais relevantes independentemente do percentual.

## CI

Pull requests executam:

- `CI / quality`: lint, typecheck, unit/integration e demais gates de qualidade;
- `CI / e2e`: Chromium + smoke Playwright contra PostgreSQL isolado;
- `CI / build`: só inicia depois de `quality` e `e2e` concluírem com sucesso.

Essa separação mantém o feedback de unit/integration rápido e torna o smoke de navegador um gate explícito sem misturar suas dependências com os testes puros.
