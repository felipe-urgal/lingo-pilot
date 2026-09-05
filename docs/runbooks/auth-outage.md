# Runbook — indisponibilidade de autenticação

## Pré-condições

- auth é first-party e server-side, com sessão persistida no PostgreSQL;
- cookie `lingo_session` é `HttpOnly`, `SameSite=Lax`, host-only e `Secure` em produção;
- o banco armazena hash do token de sessão, não o token bruto;
- email, senha, cookie, token e hash de sessão não entram em logs do incidente.

## Procedimento

1. Classifique o sintoma: signup, login, resolução de sessão, logout ou todos os fluxos autenticados.
2. Confirme primeiro liveness/readiness do core e o estado do banco. Se readiness está `503`, siga [`database-outage.md`](database-outage.md) antes de assumir bug de auth.
3. Registre somente horário UTC, release/deployment, rota/useCase, status code, errorCode e requestId seguro.
4. Compare com o deployment anterior e mudanças recentes de origin/cookie/runtime sem imprimir valores secretos.
5. Verifique se o domínio/origin canônico e flags de cookie correspondem ao ambiente Production.
6. Se sessões existentes funcionam mas login/signup falham, isole o caminho de credencial/Origin sem revogar sessões saudáveis.
7. Se todas as sessões falham após mudança de runtime, avalie rollback de app apenas se schema atual for compatível.
8. Após correção, valide com identidade sintética/controlada: login, request autenticada, refresh e logout.

## Sinais de sucesso

- usuário sintético consegue autenticar e manter sessão entre requests;
- logout revoga sessão esperada;
- não há exposição de credencial/PII nos logs;
- readiness e banco permanecem saudáveis.

## Sinais de falha

- diagnóstico depende de copiar cookie/token/email/senha para logs;
- auth só volta ao usar credencial administrativa do banco no runtime;
- sessões são revogadas em massa sem causa/decisão explícita;
- erro de banco é mascarado como incidente exclusivo de auth.

## Critérios de decisão

- **DB indisponível:** tratar dependência primeiro.
- **Regressão de aplicação com schema compatível:** rollback do provider pode ser apropriado.
- **Credencial/secret comprometido:** siga [`leaked-secret.md`](leaked-secret.md).
- **Suspeita de acesso indevido:** preserve evidência e trate como incidente de segurança, não apenas disponibilidade.

## Recuperação

Após correção/rollback seguro, execute smoke autenticado com conta sintética e monitore códigos de auth/5xx. Não use contas ou credenciais reais em evidência compartilhada.

## Escalonamento

Escale em suspeita de takeover/acesso indevido, necessidade de revogação ampla de sessões, vazamento de credencial, corrupção da tabela de sessões/credenciais ou impossibilidade de separar falha de app e banco.
