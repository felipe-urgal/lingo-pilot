# Deploy e operações de produção — LingoPilot

> **Status:** contrato arquitetural inicial. A implementação operacional será entregue incrementalmente pelas issues de Foundation/Hardening, especialmente #8, #10, #14 e #45.
>
> Este documento é **normativo** para decisões de produção. Se código, workflow ou manifesto de deployment divergir daqui, o mesmo PR deve atualizar este contrato ou registrar um ADR que explique a mudança.

## 1. Objetivo

Definir desde o início como o LingoPilot será construído, promovido, migrado, verificado e recuperado em produção, evitando que o deploy vire uma coleção de comandos improvisados quando o produto já contiver dados reais de estudo.

O contrato foi desenhado a partir de padrões operacionais já usados em outros projetos do mesmo ambiente:

- `dev-dashboard`: separação entre planejamento/estado do deployment, provider externo, migrations, readiness e recovery;
- `home-music`: comandos operacionais canônicos, health/readiness distintos, processo de atualização explícito e recuperação conservadora;
- `loto-lab`: runtime endurecido, banco não exposto, secrets fora do Git, healthchecks, backup/restore e CI que testa o artefato de produção;
- `controle-gastos`: Next.js em Vercel, PostgreSQL em Neon, migrations fora do build da Vercel e promoção de código somente depois de schema compatível.

Esses projetos são referências de engenharia, não fontes de verdade do LingoPilot. A fonte de verdade deste projeto é este documento + ADRs vigentes.

## 2. Decisões iniciais

A topologia inicial de produção será:

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

- dados sintéticos ou efêmeros;
- PostgreSQL isolado do ambiente de produção;
- secrets de teste/preview separados;
- Preview Vercel, quando habilitado, não recebe `DATABASE_URL` de produção;
- uma Preview incapaz de obter banco seguro deve falhar/operar com capacidade limitada, nunca apontar para produção como atalho.

### 4.3 Production

- Vercel Production Environment;
- Neon database/branch de produção dedicado;
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
- houve migration associada?;

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

Quando a implementação chegar ao estágio de produção, o repositório deve expor uma interface operacional estável. Alvo inicial:

```bash
pnpm prod:check
pnpm prod:migrate
pnpm prod:verify
pnpm prod:backup
```

Opcionalmente podem existir comandos especializados (`prod:migrate:status`, `prod:logs`, etc.), mas os nomes canônicos acima devem encapsular detalhes do provider quando fizer sentido.

### `prod:check`

Somente preflight. Não muta produção.

Deve validar os gates locais necessários para afirmar que a revision é promovível, sem fazer deploy, migration ou backup real.

### `prod:migrate`

Mutação de produção explícita.

Deve:

- exigir configuração de produção fora do Git;
- validar que está apontando para o banco esperado sem imprimir segredo;
- executar migrations versionadas;
- falhar de forma clara em inconsistência;
- nunca ser chamado automaticamente pelo `pnpm build`.

### `prod:verify`

Somente leitura/smoke contra a URL de produção.

Deve verificar pelo menos readiness e um fluxo público seguro. Conforme auth estiver disponível, pode validar um fluxo sintético controlado sem usar dados reais de usuário.

### `prod:backup`

Cria backup/checkpoint explícito sem embutir credenciais no repositório.

A implementação deve validar resultado e registrar metadata suficiente para posterior restore, sem logar connection string.

Os scripts serão implementados nas issues apropriadas; este documento define o contrato, não finge que eles já existem.

## 10. Integração futura com Dev Dashboard

O LingoPilot deve ser compatível com o domínio de deployment do `dev-dashboard`.

Estratégia prevista:

```text
strategy = git-managed
provider = vercel
production branch = main
external project = mapeamento explícito do projeto Vercel
```

Regras:

- o Dev Dashboard pode observar provider/deployment/drift;
- ele não deve inferir projeto Vercel pelo nome da pasta;
- `prod:check`, `prod:migrate` e `prod:verify` permanecem operações locais explícitas;
- não criar um `prod:deploy` falso apenas para caber no contrato;
- `READY` do provider não substitui `prod:verify`/readiness;
- migration permanece separada da promoção Git/Vercel;
- consulta de status não deve alterar repositório ou executar `git fetch` silenciosamente.

O arquivo `.dev-dashboard/production.json` só deve ser habilitado quando os scripts e o fluxo reais existirem e tiverem sido testados. Não anunciar `production.enabled=true` antes da capacidade existir.

