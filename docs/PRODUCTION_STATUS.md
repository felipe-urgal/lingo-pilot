# Status de produção

A topologia alvo do LingoPilot continua definida em [`PRODUCTION_DEPLOYMENT.md`](PRODUCTION_DEPLOYMENT.md): Vercel para aplicação, Neon PostgreSQL para dados e promoção `git-managed` pela branch `main`.

> **Estado atual:** produção operacional ainda não está habilitada. A issue #59 concluiu somente o baseline **fail-closed** necessário para representar essa indisponibilidade de forma explícita e segura. A operacionalização real continua na #45.

O Production Contract consumido pelo Dev Dashboard está **desabilitado por intenção**. Isso não significa que a arquitetura de produção foi abandonada; significa que o repositório ainda não possui evidência suficiente para anunciar capacidade operacional real.

## Baseline concluída em #59

O repositório já possui:

- contrato explícito `enabled=false` / `strategy=disabled` / `provider=none`;
- `pnpm prod:status` somente leitura;
- `pnpm prod:check` que falha de propósito enquanto houver blockers;
- blockers estáveis para impedir habilitação acidental;
- documentação que separa topologia aprovada de produção efetivamente pronta.

Esse baseline é uma proteção de governança, não um deploy parcial.

## Blockers atuais

- `vercel-project-not-configured`: falta registrar e validar o identificador real do projeto Vercel; ele não será inferido pelo nome do repositório.
- `neon-production-not-validated`: falta validar o banco/branch Neon de produção e sua configuração server-side.
- `backup-dr-not-validated`: backup/checkpoint e procedimento de recuperação ainda não foram exercitados em produção.
- `migration-flow-not-validated`: migrations explícitas fora do build da Vercel ainda precisam do fluxo operacional real.
- `production-health-not-configured`: os endpoints `/api/health/live` e `/api/health/ready` e o smoke externo ainda não existem no produto atual.

Enquanto qualquer blocker permanecer, `.dev-dashboard/production.json` deve continuar desabilitado.

## Comandos canônicos atuais

`pnpm prod:status` é somente leitura e lista os blockers. `pnpm prod:check` falha de propósito para impedir que CI, operadores ou o Dev Dashboard confundam arquitetura planejada com produção pronta.

Ainda **não** existem `prod:migrate`, `prod:verify` e `prod:backup` operacionais para Production. Esses comandos pertencem à implementação real da #45 e só devem ser anunciados como disponíveis quando seus contratos estiverem testados.

## Próxima transição válida

A futura ativação para `strategy=git-managed` exige trabalho explícito na #45 ou issue filha equivalente que:

1. configure e valide o projeto Vercel real;
2. configure e valide Neon Production isolado de local/CI/Preview;
3. implemente migrations operacionais fora do build;
4. implemente health/readiness e smoke;
5. implemente backup/restore com restore exercitado;
6. substitua blockers por evidência verificável;
7. atualize o manifesto do Dev Dashboard somente depois dessas validações.

Até lá, o estado correto é **produção planejada e intencionalmente bloqueada**.
