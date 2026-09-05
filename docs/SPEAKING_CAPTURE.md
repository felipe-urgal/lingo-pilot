# Speaking capture — foundation segura

Este documento registra a foundation da issue #33. Ela cobre captura no browser e a orquestração server-side para storage privado sem escolher silenciosamente um fornecedor de storage.

## Objetivo dos recortes atuais

- detectar suporte a microfone/`MediaRecorder` no browser;
- pedir permissão apenas quando o aluno inicia a gravação;
- permitir parar, cancelar, descartar e gravar novamente;
- manter fallback explícito quando gravação não está disponível;
- compartilhar limites de duração/tamanho/MIME entre browser e servidor;
- validar metadata novamente no servidor e conferir o tamanho real do payload;
- gerar object key somente com IDs controlados/validados pelo servidor;
- revalidar ownership do Attempt no contexto autenticado antes do upload;
- reservar `operationKey` atomicamente para idempotência e rejeitar conflito de payload;
- compensar upload parcial quando a persistência do receipt falha;
- definir ports pequenos de storage/ownership/ledger para adapters futuros.

Estes recortes **não** persistem áudio em Production e não escolhem bucket/provider/database adapter.

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

### Orquestração de upload

`apps/web/server/application/speaking/upload-recording.ts` fecha as invariantes que independem do fornecedor:

1. revalida metadata com o contrato server-side;
2. compara `metadata.byteLength` com `Uint8Array.byteLength`, portanto o tamanho declarado pelo cliente não é autoridade;
3. consulta `SpeakingAttemptOwnership` usando `userId` autenticado + Attempt/Activity antes de reservar ou gravar qualquer objeto;
4. reserva `(userId, operationKey)` por `SpeakingUploadLedger`;
5. uma operação já concluída com a mesma metadata retorna o mesmo receipt como replay idempotente, sem novo `put`;
6. reutilizar a `operationKey` com metadata diferente falha como conflito;
7. a reserva fornece `assetId` server-side, usado para derivar a object key;
8. somente depois disso `PrivateSpeakingStorage.putPrivateObject` recebe bytes + MIME validado;
9. se o objeto for gravado mas `ledger.complete` falhar, a aplicação tenta `deletePrivateObject` e libera a reserva antes de propagar a falha.

O port `SpeakingUploadLedger.reserve` possui uma exigência não negociável para o adapter real: a reserva precisa ser **atômica e única por `(userId, operationKey)`**. Um `find` seguido de `insert` sem constraint transacional reabre corrida de duplicate upload e não satisfaz o contrato.

`in_progress` é um estado explícito para concorrência. O caller pode responder como conflito/retry recuperável; ele não deve iniciar um segundo upload em paralelo para a mesma operação.

A compensação após falha de commit é best effort. Se o delete do storage também falhar, o futuro job de retention/cleanup precisa localizar e remover o objeto órfão de modo observável e sem logar conteúdo.

## Storage provider

A foundation define `PrivateSpeakingStorage` com duas operações:

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

O contrato de aplicação exige resolver ownership do Attempt para o usuário autenticado antes de qualquer upload. O adapter real de `SpeakingAttemptOwnership` deve consultar o estado server-side; IDs recebidos do cliente nunca são prova de autorização.

### Onde é persistido?

A foundation ainda não configura storage remoto. O port descreve a operação privada que o adapter futuro deverá executar; testes usam fake controlado.

### Quem externo recebe?

Ninguém em Production neste recorte, porque nenhum adapter/provider de storage foi escolhido ou ligado ao composition root.

### Request repetida

`operationKey` passa por uma reserva atômica no ledger. Replay da mesma operação/metadata devolve o receipt já concluído; metadata diferente com a mesma key é conflito. O adapter persistente precisa materializar essa unicidade no banco.

### Um usuário pode apontar ID de outro?

Não deve conseguir atravessar a fronteira de aplicação: ownership é verificada antes de reserva/upload. O endpoint futuro ainda precisa derivar `userId` da sessão autenticada, nunca do body.

### Upload/conteúdo executável

Somente MIME de áudio allowlisted será aceito. Filename do cliente é ignorado e conteúdo nunca deve ser servido como HTML executável.

### Logs

Nunca logar áudio, transcript, Blob, signed URL, payload completo ou conteúdo do aluno. Logs podem registrar IDs técnicos, tamanho/duração categorizados e error code seguro.

### Falha parcial

Se storage concluir e o ledger falhar, a aplicação tenta apagar o objeto imediatamente e libera a operação para retry. Falha dessa compensação deverá ser coberta pelo lifecycle/cleanup observável do adapter real.

### Exclusão

Nenhum objeto remoto de Production existe ainda. O adapter real precisa suportar delete e integrar a política de retenção/account deletion antes de Production.

## Retenção proposta para V1

Mantemos a direção já definida em `SECURITY_PRIVACY.md`: áudio bruto é temporário por default.

Antes de speaking chegar a Production, a decisão final precisa definir um TTL concreto. A hipótese de implementação é:

1. guardar somente pelo período necessário para transcrição/feedback e retry operacional;
2. apagar o bruto automaticamente após esse período;
3. reter transcript/feedback separadamente apenas se houver finalidade pedagógica explícita;
4. permitir propagação de delete por Attempt/conta;
5. monitorar cleanup falho sem incluir conteúdo em logs.

Não fixamos um número de dias nesta foundation porque isso depende do provider/lifecycle e da necessidade real do pipeline de avaliação.

## Testes do recorte de upload

`upload-recording.test.ts` protege pelo menos:

- upload único + replay idempotente sem segundo `put`;
- conflito quando a mesma operation key muda de metadata;
- ownership negada antes de tocar storage;
- divergência entre byte length declarado e payload real;
- compensating delete + release da reserva quando o commit do receipt falha.

Esses testes verificam o contrato provider-neutral. Eles não substituem integração futura com constraint transacional, storage privado real e autenticação.

## Critérios ainda pendentes da #33

Estes recortes não tornam a issue Done. Permanecem necessários, entre outros:

- escolha explícita e documentada do provider/storage privado;
- adapters reais de `SpeakingAttemptOwnership`, `SpeakingUploadLedger` e `PrivateSpeakingStorage`;
- endpoint/upload flow autenticado que derive `userId` da sessão;
- persistência de metadata/asset ref ligada ao SpeakingAttempt;
- retention/lifecycle efetivos e cleanup observável com TTL decidido;
- integração com Activity/Today/Review;
- avaliação de speaking separada da captura;
- testes de constraint/concorrência/retry e browser E2E do fluxo integrado;
- atualização do modelo de dados somente quando o use case real exigir persistência.

A próxima branch deve partir dessas pendências, não contornar a decisão de provider com storage improvisado.
