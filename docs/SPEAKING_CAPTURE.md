# Speaking capture — secure lifecycle

Este documento registra o estado da issue #33 após os recortes de captura, orquestração provider-neutral e persistência do lifecycle de mídia.

## Estado atual

Já estão implementados e protegidos por testes:

- capability detection e captura com `MediaRecorder` no browser;
- UX de permissão, start/stop/cancel/re-record e fallback sem microfone;
- limites compartilhados de duração/tamanho/MIME;
- validação server-side e object key derivada apenas de IDs controlados;
- contrato provider-neutral de upload idempotente;
- persistência PostgreSQL de `SpeakingAttempt` separada de `ActivityAttempt`;
- ownership server-side até o usuário autenticado;
- reserva atômica por `(enrollmentId, operationKey)`;
- lifecycle `reserved → uploaded → discarded/deleted`;
- deadline de upload e retenção máxima de 24 horas para áudio bruto confirmado;
- seleção testável de candidates para cleanup;
- delete/re-record modelados sem criar score, `correct` ou mastery artificial.

A decisão de provider foi aprovada: **Vercel Private Blob**. O adapter SDK/endpoint de upload direto ainda não faz parte deste slice de persistência e deve ser integrado antes de expor upload remoto em Production.

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

A UI não deve impedir o aluno de continuar a atividade quando o microfone for indisponível. A alternativa pedagógica concreta depende do tipo de Activity que integrar o recorder.

## Fronteira server-side provider-neutral

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

Os três segmentos precisam ser IDs opacos válidos; `/`, `..`, espaços iniciais e valores excessivamente longos são rejeitados.

`apps/web/server/application/speaking/upload-recording.ts` protege a orquestração em que os bytes passam pelo port provider-neutral. Ele continua útil para adapters server-side e para os invariantes de ownership, idempotência e compensação já testados.

## Persistência do lifecycle

O slice atual adiciona `speaking_attempts` e `PostgresSpeakingRepository`.

A entidade é deliberadamente separada de `activity_attempts`: uma gravação capturada ou armazenada ainda **não é evidência de acerto**. Até #34/#39 produzirem avaliação confiável, speaking não escreve `correct`, score, `ConceptEvidence`, `MasteryState` ou SRS.

### Campos operacionais principais

- enrollment/session item/activity e revision de conteúdo;
- `operationKey` idempotente;
- `assetId` e `objectKey` server-controlled;
- MIME, byte length e duração validados;
- status do lifecycle;
- ETag após confirmação do provider;
- deadline da capability de upload;
- `uploadedAt` e `retainedUntil`;
- timestamps de discard/delete.

A constraint `speaking_attempts_enrollment_operation_unique` é a fronteira transacional que impede duas gravações persistidas para a mesma operação do mesmo enrollment.

### Ownership

`ownsLessonSessionItem()` não confia em IDs isolados recebidos pelo client. A autorização percorre:

```text
SessionItem → StudySession → Enrollment → LanguageProfile → User
```

O endpoint futuro deve obter `userId` da sessão autenticada e usar essa checagem antes de emitir qualquer capability de upload.

## Lifecycle direto

`apps/web/server/application/speaking/direct-upload.ts` modela o fluxo recomendado para o Vercel Blob sem fazer o browser enviar até 5 MiB através da Function:

1. validar ownership e metadata;
2. reservar atomicamente a operação no PostgreSQL;
3. gerar `attemptId`, `assetId` e object key no servidor;
4. fornecer a object key ao adapter que emitirá uma capability curta de PUT privado;
5. browser envia os bytes diretamente ao provider;
6. adapter server-side consulta metadata real do objeto (`head`) e só então chama a confirmação;
7. confirmação grava ETag/upload time e `retainedUntil`;
8. re-record/discard marca o Attempt e tenta remover o objeto;
9. falha de delete permanece elegível para cleanup posterior.

**Importante:** MIME, byte length, ETag e timestamp usados em `confirmSpeakingUpload()` devem vir da leitura confiável do provider, nunca de JSON fornecido pelo browser.

