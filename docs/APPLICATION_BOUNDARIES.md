# Application Boundaries — LingoPilot

Este documento concretiza a baseline da issue #12 sem alterar a direção arquitetural definida em `docs/ARCHITECTURE.md` e no ADR 0001.

## Direção de dependências

```text
UI / Delivery
    ↓
Application / Use cases
    ↓
Domain contracts
    ↑
Infrastructure adapters
```

A localização física atual é deliberadamente simples:

- `packages/domain/src`: tipos de domínio, invariantes e ports essenciais;
- `apps/web/server/application`: orchestration/use cases puros, sem dependência de Next.js, React, Drizzle ou PostgreSQL;
- `packages/db/src/repositories`: adapters PostgreSQL que implementam ports definidos pelo domínio;
- delivery/composition root: pode conhecer application e infrastructure para montar dependências, mas não deve mover regras de negócio para handlers HTTP.

Não existe um package `application` separado nesta fase. Criá-lo sem necessidade concreta adicionaria uma nova fronteira de workspace sem mudar a direção das dependências.

## Contratos compartilhados

`packages/domain/src/foundation/contracts.ts` contém somente contratos pequenos e necessários:

- `Result<TValue, TError>` para resultados esperados e discriminados;
- `ApplicationError<TCode>` para erros de aplicação identificáveis por código;
- `Clock` para regras temporais testáveis sem depender de `Date.now()`;
- `IdGenerator` para geração de identificadores substituível em testes.

Esses contratos não possuem implementação de framework, banco ou provider.

## Estratégia de erros

Erros esperados devem atravessar use cases como `Result`, usando códigos tipados e tratáveis pela camada de delivery. O adapter pode representar conflitos esperados sem lançar `Error` genérico.

Falhas inesperadas de infraestrutura não devem ser silenciosamente convertidas em sucesso ou em erro de domínio falso. Elas continuam seguindo a taxonomia/observabilidade da camada externa.

## Repository ports

A interface de repository vive no lado interno que precisa do contrato. O domínio/aplicação define o que necessita; PostgreSQL implementa esse contrato em `packages/db`.

A interface deve começar mínima e crescer somente quando um use case real exigir novas operações. Não criar `BaseRepository`, `BaseEntity` ou CRUD genérico.

## Vertical executável da Foundation

A primeira vertical é `createUserIdentity`:

1. o use case recebe `Clock`, `IdGenerator` e `UserRepository` por interface;
2. o teste unitário usa um fake repository em memória e tempo/ID determinísticos;
3. `PostgresUserRepository` implementa o mesmo port usando a tabela `users` já criada pela baseline de autenticação;
4. o teste de integração executa o mesmo use case contra PostgreSQL sem alterar código de domínio/aplicação.

Esse fluxo é um probe técnico da Foundation. Ele não cria endpoint público, credencial, signup ou onboarding; essas decisões continuam pertencendo às issues de produto correspondentes.

## Enforcement

`pnpm check:workspace` verifica estruturalmente que:

- `@lingo-pilot/domain` não declara dependências proibidas;
- arquivos de `packages/domain/src` importam somente dentro do próprio boundary;
- use cases em `apps/web/server/application` não importam Next.js, React, Drizzle ou código de `packages/db`.

O check não substitui revisão arquitetural, mas transforma as regras mais importantes da #12 em falhas automatizadas de CI.
