# Runbook — indisponibilidade do PostgreSQL/Neon

## Pré-condições

- `/api/health/live` e `/api/health/ready` têm semânticas diferentes;
- readiness do core depende de PostgreSQL/schema mínimo;
- runtime usa conexão pooled e migrations/backups usam credencial administrativa separada.

## Procedimento

1. Confirme o sintoma sem expor connection string:
   - `/api/health/live` pode continuar `200`;
   - `/api/health/ready` tende a `503` quando PostgreSQL/schema impede operação segura.
2. Registre horário UTC, deployment/commit, requestIds e códigos de erro seguros.
3. Verifique status/métricas do Neon e sinais de conexão/latência no runtime. Não copie URL, usuário ou senha para o incidente.
4. Suspenda migrations, restore e outras mutações enquanto o estado do banco estiver desconhecido.
5. Se o provider estiver em outage, aguarde recuperação e evite loops agressivos de retry.
6. Se a conexão administrativa funciona mas runtime não, revise separadamente configuração pooled/runtime; não substitua runtime por credencial administrativa.
7. Após recuperação, execute:

   ```bash
   pnpm prod:verify
   ```

   e faça smoke dos fluxos que persistem dados.

## Sinais de sucesso

- readiness volta a `200`;
- operações de leitura/escrita críticas retomam sem erro persistente;
- não houve troca indevida de credenciais/classes de privilégio;
- logs correlacionam incidente e release sem PII.

## Sinais de falha

- readiness continua `503` após provider recuperar;
- schema mínimo está ausente/divergente;
- há suspeita de corrupção, perda de dados ou migration parcial;
- recuperação depende de elevar privilégio do runtime.

## Critérios de decisão

- **Outage de infraestrutura sem corrupção:** não restaure backup; recupere conectividade e valide.
- **Schema/migration ambíguos:** siga [`migration-failure.md`](migration-failure.md).
- **Dados inconsistentes/corrompidos:** siga [`data-corruption.md`](data-corruption.md).
- **Credencial suspeita:** siga [`leaked-secret.md`](leaked-secret.md).

## Recuperação

Depois de restabelecer PostgreSQL, confirme readiness, smoke, taxas de erro e operações pendentes/idempotentes antes de liberar novas migrations ou deploys.

## Escalonamento

Escale quando o outage exceder a janela operacional aceitável, houver risco de perda de dados, failover/cutover for necessário ou o estado de schema/migration não puder ser determinado com confiança.
