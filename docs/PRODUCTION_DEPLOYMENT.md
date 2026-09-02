# Deploy e operações de produção — LingoPilot

> **Status:** contrato normativo com baseline operacional ativa desde 2026-09-01. Vercel, Neon, migrations explícitas, health/readiness, backup/restore-check e o Production Contract do Dev Dashboard já foram validados. O estado factual e as evidências ficam em `docs/PRODUCTION_STATUS.md`; a #45 continua responsável pelo hardening operacional e runbooks restantes.
>
> Este documento é **normativo** para decisões de produção. Se código, workflow ou manifesto de deployment divergir daqui, o mesmo PR deve atualizar este contrato ou registrar um ADR que explique a mudança.

## 1. Objetivo

Definir como o LingoPilot é construído, promovido, migrado, verificado e recuperado em produção, evitando que o deploy vire uma coleção de comandos improvisados quando o produto contiver dados reais de estudo.

O contrato foi desenhado a partir de padrões operacionais já usados em outros projetos do mesmo ambiente:

- `dev-dashboard`: separação entre planejamento/estado do deployment, provider externo, migrations, readiness e recovery;
- `home-music`: comandos operacionais canônicos, health/readiness distintos, processo de atualização explícito e recuperação conservadora;
- `loto-lab`: runtime endurecido, banco não exposto, secrets fora do Git, healthchecks, backup/restore e CI que testa o artefato de produção;
- `controle-gastos`: Next.js em Vercel, PostgreSQL em Neon, migrations fora do build da Vercel e promoção de código somente depois de schema compatível.

Esses projetos são referências de engenharia, não fontes de verdade do LingoPilot. A fonte de verdade deste projeto é este documento + ADRs vigentes.

## 2. Decisões iniciais

A topologia de produção é:

```text
Internet
   ↓ HTTPS
Vercel
   ↓
Next.js / LingoPilot
   ↓ conexão TLS/pool apropriado
Neon PostgreSQL

LingoPilot
   └── mídia privada → storage S3-compatible (quando speaking entrar)
```

Decisões:

- **branch de produção:** `main`;
- **aplicação:** Vercel, integrada ao Git;
- **estratégia de promoção:** `git-managed`;
- **banco de produção:** Neon PostgreSQL;
- **ORM/query layer:** Drizzle, conforme `docs/ARCHITECTURE.md`;
- **deploy de aplicação:** um commit exato de `main` corresponde a uma release identificável;
- **migrations:** executadas explicitamente **fora** do build da Vercel;
- **migrations que o novo código exige:** schema compatível primeiro, código depois;
- **storage de speaking:** privado, S3-compatible, provider escolhido quando a feature exigir;
- **TLS público:** terminado pela plataforma de hosting/reverse edge; produção pública não usa HTTP simples;
- **PostgreSQL:** nunca publicado como porta pública de aplicação;
- **AI provider:** indisponibilidade deve degradar features de IA sem derrubar o Study Engine determinístico.

A escolha Vercel + Neon é uma decisão de infraestrutura. O domínio continua independente desses providers.

Referência arquitetural: `docs/ADR/0002-production-deployment-topology.md`.

## 3. Invariantes de produção

As regras abaixo não são opcionais:

1. production deploy só parte de código versionado;
2. `main` deve permanecer deployable;
3. um deploy deve ser identificável por commit SHA;
4. merge com gates obrigatórios falhando não pode ser promovido conscientemente;
5. o build da aplicação **não altera schema nem dados de produção**;
6. migration aplicada em produção é imutável; correções são novas migrations/forward-fix;
7. rollback de aplicação e rollback de banco são operações diferentes;
8. rollback de aplicação só é seguro quando o schema atual continua compatível com a versão anterior;
9. secrets nunca entram no Git, imagem, bundle cliente, issue, PR ou log compartilhado;
10. Preview/CI nunca usa o banco de produção;
11. PostgreSQL de produção não é exposto diretamente à internet;
12. health do provider não substitui readiness da aplicação;
13. falha de IA não pode corromper progresso nem tornar o core indisponível;
14. operações destrutivas exigem confirmação, backup/checkpoint e plano de recuperação;
15. após uma etapa irreversível ambígua, o estado é `recovery_required` conceitualmente: investigar antes de repetir.