## 11. Health e readiness

O LingoPilot deve separar processo/rota acessível de dependências críticas prontas.

Contrato alvo:

```text
GET /api/health/live
  → 200 se a aplicação consegue servir request

GET /api/health/ready
  → 200 quando o core está pronto
  → 503 quando dependência crítica do core impede operação segura
```

`ready` deve considerar, no mínimo:

- configuração server-side crítica válida;
- conectividade/consulta mínima ao PostgreSQL;
- compatibilidade de schema esperada pela release.

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
6. validar autenticação com identidade sintética/controlada quando o fluxo existir;
7. validar uma leitura segura que envolva PostgreSQL;
8. observar 5xx/erros estruturados por uma janela curta;
9. registrar deploy marker/revision.

Falha do smoke exige investigação imediata e decisão entre rollback de aplicação e forward-fix.

## 13. Secrets e configuração

### 13.1 Regras

- arquivos reais de `.env` não são versionados;
- `.env.example` contém somente placeholders seguros;
- secrets de Production, Preview e CI são distintos;
- segredo server-only nunca é exposto como variável pública do Next.js;
- connection strings não entram em logs;
- tokens não são passados em query string;
- rotação deve ser possível sem alterar código;
- acesso humano ao banco usa credencial de menor privilégio compatível com a operação.

### 13.2 Categorias esperadas

Com o avanço do projeto existirão, entre outras:

- database/runtime connection;
- database/migration credential quando separação de privilégio for adotada;
- auth/session secrets/provider credentials;
- AI provider credentials;
- storage credentials;
- e-mail provider credentials;
- observability credentials.

Nenhuma delas pertence ao manifesto do Dev Dashboard.

## 14. PostgreSQL / Neon

Produção usa PostgreSQL gerenciado no Neon na topologia inicial.

Regras:

- TLS obrigatório conforme configuração do provider;
- runtime usa conexão/pool apropriado a workloads serverless;
- migrations podem usar configuração separada se o provider recomendar conexão direta;
- Preview/CI não reutiliza o database/branch de produção;
- queries operacionais não expõem dados pessoais em logs;
- índices e migrations continuam versionados no repositório;
- provider é substituível pela abstração da infraestrutura; SQL/domínio não deve depender de feature proprietária sem ADR.

## 15. Backup e restore

“Provider possui backup” não é suficiente. Backup só conta quando existe procedimento de restore conhecido e testado.

Baseline portátil:

- dump PostgreSQL em formato apropriado (`pg_dump`/equivalente);
- metadata de data, database lógico, schema/revision e responsável/operação;
- armazenamento fora do repositório;
- cópia em domínio de falha diferente quando o produto possuir dados relevantes;
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

Alertas e dashboards completos entram conforme tráfego real justificar, mas identificação de versão e erro não pode esperar escala.

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

## 21. Primeira colocação em produção

Antes do primeiro deploy real, #45 (ou issues filhas) deve comprovar:

- [ ] Vercel project criado e mapeado explicitamente;
- [ ] production branch configurada como `main`;
- [ ] Neon production database criado;
- [ ] Preview/CI isolados de production;
- [ ] secrets configurados com escopo correto;
- [ ] migrations do zero testadas;
- [ ] `prod:check` implementado;
- [ ] `prod:migrate` implementado;
- [ ] `prod:verify` implementado;
- [ ] backup criado e validado;
- [ ] restore executado em database não produtivo;
- [ ] health/live e health/ready implementados;
- [ ] observabilidade identifica commit/deployment;
- [ ] CI testa build de produção;
- [ ] smoke pós-deploy documentado e executável;
- [ ] rollback/forward-fix runbook existe;
- [ ] secrets podem ser rotacionados;
- [ ] política de auth/AI/storage failure está documentada;
- [ ] manifesto do Dev Dashboard só é habilitado depois que os comandos existem.

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
- habilitar `production.enabled=true` no Dev Dashboard antes do contrato real estar implementado.

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

## 24. Runbooks previstos

Quando a operação real existir, criar em `docs/runbooks/` pelo menos:

```text
deploy.md
migration-failure.md
backup-restore.md
vercel-outage.md
database-outage.md
auth-outage.md
ai-provider-outage.md
storage-outage.md
leaked-secret.md
data-corruption.md
```

Runbook deve conter passos executáveis, critérios de decisão, sinais de sucesso/falha e escalonamento. Uma descrição genérica não conta como runbook.
