# PostgreSQL e Drizzle — LingoPilot

Este documento é normativo para a infraestrutura de persistência introduzida pela issue #10, estendida pela baseline de identidade/autorização da #11 e pela jornada inicial do aluno da #17.

## 1. Responsabilidade

`packages/db` é a fronteira de infraestrutura responsável por:

- schema físico PostgreSQL;
- migrations versionadas do Drizzle;
- criação de pool/conexão;
- helper de transação;
- repositories/helpers PostgreSQL;
- utilidades de migration e teste de integração.

Pacotes de domínio não importam Drizzle, `pg` ou `@lingo-pilot/db`. Repositórios PostgreSQL implementam contratos definidos pelas camadas apropriadas, sem inverter essa dependência.

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

Se `.env.local` já existia antes da issue #10, adicione as variáveis server-only seguindo `.env.example`; `pnpm env:init` continua não sobrescrevendo configuração existente.

## 4. Variáveis

`DATABASE_URL` é obrigatória para runtime e migrations. Em desenvolvimento deve usar `127.0.0.1:5435`.

`TEST_DATABASE_URL` existe somente para testes de integração. O parser exige um database name contendo `test`, aplica o endpoint local reservado em development/E2E e rejeita o mesmo banco usado por `DATABASE_URL`.

Nenhuma dessas variáveis é pública. Nunca criar aliases `NEXT_PUBLIC_DATABASE_*`.

A baseline de auth e o onboarding da #17 não adicionam secrets de provider nem novas variáveis de ambiente.

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

## 6. Histórico de migrations

### `0000_foundation_schema`

A primeira migration cria somente `app_metadata`, uma tabela técnica key/value usada para provar o pipeline de schema, migration e constraints sem antecipar entidades do Study Engine.

Ela possui:

- `key` como chave primária textual e não vazia;
- `value` obrigatório;
- `created_at` e `updated_at` como `timestamptz`;
- check constraint que rejeita chave em branco.

### `0001_identity_ownership_baseline`

A #11 adiciona somente estruturas necessárias para identidade/sessão e prova de ownership:

- `users` — identidade opaca mínima;
- `auth_credentials` — email canônico único + password hash ligado ao usuário;
- `auth_sessions` — sessão server-side com token hash, expiração e revogação;
- `ownership_fixtures` — recurso técnico com `owner_id` para testar autorização A/B.

Naquele estágio, a migration ainda não criava learner profile, course, study session, progress ou entidades pedagógicas; essas estruturas permaneceram reservadas às issues donas do domínio.

`auth_credentials` e `auth_sessions` usam FK com `ON DELETE CASCADE` para `users`. A fixture de ownership exige owner existente. O workflow completo de exclusão de conta continua pertencendo à #43.

### `0002_learner_journey`

A #17 introduz a persistência mínima da jornada inicial:

- `learner_profiles` — preferências globais por usuário, incluindo locale, timezone, meta diária e objetivo opcional;
- `language_profiles` — jornada pt-BR → en com nível inicial e estado ativo;
- `enrollments` — vínculo entre a jornada e o curso, com `entry_point_level` e `placement_source`.

As constraints preservam as invariantes da V1:

- um único `LearnerProfile` por `User`;
- um único `LanguageProfile` por `user + source_language + target_language`;
- um único `Enrollment` por `LanguageProfile + Course`;
- níveis iniciais limitados a A0/A1/A2;
- `placement_source=zero` somente com A0;
- `placement_source=manual` somente com A1/A2;
- FKs com `ON DELETE CASCADE` para impedir jornadas órfãs.

A operação de onboarding grava `LearnerProfile`, `LanguageProfile` e `Enrollment` dentro de uma única transação. Os conflitos de unicidade são tratados de forma idempotente: retry/refresh não cria uma segunda jornada equivalente nem uma segunda matrícula. Reentradas preservam o placement original e atualizam apenas preferências permitidas.

Essa migration não cria `Attempt`, `ReviewEvent`, `ConceptEvidence`, `MasteryState` ou completion para conteúdo anterior. Placement manual altera elegibilidade futura, não evidência pedagógica.

## 7. IDs e timestamps

Convenções para schemas futuros:

- IDs de domínio devem permanecer opacos e consistentes; a escolha concreta deve respeitar o contrato do domínio antes de virar coluna física;
- timestamps persistidos usam PostgreSQL `timestamp with time zone` (`timestamptz`);
- o pool configura a sessão PostgreSQL para `UTC`;
- timezone pedagógico do aluno é dado de domínio separado, não configuração da conexão;
- defaults de banco não substituem relógio injetável em regras temporais de domínio.