## Provider e acesso

Decisão aprovada para V1:

- provider: **Vercel Private Blob**;
- store privado por default;
- upload direto browser → Blob mediante capability curta e escopada emitida após autenticação/ownership;
- object key sem filename do usuário;
- `allowOverwrite: false`;
- MIME/tamanho restringidos também na capability do provider;
- credencial de storage permanece exclusivamente server-side;
- preferir OIDC quando disponível no runtime Vercel; token estático é fallback operacional e nunca pode chegar ao client;
- leitura futura, quando necessária para transcrição/avaliação, deve ser server-side/autorizada ou por URL temporária explicitamente escopada.

O adapter `@vercel/blob`, a rota autenticada que emite a capability e a confirmação via `head` são o próximo slice da #33. Eles não são simulados neste PR.

## Retenção V1

A decisão aprovada é: **áudio bruto confirmado pode existir por no máximo 24 horas no lifecycle de aplicação**.

Ao confirmar um upload:

```text
retainedUntil = uploadedAt + 24h
```

O banco já persiste esse deadline e o repositório lista como cleanup candidate:

- reservation cujo upload window expirou;
- gravação marcada como descartada/re-record;
- gravação `uploaded` cujo `retainedUntil <= now`.

O job executa delete idempotente e só marca `deleted` depois do adapter informar sucesso. Falha de provider não é escondida: o item continua candidate e pode ser reprocessado.

Enquanto o adapter/scheduler real não estiver ativado, `retainedUntil` é **deadline persistido**, não prova de exclusão física. A #33 só pode ser encerrada quando a remoção no Vercel Blob estiver ligada e observável.

## Threat model

### Dado

Áudio bruto de voz e metadata técnica mínima. O áudio é temporário e potencialmente sensível.

### Autorização

IDs do client não provam ownership. Toda emissão de upload/read/delete precisa derivar usuário da sessão e consultar ownership server-side.

### Path traversal / filename

Filename enviado pelo client não existe no contrato. Object key usa IDs opacos validados e server-controlled.

### Upload repetido

A unicidade no PostgreSQL impede duplicação pela mesma operation key. Replay com metadata diferente é conflito; replay compatível reutiliza o Attempt existente.

### Progresso pedagógico

Upload/captura não alteram progresso. Isso evita transformar sucesso operacional do storage em sinal falso de aprendizagem.

### Logs

Nunca logar áudio, transcript, Blob, token/capability, signed URL, URL privada permanente ou payload completo. Logs podem registrar IDs técnicos e error codes seguros.

### Falha parcial e delete

Discard/delete são idempotentes. Se o provider falhar, o registro continua selecionável para cleanup e não é marcado como removido prematuramente.

## Testes

A suíte cobre os dois níveis do contrato:

### Orquestração provider-neutral

- upload único e replay sem segundo `put`;
- conflito de operation key com metadata diferente;
- ownership negada antes do storage;
- byte length declarado divergente do payload;
- release/compensação após falhas.

### Persistência/lifecycle direto

- ownership pelo relacionamento até `User`;
- concorrência de duas reservas com uma única vencedora;
- isolamento de Attempt de outro usuário;
- persistência do ETag e deadline de 24h;
- candidate de cleanup somente quando devido/descartado;
- delete remove o item da fila de cleanup;
- unit tests de prepare/replay/conflict/confirm/discard/cleanup.

## O que ainda falta para encerrar a #33

Depois deste slice, não há mais decisão de provider/retention em aberto. Permanecem gates de integração:

- adapter real de Vercel Private Blob para capability PUT privada, `head` e delete;
- endpoint autenticado/same-origin que derive `userId` da sessão;
- integração do upload/retry/re-record ao `SpeakingRecorder`/Activity;
- scheduler/job real executando o cleanup e expondo observabilidade sem conteúdo sensível;
- browser E2E do fluxo integrado, incluindo permissão negada, retry e re-record;
- confirmação de configuração do store privado no ambiente de deploy.

Avaliação linguística/pronúncia continua fora da #33 e pertence à #34/#39.
