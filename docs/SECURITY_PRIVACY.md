# Segurança & Privacidade — LingoPilot

## 1. Objetivo

Segurança e privacidade são requisitos de produto. O LingoPilot armazenará progresso educacional e poderá processar texto e áudio do usuário; portanto, minimização, autorização e retenção precisam existir desde a base.

## 2. Princípios

- coletar apenas o necessário;
- acesso mínimo;
- negar por padrão;
- autorização por recurso;
- secrets fora do código;
- dados sensíveis fora de logs;
- retenção explícita;
- exclusão e exportação planejadas;
- providers externos recebem somente contexto necessário.

## 3. Classificação de dados

### Público/editorial

- conteúdo de curso publicado;
- assets públicos do curso;
- documentação.

### Interno operacional

- métricas agregadas;
- IDs técnicos;
- logs sem conteúdo do usuário.

### Dados pessoais

- email/identidade;
- timezone;
- configurações de perfil;
- histórico individual de estudo.

### Conteúdo potencialmente sensível

- textos livres escritos pelo usuário;
- mensagens de tutor;
- transcripts;
- gravações de speaking.

Esses dados exigem minimização especial e nunca devem ser logados por default.

## 4. Autenticação e autorização

Autenticação responde “quem é?”. Autorização responde “pode acessar este recurso?”.

Toda operação de dados do aluno deve validar ownership no servidor.

Proibido confiar apenas em:

- esconder botão na UI;
- ID enviado pelo cliente;
- route param;
- autenticação sem filtro por usuário.

A baseline da #11 usa um `AuthAdapter` server-side com implementação PostgreSQL. O domínio não depende do mecanismo de sessão nem de SDK de auth. A #17 estende essa baseline com criação de conta first-party e onboarding autenticado, reutilizando os mesmos contratos de credencial, sessão, origin e ownership. O contrato completo está em `AUTHENTICATION.md` e a decisão estrutural em `ADR/0003-first-party-auth-session.md`.

## 5. Sessão e primeiro acesso

A implementação de auth deve usar cookies/headers seguros conforme arquitetura escolhida, com:

- `HttpOnly` quando cookie;
- `Secure` em produção;
- proteção CSRF conforme mecanismo;
- expiração e revogação;
- rotação conforme provider;
- nenhuma credencial persistida em localStorage quando houver alternativa segura.

### Baseline da #11

A sessão inicial é opaca e server-side:

