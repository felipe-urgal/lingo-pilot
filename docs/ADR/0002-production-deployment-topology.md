# ADR 0002 — Topologia inicial de produção

- **Status:** Accepted
- **Data:** 2026-08-31
- **Decisão:** Vercel + Neon PostgreSQL com promoção Git-managed e migrations explícitas fora do build

## Contexto

O LingoPilot é um monólito modular em Next.js/TypeScript com PostgreSQL. Mesmo antes de existir código de produto, o projeto precisa definir uma direção operacional para que bootstrap, migrations, health, CI, secrets e observabilidade não sejam implementados com premissas contraditórias.

Foram revisados padrões de produção dos projetos `dev-dashboard`, `home-music`, `loto-lab` e `controle-gastos`.

As alternativas relevantes eram:

1. Vercel para aplicação + PostgreSQL gerenciado;
2. Docker Compose em host próprio;
3. Node/systemd em host próprio;
4. adiar completamente a decisão de hosting.

## Decisão

Adotar inicialmente:

```text
GitHub main
   ↓
Vercel Production
   ↓
Next.js LingoPilot
   ↓
Neon PostgreSQL
```

Para mídia de speaking, quando necessária, usar storage privado por interface S3-compatible, com provider definido separadamente.

A estratégia de deploy é **Git-managed**:

- `main` é a branch de produção;
- merge/promoção Git dispara a release da aplicação;
- o deployment é identificado por commit SHA;
- não existe `prod:deploy` local artificial;
- migrations são uma operação separada e explícita;
- o build da Vercel não executa migration;
- schema requerido por código novo deve ficar compatível antes da promoção desse código;
- health/readiness da aplicação é verificado separadamente do estado `READY` do provider.

## Por que Vercel

- encaixe natural com Next.js/App Router;
- Preview Deployments úteis para revisão;
- reduz operação de VM/process manager no estágio inicial;
- HTTPS e edge/runtime são responsabilidades da plataforma;
- integração Git simplifica releases identificáveis por SHA.

Isso não autoriza dependência de APIs proprietárias dentro do domínio.

## Por que Neon

- PostgreSQL continua sendo a interface de persistência definida pela arquitetura;
- banco gerenciado reduz operação do host no início;
- combina bem com workload web/serverless quando conexão/pooling são configurados corretamente;
- permite manter application hosting e database lifecycle separados.

Código e migrations devem permanecer PostgreSQL-portable quando razoável. Uso estrutural de feature proprietária do Neon requer nova decisão/ADR se criar lock-in material.

## Por que não Docker Compose como padrão inicial

Docker Compose, como no Loto Lab, é uma estratégia válida quando queremos controlar runtime, rede, healthchecks e banco no mesmo host. Para o LingoPilot inicial isso adicionaria responsabilidades de host, TLS, patching, container lifecycle e backup operacional sem necessidade comprovada.

Se jobs longos, custo ou limitações serverless justificarem host próprio no futuro, a topologia pode mudar sem reescrever o domínio.

## Por que não systemd como padrão inicial

Systemd, como no Home Music, é excelente para um serviço pessoal local/privado ligado continuamente, especialmente com Tailscale. O LingoPilot pretende evoluir para produto web acessível em múltiplos dispositivos e potencialmente múltiplos usuários; Vercel reduz a carga operacional inicial desse cenário.

## Migrations

Adotar política `expand → deploy → contract`.

- migrations são versionadas;
- migration aplicada em produção não é editada;
- `pnpm build` nunca altera produção;
- migrations que o código novo exige são aplicadas antes da promoção do código e precisam ser backward-compatible com a versão ainda ativa;
- mudanças destrutivas são separadas em releases e exigem backup/checkpoint;
- rollback de aplicação só ocorre após conferir compatibilidade com o schema já avançado.

## Integração com Dev Dashboard

Quando o produto possuir operações reais de produção, o manifesto deverá usar conceitualmente:

```text
strategy=git-managed
provider=vercel
branch=main
external.project=<mapeamento explícito>
```

O Dev Dashboard observará provider/drift, enquanto operações locais como check/migrate/verify continuam explícitas.

O manifesto não deve ser habilitado antes de os scripts canônicos existirem e serem validados.

## Segurança

- banco de produção não é usado por Preview/CI/local;
- PostgreSQL não é exposto publicamente;
- secrets ficam em stores de ambiente/provider, nunca no Git;
- produção pública usa HTTPS;
- storage de áudio é privado;
- outputs/logs não expõem connection strings, tokens, áudio, transcript ou respostas livres do aluno.

## Consequências positivas

- menor custo operacional inicial;
- releases rastreáveis por Git SHA;
- arquitetura alinhada ao framework escolhido;
- banco e app podem evoluir independentemente;
- encaixe futuro com o domínio de deployment do Dev Dashboard;
- rollback da aplicação é simples quando schema é compatível.

## Consequências e riscos

- dependência operacional de Vercel e Neon;
- quotas/limites do provider podem bloquear promoção temporariamente;
- funções serverless exigem estratégia correta de conexão PostgreSQL;
- migration não pode depender do build automático da Vercel;
- rollback não é automaticamente seguro depois de schema incompatível;
- jobs longos e processamento pesado podem exigir runtime assíncrono/externo no futuro.

## Mitigações

- adapters mantêm providers fora do domínio;
- provider outage é modelado explicitamente;
- CI permanece independente de deploy Vercel;
- migrations têm comando operacional próprio;
- backup/restore é testado;
- release metadata registra commit/deployment;
- features de IA degradam sem derrubar o core;
- mudança estrutural futura exige ADR.

## Alternativas revisitáveis

Reavaliar hosting se houver evidência de:

- custo incompatível;
- necessidade de processos long-running;
- jobs/queues que não se encaixem no runtime;
- requisitos de rede ou compliance;
- necessidade de controle operacional do host;
- limitação de observabilidade/performance;
- escala comprovada.

## Referências internas

- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/OBSERVABILITY.md`
- issue #45
