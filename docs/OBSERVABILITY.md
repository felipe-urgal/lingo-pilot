# Observabilidade — LingoPilot

## 1. Objetivo

Observabilidade deve permitir responder, sem adivinhação:

- o sistema está saudável?
- qual fluxo falhou?
- qual versão causou regressão?
- o usuário perdeu progresso?
- o Learning Engine tomou uma decisão inesperada?
- um provider externo está degradado?

## 2. Pilares

- logs estruturados;
- métricas;
- tracing onde agrega valor;
- eventos de produto/aprendizagem separados de telemetria técnica;
- alertas acionáveis.

## 3. Logs estruturados

Campos comuns sugeridos:

```text
timestamp
level
environment
service/module
requestId
traceId
useCase
result
errorCode
durationMs
userRef pseudonimizada quando necessária
```

Não logar conteúdo livre do usuário por default.

### Baseline implementada na Foundation

A baseline server-side fica em `apps/web/server/observability/` e não é importada pelo domínio. Ela fornece:

- logger estruturado com contexto filho por request;
- saída JSON em produção e saída legível em desenvolvimento/teste;
- `requestId` recebido por `x-request-id` quando válido ou gerado pelo servidor;
- propagação de `x-request-id` em respostas de sucesso e erro;
- `route`, `method`, `useCase`, `result`, `statusCode` e `durationMs` como metadata operacional;
- version/deployment metadata quando disponível no ambiente Vercel;
- hooks de métricas e tracing definidos por contratos e inicialmente conectados a implementação no-op.

A composição usa `apps/web/config/observability.ts`, separada da validação completa de runtime. Assim, liveness e logging básico não passam a depender da disponibilidade ou configuração do banco.

A política de sanitização é fail-closed: secrets, cookies, tokens, credenciais, email/PII e payload/texto livre são removidos ou redigidos por default. Campos operacionais precisam ser explicitamente reconhecidos para permanecer nos logs. Exceções inesperadas não registram `error.message` bruto; o logger recebe somente metadata segura, como nome da classe do erro e código estável.

## 4. Error taxonomy

Erros devem possuir códigos estáveis por categoria, por exemplo:

```text
AUTH_UNAUTHORIZED
AUTH_FORBIDDEN
CONTENT_INVALID_REFERENCE
SESSION_ALREADY_EXISTS
SESSION_ITEM_ALREADY_COMPLETED
REVIEW_INVALID_GRADE
AI_PROVIDER_TIMEOUT
AI_INVALID_OUTPUT
MEDIA_UPLOAD_FAILED
DB_CONSTRAINT_VIOLATION
```

Mensagem interna pode variar; código deve permitir agregação.

A baseline HTTP mantém os códigos em `apps/web/server/observability/errors.ts`. Erros esperados são mapeados para status e mensagem pública segura; falhas inesperadas usam `INTERNAL_UNEXPECTED` e incluem o `requestId` para correlação sem expor stack trace ou detalhe interno ao cliente.

## 5. Métricas técnicas

### Web/API

- request count;
- error rate;
- latency p50/p95/p99;
- status code;
- route/use case.

A Foundation já define eventos `http.request.count` e `http.request.duration` atrás do contrato `TelemetryHooks`. Não existe provider externo obrigatório nesta fase; conectar um backend de métricas ou tracing deve acontecer na composição de infraestrutura sem alterar domínio/use cases.

### Banco

- query latency;
- connection pool saturation;
- transaction failures;
- slow query count.

### IA

- calls;
- success/failure;
- latency;
- invalid schema;
- retry;
- fallback;
- cost/tokens quando disponível.

### Media

- upload success;
- processing latency;
- transcription failure;
- cleanup failure.

## 6. Métricas do Learning Engine

- sessões planejadas;
- planner duration;
- items por reason code;
- review backlog size;
- new-content-suspended count;
- session duplicate prevention;
- mastery update failures;
- SRS scheduling failures.

Essas métricas devem permitir detectar bug de algoritmo sem examinar usuário individual.

## 7. Eventos de produto

Eventos de analytics devem representar comportamento de produto, não substituir banco transacional.

Exemplos:

```text
onboarding_completed
study_session_started
study_session_completed
lesson_started
lesson_completed
activity_submitted
review_completed
speaking_attempt_completed
tutor_session_started
```

Cada evento precisa de schema documentado e versão quando mudar semanticamente.

## 8. Privacidade de analytics

Evitar enviar:

- resposta textual completa;
- transcript;
- áudio;
- email;
- prompt de tutor;
- conteúdo de erro inserido pelo usuário.

Enviar IDs de conteúdo, categorias e resultados agregáveis.

## 9. Tracing

Tracing é prioritário em fluxos com múltiplas fronteiras:

- plan daily session;
- submit attempt + progress update;
- speaking upload → transcription → evaluation;
- AI correction.

Não instrumentar cada função trivial.

## 10. Correlation IDs

Toda request recebe `requestId`. Jobs/AI calls derivados preservam relação por trace/correlation metadata.

Isso deve permitir seguir um submit sem colocar conteúdo sensível no log.

Na fronteira HTTP atual, `x-request-id` fornecido pelo chamador só é reutilizado quando contém caracteres permitidos e possui comprimento entre 8 e 128 caracteres. Caso contrário, o servidor gera um UUID. O mesmo identificador aparece no log contextual e na resposta HTTP.

## 11. SLOs iniciais

SLOs quantitativos serão calibrados após baseline. Primeiras categorias:

- disponibilidade do core study flow;
- sucesso de submit de activity;
- sucesso de geração de Today;
- latência de Today;
- taxa de erro de AI separada do core;
- taxa de falha de media processing.

IA não deve degradar SLO do core quando for funcionalidade auxiliar.

## 12. Alertas

Alertas devem exigir ação.

Exemplos:

- spike de 5xx;
- falha de geração de sessão acima de threshold;
- migrations/DB unavailable;
- AI invalid output spike;
- media cleanup stopped;
- authentication failure anomaly.

Não alertar por métrica sem runbook.

## 13. Dashboards

Dashboards futuros:

### Operations

- traffic;
- error rate;
- latency;
- deploy markers;
- DB;
- AI/media providers.

### Learning Engine

- sessions/day;
- reason code distribution;
- review debt;
- completion;
- mastery evidence.

### AI Quality

- feature calls;
- invalid outputs;
- fallbacks;
- latency/cost;
- eval score trends.

## 14. Health checks

Separar:

- liveness;
- readiness;
- dependency health quando necessário.

Não bloquear liveness por provider de IA opcional.

A instrumentação da Foundation preserva essa separação: `/api/health/live` não depende da configuração completa de banco; `/api/health/ready` verifica PostgreSQL e registra indisponibilidade com código seguro, sem vazar URL de conexão ou mensagem bruta de exceção.

## 15. Deploy markers

Toda telemetria deve permitir correlacionar incidente com versão/commit/deploy.

Quando disponíveis, `VERCEL_GIT_COMMIT_SHA` e `VERCEL_DEPLOYMENT_ID` alimentam a metadata do logger. Fora da Vercel, a baseline continua funcional com versão local e sem deployment id.

## 16. Runbooks

Antes de alertas de produção, criar procedimentos para:

- DB degradation;
- auth outage;
- AI outage;
- media processing outage;
- deploy rollback;
- migration failure.

## 17. Regra final

Observabilidade não deve transformar o produto educacional em sistema de vigilância. Colete o mínimo necessário para operar, diagnosticar e melhorar aprendizado de forma responsável.