IDs de usuário/sessão são opacos. Sessões persistem `token_hash`, nunca o token bruto do cookie. `LanguageProfile` e `Enrollment` também usam IDs opacos gerados pela aplicação; unicidade semântica é protegida separadamente pelas constraints compostas da migration `0002`.

## 8. Pool e transações

`createDatabaseClient()` cria um `pg.Pool` e um cliente Drizzle sem conectar durante import/build. O pool usa limite explícito configurável e `UTC` como timezone de sessão.

`withTransaction(database, operation)` fornece a fronteira transacional injetável. Use cases/repositories futuros podem receber `Database` ou `DatabaseTransaction` sem acessar `process.env` nem criar conexão internamente.

Operações que precisam permanecer atomicamente consistentes devem usar esse boundary em vez de executar writes independentes. O repository da jornada inicial da #17 usa a própria transação do cliente Drizzle para manter `LearnerProfile + LanguageProfile + Enrollment` atomicamente consistentes.

O web app mantém um cliente de banco server-side reutilizável e não abre conexão durante import/build. Auth e ownership nunca são importados pelo bundle cliente.

Código de delivery que precisa de persistência importa `packages/db/src/runtime.ts`, uma superfície deliberadamente sem `migrations.ts`. Migration tooling permanece exclusivo dos comandos/scripts operacionais e não deve entrar no grafo do bundle Next.js.

## 9. Auth, ownership e jornada do aluno

Helpers de auth em `packages/db/src/auth.ts`:

- criam/consultam credencial por email canônico;
- criam sessão com token hash;
- resolvem apenas sessão não revogada e `expires_at > now`;
- revogam sessão pelo hash do token.

Helpers de ownership em `packages/db/src/ownership.ts` recebem `userId` resolvido no servidor. Leitura/escrita da fixture usam `resourceId + ownerId` na mesma cláusula `WHERE`.

O repository PostgreSQL da jornada recebe o `userId` autenticado pelo use case/delivery e consulta `LearnerProfile`/`LanguageProfile` pela identidade do servidor; o cliente não fornece `ownerId` como prova de acesso. A matrícula é alcançada pelo `LanguageProfile` pertencente ao usuário.

É proibido transformar o padrão em:

1. buscar recurso pedagógico apenas por ID sem ownership;
2. confiar em `ownerId`/`userId` do payload como autorização;
3. autorizar somente porque a UI escondeu uma ação.

Contratos completos: `docs/AUTHENTICATION.md` e `docs/DOMAIN_MODEL.md`.

## 10. Testes de integração

Com banco local ativo:

```bash
pnpm test:integration
```

A suíte:

1. valida `TEST_DATABASE_URL` antes de conectar;
2. remove apenas os schemas `public` e `drizzle` do banco explicitamente marcado como teste;
3. aplica migrations a partir de um estado vazio;
4. verifica insert/read e constraints da Foundation;
5. força erro dentro de transação e confirma rollback;
6. valida email canônico/único de credencial;
7. valida sessão ativa, expirada e revogada;
8. prova que usuário B não lê nem altera recurso de A;
9. valida criação transacional/idempotente da jornada inicial e suas constraints de placement;
10. confirma timezone UTC.

O teste nunca recebe `DATABASE_URL` como destino de escrita.

No CI, `CI / quality` sobe um PostgreSQL efêmero dedicado e executa a mesma suíte. Credenciais do workflow são sintéticas; nenhum secret real é necessário.

## 11. Reset local

Reset destrutivo do banco local:

```bash
pnpm db:reset
```

O comando remove container e volume próprios do LingoPilot, recria o PostgreSQL, aguarda healthcheck e reaplica migrations. Ele não toca containers, redes ou volumes de outros projetos.

Para apenas parar/remover o container e a rede preservando dados:

```bash
pnpm db:down
```

## 12. Seed e criação de conta

O projeto não depende de seed de domínio para criar contas ou jornadas reais de desenvolvimento. A #17 adiciona signup first-party que reutiliza o hashing/persistência da baseline de auth e cria a jornada somente quando o usuário conclui o onboarding.

Fixtures e factories automatizadas continuam usando somente dados sintéticos/determinísticos. Quando uma issue dona de conteúdo/dados de desenvolvimento exigir seed, ela deve adicionar comando explícito e documentação de idempotência no mesmo PR.

## 13. Produção

Produção usa `DATABASE_URL` fornecida pelo provider server-side. Migrations permanecem fora do build/deploy automático da aplicação, conforme o contrato de produção.

A conexão de produção não deve reutilizar credenciais locais/teste, e a aplicação não deve executar migration implicitamente ao iniciar ou importar módulos.

Antes de tráfego público, auth/signup precisam também de rate limit adequado à topologia serverless; não usar limiter local em memória como falsa garantia distribuída.
