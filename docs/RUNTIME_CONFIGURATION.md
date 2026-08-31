# Runtime configuration — LingoPilot

Este documento define o contrato de configuração de runtime do LingoPilot. Ele complementa `docs/LOCAL_DEVELOPMENT.md`, `docs/DATABASE.md`, `docs/SECURITY_PRIVACY.md` e `docs/PRODUCTION_DEPLOYMENT.md`.

## 1. Objetivos

A configuração deve ser previsível, validada cedo, tipada para consumidores TypeScript e segura para browser/server.

Princípios:

1. não acessar `process.env` de forma espalhada pela aplicação;
2. configuração obrigatória inválida deve falhar antes de servir tráfego;
3. valores públicos e server-only são contratos diferentes;
4. defaults só existem quando são comprovadamente seguros;
5. perfis de desenvolvimento e E2E não podem escolher portas dinamicamente;
6. `.env.example` contém apenas valores fictícios, credenciais locais sintéticas ou valores públicos seguros;
7. secrets reais nunca são commitados, logados ou expostos por `NEXT_PUBLIC_*`;
8. CI básico não depende de credenciais reais;
9. o `.env.local` canônico fica na raiz do monorepo e não é duplicado por workspace;
10. variáveis já presentes no processo sempre têm precedência sobre `.env.local`.

## 2. Fonte central

O parser central está em:

```text
@lingo-pilot/config/runtime/environment
```

A implementação é executável por Node.js (`environment.mjs`) e possui contrato TypeScript explícito (`environment.d.ts`).

Ele é responsável por:

- validar URL pública;
- validar URLs PostgreSQL server-only;
- resolver profile de runtime;
- validar timezone;
- normalizar flags booleanas;
- impor invariantes de dev/E2E;
- proteger o banco de integração contra reutilização acidental do banco de desenvolvimento;
- expor constantes canônicas de host/porta usadas pelos scripts locais.

O carregamento do arquivo local fica separado do parser. O helper:

```text
scripts/runtime-env.mjs
```

resolve o ambiente efetivo combinando `.env.local` da raiz com o ambiente do processo. Essa separação mantém o parser testável e permite reutilizar o mesmo mecanismo em build, start, migrations, smoke checks e testes de integração.

## 3. Separação browser/server

O web app possui duas entradas:

```text
apps/web/config/public.ts
apps/web/config/server.ts
```

### `public.ts`

Só recebe variáveis que podem ir para o browser. Hoje:

```text
NEXT_PUBLIC_APP_URL
```

A chamada ao parser recebe um objeto explícito em vez de `process.env` inteiro. Testes garantem que `DATABASE_URL`, `TEST_DATABASE_URL` e outros valores server-only não aparecem na configuração pública.

### `server.ts`

É o ponto central para configuração de runtime do servidor. Hoje lê explicitamente:

```text
APP_TIMEZONE
DATABASE_URL
LINGO_PROFILE
LINGO_TEST_MODE
NEXT_PUBLIC_APP_URL
NODE_ENV
```

`TEST_DATABASE_URL` não é runtime da aplicação web: é lida somente pela infraestrutura de integration tests.

Novos secrets devem entrar somente no contrato server-side e somente na issue que introduzir a capacidade dona daquele secret.

## 4. Variáveis atuais

### `NEXT_PUBLIC_APP_URL`

Obrigatória quando a configuração é validada.

Regras:

- URL absoluta;
- apenas `http` ou `https`;
- sem usuário/senha;
- sem path, query string ou hash;
- desenvolvimento oficial: `http://127.0.0.1:5400`;
- E2E oficial: `http://127.0.0.1:5401`.

É pública por definição e pode ser usada no browser.

### `APP_TIMEZONE`

Timezone de fallback da infraestrutura. Default seguro: `UTC`.

Deve ser um timezone IANA válido. Não representa automaticamente o timezone pedagógico do aluno; a data de estudo do usuário pertence ao domínio/perfil quando essa feature existir.

### `DATABASE_URL`

Conexão PostgreSQL server-only obrigatória para runtime e comandos de banco.