## 4. Ambientes

O projeto considera pelo menos três contextos distintos.

### 4.1 Local

Definido em `docs/LOCAL_DEVELOPMENT.md`.

Nunca reutilizar credenciais ou banco de produção localmente.

### 4.2 CI / Preview

- dados sintéticos ou efêmeros em CI;
- PostgreSQL isolado do ambiente de produção;
- secrets de teste/preview separados;
- deployments Preview da Vercel usam a branch Neon permanente `preview`, nunca a branch `main` de Production;
- `VERCEL_URL` pode fornecer a origem pública automática de cada Preview quando `NEXT_PUBLIC_APP_URL` não estiver definida;
- uma Preview incapaz de obter banco seguro deve falhar/operar com capacidade limitada, nunca apontar para produção como atalho.

### 4.3 Production

- Vercel Production Environment;
- Neon branch `main` dedicada a Production;
- runtime usa conexão pooled apropriada ao ambiente serverless;
- operações privilegiadas de migration/backup usam configuração direta separada do runtime;
- secrets com escopo de produção;
- storage privado de produção quando houver mídia;
- observabilidade e retenção conforme documentos próprios.

Nenhum ambiente deve inferir credenciais de outro por fallback.

## 5. Identidade de release

A unidade de release é o **commit SHA** promovido para produção.

A aplicação deve expor internamente metadados suficientes para diagnóstico, por exemplo:

```text
APP_ENV=production
APP_VERSION=<git-sha>
DEPLOYMENT_ID=<provider-deployment-id quando disponível>
```

Nomes concretos podem mudar na implementação, mas logs e diagnóstico devem permitir responder:

- qual commit está em produção?;
- qual deployment o executa?;
- quando foi promovido?;
- qual revision de conteúdo/schema ele espera?;
- houve migration associada?

Não usar somente número de versão manual como prova de revision.

## 6. Gates antes de produção

O GitHub Actions é o gate de engenharia. Antes de um commit ser considerado promovível, os checks aplicáveis devem estar verdes.

Baseline esperado:

```text
install --frozen-lockfile
→ format/check
→ lint
→ typecheck
→ unit tests
→ integration tests com PostgreSQL efêmero
→ content:validate
→ build de produção
→ smoke do build
→ E2E crítico
→ security checks aplicáveis
```

Performance/a11y/evals de IA entram como gates conforme as fases correspondentes do roadmap forem implementadas.

O objetivo é testar, no CI, o máximo possível do **artefato e dos contratos que produção realmente usa**, não apenas source files isolados.

## 7. Build da Vercel

O build de produção deve ser reproduzível e side-effect free em relação ao banco.

Conceitualmente:

```bash
pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` pode gerar clientes/artefatos locais necessários, mas **não pode executar migration de produção**.

O build não deve:

- usar `drizzle-kit push` contra produção;
- aplicar DDL em runtime de build;
- executar seed real;
- criar usuário de produção;
- alterar conteúdo pedagógico persistido como efeito colateral;
- depender de credencial privilegiada que só existe para migrations.

## 8. Política de migrations

### 8.1 Fonte de verdade

Migrations versionadas no repositório são a única forma normal de evolução de schema.

Nunca:

- editar migration já aplicada em produção;
- “corrigir” production manualmente e esquecer de versionar;
- usar schema push não auditável como substituto do fluxo de migration;
- reduzir artificialmente versão de migration para fingir rollback.

### 8.2 Expand → deploy → contract

Mudanças de schema devem preferir evolução compatível:

```text
Release A: EXPAND
adiciona coluna/tabela/index compatível com o código atual

↓ migration em produção

Release B: DEPLOY
novo código passa a usar a estrutura nova

↓ período de compatibilidade / backfill quando necessário

Release C: CONTRACT
remove estrutura antiga somente quando nenhuma versão suportada depende dela
```

