# Runbooks de produção

Este diretório contém os procedimentos operacionais executáveis da issue #45. `docs/PRODUCTION.md` continua sendo a entrada canônica para o fluxo normal; estes runbooks entram quando a operação precisa de passos de release, diagnóstico ou recuperação específicos.

## Regras comuns

- nunca copie connection strings, tokens, cookies, dumps ou PII para issue, PR, chat ou log compartilhado;
- identifique release por commit SHA e deployment por identificador do provider quando disponível;
- preserve evidência antes de repetir uma mutação cujo efeito ficou parcial ou desconhecido;
- `READY` da Vercel não substitui `/api/health/ready`;
- migration aplicada é imutável; correção usa forward-fix;
- rollback de aplicação só é permitido quando o schema atual continua compatível com a versão anterior;
- restore de backup não é resposta automática a regressão de aplicação;
- `recovery_required` significa: interromper novas mutações, preservar evidência e só retomar depois que o estado atual estiver conhecido.

## Índice

- [`deploy.md`](deploy.md) — promoção explícita pelo Dev Dashboard e smoke pós-deploy;
- [`migration-failure.md`](migration-failure.md) — falha/estado ambíguo de migration;
- [`backup-restore.md`](backup-restore.md) — backup, restore exercise e restore de emergência;
- [`vercel-outage.md`](vercel-outage.md) — outage, quota ou falha do provider;
- [`database-outage.md`](database-outage.md) — indisponibilidade do Neon/PostgreSQL;
- [`auth-outage.md`](auth-outage.md) — falha de login/sessão/cookie/DB;
- [`leaked-secret.md`](leaked-secret.md) — rotação e contenção de credencial;
- [`data-corruption.md`](data-corruption.md) — suspeita/confirmação de corrupção lógica.

`ai-provider-outage.md` e `storage-outage.md` só devem existir quando essas capabilities entrarem em produção.
