# Runbook — falha de migration

## Pré-condições

- migration de Production só é executada por `pnpm prod:migrate` com configuração administrativa fora do Git;
- checkpoint/backup verificável existe quando a mudança exige proteção adicional;
- o código dependente do novo schema ainda não foi promovido quando a migration precisa ocorrer `before-deploy`.

## Procedimento

1. Ao primeiro erro, **não repita** `pnpm prod:migrate` automaticamente.
2. Registre em local seguro: horário UTC, SHA do release, migration esperada, código de saída e mensagem sanitizada do tooling. Nunca registre a URL do banco.
3. Marque operacionalmente o incidente como `recovery_required` quando qualquer uma destas condições ocorrer:
   - houve conexão com Production e o processo falhou depois de iniciar mutação;
   - a conexão caiu durante a migration;
   - o tooling não consegue provar se a migration foi registrada/aplicada;
   - schema observado e histórico de migrations divergem;
   - uma etapa manual/externa pode ter produzido efeito parcial.
4. Preserve os logs/artefatos disponíveis antes de reiniciar processo, container, terminal ou credencial que possa apagar contexto.
5. Use o console/observabilidade do Neon e o histórico versionado do repositório para determinar o estado atual. Não edite migration já aplicada e não faça schema push manual.
6. Se o estado for conhecido e **nenhuma mutação tiver ocorrido**, corrija a causa e reexecute o preflight antes de um novo `prod:migrate`:

   ```bash
   pnpm prod:check
   ```

7. Se a migration foi aplicada total ou parcialmente, produza um forward-fix versionado. Teste-o em banco não produtivo antes de qualquer nova mutação de Production.

## Sinais de sucesso

- estado do schema e histórico de migrations são conhecidos e coerentes;
- uma retry foi classificada explicitamente como segura **ou** um forward-fix versionado foi preparado;
- o código dependente só é promovido depois que o schema necessário está saudável;
- `pnpm prod:verify` e smoke passam após a promoção.

## Sinais de falha

- estado do schema continua desconhecido;
- alguém precisa “tentar de novo para ver”;
- migration aplicada teria de ser editada para continuar;
- rollback de app foi proposto sem verificar compatibilidade do schema;
- recuperação depende de restaurar Production sem restore-check prévio.

## Critérios de decisão

- **Retry permitido:** somente quando é possível demonstrar que nenhuma mutação ocorreu ou que a operação é idempotente para o estado exato observado.
- **Forward-fix obrigatório:** migration já registrada/aplicada, efeito parcial conhecido que precisa de correção ou schema incompatível com rollback de app.
- **Rollback de app permitido:** apenas se o schema atual continua compatível com a versão anterior.
- **Restore considerado:** somente em incidente de dados/schema em que forward repair não é seguro; siga [`backup-restore.md`](backup-restore.md) e [`data-corruption.md`](data-corruption.md).

## Recuperação

- mantenha `main` sem código que dependa de schema ainda indisponível;
- prefira `expand → deploy → contract` para evitar janela incompatível;
- crie nova migration para corrigir estado aplicado; nunca reescreva migration imutável;
- depois da correção, execute novamente preflight, migration quando aplicável, provider-deploy e verify conforme [`deploy.md`](deploy.md).

## Escalonamento

Escale imediatamente quando o estado aplicado for ambíguo, a migration for destrutiva, houver risco de perda de dados, um backfill tiver efeitos parciais ou a recuperação exigir restore/cutover de banco.