Isso permite que schema novo exista antes do código sem quebrar a versão atualmente ativa.

### 8.3 Migration aditiva requerida por código novo

Fluxo alvo:

```text
PR aprovado + head final com gates verdes
→ confirmar migration exata/review de SQL
→ confirmar revision/commit que será promovido
→ backup/checkpoint quando a mudança justificar
→ executar prod:migrate a partir da revision revisada
→ confirmar schema saudável/up to date
→ merge/promover código dependente
→ acompanhar Vercel
→ readiness/smoke
```

Se a migration falhar, **não promover o código dependente**.

### 8.4 Migration destrutiva

Não deve ser acoplada a uma única troca instantânea de código.

Exige:

- issue explícita;
- análise de compatibilidade;
- backup/checkpoint verificável;
- estratégia de backfill quando houver dados;
- release intermediária que pare de depender da estrutura antiga;
- janela de observação quando apropriado;
- restore/forward-fix documentado.

### 8.5 Execução única

Migration deve possuir proteção operacional contra duas execuções concorrentes quando o mecanismo escolhido permitir corrida relevante.

O processo de migration deve retornar erro não-zero e mensagem sanitizada quando falhar. Retry cego não é permitido depois de efeito parcial desconhecido.

## 9. Scripts operacionais canônicos

O repositório expõe a interface operacional estável abaixo:

```bash
pnpm prod:status
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
pnpm prod:restore-check -- <backup.dump>
```

Configuração administrativa real permanece fora do Git em:

```text
<Project.path>/.dev-dashboard/.env.production.local
```

### `prod:status`

Somente leitura. Resume o contrato de Production e sua capacidade operacional sem revelar secrets.

### `prod:check`

Preflight isolado. Não muta produção e usa `CHECK_DATABASE_URL` + `CHECK_TEST_DATABASE_URL` distintos; não recebe credenciais administrativas/provider nem faz fallback para o banco de Production.

### `prod:migrate`

Mutação de produção explícita.

Deve:

- exigir configuração de produção fora do Git;
- usar a conexão administrativa direta apropriada (`DATABASE_DIRECT_URL`);
- validar a configuração sem imprimir segredo;
- executar migrations versionadas;
- falhar de forma clara em inconsistência;
- nunca ser chamado automaticamente pelo `pnpm build`.

### `prod:verify`

Somente leitura/smoke contra `LINGO_PRODUCTION_READY_URL` HTTPS. A URL canônica atual é `https://lingo-pilot.vercel.app/api/health/ready`.

### `prod:backup`

Cria backup PostgreSQL explícito sem embutir credenciais no repositório ou na linha de comando. O artefato local fica em caminho ignorado pelo Git.

### `prod:restore-check`

Restaura um backup em banco **não produtivo**, exige `RESTORE_CHECK_DATABASE_URL` e confirmação explícita `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check`, recusa o mesmo endpoint de Production quando a URL de produção está disponível e valida o schema mínimo após o restore.

Os comandos acima foram exercitados durante a ativação de produção de 2026-09-01. Novos comandos especializados só devem ser adicionados quando houver necessidade operacional clara.

## 10. Integração com Dev Dashboard

O Production Contract está ativo em `.dev-dashboard/production.json` com:

```text
production.enabled = true
strategy = git-managed
provider = vercel
production branch = main
external.project = lingo-pilot
health = https://lingo-pilot.vercel.app/api/health/ready
```

Políticas canônicas atuais:

```text
backup = required-before-migration
migrations = before-deploy
rollback = provider-only-when-schema-compatible
```

Regras:

- o Dev Dashboard pode observar provider/deployment/drift;
- ele não deve inferir projeto Vercel pelo nome da pasta;
- `prod:check`, `prod:migrate`, `prod:verify`, `prod:backup` e `prod:restore-check` permanecem operações locais explícitas;
- não criar um `prod:deploy` falso apenas para caber no contrato;
- `READY` do provider não substitui `prod:verify`/readiness;
- migration permanece separada da promoção Git/Vercel;
- consulta de status não deve alterar repositório ou executar `git fetch` silenciosamente.