Regras:

- protocolo `postgres:` ou `postgresql:`;
- deve conter host e exatamente um database name;
- development/E2E devem usar `127.0.0.1:5435`;
- Preview/produção usam credenciais próprias do provider;
- nunca prefixar com `NEXT_PUBLIC_`;
- nunca imprimir a URL em logs;
- validar a URL não abre conexão nem executa migration.

### `TEST_DATABASE_URL`

Conexão server-only exclusiva para integration tests.

Regras:

- segue o mesmo shape PostgreSQL de `DATABASE_URL`;
- development/E2E usam `127.0.0.1:5435`;
- o database name deve conter `test`;
- não pode identificar o mesmo host/porta/database de `DATABASE_URL`;
- não é repassada pelo Turborepo nem consumida pelo web app.

Essas guardas existem porque a suíte de integração recria schemas e, portanto, nunca pode atingir o banco comum de desenvolvimento.

### `LINGO_TEST_MODE`

Flag server-side para comportamento de teste.

Valores aceitos:

```text
true / false
1 / 0
yes / no
on / off
```

Regras:

- desenvolvimento comum: `false`;
- produção: `false`;
- E2E: `true`.

### `LINGO_PROFILE`

Variável interna de runtime. Os scripts oficiais a injetam; o desenvolvedor não precisa configurá-la no `.env.local`.

Perfis aceitos:

```text
development
e2e
test
production
```

Sem valor explícito, o parser deriva o profile a partir de `NODE_ENV`.

## 5. Perfis oficiais

### Desenvolvimento

`pnpm dev` injeta de forma determinística:

```text
LINGO_PROFILE=development
LINGO_TEST_MODE=false
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
```

`DATABASE_URL` continua vindo do ambiente efetivo e deve apontar para o endpoint local reservado. A porta web é checada antes do Next.js iniciar; se estiver ocupada, o processo falha.

### E2E

`pnpm dev:e2e` injeta:

```text
LINGO_PROFILE=e2e
LINGO_TEST_MODE=true
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5401
```

A foundation de banco já suporta conexão local isolada. Playwright e o lifecycle completo de banco/fixtures E2E continuam responsabilidade da #16.

### Produção

Produção usa `NODE_ENV=production`, deve fornecer uma URL pública real e uma `DATABASE_URL` real server-side no ambiente do provider. Test mode é proibido.

Provisionamento Neon/Vercel continua separado do código de foundation; migrations não são executadas automaticamente por build/start.

## 6. Bootstrap local e precedência

Primeira execução:

```bash
pnpm env:init
pnpm env:check
pnpm db:up
pnpm db:migrate
pnpm db:smoke
```

`pnpm env:init`:

- copia `.env.example` para `.env.local` na raiz somente se `.env.local` não existir;
- nunca sobrescreve configuração local existente;
- não busca secrets em serviços externos;
- não cria cópia em `apps/web` ou em packages.

Quem já possuía `.env.local` antes da foundation de banco deve adicionar manualmente as variáveis novas do `.env.example`.

`pnpm env:check`:

- resolve `.env.local` quando presente;
- preserva variáveis já fornecidas pelo processo;
- valida o contrato central, incluindo `DATABASE_URL`;
- imprime somente valores não sensíveis necessários ao diagnóstico;
- termina com código diferente de zero quando a configuração é inválida.

A precedência é deliberada:

```text
shell / CI / provider
        ↓ sobrescreve
.env.local da raiz
```

Isso impede que um arquivo local faça shadow de configuração fornecida por CI ou produção.

## 7. Comandos que iniciam subprocessos

Carregar `.env.local` dentro de `pnpm env:check` não altera o ambiente do shell que executará o próximo comando. Cada script npm/pnpm roda em um processo separado.

Além disso, o Next.js é executado a partir de `apps/web`, portanto não devemos depender de descoberta implícita do `.env.local` localizado na raiz do monorepo.

Por isso, comandos raiz que precisam de runtime config usam:

```text
scripts/run-with-runtime-env.mjs
```

Hoje incluem:

