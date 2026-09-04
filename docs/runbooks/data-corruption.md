# Runbook — suspeita de corrupção de dados

## Pré-condições

- restore não é executado diretamente sobre Production como primeiro diagnóstico;
- backups candidatos são validados em ambiente isolado;
- migrations aplicadas são imutáveis e correções de schema usam forward-fix.

## Procedimento

1. Declare `recovery_required` e interrompa deploys/migrations/mutações não essenciais que possam ampliar o dano.
2. Preserve evidência: horário UTC, release/deployment, migration head conhecido, tabelas/fluxos afetados em termos técnicos e requestIds seguros. Não copie PII/payload do learner.
3. Determine o alcance: schema, conjunto lógico de registros, fila/progresso ou indisponibilidade de infraestrutura.
4. Quando seguro, capture um backup do estado atual antes de qualquer reparo para preservar possibilidade de análise.
5. Selecione um backup anterior candidato e valide fora de Production:

   ```bash
   pnpm prod:restore-check -- <backup.dump>
   ```

6. Compare o ponto recuperável com o estado atual e estime dados que seriam perdidos por restore.
7. Escolha entre:
   - **forward repair** versionado/transacional para corrupção limitada e compreendida;
   - **restore/cutover** quando integridade ampla não puder ser reconstruída com confiança.
8. Teste a estratégia em ambiente não produtivo antes de Production.
9. Após recuperação, execute `pnpm prod:verify`, smoke dos fluxos de persistência e monitore recorrência.

## Sinais de sucesso

- causa/alcance são conhecidos antes da mutação de recuperação;
- estratégia escolhida preserva o máximo de dados verificáveis;
- restore candidato foi exercitado fora de Production;
- aplicação/readiness e invariantes afetados voltam ao estado esperado.

## Sinais de falha

- recuperação começa apagando/reescrevendo Production sem snapshot/evidência;
- restore é escolhido apenas porque existe um dump;
- reparo usa script ad-hoc não versionado contra Production;
- PII é copiada para discussão do incidente.

## Critérios de decisão

- **Forward repair:** dano delimitado, regra de correção determinística, operação testável e auditável.
- **Restore/cutover:** integridade ampla/indeterminada e backup validado representa ponto conhecido melhor que o estado atual.
- **Migration relacionada:** coordene também [`migration-failure.md`](migration-failure.md).

## Recuperação

Após estabilizar, documente causa, janela, dados potencialmente afetados, RPO/RTO observado e follow-ups de prevenção sem manter conteúdo do learner no registro operacional.

## Escalonamento

Escale imediatamente em perda de dados, impacto multiusuário, dúvida sobre integridade histórica pedagógica, necessidade de restore/cutover ou possível incidente de segurança.
