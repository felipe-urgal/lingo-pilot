# LingoPilot

> Seu caminho diário para aprender um idioma.

LingoPilot é uma plataforma pessoal de aprendizado de idiomas orientada por progresso. A proposta central é simples: o aluno não precisa decidir o que estudar a cada dia. O sistema organiza a sessão diária, ensina conteúdo novo, revisa o que está prestes a ser esquecido, mede desempenho e adapta os próximos passos.

O primeiro recorte do produto é **Português (Brasil) → Inglês**, começando em **A0 absoluto** e avançando por **A1 e A2**. A arquitetura, porém, nasce preparada para novos idiomas e níveis sem transformar o domínio em um conjunto de exceções.

## Princípios do produto

1. **Hoje é a tela principal.** O produto deve responder imediatamente: “o que eu estudo agora?”.
2. **Progressão antes de quantidade.** Conteúdo só entra quando os pré-requisitos foram cumpridos.
3. **Prática ativa.** Ler uma explicação não é suficiente; toda aprendizagem precisa gerar recuperação, produção e revisão.
4. **Revisão inteligente.** O sistema deve trazer de volta o que o aluno está prestes a esquecer.
5. **IA com limites pedagógicos.** O tutor conhece o que o aluno já estudou e evita pular a progressão sem motivo.
6. **Simplicidade operacional.** A experiência deve ser rápida, clara e sem decisões desnecessárias para o aluno.
7. **Qualidade mensurável.** Conteúdo, software e respostas de IA precisam de validação, testes e critérios explícitos.

## Escopo inicial

A primeira versão do LingoPilot deve permitir:

- onboarding do aluno e configuração da meta diária;
- trilha estruturada A0 → A1 → A2;
- sessão “Hoje” montada automaticamente;
- aulas visuais e progressivas;
- exercícios objetivos e de produção;
- flashcards com repetição espaçada;
- listening com diálogos graduados;
- speaking com gravação e feedback;
- leitura e escrita graduadas;
- progresso, domínio por habilidade e histórico;
- tutor de IA restrito ao conteúdo já aprendido;
- geração de prática adaptativa a partir dos erros recorrentes.

## Arquitetura

O projeto começa como **monólito modular**, não como microserviços. O objetivo é manter velocidade de desenvolvimento com limites de domínio claros e possibilidade de extração futura somente quando houver necessidade comprovada.

Estrutura planejada:

```text
apps/
  web/                  # aplicação Next.js
packages/
  domain/               # regras de negócio puras
  learning/             # scheduler, mastery, SRS e sessão diária
  content/              # schemas e validação de conteúdo
  db/                   # PostgreSQL, migrations e repositories
  ai/                   # interfaces, prompts, guardrails e avaliações
  ui/                   # design system compartilhado
  config/               # TypeScript, lint e tooling compartilhado
docs/
  ADR/                   # decisões arquiteturais
```

A visão detalhada está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Produção

A topologia inicial aprovada é **Next.js na Vercel + PostgreSQL no Neon**, com `main` como branch de produção, promoção Git-managed e migrations explícitas fora do build da Vercel.

Princípios importantes:

- release identificada por commit SHA;
- CI/Preview isolados de production;
- schema compatível antes do código que depende dele;
- health/readiness da aplicação separados do estado do provider;
- backup só é considerado confiável depois de restore testado;
- rollback de aplicação só ocorre após verificar compatibilidade com migrations já aplicadas;
- integração futura com o Dev Dashboard usa provider Vercel, sem criar `prod:deploy` artificial.

Contrato completo: [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md).  
Decisão arquitetural: [`docs/ADR/0002-production-deployment-topology.md`](docs/ADR/0002-production-deployment-topology.md).

## Roadmap

O desenvolvimento está dividido em cinco etapas:

- **Fase 0 — Foundation:** qualidade, arquitetura, CI, design system e modelos de domínio.
- **Fase 1 — Study Engine:** onboarding, conteúdo, sessão diária, aulas, exercícios, SRS e progresso.
- **Fase 2 — Skills:** listening, speaking, reading e writing.
- **Fase 3 — AI Tutor:** tutor contextual, correções adaptativas, geração de prática e avaliações.
- **Fase 4 — Product Hardening:** segurança, observabilidade, dados, performance e experiência offline/PWA.
- **Fase 5 — Language Platform:** abstração de idioma, novos cursos e preparação para produto público.

Veja [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Desenvolvimento

Antes de alterar código, leia obrigatoriamente:

- [`AGENTS.md`](AGENTS.md) — contrato operacional para agentes de IA e desenvolvedores;
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — workflow de contribuição;
- [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) — contrato de ambiente/portas locais;
- [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md) — processo de desenvolvimento e revisão;
- [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md) — critérios mínimos para considerar trabalho concluído;
- [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) — contrato de deploy, migration, backup e recovery quando a mudança toca produção.

### Regra principal

**Nenhuma funcionalidade é considerada pronta apenas porque funciona localmente.** Ela precisa estar coerente com o domínio, testada no nível adequado, revisada, observável quando necessário e documentada.

## Documentação principal

- [Visão do produto](docs/VISION.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Ambiente local](docs/LOCAL_DEVELOPMENT.md)
- [Deploy e operações de produção](docs/PRODUCTION_DEPLOYMENT.md)
- [Modelo de domínio](docs/DOMAIN_MODEL.md)
- [Learning Engine](docs/LEARNING_ENGINE.md)
- [Modelo de conteúdo](docs/CONTENT_MODEL.md)
- [UX e Design](docs/UX_AND_DESIGN.md)
- [Tutor de IA](docs/AI_TUTOR.md)
- [Segurança e privacidade](docs/SECURITY_PRIVACY.md)
- [Estratégia de qualidade](docs/QUALITY_STRATEGY.md)
- [Observabilidade](docs/OBSERVABILITY.md)
- [Workflow de desenvolvimento](docs/DEVELOPMENT_WORKFLOW.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)

## Estado do repositório

O repositório está em fase de fundação. As primeiras issues definem arquitetura, bootstrap técnico, design system e implementação da V1. Código de produção só deve começar após a base de qualidade e os contratos principais estarem estabelecidos.
