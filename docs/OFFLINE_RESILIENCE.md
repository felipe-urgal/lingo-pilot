# PWA e resiliência offline

Este documento registra o contrato inicial da issue #42. A prioridade é continuidade segura, sem transformar Cache Storage ou Background Sync em uma segunda fonte de verdade para dados do aluno.

## Objetivos do primeiro recorte

- tornar o app instalável por manifest + service worker;
- manter assets estáticos necessários ao shell reutilizáveis offline;
- oferecer fallback público, claro e acessível quando a navegação perde rede;
- nunca persistir HTML autenticado, respostas de API ou payloads de estudo no service worker;
- limpar caches de sessão pertencentes ao LingoPilot após logout bem-sucedido, preservando somente o shell público offline;
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

O worker observa apenas o `POST /api/auth/logout` para limpeza. Quando a resposta do servidor é menor que 400, caches LingoPilot que possam carregar estado de sessão ou assets acumulados são removidos.

O cache `lingo-pilot-shell-*` é preservado porque contém apenas o fallback público `/offline`. Isso evita que uma sessão futura perca a tela offline depois que o usuário anterior fizer logout; nenhum HTML autenticado ou dado do aluno é mantido nesse shell.

A limpeza não toca caches de outros aplicativos/origins com nomes não pertencentes ao LingoPilot.

Como HTML privado não é cacheado neste recorte, logout não depende dessa limpeza para confidencialidade; ela é defesa adicional para assets e para evolução futura do contrato.

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

O registro no client também participa do lifecycle de versão: depois que `/sw.mjs` registra com sucesso, a aplicação observa o evento `online`. Quando a conectividade retorna, chama `ServiceWorkerRegistration.update()` para que o browser verifique uma nova versão do worker imediatamente, em vez de depender apenas da cadência interna do navegador. O listener é removido no unmount e erros de `register()`/`update()` continuam não bloqueantes para a experiência online.

Esse comportamento **não** reenvia mutations, não cria fila e não toca em payload de estudo. Reconnect neste recorte significa somente recuperar conectividade e verificar atualização do worker; qualquer retry de operação transacional continua pertencendo ao fluxo que prove idempotência server-side.

## Installability

`app/manifest.ts` define nome, `start_url`, display standalone, idioma e o ícone SVG escalável com alvos explícitos `192x192` e `512x512`. O service worker é registrado apenas quando `navigator.serviceWorker` existe e o contexto é seguro.

Os tamanhos explícitos atendem o contrato estrutural deste primeiro recorte. A validação em browser real continua obrigatória antes de declarar a #42 concluída; se algum browser alvo exigir fallback raster, ele deve ser adicionado a partir dessa evidência.

Falha ao registrar o worker não bloqueia a aplicação online.

## Checklist browser-first antes de concluir a #42

Executar em um ambiente HTTPS real ou localhost compatível com service worker. Registrar browser/versão e resultado na #42 ou em follow-up dedicado.

### Manifest e instalação

- abrir DevTools → Application → Manifest e confirmar nome, `start_url`, `display: standalone` e ícones 192/512 sem erro;
- confirmar que `/sw.mjs` está registrado com scope `/` e ativo;
- instalar o app quando o browser oferecer a opção e confirmar que abre em modo standalone na rota esperada;
- validar pelo menos um viewport mobile e um desktop.

### Offline e reconnect

- com uma sessão autenticada carregada, ativar modo offline e navegar/recarregar uma rota que exija rede;
- confirmar que o browser recebe somente o fallback público `/offline`, sem HTML previamente autenticado;
- restaurar a rede e usar a ação de reconexão do fallback;
- confirmar no painel de Service Workers que o retorno ao `online` dispara verificação de update sem criar request de replay de mutation;
- confirmar retorno ao fluxo online sem duplicar submit, Attempt ou ReviewEvent.

### Cache e logout

- antes do logout, inspecionar Cache Storage e confirmar que só existem shell público e assets `/_next/static/` esperados;
- confirmar ausência de responses de `/app`, `/api`, login/signup ou payloads do aluno;
- executar logout online com sucesso;
- confirmar que caches de sessão/estáticos do namespace LingoPilot são removidos, mas o shell público continua disponível;
- entrar com outro usuário e confirmar que nenhum conteúdo do usuário anterior aparece offline.

### Update do worker

- após uma mudança de versão de cache/worker, recarregar e confirmar ativação da versão nova;
- confirmar remoção das versões antigas do namespace LingoPilot;
- repetir um ciclo online → offline → online e confirmar que o client chama `registration.update()` ao recuperar rede;
- garantir que o update não deixou cache órfão nem disparou replay de mutation.

Qualquer divergência observada aqui deve virar teste automatizado no nível mais baixo que consiga reproduzir a propriedade, sem transformar E2E em novo GitHub Action obrigatório.

## Testes

`tests/pwa-service-worker-policy.test.mjs` protege invariantes que não podem regredir silenciosamente:

- rotas privadas nunca são classificadas como asset cacheável;
- somente `GET` de `/_next/static/` com resposta bem-sucedida pode ser persistido;
- logout bem-sucedido solicita limpeza de caches de sessão sem remover o shell público;
- worker não introduz IndexedDB, SyncManager ou listener de Background Sync.

`apps/web/test/service-worker-registration.component.test.tsx` protege o lifecycle do registro no client:

- reconexão `online` solicita `registration.update()` exatamente pelo listener instalado pelo componente;
- unmount remove o listener e evita update residual;
- falha de registro permanece não bloqueante.

Esses testes pertencem ao gate padrão `pnpm check`. Antes de promover a #42 a Done ainda são necessários testes browser-first dos critérios completos, incluindo installability real, update de service worker, navegação offline/reconnect e comportamento em múltiplos estados de sessão.

## Próximos recortes

A issue #42 permanece aberta depois desta foundation. Próximos passos devem ser guiados por dogfood e pelos critérios de aceite, especialmente:

- verificar installability e o ciclo update/reconnect em browser real;
- medir storage/cache budget;
- decidir se algum conteúdo editorial público/revisionado pode ser cacheado sem risco de stale indefinido;
- só então avaliar fila offline restrita a mutations comprovadamente idempotentes.
