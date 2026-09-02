# Autenticação e autorização — LingoPilot

Este documento é o contrato técnico da baseline introduzida pela issue #11 e estendida pelo primeiro acesso da #17. Ele complementa `SECURITY_PRIVACY.md`, `ARCHITECTURE.md` e `DATABASE.md`.

## 1. Objetivo

A aplicação precisa resolver duas coisas separadas:

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

Nenhum provider SaaS de autenticação foi introduzido. Se um provider externo substituir o adapter no futuro, o contrato de identidade e autorização deve permanecer estável e a mudança estrutural exige revisão/ADR.

## 3. Credenciais

A aplicação suporta email + senha para login e criação de conta first-party.

- email é normalizado com `trim()` + lowercase antes da consulta/persistência;
- `auth_credentials.email` é único e possui constraint de formato canônico no banco;
- senha em texto puro nunca é persistida;
- hash usa `scrypt` com salt aleatório por credencial;
- parâmetros atuais: `N=2^17`, `r=8`, `p=1`, chave derivada de 64 bytes;
- o formato persistido inclui algoritmo e work factors para permitir upgrade futuro;
- comparação usa `timingSafeEqual`;
- erros de login não distinguem email inexistente de senha incorreta;
- conflito de signup retorna mensagem genérica de conta indisponível, sem confirmar se o email já existe.

A escolha de parâmetros segue a baseline atual do OWASP Password Storage Cheat Sheet para scrypt quando Argon2id não está disponível na stack padrão do Node.

## 4. Criação de conta e primeiro acesso

A #17 adiciona `/signup` como fluxo first-party mínimo para cumprir a jornada de primeiro acesso.

Persistência:

```text
signup
  ↓
transaction: users + auth_credentials
  ↓
autenticação pelo mesmo AuthAdapter
  ↓
sessão server-side
  ↓
/app/onboarding
```

A criação de `users + auth_credentials` é transacional. Se email/user colidir, a transação inteira falha e o usuário recebe uma resposta genérica. Após persistir a conta, o fluxo autentica pelas mesmas regras do login e cria uma sessão normal; não existe caminho paralelo de sessão para signup.

O onboarding pedagógico acontece **depois** de existir uma identidade autenticada e possui sua própria transação para `LearnerProfile + LanguageProfile + Enrollment`. Isso mantém auth e jornada separados.

Fixtures de teste usam somente dados sintéticos.

## 5. Sessão

Login/signup bem-sucedido cria uma sessão server-side:

- token opaco gerado com 32 bytes criptograficamente aleatórios;
- token bruto existe somente no cookie do cliente durante a sessão;
- PostgreSQL guarda apenas SHA-256 do token;
- sessão possui `expires_at`, `revoked_at` e vínculo com `user_id`;
- TTL inicial: 30 dias;
- sessão expirada ou revogada resolve como não autenticada;
- logout revoga a sessão no banco antes de expirar o cookie.

SHA-256 é usado aqui para lookup de um token aleatório de alta entropia, **não** para armazenamento de senha.

## 6. Cookie, origin e redirects

Cookie canônico: `lingo_session`.

Configuração:

- `HttpOnly=true`;
- `SameSite=Lax`;
- `Path=/`;
- `Secure=true` em produção;
- não usa `localStorage`;
- expiração acompanha a sessão server-side.

POSTs de login/logout/signup exigem `Origin` igual ao origin canônico da aplicação. O POST de onboarding autenticado segue a mesma regra. Isso complementa `SameSite=Lax` para a baseline de CSRF desses forms.

Redirects server-side de auth/onboarding são construídos a partir de `serverConfig.public.appUrl`, nunca de um hostname implícito do runtime/proxy. Isso preserva o cookie host-only e evita troca acidental entre `127.0.0.1`, `localhost` ou hostnames internos do provider.

## 7. Resolução de identidade

Server Components usam `getCurrentUser()` / `requireCurrentUser()`.

- `getCurrentUser()` retorna identidade ou `null`;
- `requireCurrentUser()` redireciona não autenticados para `/login`;
- `/app` é protegido no layout do servidor;
- `/` decide entre `/login` e `/app` a partir da sessão no servidor;
- `/app` direciona usuário sem jornada para `/app/onboarding` e usuário com jornada para `/app/today`.

APIs não usam redirect como contrato genérico de erro de autorização:

- sem sessão válida em API de recurso → `401 { error: "unauthorized" }`;
- sessão válida sem ownership → `403 { error: "forbidden" }`.

Forms browser-first de auth/onboarding podem redirecionar para a tela apropriada após sucesso/erro validado.

## 8. Ownership

A fixture de autorização existe para fixar o padrão que features futuras devem copiar.

Leitura e escrita recebem a identidade resolvida no servidor e filtram na própria query:

```text
resource.id = request resourceId
AND
resource.owner_id = authenticated userId
```

O servidor nunca aceita `ownerId` enviado pelo cliente como prova de acesso.

A jornada da #17 segue o mesmo princípio: repository busca `LearnerProfile/LanguageProfile/Enrollment` pelo `userId` resolvido da sessão. O cliente não envia um `userId` confiável para selecionar jornada.

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
- payload completo de login/signup/onboarding;
- email quando não for estritamente necessário para diagnóstico autorizado.

A conclusão do onboarding registra apenas categorias seguras, como `entryPointLevel`, `placementSource` e `primaryGoal` estruturado, além de códigos técnicos/correlation ID já previstos pela observabilidade.

## 10. Testes mínimos

A baseline permanente cobre:

- normalização/validação de credenciais;
- hashing e verificação de senha;
- configuração segura do cookie por profile;
- geração/hash de token opaco;
- migration de tabelas de auth;
- unicidade/canonicalização de email;
- sessão ativa, expirada e revogada;
- usuário A não lê nem escreve recurso de B;
- criação transacional da conta usada pelo signup;
- E2E signup → onboarding;
- E2E logout → login → retorno ao onboarding;
- redirects no origin canônico, protegendo continuidade do cookie de sessão.

Os E2E rodam em `127.0.0.1:5401` com banco de teste isolado e fazem parte do CI permanente.

## 11. Rate limit e abuso

Rate limit de login/signup é obrigatório antes de exposição pública ampla, conforme `SECURITY_PRIVACY.md`.

Nem a #11 nem a #17 adicionam um limiter em memória porque a topologia alvo é serverless e isso criaria uma garantia falsa entre instâncias. A implementação de hardening deve usar um mecanismo distribuído/adequado ao runtime escolhido antes de tráfego real não controlado. A existência do fluxo `/signup` não revoga esse requisito operacional.

## 12. Threat model da baseline atual

- **Dado que entra:** email, senha, token de sessão, preferências estruturadas de onboarding, resource ID e valor da fixture.
- **Quem acessa:** código server-side de auth/persistência; senha só existe durante a request.
- **Persistência:** email + password hash, sessão com token hash, ownership por `owner_id`, learner journey ligada ao usuário autenticado.
- **Provider externo:** nenhum para auth.
- **Retry:** login pode criar nova sessão; logout é idempotente do ponto de vista de acesso; signup é transacional e conflito não deixa usuário parcial; onboarding é idempotente por constraints/repository.
- **ID de outro usuário:** ownership/journey usam identidade resolvida no servidor.
- **Upload/conteúdo executável:** não aplicável.
- **Logs:** sem credenciais, cookies, tokens ou payload livre de onboarding.
- **Exclusão:** sessões/credenciais e jornada usam FKs apropriadas; workflow de exclusão integral será fechado pela #43.

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
- exposição pública ampla sem rate limit adequado.