- cookie `lingo_session` com `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção;
- token aleatório de 32 bytes no cookie;
- somente SHA-256 do token aleatório é persistido no banco;
- TTL inicial de 30 dias;
- `expires_at` e `revoked_at` são validados no servidor;
- logout revoga a sessão persistida;
- POSTs de login/logout exigem `Origin` igual ao origin canônico da aplicação.

SHA-256 não é usado para senha. Senhas usam `scrypt` com salt aleatório e parâmetros registrados no hash. O baseline atual é `N=2^17`, `r=8`, `p=1`.

Password reset, MFA e social login continuam fora desta baseline e não devem ser improvisados em features consumidoras.

### Extensão da #17

A #17 é a feature dona do primeiro acesso e adiciona signup first-party deliberadamente, sem provider novo e sem criar uma segunda estratégia de sessão:

- `/signup` aceita somente email + senha segundo as regras já usadas pelo login;
- criação de `users + auth_credentials` ocorre em uma única transação;
- conflito de email retorna mensagem genérica e não confirma existência de conta;
- senha continua existindo apenas durante a request e somente seu hash `scrypt` é persistido;
- após criar a conta, o mesmo `AuthAdapter` autentica e emite a sessão server-side normal;
- POST de signup e POST de onboarding exigem `Origin` igual ao origin canônico;
- redirects de auth/onboarding usam a origem canônica configurada, preservando o cookie host-only;
- onboarding persiste apenas preferências/jornada necessárias e não recebe senha novamente.

Essa extensão não cria nova categoria de PII além das já previstas neste documento: identidade/email, timezone e configurações de perfil. A liberação para exposição pública ampla continua condicionada a rate limit adequado à topologia serverless.

## 6. Input validation

Toda fronteira valida payload:

- forms;
- API/server actions;
- content files;
- webhooks;
- AI responses;
- upload metadata.

Validação de tipo não substitui autorização.

No login/signup, email é normalizado/canonicalizado e mensagens de erro não devem revelar credencial ou confirmar desnecessariamente a existência da conta. Password/token nunca devem aparecer em mensagens de erro.

## 7. Upload de áudio

Speaking requer controles específicos:

- tipos MIME allowlisted;
- tamanho máximo;
- duração máxima;
- filename não confiável;
- storage key gerada pelo servidor;
- upload signed/presigned quando aplicável;
- bucket privado por default;
- URL temporária para leitura;
- exclusão conforme política;
- não servir conteúdo arbitrário como HTML executável.

## 8. Retenção de áudio

Política recomendada para V1:

- áudio bruto é temporário por default;
- manter apenas o tempo necessário para transcrição/feedback, salvo opção explícita de histórico;
- transcript pode ter retenção separada;
- usuário deve poder excluir tentativa quando política permitir;
- jobs de limpeza precisam de observabilidade.

A política final deve ser confirmada antes de speaking em produção.

## 9. IA e providers externos

Antes de enviar dados:

- remover email/nome quando desnecessário;
- enviar somente contexto pedagógico necessário;
- não enviar histórico inteiro se resumo é suficiente;
- documentar categoria de dado enviada;
- manter configuração de provider centralizada;
- revisar retenção do provider escolhido.

## 10. Logging

Nunca logar por default:

- tokens;
- cookies;
- authorization headers;
- senhas;
- password hashes;
- hashes de sessão usados como credencial técnica;
- payload completo de login/signup/onboarding;
- texto completo de writing;
- prompt do usuário contendo PII;
- transcript completo;
- áudio;
- payload completo de providers.

Logs podem usar IDs e categorias de erro. Email também deve ser evitado quando um ID técnico for suficiente. A conclusão do onboarding pode registrar somente escolhas categóricas estruturadas necessárias para operação/analytics, como entry point, `placementSource` e objetivo, sem email ou payload completo.

## 11. Secrets e classes de privilégio

- `.env.example` contém nomes, nunca valores reais;
- secrets ficam em secret manager/hosting/configuração administrativa local protegida;
- rotação é obrigatória em caso de exposição;
- princípio de least privilege;
- ambientes separados quando possível.

Em Production, mantenha separadas pelo menos estas classes:

- **runtime DB:** somente privilégio necessário para a aplicação, usando conexão pooled apropriada;
- **migration/backup DB:** credencial administrativa direta, fora do runtime Vercel;
- **provider deployment:** credencial/conexão do Dev Dashboard com a Vercel, fora do repositório.

Uma rotação de valor não deve exigir editar código quando o contrato/nome do secret permanece o mesmo. Procedimento: [`runbooks/leaked-secret.md`](runbooks/leaked-secret.md).

## 12. Banco

- conexão cifrada em produção;
- credenciais separadas por ambiente;
- backups;
- restore testado antes de confiar no backup;
- migrations revisadas;
- queries sempre filtradas por ownership quando aplicável.

Credenciais e sessões de auth ficam separadas dos recursos pedagógicos. FK para `users` propaga exclusão de credenciais/sessões e, a partir da #17, também dos perfis/jornada inicial vinculados. O workflow completo de account deletion continua pertencendo à #43.

Backup/restore de emergência deve preservar evidência, validar o artefato fora de Production e considerar impacto de retenção/LGPD antes de cutover. Veja [`runbooks/backup-restore.md`](runbooks/backup-restore.md) e [`runbooks/data-corruption.md`](runbooks/data-corruption.md).

## 13. Rate limits e abuso

Priorizar limites em:

- login;
- signup;
- recuperação de conta;
- endpoints de IA;
- upload/transcrição;
- geração de conteúdo;
- ações caras.

Rate limit não substitui autorização.

Para login/signup, um limiter em memória por instância não é considerado garantia suficiente na topologia serverless alvo. Rate limit distribuído/adequado ao runtime é obrigatório antes de exposição pública ampla. Até essa liberação, a existência técnica das rotas de primeiro acesso não deve ser tratada como autorização para divulgação/abertura do produto a tráfego irrestrito.

## 14. Segurança de frontend

- evitar `dangerouslySetInnerHTML` para conteúdo não confiável;
- sanitizar rich text quando necessário;
- CSP quando arquitetura estabilizar;
- dependências auditadas;
- links externos seguros;
- nenhuma chave secreta em bundle cliente;
- autenticação/autorização nunca depende apenas de esconder UI.

## 15. LGPD — princípios de produto

Sem substituir análise jurídica formal, o produto deve suportar tecnicamente:

- transparência de uso;
- minimização;
- finalidade;
- acesso/exportação;
- correção de perfil;
- exclusão quando aplicável;
- retenção definida;
- registro de providers/subprocessadores relevantes.

## 16. Exportação

Planejar export de:

- perfil;
- progresso;
- histórico de sessões;
- attempts relevantes;
- reviews;
- tutor history quando retido.

Formato deve ser legível e/ou estruturado.

## 17. Exclusão de conta

Exclusão precisa de workflow explícito:

1. autenticar intenção;
2. confirmar escopo;
3. revogar sessão;
4. apagar/anonymizar dados conforme política;
5. remover mídia;
6. propagar para jobs/providers quando aplicável;
7. registrar conclusão sem manter conteúdo excluído.

## 18. Threat model mínimo por feature

Para features críticas, responder no PR:

- qual dado entra?
- quem pode acessá-lo?
- onde é persistido?
- quem externo recebe?
- o que acontece se request for repetido?
- um usuário consegue apontar ID de outro?
- existe upload ou conteúdo executável?
- que dado aparece em logs?
- como é apagado?

A #11 documenta a baseline de auth em `AUTHENTICATION.md`; a #17 estende o mesmo documento com signup, onboarding, ownership da jornada e minimização de logs.

## 19. Incidentes

Procedimentos operacionais atuais:

- credencial vazada: [`runbooks/leaked-secret.md`](runbooks/leaked-secret.md);
- suspeita/corrupção de dados: [`runbooks/data-corruption.md`](runbooks/data-corruption.md);
- auth indisponível: [`runbooks/auth-outage.md`](runbooks/auth-outage.md);
- banco indisponível: [`runbooks/database-outage.md`](runbooks/database-outage.md);
- backup/restore: [`runbooks/backup-restore.md`](runbooks/backup-restore.md).

Regras de resposta:

- preservar evidência antes de repetir mutação de efeito parcial/ambíguo;
- nunca colocar secret/PII/dump na evidência compartilhada;
- rotacionar credencial no sistema de origem e atualizar secret store, não código;
- tratar acesso indevido confirmado como incidente de segurança, mesmo que a disponibilidade já tenha voltado;
- registrar commit/deployment/requestId/errorCode seguros para correlação.

Runbooks de provider de IA e storage só serão adicionados quando essas capabilities existirem. Exposição de mídia e dependency vulnerability crítica deverão ganhar procedimento específico quando o risco/capability correspondente entrar em Production.

## 20. Revisão obrigatória

Qualquer PR que introduza:

- novo provider;
- nova categoria de PII;
- upload;
- compartilhamento;
- export;
- delete;
- auth;
- autorização;
- armazenamento de áudio;

precisa atualizar este documento ou explicar por que não há mudança de política.

## Dados de prática e revisão

`ActivityAttempt.answer` é dado do learner e pode conter texto em short-answer/translation. O payload completo não entra em logs/telemetria por padrão. Ownership é derivado da jornada autenticada, nunca de IDs enviados pelo browser. Attempts, ReviewEvents e ConceptEvidence compõem histórico pedagógico; nenhum provider externo recebe respostas nesta vertical determinística.
