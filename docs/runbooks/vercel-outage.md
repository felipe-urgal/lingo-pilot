# Runbook — outage ou quota da Vercel

## Pré-condições

- deployments automáticos da integração Git estão desabilitados por `vercel.json`;
- produção é promovida explicitamente pelo Dev Dashboard via API do provider;
- o deployment atualmente ativo pode continuar saudável mesmo quando novas promoções estão indisponíveis.

## Procedimento

1. Determine se o problema é **provider**, **quota**, **build do release** ou **aplicação já implantada**.
2. Registre horário UTC, SHA esperado, deployment id quando houver e erro sanitizado do provider/Dev Dashboard.
3. Confirme o estado da aplicação existente:

   ```bash
   pnpm prod:verify
   ```

4. Se a aplicação atual está saudável e apenas novas promoções falham, congele novas migrations incompatíveis e preserve `main`/release candidato até o provider voltar.
5. Se a causa for quota, não reative deployment automático da integração Git para contornar o limite e não dispare retries repetidos. Aguarde janela/capacidade ou trate o limite na conta/provider.
6. Se o provider reporta outage, acompanhe o status oficial e evite mutações de banco cujo código correspondente não possa ser promovido.
7. Quando a capacidade voltar, reexecute `pnpm prod:check`, confirme migration state e faça `provider-deploy -> prod:verify` pelo fluxo normal.

## Sinais de sucesso

- deployment existente permanece saudável durante indisponibilidade de promoção;
- nenhuma migration incompatível é aplicada sem caminho de deploy;
- após recuperação do provider, um único deployment do SHA esperado fica `READY` e `prod:verify` passa.

## Sinais de falha

- retries geram deployments duplicados ou consomem quota sem mudar diagnóstico;
- alguém propõe `vercel --prod` ou reativar Git deployment sem mudança de contrato;
- migration foi aplicada mesmo sem capacidade de promover código dependente;
- provider `READY` é tratado como substituto de readiness da aplicação.

## Critérios de decisão

- **Provider indisponível + app atual saudável:** esperar e congelar promoção é preferível.
- **App atual indisponível por regressão do último deployment:** avaliar rollback somente com schema compatível.
- **Banco também degradado:** siga [`database-outage.md`](database-outage.md); não atribua tudo à Vercel.

## Recuperação

Após retorno do provider, confirme SHA/deployment, rode `pnpm prod:verify`, smoke do fluxo afetado e observe 5xx antes de retomar migrations/releases pendentes.

## Escalonamento

Escale quando a indisponibilidade impede recuperação de uma regressão ativa, quota não possui resolução operacional conhecida, o deployment ativo também caiu ou existe conflito entre estado mostrado pelo provider e readiness real.
