# Definition of Done — LingoPilot

Uma issue só está concluída quando todos os itens aplicáveis abaixo forem atendidos.

A receita operacional para setup, execução local e gate antes do PR está em [`DEVELOPMENT.md`](DEVELOPMENT.md). Produção segue [`PRODUCTION.md`](PRODUCTION.md).

## Produto

- [ ] Resolve o problema descrito na issue.
- [ ] Critérios de aceite foram verificados.
- [ ] Não introduz comportamento relevante fora do escopo sem documentação.
- [ ] Copy/UX está coerente com o nível do usuário.
- [ ] Fluxos de erro e vazio foram considerados.

## Arquitetura

- [ ] Responsabilidade está no módulo correto.
- [ ] Regra de negócio não ficou acoplada à UI/framework sem necessidade.
- [ ] Integrações externas usam contratos/adapters adequados.
- [ ] Nova decisão estrutural possui ADR quando necessário.
- [ ] Não houve abstração ou serviço novo sem justificativa.

## Dados

- [ ] Schema/migration revisados quando aplicável.
- [ ] Compatibilidade com dados existentes considerada.
- [ ] Constraints e índices necessários existem.
- [ ] Operações atômicas usam transação.
- [ ] Retry não causa duplicidade.
- [ ] Histórico pedagógico necessário é preservado.

## Segurança e privacidade

- [ ] Autenticação considerada.
- [ ] Autorização por recurso verificada.
- [ ] Input validado na fronteira.
- [ ] Nenhuma PII/secrets indevidos em logs.
- [ ] Upload/media possui controles quando aplicável.
- [ ] Provider externo recebe somente dados necessários.
- [ ] Retenção/exclusão revisadas quando categoria de dado mudou.

## Backend

- [ ] Erros esperados possuem tratamento explícito.
- [ ] Timeouts/retries externos são limitados.
- [ ] Queries não introduzem N+1 óbvio.
- [ ] Listas potencialmente grandes possuem paginação/limite.
- [ ] Idempotência existe em operações sujeitas a retry.

## Frontend

- [ ] Mobile validado.
- [ ] Desktop validado quando aplicável.
- [ ] Keyboard navigation funciona.
- [ ] Foco é previsível.
- [ ] Loading/empty/error/success existem quando necessários.
- [ ] Informação não depende só de cor.
- [ ] Ação duplicada é prevenível ou segura.
- [ ] Reduced motion considerado quando há animação.

## Testes e gate

- [ ] Regras novas possuem testes no nível adequado.
- [ ] Bug possui teste de regressão quando automatizável.
- [ ] Integration test cobre persistência/transaction quando relevante.
- [ ] Fluxo crítico possui E2E quando justificável.
- [ ] Testes não dependem de relógio real quando regra é temporal.
- [ ] `pnpm check` passa no head final.
- [ ] Checks especializados relevantes ao escopo foram executados.

`pnpm check` é o gate obrigatório e cobre lint, typecheck, unit/integration, content validation e build. Formatação, configuração/runtime, consistência/smoke de banco e E2E são verificações direcionadas quando o escopo exigir.

## Conteúdo pedagógico

- [ ] Objetivo de aprendizagem explícito.
- [ ] Conceitos/pré-requisitos corretos.
- [ ] Conteúdo validado por schema.
- [ ] Atividades avaliam o objetivo proposto.
- [ ] Revisão/versionamento preservados.
- [ ] Conteúdo de IA não foi promovido silenciosamente a editorial.

## IA

- [ ] Output estruturado validado quando aplicável.
- [ ] Prompt possui versão.
- [ ] Provider failure possui fallback.
- [ ] Contexto respeita limite pedagógico.
- [ ] Evals/casos de teste existem para comportamento novo.
- [ ] Metadata necessária para auditoria é registrada.

## Observabilidade

- [ ] Erros importantes são categorizados.
- [ ] Operação crítica possui logs/métricas suficientes.
- [ ] Nenhum dado sensível foi adicionado à telemetria.
- [ ] Nova dependência externa pode ser diagnosticada.

## Documentação

- [ ] `README.md`, `DEVELOPMENT.md`, `PRODUCTION.md` e docs especializadas afetadas foram reconciliadas quando necessário.
- [ ] ADR criado/atualizado quando aplicável.
- [ ] `.env.example` atualizado sem secrets quando necessário.
- [ ] Issue/PR descrevem decisões relevantes.

## PR

- [ ] Branch segue padrão.
- [ ] Commits não contêm secrets ou artefatos indevidos.
- [ ] Template do PR foi preenchido.
- [ ] Evidência visual existe para UI quando aplicável.
- [ ] Auto code review foi concluído.
- [ ] `CI / quality` está verde no head final.
- [ ] Feedback de review foi resolvido ou respondido.
- [ ] Estratégia de rollback/forward-fix é conhecida para mudança de risco.

## Regra final

Se algum item aplicável estiver conscientemente incompleto, a issue não deve ser marcada como Done sem registrar explicitamente o motivo e o follow-up aprovado.
