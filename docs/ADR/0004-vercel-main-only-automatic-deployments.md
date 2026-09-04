# ADR 0004 — Deployments automáticos da Vercel somente na `main`

## Status

**Superado em 2026-09-04 pelo ADR 0006.**

Aceito originalmente em 2026-09-02. Este documento permanece como registro histórico da política que existiu entre os ADRs 0004 e 0006.

## Contexto

O ADR 0002 definiu a topologia Vercel + Neon e a documentação operacional passou a considerar Preview Deployments da Vercel em branches de trabalho, isolados na branch Neon permanente `preview`.

Na operação daquele momento, esses previews automáticos não eram necessários para o fluxo de entrega e consumiam quota/capacidade do provider a cada push de branch. O fluxo canônico de produção já era `git-managed` e promovia somente código mergeado em `main`.

## Decisão original

A integração Git da Vercel deveria criar deployments automáticos somente para a branch `main`.

A política foi versionada na raiz do repositório por `vercel.json` como:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "*": false,
      "main": true
    }
  }
}
```

Consequências operacionais originais:

- pushes em `feature/*`, `bugfix/*`, `docs/*`, `refactor/*`, `test/*` e demais branches não criavam Preview Deployment automático;
- merge/push em `main` continuava elegível ao deployment automático de Production;
- deployments manuais via CLI/API não eram proibidos por esta decisão;
- a branch Neon `preview` não era removida e permanecia isolada para preview explícito;
- preview manual continuava proibido de usar a branch Neon `main` ou credencial de Production.

## Superação pelo ADR 0006

O PR #102 alterou `vercel.json` para `git.deploymentEnabled=false`, desabilitando também o deployment automático da `main`. O Dev Dashboard passou a ser o gatilho explícito do provider via API no fluxo `check -> backup/migrate quando aplicável -> provider-deploy -> verify`.

Portanto, qualquer trecho acima que descreva deployment automático da `main` é **histórico** e não representa o contrato atual. Consulte [`0006-explicit-vercel-deployments-via-dev-dashboard.md`](0006-explicit-vercel-deployments-via-dev-dashboard.md).

## Relação com ADR 0002

Este ADR refinava o ADR 0002 apenas na política de acionamento automático da integração Git. A topologia estrutural Vercel + Neon, a production branch `main`, migrations fora do build e isolamento entre ambientes permaneceram inalterados e continuam válidos também após o ADR 0006.

## Alternativas consideradas na decisão original

### Manter Preview automático em todas as branches

Descartado porque não era necessário no fluxo e aumentava consumo de quota/capacidade do provider.

### Usar Ignored Build Step

Descartado como política principal. A intenção era impedir a criação automática do deployment para branches não autorizadas, e não iniciar o fluxo para depois ignorar o build.

## Riscos e rollback históricos

O principal trade-off era perder URLs automáticas de preview por PR/branch. Um preview ainda poderia ser criado explicitamente com configuração não produtiva isolada.

A política atual não deve ser revertida a partir deste ADR histórico. Qualquer reativação de deployments automáticos exige nova decisão que atualize `vercel.json`, ADR 0006 e documentação operacional.

## Referências

- Issue #77
- Issue #45
- PR #102
- ADR 0002 — Production deployment topology
- ADR 0006 — Deployments explícitos da Vercel via Dev Dashboard
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/PRODUCTION_STATUS.md`
