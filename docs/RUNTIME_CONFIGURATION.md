# Runtime configuration — LingoPilot

Este documento define o contrato de configuração de runtime do LingoPilot. Ele complementa `docs/LOCAL_DEVELOPMENT.md`, `docs/SECURITY_PRIVACY.md` e `docs/PRODUCTION_DEPLOYMENT.md`.

## 1. Objetivos

A configuração deve ser previsível, validada cedo, tipada para consumidores TypeScript e segura para browser/server.

Princípios:

1. não acessar `process.env` de forma espalhada pela aplicação;
2. configuração obrigatória inválida deve falhar antes de servir tráfego;
3. valores públicos e server-only são contratos diferentes;
4. defaults só existem quando são comprovadamente seguros;
5. perfis de desenvolvimento e E2E não podem escolher portas dinamicamente;
6. `.env.example` contém apenas valores fictícios ou públicos seguros;
7. secrets nunca são commitados, logados ou expostos por `NEXT_PUBLIC_*`;
8. CI básico não depende de credenciais reais.

## 2. Fonte central

O parser central está em:

```text
@lingo-pilot/config/runtime/environment
```

A implementação é executável por Node.js (`environment.mjs`) e possui contrato TypeScript explícito (`environment.d.ts`).

Ele é responsável por:

- validar URL pública;
- resolver profile de runtime;
- validar timezone;
- normalizar flags booleanas;
- impor invariantes de dev/E2E;
- expor as constantes canônicas de host/porta usadas pelos scripts locais.

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

A chamada ao parser recebe um objeto explícito em vez de `process.env` inteiro. Isso impede que uma variável server-only seja propagada acidentalmente pelo módulo público quando novos secrets forem adicionados no futuro.

### `server.ts`

É o ponto central para configuração de runtime do servidor. Hoje lê explicitamente:

```text
APP_TIMEZONE
LINGO_PROFILE
LINGO_TEST_MODE
NEXT_PUBLIC_APP_URL
NODE_ENV
```

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

A porta é checada antes do Next.js iniciar. Se estiver ocupada, o processo falha; não existe fallback.

### E2E

`pnpm dev:e2e` injeta:

```text
LINGO_PROFILE=e2e
LINGO_TEST_MODE=true
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5401
```

Playwright completo e banco isolado continuam pertencendo à #16.

### Produção

Produção usa `NODE_ENV=production` e deve fornecer uma URL pública real no ambiente do provider. Test mode é proibido.

Quando Vercel/Neon forem efetivamente provisionados, as variáveis adicionais entram no contrato de produção na mesma mudança que implementar a capacidade correspondente.

## 6. Bootstrap local

Primeira execução:

```bash
pnpm env:init
pnpm env:check
```

`pnpm env:init`:

- copia `.env.example` para `.env.local` somente se `.env.local` não existir;
- nunca sobrescreve configuração local existente;
- não busca secrets em serviços externos.

`pnpm env:check`:

- carrega `.env.local` quando presente;
- preserva variáveis já fornecidas pelo processo;
- valida o contrato central;
- imprime somente valores não sensíveis necessários ao diagnóstico;
- termina com código diferente de zero quando a configuração é inválida.

## 7. Startup/build validation

`apps/web/next.config.ts` importa o contrato server-side. Portanto, `next dev`/`next build` não devem seguir silenciosamente com configuração inválida.

O objetivo é detectar erro de configuração antes de existir uma aplicação parcialmente funcional.

## 8. CI

CI fornece apenas valores sintéticos e seguros:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
LINGO_TEST_MODE=false
```

O job `quality` executa `pnpm env:check`. O job `build` recebe o mesmo ambiente e o Next.js volta a validar a configuração durante o build.

Nenhuma credencial real é necessária para os gates básicos.

## 9. Banco de dados

`DATABASE_URL` não existe ainda no contrato porque a implementação pertence à #10.

Quando entrar:

- local deve apontar para `127.0.0.1:5435`;
- CI deve usar PostgreSQL isolado;
- Preview/produção devem usar credenciais próprias;
- o valor é server-only;
- não pode ser prefixado com `NEXT_PUBLIC_`;
- validação deve verificar protocolo/shape sem logar credenciais.

## 10. Adicionando uma nova variável

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
10. existem testes de configuração válida e inválida?

Não adicionar variável “para usar depois”. Configuração entra junto com a capacidade que a consome.

## 11. Regras para agentes de IA

Agentes devem:

- usar os módulos centrais de configuração;
- evitar `process.env` em código de domínio/aplicação;
- nunca mover secret para `NEXT_PUBLIC_*` para resolver erro de build;
- nunca adicionar fallback silencioso para credencial ausente;
- nunca trocar as portas 5400/5401/5435 sem atualizar o contrato local;
- atualizar testes e documentação no mesmo PR que alterar configuração.
