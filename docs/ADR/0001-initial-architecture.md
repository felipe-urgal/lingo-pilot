# ADR 0001 — Arquitetura inicial do LingoPilot

- **Status:** Accepted
- **Data:** 2026-08-31

## Contexto

O LingoPilot está começando como produto pessoal, mas possui intenção explícita de evoluir para uma plataforma de aprendizado de idiomas. O domínio envolve currículo, sessões diárias, repetição espaçada, mastery, conteúdo versionado, mídia e IA.

A arquitetura precisa permitir evolução sem impor custo operacional prematuro.

## Decisão

Adotar:

1. **monorepo TypeScript**;
2. **monólito modular** como arquitetura de runtime inicial;
3. **Next.js/React** para aplicação web;
4. **PostgreSQL** como fonte de verdade transacional;
5. **Drizzle ORM** para schema/migrations/data access;
6. packages separados para `domain`, `learning`, `content`, `db`, `ai`, `ui` e `config`;
7. integrações externas atrás de interfaces/adapters;
8. conteúdo pedagógico estruturado e versionado como dados;
9. IA fora do caminho crítico determinístico do Study Engine;
10. GitHub Actions como baseline de CI.

A issue de bootstrap fixa versões estáveis e configura a ferramenta escolhida.

## Motivos

### Monólito modular

O maior risco atual é descobrir o domínio correto, não escalar requests. Um deploy único reduz complexidade enquanto packages/módulos preservam fronteiras.

### PostgreSQL

O domínio exige integridade relacional, transações, histórico e consultas analíticas moderadas. PostgreSQL oferece base madura sem exigir múltiplos stores.

### TypeScript end-to-end

Reduz troca de contexto, permite compartilhar contratos de validação e acelera produto pequeno sem impedir extração futura.

### Conteúdo como dados

Evita acoplar currículo à UI e possibilita versionamento, validação, múltiplos idiomas e futuro authoring.

### IA desacoplada

Modelos são não determinísticos, caros e sujeitos a indisponibilidade. O aluno deve conseguir continuar o core study flow sem uma resposta de IA.

## Alternativas consideradas

### Microserviços desde o início

Rejeitado por custo de deploy, tracing, contratos de rede, consistência e operação sem escala/ownership que justifique.

### Backend separado em framework dedicado

Pode ser útil futuramente, mas adiciona runtime/deploy e duplicação de contratos antes de existir necessidade concreta.

### NoSQL como store primário

Rejeitado porque relações e invariantes de progresso são centrais.

### Conteúdo hardcoded em componentes

Rejeitado por inviabilizar versionamento e evolução multi-idioma.

## Consequências positivas

- desenvolvimento rápido;
- testes de domínio isolados;
- um deploy inicial;
- transações simples;
- fronteiras explícitas;
- extração futura possível.

## Consequências negativas

- disciplina é necessária para não transformar monólito em acoplamento indiscriminado;
- build monorepo precisa ser bem configurado;
- algumas features assíncronas poderão exigir infraestrutura posterior.

## Regras de revisão

Esta decisão deve ser revisitada somente com evidência concreta, por exemplo:

- processamento de áudio exige worker isolado;
- escala independente comprovada;
- requisito de segurança demanda separação;
- times independentes surgem;
- runtime incompatível é necessário.

“Pode escalar no futuro” não é motivo suficiente para microserviço.