A regra histórica continua válida: `production.enabled=true` só pode permanecer habilitado enquanto comandos, provider mapping e fluxo operacional corresponderem à realidade. Se uma regressão remover essa capacidade, o contrato deve voltar a falhar fechado até ser restaurado.

## 11. Health e readiness

O LingoPilot separa processo/rota acessível de dependências críticas prontas.

Contrato implementado:

```text
GET /api/health/live
  → 200 se a aplicação consegue servir request

GET /api/health/ready
  → 200 quando o core está pronto
  → 503 quando PostgreSQL/schema crítico impede operação segura
```

`ready` considera atualmente conexão PostgreSQL e presença do schema mínimo esperado (`app_metadata`), além da configuração necessária para o runtime iniciar.

`ready` **não** deve ficar 503 apenas porque:

- provider de IA está indisponível;
- feature opcional de geração falhou;
- analytics externo está indisponível.

Esses providers devem ter health/telemetria próprios e fallback.

Endpoints públicos de health retornam informação mínima. Diagnóstico detalhado deve ser protegido ou permanecer apenas na observabilidade interna.

## 12. Smoke pós-deploy

Um deployment não é considerado validado apenas porque Vercel informou `READY`.

Após promoção:

1. confirmar commit/deployment esperado;
2. chamar `/api/health/live`;
3. chamar `/api/health/ready`;
4. validar shell/rota pública principal;
5. validar headers/cache/security relevantes;
6. validar autenticação com identidade sintética/controlada quando o fluxo existir e estiver apto a tráfego público;
7. validar uma leitura segura que envolva PostgreSQL;
8. observar 5xx/erros estruturados por uma janela apropriada;
9. registrar deploy marker/revision.

Falha do smoke exige investigação imediata e decisão entre rollback de aplicação e forward-fix.

## 13. Secrets e configuração

### 13.1 Regras

- arquivos reais de `.env` não são versionados;
- `.env.example` documenta o contrato **local** e contém somente valores públicos seguros/credenciais locais sintéticas;
- configuração operacional privilegiada de produção fica em `.dev-dashboard/.env.production.local`, ignorado pelo Git;
- secrets de Production, Preview e CI são distintos;
- segredo server-only nunca é exposto como variável pública do Next.js;
- connection strings não entram em logs;
- tokens não são passados em query string;
- rotação deve ser possível sem alterar código;
- acesso humano ao banco usa credencial de menor privilégio compatível com a operação.

### 13.2 Categorias atuais e futuras

Hoje existem categorias separadas para:

- database/runtime connection;
- database/migration/backup connection;
- check databases isolados;
- Vercel/provider operation quando necessária fora do runtime.

Com o avanço do produto também existirão, conforme a issue dona da capacidade:

- AI provider credentials;
- storage credentials;
- e-mail provider credentials;
- observability credentials.

A baseline first-party de auth não adiciona secret de provider; sessão e credenciais são persistidas no PostgreSQL conforme `docs/AUTHENTICATION.md`.

Nenhum secret pertence ao manifesto do Dev Dashboard.

## 14. PostgreSQL / Neon

Produção usa PostgreSQL gerenciado no Neon.

Estado atual:

- projeto operacional dedicado;
- branch `main` para Production;
- branch `preview` separada para deployments Preview;
- runtime Production usa conexão pooled;
- migration/backup usam conexão administrativa direta separada quando necessário.

Regras:

- TLS obrigatório conforme configuração do provider;
- runtime usa conexão/pool apropriado a workloads serverless;
- migrations usam configuração separada do runtime quando necessário;
- Preview/CI não reutiliza o database/branch de produção;
- queries operacionais não expõem dados pessoais em logs;
- índices e migrations continuam versionados no repositório;
- provider é substituível pela abstração da infraestrutura; SQL/domínio não deve depender de feature proprietária sem ADR.

## 15. Backup e restore

“Provider possui backup” não é suficiente. Backup só conta quando existe procedimento de restore conhecido e testado.

Baseline portátil implementada/exercitada:

- dump PostgreSQL em formato custom via `prod:backup`;
- armazenamento local fora do repositório;
- restore-check explícito em banco não produtivo;
- validação pós-restore do schema mínimo.

Conforme o produto passar a armazenar dados relevantes, a política deve evoluir para incluir:

- metadata de data, database lógico, schema/revision e responsável/operação;
- cópia em domínio de falha diferente;
- criptografia e controle de acesso compatíveis com o conteúdo;
- restore testado periodicamente em banco **não produtivo**.

Snapshots/PITR do provider podem complementar esse baseline, mas não eliminam a obrigação de testar recuperação.

Antes de migration destrutiva ou backfill arriscado, deve existir checkpoint verificável conforme o runbook vigente.

Restore em produção é operação destrutiva e nunca é executado como resposta automática a qualquer deploy falho.

## 16. Rollback e forward-fix

### 16.1 Aplicação

Vercel permite voltar/promover uma deployment anterior, mas isso só é operacionalmente seguro se o schema atual for compatível com aquela versão.

Antes de rollback:

1. identificar deployment/commit atual e candidato;
2. identificar migrations já aplicadas;
3. confirmar compatibilidade do código antigo com schema novo;
4. preservar evidência/logs do incidente;
5. só então promover versão anterior.

### 16.2 Banco

Migration é forward-only por padrão.

Nunca fazer downgrade improvisado de schema ou apagar migration metadata para “voltar”.

Se dados/schema ficaram incompatíveis:

- preferir forward-fix quando seguro;
- restaurar backup somente com decisão explícita e entendimento da perda de dados ocorrida desde o checkpoint.

### 16.3 `recovery_required`

Se houver dúvida sobre efeito parcial de migration, backfill, delete ou alteração de storage:

- parar novas mutações relacionadas quando possível;
- não repetir automaticamente;
- inspecionar estado real;
- seguir runbook específico;
- registrar incidente/finding;
- só retomar deployment quando o estado estiver entendido.

## 17. Disponibilidade e dependências externas

O core deve distinguir dependência crítica de capability opcional.

### Críticas

- aplicação/configuração válida;
- PostgreSQL;
- auth quando necessário para recurso autenticado.

### Degradáveis

- AI tutor/evaluation;
- speech-to-text;
- analytics;
- e-mail fora de fluxos que dependem diretamente dele;
- storage de áudio para sessões que não usam speaking.

Exemplo: indisponibilidade do provider de IA pode esconder/desabilitar feedback de IA e permitir retry posterior, mas não pode impedir o aluno de abrir Today, revisar conteúdo determinístico ou consultar progresso já persistido.

## 18. Speaking e storage de mídia

Quando speaking for implementado:

- assets privados por padrão;
- nenhum bucket público;
- object key gerada no servidor;
- MIME/tamanho/duração validados;
- download/leitura autorizado ou por URL temporária curta;
- política de retenção explícita;
- cleanup idempotente e observável;
- delete da conta inclui lifecycle da mídia conforme política;
- logs nunca carregam áudio, transcript integral ou URL pública permanente.

O provider concreto de storage será escolhido por issue/ADR quando necessário.

## 19. Observabilidade de deploy

Cada release deve permitir correlacionar:

- commit SHA;
- deployment/provider ID;
- horário;
- environment;
- migration revision quando aplicável;
- resultado do smoke;
- request/correlation IDs de falhas pós-deploy.

Logs de produção são estruturados e sanitizados. Não registrar:

- cookies/tokens;
- `DATABASE_URL`;
- respostas livres do aluno;
- transcript/áudio;
- prompt/resposta integral de IA por default.

Alertas e dashboards completos entram conforme tráfego real justificar, mas identificação de versão e erro não pode esperar escala. A #14 e o hardening restante da #45 devem completar o que ainda faltar para correlação operacional consistente.

## 20. Fluxo operacional padrão

### Sem migration

```text
Issue
→ branch
→ implementação + testes + docs
→ PR
→ CI/gates
→ auto code review
→ review final
→ merge em main
→ Vercel production deploy do SHA
→ provider READY
→ prod:verify/readiness
→ smoke + logs
→ release validada
```

