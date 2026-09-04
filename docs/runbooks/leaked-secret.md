# Runbook — credencial/secret vazado

## Pré-condições

- secrets vivem fora do Git e do bundle cliente;
- runtime, migration/backup e provider devem usar classes de credencial separadas/least-privilege;
- rotação deve ocorrer no provider/secret store, sem exigir alteração de código quando o nome/contrato da variável não muda.

## Procedimento

1. Trate suspeita plausível como incidente até provar o contrário. Não replique o valor vazado em issue, PR, chat ou screenshot.
2. Identifique a **classe**, não o valor: runtime database, admin database, provider Vercel/Dev Dashboard, sessão/credencial de usuário ou outro secret.
3. Preserve evidência mínima: onde foi exposto, janela de tempo, release/deployment afetado e quem/qual sistema poderia acessar.
4. Revogue/rotacione no sistema de origem:
   - **runtime DB:** rotacione a credencial/role de runtime no Neon e atualize o secret de Production na Vercel;
   - **admin DB:** rotacione a credencial usada em `.dev-dashboard/.env.production.local` e atualize somente o armazenamento administrativo local autorizado;
   - **provider:** revogue o token/credencial no provider e atualize a conexão segura do Dev Dashboard;
   - **cookie/token individual:** revogue a sessão correspondente quando identificável sem expor o token.
5. Se um secret de runtime mudou, force nova configuração/deployment conforme o provider exigir e valide:

   ```bash
   pnpm prod:verify
   ```

6. Busque uso suspeito no período usando metadata segura, sem adicionar o secret às consultas/logs.
7. Se o valor entrou no Git, considere-o comprometido mesmo após remoção; rotacione primeiro. Limpeza de histórico é medida adicional, não substitui revogação.

## Sinais de sucesso

- credencial antiga está revogada;
- nova credencial fica apenas no secret store apropriado;
- runtime/readiness continuam saudáveis;
- não foi necessário editar código para trocar o valor;
- investigação não propagou o secret para novos sistemas.

## Sinais de falha

- credencial antiga continua válida “por segurança”;
- runtime passa a usar credencial administrativa;
- valor rotacionado aparece em commit, issue ou log;
- recuperação depende de esconder o vazamento sem revogar acesso.

## Critérios de decisão

- **Possível exposição externa:** rotacione imediatamente.
- **Credencial administrativa:** prioridade máxima e revisão de operações executadas no período.
- **Acesso indevido confirmado:** amplie para incidente de segurança/dados e preserve evidência antes de limpeza.

## Recuperação

Depois da rotação, valide Production, revise least privilege da classe afetada e registre causa/follow-up sem o valor secreto. Se houver impacto em dados, siga [`data-corruption.md`](data-corruption.md).

## Escalonamento

Escale imediatamente para credencial administrativa/provider, acesso indevido, exposição pública, impossibilidade de revogar rapidamente ou suspeita de exfiltração de dados.
