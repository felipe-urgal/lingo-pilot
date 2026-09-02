# ADR 0003 — Sessão first-party atrás de AuthAdapter

- **Status:** Accepted
- **Data:** 2026-09-02
- **Decisão:** credenciais e sessões first-party em PostgreSQL atrás de um `AuthAdapter`, sem provider SaaS na Foundation

## Contexto

A issue #11 precisa entregar identidade server-side, login/logout, shell privado e autorização por ownership sem acoplar o domínio a um SDK de autenticação.

A arquitetura também exige que autenticação estrutural seja registrada em ADR.

As alternativas consideradas foram:

1. adotar imediatamente um provider SaaS/SDK de auth;
2. usar sessão stateless/JWT própria;
3. usar credenciais + sessão opaca server-side em PostgreSQL atrás de adapter;
4. adiar autenticação real e usar apenas usuário sintético/test mode.

## Decisão

Adotar a opção 3 para a Foundation.

```text
Delivery / Next.js
      ↓
   AuthAdapter
      ↓
PostgresAuthAdapter
      ↓
PostgreSQL
```

O adapter expõe somente operações de autenticar credenciais, resolver sessão e revogar sessão. O domínio não conhece cookie, senha, token, Next.js, Drizzle ou provider.

## Credenciais

- login inicial por email + senha;
- email canônico em lowercase;
- senha protegida por scrypt com salt aleatório;
- work factor inicial `N=2^17, r=8, p=1`;
- formato persistido versionável contém algoritmo/parâmetros;
- senha em texto puro nunca é persistida ou logada.

## Sessões

- token opaco de 32 bytes aleatórios;
- somente o hash SHA-256 do token é persistido;
- cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção e `Path=/`;
- TTL inicial de 30 dias;
- expiração e revogação validadas no servidor;
- logout revoga a sessão persistida;
- nenhuma credencial/token em `localStorage`.

## CSRF

Login e logout por POST exigem `Origin` igual ao origin canônico da aplicação. O controle atua em conjunto com `SameSite=Lax`.

## Por que não provider SaaS agora

A Foundation ainda não validou onboarding, recuperação de conta, MFA, requisitos de identidade social ou necessidades operacionais que justifiquem lock-in/provider específico.

Adicionar um SDK agora aumentaria configuração, secrets e coupling antes de existir requisito concreto. O `AuthAdapter` preserva a opção de substituir a implementação quando houver evidência.

## Por que não JWT stateless

A baseline precisa de revogação simples, expiração verificável e logout server-side. Uma sessão opaca persistida torna esse contrato direto e evita colocar claims de autorização em token cliente.

Ownership continua sendo consultado no servidor; possuir uma sessão não concede acesso a qualquer recurso arbitrário.

## Por que não usuário sintético

Test mode não atende o critério de que usuário não autenticado fique fora da área privada nem prova lifecycle real de sessão. A baseline deve exercitar o mesmo mecanismo de identidade que a aplicação usará.

## Consequências positivas

- zero provider externo adicional;
- domínio permanece independente;
- sessão pode ser revogada imediatamente;
- token bruto não fica no banco;
- ownership recebe identidade resolvida no servidor;
- testes podem usar PostgreSQL real e dados sintéticos;
- substituição futura do provider fica atrás do adapter.

## Consequências e riscos

- o projeto assume responsabilidade pelo lifecycle de credenciais;
- password reset, MFA e verificação de email ainda não existem;
- rate limit distribuído de login ainda precisa ser implementado antes de exposição pública;
- work factors de senha precisam de revisão periódica;
- eventual migração para provider externo exige estratégia de contas/sessões existentes.

## Mitigações

- algoritmo/parâmetros ficam codificados no hash persistido;
- erros de login são genéricos;
- cookie é server-only;
- logs não recebem credenciais/tokens;
- produção permanece fail-closed até hardening operacional;
- mudanças de provider ou política de credenciais exigem ADR/revisão de segurança.

## Escopo deliberadamente fora

- signup público;
- social login;
- magic link;
- MFA;
- password reset;
- organizações/roles;
- autorização por UI.

Signup/onboarding pertence à #17. Export/delete lifecycle completo pertence à #43.

## Referências internas

- issue #11
- issue #17
- issue #43
- `docs/AUTHENTICATION.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/QUALITY_STRATEGY.md`
