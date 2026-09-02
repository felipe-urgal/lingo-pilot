# ADR 0004 — Deployments automáticos da Vercel somente na `main`

## Status

Aceito em 2026-09-02.

## Contexto

O ADR 0002 definiu a topologia Vercel + Neon e a documentação operacional passou a considerar Preview Deployments da Vercel em branches de trabalho, isolados na branch Neon permanente `preview`.

Na operação atual, esses previews automáticos não são necessários para o fluxo de entrega e consomem quota/capacidade do provider a cada push de branch. O fluxo canônico de produção já é `git-managed` e promove somente código mergeado em `main`.

## Decisão

A integração Git da Vercel deve criar deployments automáticos somente para a branch `main`.

A política é versionada na raiz do repositório por `vercel.json`:

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

Consequências operacionais:

- pushes em `feature/*`, `bugfix/*`, `docs/*`, `refactor/*`, `test/*` e demais branches não criam Preview Deployment automático;
- merge/push em `main` continua elegível ao deployment automático de Production;
- deployments manuais via CLI/API não são proibidos por esta decisão;
- a branch Neon `preview` não é removida: permanece isolada e disponível caso um preview seja habilitado explicitamente no futuro;
- se um preview manual for criado, ele continua proibido de usar a branch Neon `main` ou qualquer credencial de Production.

## Relação com ADR 0002

Este ADR **refina** o ADR 0002 apenas na política de acionamento automático da integração Git da Vercel. A topologia estrutural Vercel + Neon, a production branch `main`, migrations fora do build e isolamento entre ambientes permanecem inalterados.

Onde documentação anterior disser que branches de trabalho geram Preview Deployments automaticamente, esta decisão mais recente prevalece.

## Alternativas consideradas

### Manter Preview automático em todas as branches

Descartado porque não é necessário no fluxo atual e aumenta consumo de quota/capacidade do provider.

### Usar Ignored Build Step

Descartado como política principal. A intenção é impedir a criação automática do deployment para branches não autorizadas, e não iniciar o fluxo para depois ignorar o build.

## Riscos e rollback

O principal trade-off é perder URLs automáticas de preview por PR/branch. Quando uma validação remota for realmente necessária, um preview pode ser criado explicitamente e deve usar configuração não produtiva isolada.

Rollback é simples: remover/refinar `git.deploymentEnabled` em novo PR e atualizar esta decisão/documentação. Nenhuma migration ou alteração de dados é necessária.

## Referências

- Issue #77
- Issue #45
- ADR 0002 — Production deployment topology
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/PRODUCTION_STATUS.md`
