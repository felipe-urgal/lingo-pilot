# Ambiente local e contrato de portas — LingoPilot

Este documento é normativo para desenvolvimento local do LingoPilot.

O objetivo é impedir colisões com projetos e infraestrutura que já executam na máquina de desenvolvimento, evitar comportamento não determinístico de ferramentas que escolhem portas automaticamente e manter URLs estáveis para autenticação, E2E e documentação.

O contrato de variáveis e separação browser/server está em `docs/RUNTIME_CONFIGURATION.md`. O workflow de persistência está em `docs/DATABASE.md`.

## 1. Princípios

1. **Nenhum serviço do LingoPilot deve assumir a porta padrão de uma ferramenta no host.**
2. **Nenhum processo deve procurar automaticamente “a próxima porta livre”.** Se a porta contratada estiver ocupada, o comando deve falhar com mensagem clara.
3. Portas de host são diferentes de portas internas de containers. PostgreSQL continua ouvindo `5432` dentro do container e é publicado em uma porta de host exclusiva.
4. Novas portas só podem ser adicionadas após checar este documento e o registro local de projetos.
5. Não reutilizar uma porta de outro projeto apenas porque ele parece estar desligado naquele momento.
6. CI é ambiente isolado e pode usar portas internas/default quando não houver colisão; isso não altera o contrato do host local.
7. Serviços locais devem preferir bind em `127.0.0.1` quando não houver necessidade explícita de exposição na rede.
8. Configuração local deve ser criada por `pnpm env:init` e validada por `pnpm env:check`; scripts oficiais não devem exigir conhecimento tribal.

## 2. Portas já ocupadas no ambiente

### Trabalho

| Porta | Serviço/projeto             |
| ----: | --------------------------- |
|  3000 | caiena                      |
|  3001 | fi-editor-api               |
|  3002 | fi-observatorio-app         |
|  3003 | fi-editor-local             |
|  3004 | caiena-reserved             |
|  3005 | caiena-reserved             |
|  3006 | caiena-reserved             |
|  3035 | fi-ferramentas-webpacker    |
|  1025 | fi-ferramentas-mailhog-smtp |
|  8025 | fi-ferramentas-mailhog-web  |
| 12345 | fi-ferramentas              |
| 12346 | fi-ferramentas              |

### Infraestrutura

| Porta | Serviço   |
| ----: | --------- |
|    80 | apache    |
|   443 | tailscale |
|  3306 | mysql     |
| 33060 | mysql-x   |
|  5432 | postgres  |
|  6379 | redis     |
| 11211 | memcached |

### Projetos pessoais

| Projeto           | Portas                                 |
| ----------------- | -------------------------------------- |
| home-music        | web `5173`, api `8787`, e2e `8791`     |
| dev-dashboard     | web `5174`, preview `4173`, api `4343` |
| controle-gastos   | web `5100`                              |
| loto-lab          | app `5200`, postgres `5434`             |
| portfolio-copilot | web `5300`, postgres `5433`             |

Os caminhos absolutos desses projetos são detalhes da máquina do desenvolvedor e não devem virar requisito de runtime do LingoPilot. O checkout pode ficar, por convenção pessoal, em `$HOME/Projetos/lingo-pilot`.

## 3. Portas reservadas para o LingoPilot

| Finalidade                       | Host        |    Porta | Observação                                                                                  |
| -------------------------------- | ----------- | -------: | ------------------------------------------------------------------------------------------- |
| Web / Next.js em desenvolvimento | `127.0.0.1` | **5400** | UI e endpoints HTTP da aplicação; não haverá API local separada no monólito modular inicial |
| Web para Playwright/E2E          | `127.0.0.1` | **5401** | servidor isolado de teste para não disputar a sessão de desenvolvimento                     |
| PostgreSQL local do projeto      | `127.0.0.1` | **5435** | mapping `host:5435 -> container:5432`                                                       |

Estas portas ficam reservadas ao projeto mesmo quando o processo não estiver ativo.

