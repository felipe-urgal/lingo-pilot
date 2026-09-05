# PWA e resiliência offline

Este documento registra o contrato inicial da issue #42. A prioridade é continuidade segura, sem transformar Cache Storage ou Background Sync em uma segunda fonte de verdade para dados do aluno.

## Objetivos do primeiro recorte

- tornar o app instalável por manifest + service worker;
- manter assets estáticos necessários ao shell reutilizáveis offline;
- oferecer fallback público, claro e acessível quando a navegação perde rede;
- nunca persistir HTML autenticado, respostas de API ou payloads de estudo no service worker;
- limpar caches pertencentes ao LingoPilot após logout bem-sucedido;
- manter mutations network-only até existir uma fila desenhada em cima de idempotência comprovada.

## Política de cache

O service worker usa caches versionados com prefixo `lingo-pilot-`.

### Pode entrar em cache

- `/offline`, como fallback público de navegação;
- respostas `GET` bem-sucedidas sob `/_next/static/`.

### Não entra em cache

- `/app` e qualquer rota autenticada;
- `/api` e qualquer resposta de API;
- `/login` e `/signup`;
- `POST`, `PUT`, `PATCH`, `DELETE`;
- Attempts, ReviewEvents, learner context, progress ou qualquer dado derivado de usuário.

Navegação é network-first. Se a rede falhar, o worker retorna somente `/offline` já precacheado.

## Logout e dados residuais

O worker observa apenas o `POST /api/auth/logout` para limpeza. Quando a resposta do servidor é menor que 400, todos os caches cujo nome começa por `lingo-pilot-` são removidos.

A limpeza não toca caches de outros aplicativos/origins com nomes não pertencentes ao LingoPilot.

Como HTML privado não é cacheado neste recorte, logout não depende dessa limpeza para confidencialidade; ela é defesa adicional para assets/fallback versionados e para evolução futura do contrato.

## Mutations offline

Não existe fila genérica, IndexedDB de replay nem Background Sync neste recorte.

Se o aluno tentar enviar uma operação sem rede, o comportamento continua sendo o erro recuperável do fluxo atual. Uma fila só pode ser adicionada quando cada operação elegível tiver:

1. `operationKey` estável gerada antes do primeiro envio;
2. idempotência server-side comprovada por teste;
3. ownership revalidada no replay;
4. limite de retenção/tamanho;
5. estratégia para logout/troca de usuário;
6. UI que diferencie `pending`, `sent`, `failed` e `discarded`;
7. teste de reconnect sem duplicar Attempt/ReviewEvent.

Até isso existir, network-only é a decisão mais segura.

## Atualização do service worker

`install` precacheia o fallback e chama `skipWaiting`. `activate` remove versões antigas dos caches LingoPilot e assume controle com `clients.claim()`.

Assets estáticos usam cache-first somente porque seus caminhos do Next são versionados por build/hash. HTML e APIs não usam stale-while-revalidate.

## Installability

`app/manifest.ts` define nome, `start_url`, display standalone, idioma e ícone. O service worker é registrado apenas quando `navigator.serviceWorker` existe e o contexto é seguro.

Falha ao registrar o worker não bloqueia a aplicação online.

## Testes

`tests/pwa-service-worker-policy.test.mjs` protege invariantes que não podem regredir silenciosamente:

- rotas privadas nunca são classificadas como asset cacheável;
- somente `GET` de `/_next/static/` com resposta bem-sucedida pode ser persistido;
- logout bem-sucedido solicita limpeza de cache;
- worker não introduz IndexedDB, SyncManager ou listener de Background Sync.

Antes de promover a #42 a Done ainda são necessários testes browser-first dos critérios completos da issue, incluindo installability real, update de service worker, navegação offline/reconnect e comportamento em múltiplos estados de sessão.

## Próximos recortes

A issue #42 permanece aberta depois desta foundation. Próximos passos devem ser guiados por dogfood e pelos critérios de aceite, especialmente:

- verificar installability em browser real;
- medir storage/cache budget;
- decidir se algum conteúdo editorial público/revisionado pode ser cacheado sem risco de stale indefinido;
- só então avaliar fila offline restrita a mutations comprovadamente idempotentes.