```bash
pnpm build
pnpm start
pnpm db:migrate
pnpm db:smoke
pnpm test:integration
```

O wrapper:

1. lê `.env.local` da raiz quando existir;
2. combina o arquivo com o ambiente atual, mantendo o processo como maior precedência;
3. valida a configuração antes de iniciar o comando;
4. passa o ambiente efetivo explicitamente ao processo filho;
5. não imprime valores de configuração ou secrets.

Comandos internos de workspace pressupõem ambiente já injetado externamente. Para operações comuns, prefira os comandos raiz documentados.

## 8. Startup/build validation

`apps/web/next.config.ts` importa o contrato server-side. Portanto, `next dev`/`next build` não seguem silenciosamente com configuração inválida.

A validação ocorre em duas bordas para comandos canônicos de build/start:

```text
root runtime wrapper
       ↓
processo filho / Turborepo
       ↓
Next config valida novamente
```

`DATABASE_URL` participa dessa validação, mas nenhuma chamada de rede acontece. Criar o pool, aplicar migrations e abrir conexão são ações explícitas da boundary `packages/db`.

## 9. CI

CI fornece apenas valores sintéticos e seguros:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_runtime
TEST_DATABASE_URL=postgresql://<synthetic>@127.0.0.1:5435/lingo_pilot_test
LINGO_TEST_MODE=false
```

O job `quality` sobe um PostgreSQL efêmero próprio, executa `pnpm env:check`, lint, typecheck, unit tests, integration tests reais, `pnpm db:check` e content validation.

Somente `TEST_DATABASE_URL` é usada como destino destrutivo dos integration tests. `DATABASE_URL` existe no CI para validar o contrato server-side; o banco runtime sintético não precisa existir para build porque build não conecta.

O job `build` recebe o mesmo ambiente e `pnpm build` passa por `scripts/run-with-runtime-env.mjs`; o Next.js volta a validar a configuração sem executar migrations.

Nenhuma credencial real é necessária para esses gates.

## 10. Banco de dados

O contrato implementado é:

- local em `127.0.0.1:5435`;
- `DATABASE_URL` server-only para desenvolvimento/runtime/migrations;
- `TEST_DATABASE_URL` server-only e isolada para integration tests;
- CI com PostgreSQL efêmero;
- pool PostgreSQL configurado para UTC;
- migrations versionadas do Drizzle fora do build/deploy da aplicação;
- comandos de banco reutilizam o carregador de ambiente raiz;
- nenhuma migration/conexão acontece por import.

Detalhes operacionais, schema, transações, reset e convenções de timestamps estão em `docs/DATABASE.md`.

## 11. Adicionando uma nova variável

Toda nova variável precisa responder antes do merge:

1. qual capacidade é dona dela?;
2. é pública ou server-only?;
3. é obrigatória em quais environments?;
4. existe default realmente seguro?;
5. qual mensagem de erro ajuda o operador?;
6. como CI/testes recebem valor sintético?;
7. a documentação e `.env.example` precisam mudar?;
8. ela afeta callbacks, CSP, CORS, storage, banco ou providers?;
9. há risco de secret aparecer em logs/browser?;
10. existem testes de configuração válida e inválida?;
11. algum comando subprocesso precisa receber explicitamente a variável?

Não adicionar variável “para usar depois”. Configuração entra junto com a capacidade que a consome.

## 12. Regras para agentes de IA

Agentes devem:

- usar os módulos centrais de configuração;
- reutilizar `scripts/runtime-env.mjs` para comandos raiz que precisem carregar `.env.local`;
- evitar `process.env` em código de domínio/aplicação;
- nunca mover secret para `NEXT_PUBLIC_*` para resolver erro de build;
- nunca duplicar `.env.local` em `apps/web` como workaround;
- nunca usar `DATABASE_URL` como fallback de `TEST_DATABASE_URL`;
- nunca adicionar fallback silencioso para credencial ausente;
- nunca trocar as portas 5400/5401/5435 sem atualizar o contrato local;
- atualizar testes e documentação no mesmo PR que alterar configuração.