### URLs canônicas locais

```text
App dev:  http://127.0.0.1:5400
App E2E:  http://127.0.0.1:5401
Postgres: 127.0.0.1:5435
```

Não usar `3000` como fallback do Next.js: essa porta já pertence ao ambiente de trabalho. Não usar `5432`, `5433` ou `5434` para o PostgreSQL do LingoPilot.

## 4. Primeira execução

Pré-requisitos: Node.js 24.x, Corepack, Docker Engine e Docker Compose.

```bash
nvm use
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
pnpm env:init
pnpm env:check
pnpm db:up
pnpm db:migrate
pnpm db:smoke
pnpm dev
```

`pnpm env:init` cria `.env.local` a partir de `.env.example` somente quando necessário. Ele nunca sobrescreve um `.env.local` existente. Quem já possuía o arquivo antes da foundation de banco deve adicionar `DATABASE_URL` e `TEST_DATABASE_URL` manualmente a partir do exemplo versionado.

`pnpm env:check` carrega `.env.local` quando presente e valida o contrato central. Erro de configuração termina com código diferente de zero e mensagem com a chave problemática, sem imprimir secrets.

## 5. Contrato web implementado

Comandos canônicos:

```text
pnpm dev      -> 127.0.0.1:5400
pnpm dev:e2e  -> 127.0.0.1:5401
```

Antes de iniciar o Next.js, `apps/web/scripts/port-contract.mjs` verifica se a porta contratada está livre. Se estiver ocupada, o processo termina com erro; ele não tenta `5401`, `5402` ou qualquer outra porta.

As constantes `WEB_HOST`, `WEB_PORT` e `E2E_PORT` vivem no contrato central `@lingo-pilot/config/runtime/environment`, evitando duplicação entre scripts e validação.

Os scripts oficiais também injetam profiles determinísticos:

```text
pnpm dev
  LINGO_PROFILE=development
  LINGO_TEST_MODE=false
  NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400

pnpm dev:e2e
  LINGO_PROFILE=e2e
  LINGO_TEST_MODE=true
  NEXT_PUBLIC_APP_URL=http://127.0.0.1:5401
```

Isso impede que um `.env.local` antigo faça o servidor iniciar numa porta enquanto a aplicação acredita estar em outra origem.

## 6. `.env.example`

O arquivo versionado contém somente configuração pública segura ou credenciais locais sintéticas:

```dotenv
NEXT_PUBLIC_APP_URL=http://127.0.0.1:5400
APP_TIMEZONE=UTC
LINGO_TEST_MODE=false
DATABASE_URL=postgresql://lingo_pilot:lingo_pilot_local@127.0.0.1:5435/lingo_pilot_dev
TEST_DATABASE_URL=postgresql://lingo_pilot:lingo_pilot_local@127.0.0.1:5435/lingo_pilot_test
```

Regras:

- `NEXT_PUBLIC_APP_URL` é público e deliberadamente browser-safe;
- `APP_TIMEZONE` é fallback de infraestrutura, não preferência pedagógica do usuário;
- `LINGO_TEST_MODE` é server-side e deve permanecer `false` fora de teste;
- `LINGO_PROFILE` é injetado/derivado e não precisa ser configurado manualmente;
- `DATABASE_URL` é server-only e, em development/E2E, deve usar `127.0.0.1:5435`;
- `TEST_DATABASE_URL` é server-only, deve identificar explicitamente um banco de teste e nunca pode reutilizar o banco de desenvolvimento;
- auth e providers entram somente nas issues que implementarem essas capacidades.

## 7. Validação de startup/build

`apps/web/next.config.ts` carrega `apps/web/config/server.ts`. Portanto, `next dev` e `next build` validam configuração antes de prosseguir.

A aplicação possui também `apps/web/config/public.ts`, que recebe explicitamente apenas `NEXT_PUBLIC_APP_URL`. Não passar `process.env` inteiro para módulos públicos.

