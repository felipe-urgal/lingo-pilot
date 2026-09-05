# Speaking capture — foundation segura

Este documento registra o primeiro recorte da issue #33. Ele cobre captura no browser e o contrato de entrada para storage privado sem escolher silenciosamente um fornecedor de storage.

## Objetivo do recorte

- detectar suporte a microfone/`MediaRecorder` no browser;
- pedir permissão apenas quando o aluno inicia a gravação;
- permitir parar, cancelar, descartar e gravar novamente;
- manter fallback explícito quando gravação não está disponível;
- compartilhar limites de duração/tamanho/MIME entre browser e servidor;
- validar metadata novamente no servidor;
- gerar object key somente com IDs controlados/validados pelo servidor;
- definir um port pequeno de storage privado para o adapter futuro.

Este recorte **não** persiste áudio em produção e não escolhe bucket/provider.

## Contrato de captura

A política compartilhada vive em `apps/web/lib/speaking/recording-policy.ts`:

- duração máxima: 60 segundos;
- tamanho máximo: 5 MiB;
- MIME allowlist: WebM/Opus, Ogg/Opus e MP4 compatíveis listados explicitamente.

O browser usa a allowlist apenas para selecionar um formato que `MediaRecorder.isTypeSupported()` aceite. O servidor continua sendo a autoridade e rejeita metadata fora do contrato mesmo que o cliente tenha sido alterado.

`SpeakingRecorder` não faz upload automaticamente. Ao finalizar uma gravação válida ele entrega somente `Blob`, MIME e duração ao consumidor. Isso mantém captura separada de persistência, retry e avaliação linguística.

## Permissões e UX

Estados explícitos:

- `idle`: nenhuma permissão solicitada;
- `requesting`: browser está pedindo acesso;
- `recording`: microfone ativo;
- `ready`: gravação local disponível para prévia;
- `error`: permissão negada, dispositivo indisponível ou gravação inválida;
- `unsupported`: browser sem capability compatível.

Todas as tracks do `MediaStream` são encerradas ao parar, cancelar, falhar ou desmontar o componente. Preview local usa object URL temporária e é revogada ao substituir/descartar a gravação.

A UI não deve impedir o aluno de continuar a atividade quando o microfone for indisponível. A alternativa pedagógica concreta depende do tipo de Activity que integrar o recorder e não é inventada nesta foundation.

## Fronteira server-side

`apps/web/server/application/speaking/recording-contract.ts` valida:

- `operationKey` opaca e limitada;
- `attemptId` e `activityId` opacos;
- MIME allowlisted;
- byte length positivo e dentro do limite;
- duração positiva e dentro do limite.

Filename/path enviado pelo cliente não faz parte do contrato.

A object key é construída como:

```text
speaking/{userId}/{attemptId}/{assetId}
```

Os três segmentos precisam ser IDs opacos válidos; `/`, `..`, espaços iniciais e valores excessivamente longos são rejeitados. O adapter de storage recebe essa key já derivada pelo servidor.

## Storage provider

A foundation define apenas `PrivateSpeakingStorage` com duas operações:

- `putPrivateObject`;
- `deletePrivateObject`.

Não existe adapter real neste PR. Antes de escolher provider/bucket é necessário decidir explicitamente:

- custo e lock-in;
- região/localização de dados;
- criptografia e controles de acesso;
- suporte a URL temporária/signed upload se adotado;
- lifecycle/retention automático;
- observabilidade de cleanup;
- comportamento de exclusão de conta;
- subprocessador/LGPD aplicável.

Um fake/in-memory pode existir somente em testes; ele não deve ser composition root de Production.

## Threat model do recorte

### Qual dado entra?

Áudio bruto capturado localmente e metadata técnica mínima. Gravação de voz é conteúdo potencialmente sensível.

### Quem pode acessar?

Neste recorte, somente o próprio contexto de browser antes de qualquer upload. A integração futura deve revalidar usuário autenticado e ownership do `attemptId` no servidor.

### Onde é persistido?

Agora, apenas memória/object URL do browser durante o fluxo. Nenhum storage remoto é ativado.

### Quem externo recebe?

Ninguém neste recorte.

### Request repetida

O contrato carrega `operationKey`; a implementação futura de upload/persistência deve garantir idempotência antes de gravar `assetRef` ou disparar transcrição/avaliação.

### Um usuário pode apontar ID de outro?

IDs do cliente nunca serão prova de ownership. O endpoint futuro precisa resolver Attempt pelo usuário autenticado antes de gerar object key ou signed URL.

### Upload/conteúdo executável

Somente MIME de áudio allowlisted será aceito. Filename do cliente é ignorado e conteúdo nunca deve ser servido como HTML executável.

### Logs

Nunca logar áudio, transcript, Blob, signed URL, payload completo ou conteúdo do aluno. Logs podem registrar IDs técnicos, tamanho/duração categorizados e error code seguro.

### Exclusão

Nenhum objeto remoto existe ainda. O adapter real precisa suportar delete e integrar a política de retenção/account deletion antes de Production.

## Retenção proposta para V1

Mantemos a direção já definida em `SECURITY_PRIVACY.md`: áudio bruto é temporário por default.

Antes de speaking chegar a Production, a decisão final precisa definir um TTL concreto. A hipótese de implementação é:

1. guardar somente pelo período necessário para transcrição/feedback e retry operacional;
2. apagar o bruto automaticamente após esse período;
3. reter transcript/feedback separadamente apenas se houver finalidade pedagógica explícita;
4. permitir propagação de delete por Attempt/conta;
5. monitorar cleanup falho sem incluir conteúdo em logs.

Não fixamos um número de dias nesta foundation porque isso depende do provider/lifecycle e da necessidade real do pipeline de avaliação.

## Critérios ainda pendentes da #33

Este recorte não torna a issue Done. Permanecem necessários, entre outros:

- adapter de storage privado escolhido e configurado explicitamente;
- endpoint/upload flow autenticado com ownership e idempotência;
- persistência de metadata/asset ref ligada ao SpeakingAttempt;
- retention/lifecycle efetivos e cleanup observável;
- integração com Activity/Today/Review;
- avaliação de speaking separada da captura;
- testes de retry/duplicate submit e browser E2E do fluxo integrado;
- atualização do modelo de dados somente quando o use case real exigir persistência.

A próxima branch deve partir dessas pendências, não contornar o provider decision com storage improvisado.
