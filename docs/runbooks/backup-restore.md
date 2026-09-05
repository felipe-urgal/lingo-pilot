# Runbook — backup e restore

## Pré-condições

- `prod:backup` usa credencial administrativa separada do runtime;
- `.dev-dashboard/backups/` é ignorado pelo Git e não é armazenamento durável de longo prazo;
- restore sempre é validado primeiro fora de Production;
- `RESTORE_CHECK_DATABASE_URL` aponta para banco não produtivo e `RESTORE_CHECK_CONFIRM=lingo-pilot-restore-check` está configurado fora do Git.

## Procedimento — backup

1. Antes de toda migration de Production coberta pela política `required-before-migration`:

   ```bash
   pnpm prod:backup
   ```

2. Para cada backup que será retido, registre fora do dump e sem secrets:
   - timestamp UTC;
   - ambiente/projeto/branch de origem;
   - commit SHA da aplicação;
   - migration head esperado;
   - nome do artefato e checksum;
   - operador/processo responsável;
   - política de retenção e data prevista de descarte.
3. Quando Production passar a conter dados duráveis/relevantes de learners, retenha cópia criptografada em domínio de falha diferente da máquina do operador e do banco primário, com acesso least-privilege. Meta operacional inicial: 30 dias de retenção para checkpoints explícitos, sujeita a revisão de custo/LGPD.

## Procedimento — restore exercise

1. Gere ou selecione um backup conhecido.
2. Use banco isolado não produtivo e execute:

   ```bash
   pnpm prod:restore-check -- <backup.dump>
   ```

3. Registre data UTC, checksum do backup, destino não produtivo, resultado do restore e validação mínima de schema.
4. Cadência:
   - antes de dados duráveis/relevantes: repetir após mudança material do mecanismo de backup/restore ou no mínimo trimestralmente;
   - após dados duráveis/relevantes: exercício mensal e também após mudança material do mecanismo.

## Procedimento — restore de emergência

1. Declare `recovery_required` e interrompa mutações concorrentes.
2. Preserve o estado atual e evidências; quando seguro, capture backup do estado corrompido para análise antes de substituir qualquer coisa.
3. Restaure o backup candidato em ambiente isolado com `prod:restore-check`.
4. Valide integridade/schema e estime perda de dados entre timestamp do backup e incidente.
5. Só depois de decisão explícita coordene novo banco/branch de recuperação ou cutover de Production. Não sobrescreva o banco primário como primeiro teste.
6. Após cutover, rode `pnpm prod:verify`, smoke e monitore erros antes de encerrar o incidente.

## Sinais de sucesso

- backup termina sem expor credenciais;
- checksum/metadata permitem identificar o artefato;
- restore-check termina em banco não produtivo e confirma schema mínimo;
- exercício documenta RPO observado e tempo de recuperação real.

## Sinais de falha

- único backup está no mesmo domínio de falha do banco/máquina;
- artefato não possui metadata/checksum suficiente;
- restore só foi “validado” diretamente em Production;
- credencial/dump foi anexado a issue/PR;
- exercício não consegue reconstruir schema mínimo.

## Critérios de decisão

- deploy de aplicação com schema saudável **não** justifica restore;
- corrupção lógica restrita pode ser corrigida por forward repair se preservar mais dados e for verificável;
- restore é preferível quando a integridade não pode ser reconstruída com confiança e um backup validado oferece ponto de recuperação conhecido.

## Recuperação

Se `prod:backup` falhar antes de migration exigida, não execute a migration até restabelecer checkpoint verificável. Se `prod:restore-check` falhar, trate o backup como não comprovado e escolha outro artefato/causa antes de qualquer emergência real.

## Escalonamento

Escale para decisão humana quando houver perda potencial de dados, necessidade de cutover, conflito de retenção/LGPD, falha repetida de restore exercise ou ausência de backup comprovadamente recuperável.