`DATABASE_URL` é validada por protocolo/shape e endpoint local, mas essa validação **não abre conexão**. Build e import de módulos não executam migrations nem consultas.

A regra é falhar cedo. Não usar defaults para esconder URL, credencial ou configuração operacional inválida.

## 8. Docker / PostgreSQL

O PostgreSQL local é implementado em `compose.yaml` com isolamento explícito:

```text
container: lingo-pilot-postgres
network:   lingo-pilot-network
volume:    lingo-pilot-postgres-data
bind:      127.0.0.1:5435 -> container:5432
```

O Compose cria:

```text
lingo_pilot_dev   -> desenvolvimento comum
lingo_pilot_test  -> integração automatizada
```

Comandos:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:smoke
pnpm test:integration
pnpm db:down
```

`pnpm db:reset` é destrutivo somente para o volume próprio do LingoPilot: remove o volume, recria ambos os bancos e reaplica migrations no banco de desenvolvimento.

Regras:

- não publicar `5432:5432` no host;
- não usar `5433` ou `5434`, pois já pertencem a outros projetos;
- não compartilhar container/network/volume com outro projeto;
- integration tests só podem destruir/recriar schemas dentro do `TEST_DATABASE_URL` validado;
- CI usa um serviço PostgreSQL efêmero próprio;
- detalhes de schema, migration e reset vivem em `docs/DATABASE.md`.

## 9. E2E

O Playwright usa a aplicação em `5401` por configuração explícita. `pnpm test:e2e` valida `TEST_DATABASE_URL`, recria/migra somente o banco de teste e inicia `pnpm dev:e2e` com `reuseExistingServer` desabilitado. O processo de desenvolvimento em `5400` pode permanecer ativo durante a suíte.

O E2E não deve:

- matar processo que esteja em `5400`;
- assumir que dev server não está rodando;
- escolher porta dinâmica silenciosamente;
- compartilhar banco mutável com o ambiente de desenvolvimento comum.

## 10. Diagnóstico de conflito

Se houver conflito de porta web, a mensagem informa host/porta e que o LingoPilot não auto-incrementa portas.

Comandos úteis no Linux:

```bash
lsof -iTCP:5400 -sTCP:LISTEN
ss -ltnp | grep ':5400'
lsof -iTCP:5435 -sTCP:LISTEN
```

Evitar o padrão:

```text
Port 5400 is in use, trying 5401...
```

Esse comportamento é proibido porque quebra callbacks, E2E, CORS/origin e documentação.

## 11. Novos serviços futuros

Speaking storage, filas, cache, mail catcher, observability local ou qualquer outro serviço futuro **não recebe porta antecipadamente**.

Ao introduzir serviço/configuração nova:

1. confirmar necessidade e issue dona;
2. verificar portas já reservadas;
3. classificar variável como pública ou server-only;
4. escolher default somente se realmente seguro;
5. atualizar parser, `.env.example`, testes e docs;
6. fornecer valor sintético em CI quando necessário;
7. registrar impacto em OAuth/CORS/CSP/callbacks.

Não reservar intervalos inteiros nem criar variáveis “para usar depois”.

## 12. Relação com issues de Foundation

- **#7:** web shell, portas 5400/5401 e fail-fast de conflito.
- **#8:** CI permanente e proteção da `main`.
- **#9:** contrato central de configuração, `env:init`, `env:check`, profiles e validação startup/build.
- **#10:** PostgreSQL/Drizzle/migrations e porta host 5435.
- **#16:** Vitest/Testing Library, Playwright em `5401`, isolamento E2E, harness PostgreSQL e suporte determinístico de testes.

## 13. Regra para agentes de IA

Antes de alterar serviço local, container, callback URL ou variável de ambiente, o agente deve consultar este arquivo, `docs/RUNTIME_CONFIGURATION.md` e, para persistência, `docs/DATABASE.md`.

Um agente não pode resolver erro de configuração escolhendo outra porta, expondo secret como `NEXT_PUBLIC_*`, compartilhando banco mutável entre perfis ou adicionando fallback silencioso.
