# Autenticação e autorização — LingoPilot

Este documento é o contrato técnico da baseline introduzida pela issue #11. Ele complementa `SECURITY_PRIVACY.md`, `ARCHITECTURE.md` e `DATABASE.md`.

## 1. Objetivo

A Foundation precisa resolver duas coisas separadas:

1. **autenticação** — identificar quem está fazendo a request;
2. **autorização** — garantir no servidor que essa identidade pode acessar o recurso solicitado.

Esconder UI, confiar em route params ou receber `userId` do cliente nunca substitui autorização.

## 2. Decisão da Foundation

A baseline usa um adapter de autenticação próprio e substituível:

```text
Next.js delivery
   ↓
AuthAdapter
   ↓
PostgresAuthAdapter
   ↓
@lingo-pilot/db / PostgreSQL
```

O domínio não importa Next.js, código de sessão, PostgreSQL nem SDK de auth. A decisão estrutural está registrada em `docs/ADR/0003-first-party-auth-session.md`.

Nenhum provider SaaS de autenticação foi introduzido nesta etapa. Se um provider externo substituir o adapter no futuro, o contrato de identidade e autorização deve permanecer estável e a mudança estrutural exige revisão/ADR.

## 3. Credenciais

A baseline suporta login por email + senha para uma conta já persistida.

- email é normalizado com `trim()` + lowercase antes da consulta;
- `auth_credentials.email` é único e possui constraint de formato canônico no banco;
- senha em texto puro nunca é persistida;
- hash usa `scrypt` com salt aleatório por credencial;
- parâmetros atuais: `N=2^17`, `r=8`, `p=1`, chave derivada de 64 bytes;
- o formato persistido inclui algoritmo e work factors para permitir upgrade futuro;
- comparação usa `timingSafeEqual`;
- erros de login não distinguem email inexistente de senha incorreta.

A escolha de parâmetros segue a baseline atual do OWASP Password Storage Cheat Sheet para scrypt quando Argon2id não está disponível na stack padrão do Node.

## 4. Criação de conta

Signup/onboarding não pertence à #11.

A Foundation fornece persistência e hashing necessários para credenciais, mas não cria um fluxo público de cadastro improvisado. O onboarding da Fase 1 (#17) deve ser dono da criação de conta/perfil e reutilizar esses contratos ou substituí-los por um adapter aprovado.

Fixtures de teste usam somente dados sintéticos.

## 5. Sessão

Login bem-sucedido cria uma sessão server-side:

- token opaco gerado com 32 bytes criptograficamente aleatórios;
- token bruto existe somente no cookie do cliente durante a sessão;
- PostgreSQL guarda apenas SHA-256 do token;
- sessão possui `expires_at`, `revoked_at` e vínculo com `user_id`;
- TTL inicial: 30 dias;
- sessão expirada ou revogada resolve como não autenticada;
- logout revoga a sessão no banco antes de expirar o cookie.

SHA-256 é usado aqui para lookup de um token aleatório de alta entropia, **não** para armazenamento de senha.

## 6. Cookie

Cookie canônico: `lingo_session`.

Configuração:

- `HttpOnly=true`;
- `SameSite=Lax`;
- `Path=/`;
- `Secure=true` em produção;
- não usa `localStorage`;
- expiração acompanha a sessão server-side.

POSTs de login/logout exigem `Origin` igual ao origin canônico da aplicação. Isso complementa `SameSite=Lax` para a baseline de CSRF desses forms.

## 7. Resolução de identidade

Server Components usam `getCurrentUser()` / `requireCurrentUser()`.

- `getCurrentUser()` retorna identidade ou `null`;
- `requireCurrentUser()` redireciona não autenticados para `/login`;
- `/app` é protegido no layout do servidor;
- `/` decide entre `/login` e `/app` a partir da sessão no servidor.

APIs não usam redirect como contrato de erro:

- sem sessão válida → `401 { error: "unauthorized" }`;
- sessão válida sem ownership → `403 { error: "forbidden" }`.

## 8. Ownership

A fixture de autorização existe para fixar o padrão que features futuras devem copiar.

Leitura e escrita recebem a identidade resolvida no servidor e filtram na própria query:

```text
resource.id = request resourceId
AND
resource.owner_id = authenticated userId
```

O servidor nunca aceita `ownerId` enviado pelo cliente como prova de acesso.

A API técnica `/api/ownership/[resourceId]` demonstra o contrato:

- GET autenticado do próprio recurso → sucesso;
- PUT autenticado do próprio recurso → sucesso;
- request sem sessão → 401;
- usuário A apontando para recurso de B → 403;
- update de outro usuário não altera a linha.

## 9. Logging e privacidade

Nunca logar:

- senha;
- password hash;
- cookie de sessão;
- token bruto;
- hash de token como substituto de tracing;
- payload completo de login;
- email quando não for estritamente necessário para diagnóstico autorizado.

Observabilidade deve trabalhar com IDs técnicos/categorias de erro e seguir `SECURITY_PRIVACY.md`.

## 10. Testes mínimos

A baseline cobre:

- normalização/validação de credenciais;
- hashing e verificação de senha;
- configuração segura do cookie por profile;
- geração/hash de token opaco;
- migration de tabelas de auth;
- unicidade/canonicalização de email;
- sessão ativa, expirada e revogada;
- usuário A não lê nem escreve recurso de B.

A infraestrutura E2E completa continua pertencendo à #16. Quando ela estiver disponível, login → shell privado → logout deve entrar como fluxo E2E permanente, conforme `QUALITY_STRATEGY.md`.

## 11. Rate limit e abuso

Rate limit de login é obrigatório antes de exposição pública, conforme `SECURITY_PRIVACY.md`.

A #11 não adiciona um limiter em memória porque a topologia alvo é serverless e isso criaria uma garantia falsa entre instâncias. A implementação deve usar um mecanismo distribuído/adequado ao runtime escolhido quando a aplicação for aberta a tráfego real. Até lá, a produção continua fail-closed pelo Production Contract.

## 12. Threat model da baseline

- **Dado que entra:** email, senha, token de sessão, resource ID e valor da fixture.
- **Quem acessa:** código server-side de auth/persistência; senha só existe durante a request.
- **Persistência:** email + password hash, sessão com token hash, ownership por `owner_id`.
- **Provider externo:** nenhum na baseline.
- **Retry:** login pode criar nova sessão; logout é idempotente do ponto de vista de acesso.
- **ID de outro usuário:** ownership filtra `resourceId + authenticated userId` na query.
- **Upload/conteúdo executável:** não aplicável.
- **Logs:** sem credenciais, cookies ou tokens.
- **Exclusão:** sessões/credenciais possuem FK para `users` com cascade; workflow de exclusão integral será fechado pela #43.

## 13. Evolução

Mudanças que exigem revisão explícita:

- provider externo de auth;
- magic link/social login;
- MFA;
- password reset;
- alteração de algoritmo/work factor;
- sessão stateless/JWT;
- mudança de TTL/rotação;
- roles/organizações;
- exposição pública sem rate limit adequado.
