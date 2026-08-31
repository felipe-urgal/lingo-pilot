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

## 5. Sessão

A implementação de auth deve usar cookies/headers seguros conforme arquitetura escolhida, com:

- `HttpOnly` quando cookie;
- `Secure` em produção;
- proteção CSRF conforme mecanismo;
- expiração e revogação;
- rotação conforme provider;
- nenhuma credencial persistida em localStorage quando houver alternativa segura.

## 6. Input validation

Toda fronteira valida payload:

- forms;
- API/server actions;
- content files;
- webhooks;
- AI responses;
- upload metadata.

Validação de tipo não substitui autorização.

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
- texto completo de writing;
- prompt do usuário contendo PII;
- transcript completo;
- áudio;
- payload completo de providers.

Logs podem usar IDs e categorias de erro.

## 11. Secrets

- `.env.example` contém nomes, nunca valores reais;
- secrets em secret manager/hosting;
- rotação em caso de exposição;
- princípio de least privilege;
- ambientes separados quando possível.

## 12. Banco

- conexão cifrada em produção;
- credenciais separadas por ambiente;
- backups;
- restore testado antes de confiar no backup;
- migrations revisadas;
- queries sempre filtradas por ownership quando aplicável.

## 13. Rate limits e abuso

Priorizar limites em:

- login;
- recuperação de conta;
- endpoints de IA;
- upload/transcrição;
- geração de conteúdo;
- ações caras.

Rate limit não substitui autorização.

## 14. Segurança de frontend

- evitar `dangerouslySetInnerHTML` para conteúdo não confiável;
- sanitizar rich text quando necessário;
- CSP quando arquitetura estabilizar;
- dependências auditadas;
- links externos seguros;
- nenhuma chave secreta em bundle cliente.

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

## 19. Incidentes

Antes de produto público, criar runbook para:

- credencial vazada;
- acesso indevido;
- provider comprometido;
- perda/corrupção de dados;
- exposição de mídia;
- dependency vulnerability crítica.

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