### Com migration aditiva obrigatória

```text
Issue
→ branch
→ migration + código compatível
→ PR
→ CI/gates + review do SQL
→ auto code review
→ checkpoint se necessário
→ prod:migrate usando a revision revisada
→ validar schema
→ merge/promover código
→ Vercel production deploy
→ prod:verify/readiness
→ smoke + logs
```

### Com migration destrutiva

Não existe fluxo de uma etapa. Usar `expand → deploy → contract` em releases separadas e runbook próprio.

## 21. Baseline de primeira colocação em produção

A primeira ativação operacional foi concluída em 2026-09-01 e está detalhada em `docs/PRODUCTION_STATUS.md`.

Entregue e validado:

- [x] projeto Vercel criado e mapeado explicitamente;
- [x] production branch configurada como `main`;
- [x] Neon Production provisionado;
- [x] Preview isolado em branch Neon separada e CI isolado de Production;
- [x] configuração de runtime/operacional separada por escopo;
- [x] migration versionada aplicada em Production;
- [x] `prod:check` implementado e exercitado;
- [x] `prod:migrate` implementado e exercitado;
- [x] `prod:verify` implementado e readiness real validada;
- [x] `prod:backup` implementado e backup real criado;
- [x] `prod:restore-check` executado em banco Neon não produtivo;
- [x] `/api/health/live` e `/api/health/ready` implementados;
- [x] CI testa build de produção;
- [x] Production Contract do Dev Dashboard habilitado somente após os comandos/fluxo existirem.

Hardening ainda pertencente à #45/#14:

- [ ] completar correlação estruturada de commit/deployment/incidente onde ainda faltar;
- [ ] manter smoke/runbooks executáveis e atualizados;
- [ ] formalizar procedimentos de rollback/forward-fix e migration failure;
- [ ] formalizar rotação/least privilege e resposta a segredo comprometido;
- [ ] definir cadência de restore exercise quando houver dados relevantes.

A capability de Production ativa não deve ser confundida com conclusão de todo o hardening operacional.

## 22. Ações proibidas

Em produção, não:

- rodar `drizzle-kit push` como atalho;
- executar migration automaticamente em cada cold start/request;
- apontar Preview/CI/local para o banco de produção;
- publicar porta PostgreSQL;
- colocar segredo em `NEXT_PUBLIC_*`;
- fazer deploy com working tree local suja por fluxo `command`;
- fabricar commit/redeploy para contornar cota de provider;
- considerar `READY` da Vercel prova suficiente de saúde;
- restaurar backup automaticamente porque um deploy falhou;
- rollbackar código sem conferir schema atual;
- editar migration já aplicada;
- usar usuário superuser do PostgreSQL no runtime se privilégio menor for suficiente;
- persistir áudio/transcript em log;
- manter `production.enabled=true` se o contrato real deixar de existir ou não puder mais ser validado.

## 23. Evolução futura

A topologia Vercel + Neon é adequada ao monólito modular inicial. Mudança para container próprio, VM, Kubernetes, outro banco gerenciado ou plataforma diferente deve ser motivada por necessidade concreta, como:

- custo;
- limite operacional;
- job assíncrono incompatível com runtime atual;
- requisitos de rede/latência;
- observabilidade;
- soberania/privacidade;
- escala comprovada.

A troca deve preservar os contratos de domínio e, quando estrutural, criar novo ADR.

## 24. Runbooks de hardening

A operação real já existe; portanto a #45 deve completar em `docs/runbooks/`, no mínimo, os runbooks aplicáveis à capacidade atual:

```text
deploy.md
migration-failure.md
backup-restore.md
vercel-outage.md
database-outage.md
auth-outage.md
leaked-secret.md
data-corruption.md
```

Adicionar `ai-provider-outage.md` e `storage-outage.md` quando as respectivas capabilities entrarem no produto; não inventar provider inexistente apenas para preencher checklist.

Runbook deve conter passos executáveis, critérios de decisão, sinais de sucesso/falha e escalonamento. Uma descrição genérica não conta como runbook.