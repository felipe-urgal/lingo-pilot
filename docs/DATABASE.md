# PostgreSQL e Drizzle — LingoPilot

Este documento é normativo para a infraestrutura de persistência introduzida pela issue #10.

## 1. Responsabilidade

`packages/db` é a fronteira de infraestrutura responsável por:

- schema físico PostgreSQL;
- migrations versionadas do Drizzle;
- criação de pool/conexão;
- helper de transação;
- utilidades de migration e teste de integração.

Pacotes de domínio não importam Drizzle, `pg` ou `@lingo-pilot/db`. Repositórios PostgreSQL futuros implementam contratos definidos pelas camadas apropriadas, sem inverter essa dependência.

## 2. Banco local isolado

O PostgreSQL local é executado por `compose.yaml` com nomes exclusivos do projeto:

```text
container: lingo-pilot-postgres
network:   lingo-pilot-network
volume:    lingo-pilot-postgres-data
```

A única publicação local permitida é:

```text
127.0.0.1:5435 -> postgres:5432
```

Não usar `5432`, `5433` ou `5434` no host. O serviço não é publicado em `0.0.0.0`.

O Compose cria dois bancos com credenciais sintéticas locais:

```text
lingo_pilot_dev   -> desenvolvimento comum
lingo_pilot_test  -> testes de integração
```

Nenhum deles é reutilizado por outro projeto.

## 3. Primeira execução

Depois de `pnpm env:init`:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:smoke
pnpm dev
```

`pnpm db:up` espera o healthcheck do PostgreSQL antes de retornar. `pnpm db:migrate` aplica apenas migrations versionadas. `pnpm db:smoke` abre uma conexão curta e confirma que a sessão está em UTC.

Se `.env.local` já existia antes da issue #10, adicione as novas variáveis server-only seguindo `.env.example`; `pnpm env:init` continua não sobrescrevendo configuração existente.

## 4. Variáveis

`DATABASE_URL` é obrigatória para runtime e migrations. Em desenvolvimento deve usar `127.0.0.1:5435`.

`TEST_DATABASE_URL` existe somente para testes de integração. O parser exige um database name contendo `test`, aplica o endpoint local reservado em development/E2E e rejeita o mesmo banco usado por `DATABASE_URL`.

Nenhuma dessas variáveis é pública. Nunca criar aliases `NEXT_PUBLIC_DATABASE_*`.

## 5. Schema e migrations

Fonte do schema:

```text
packages/db/src/schema.ts
```

Configuração Drizzle Kit:

```text
packages/db/drizzle.config.ts
```

Migrations versionadas:

```text
packages/db/drizzle/
```

Comandos canônicos:

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
```

Fluxo para alterar schema:

1. alterar `packages/db/src/schema.ts`;
2. executar `pnpm db:generate -- --name=<descricao>`;
3. revisar SQL e metadata gerados;
4. executar `pnpm db:check`;
5. aplicar em banco vazio e banco local existente com `pnpm db:migrate`;
6. adicionar/ajustar integration tests.

Nunca editar uma migration já aplicada para mudar seu significado. Correções entram em uma nova migration, salvo enquanto a migration ainda pertence a um PR não mergeado e não foi compartilhada como estado persistente.

## 6. Migration foundation

A primeira migration cria apenas `app_metadata`, uma tabela técnica key/value usada para provar o pipeline de schema, migration e constraints sem antecipar entidades do Study Engine.

Ela possui:

- `key` como chave primária textual e não vazia;
- `value` obrigatório;
- `created_at` e `updated_at` como `timestamptz`;
- check constraint que rejeita chave em branco.

Nenhuma tabela de learner, course, session, progress ou auth é criada pela Foundation.

## 7. IDs e timestamps

Convenções para schemas futuros:

- IDs de domínio devem permanecer opacos e consistentes; a escolha concreta deve respeitar o contrato do domínio antes de virar coluna física;
- timestamps persistidos usam PostgreSQL `timestamp with time zone` (`timestamptz`);
- o pool configura a sessão PostgreSQL para `UTC`;
- timezone pedagógico do aluno é dado de domínio separado, não configuração da conexão;
- defaults de banco não substituem relógio injetável em regras temporais de domínio.

## 8. Pool e transações

`createDatabaseClient()` cria um `pg.Pool` e um cliente Drizzle sem conectar durante import/build. O pool usa limite explícito configurável e `UTC` como timezone de sessão.

`withTransaction(database, operation)` fornece a fronteira transacional injetável. Use cases/repositories futuros podem receber `Database` ou `DatabaseTransaction` sem acessar `process.env` nem criar conexão internamente.

Operações que precisam permanecer atomicamente consistentes devem usar esse boundary em vez de executar writes independentes.

## 9. Testes de integração

Com banco local ativo:

```bash
pnpm test:integration
```

A suíte:

1. valida `TEST_DATABASE_URL` antes de conectar;
2. remove apenas os schemas `public` e `drizzle` do banco explicitamente marcado como teste;
3. aplica migrations a partir de um estado vazio;
4. verifica insert/read;
5. verifica constraint;
6. força erro dentro de transação e confirma rollback;
7. confirma timezone UTC.

O teste nunca recebe `DATABASE_URL` como destino de escrita.

No CI, `CI / quality` sobe um PostgreSQL efêmero dedicado e executa a mesma suíte. Credenciais do workflow são sintéticas; nenhum secret real é necessário.

## 10. Reset local

Reset destrutivo do banco local:

```bash
pnpm db:reset
```

O comando remove container e volume próprios do LingoPilot, recria o PostgreSQL, aguarda healthcheck e reaplica migrations. Ele não toca containers, redes ou volumes de outros projetos.

Para apenas parar/remover o container e a rede preservando dados:

```bash
pnpm db:down
```

## 11. Seed

A Foundation não possui seed de domínio. Isso é deliberado: ainda não existem entidades pedagógicas implementadas para popular sem antecipar o modelo.

O estado baseline é produzido somente pelas migrations. Quando uma issue dona de dados de desenvolvimento exigir seed, ela deve adicionar comando explícito, dados sintéticos/determinísticos e documentação de idempotência no mesmo PR.

## 12. Produção

Produção usa `DATABASE_URL` fornecida pelo provider server-side. Migrations permanecem fora do build/deploy automático da aplicação, conforme o contrato de produção.

A conexão de produção não deve reutilizar credenciais locais/teste, e a aplicação não deve executar migration implicitamente ao iniciar ou importar módulos.
