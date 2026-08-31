# Generated files — LingoPilot

Este documento define como arquivos gerados por frameworks e ferramentas devem ser tratados no repositório.

## Regra geral

Um arquivo derivável de configuração/código-fonte e regenerado automaticamente por comandos oficiais não deve ser tratado como código autoral sem uma razão explícita e documentada.

Antes de versionar um arquivo gerado, verificar:

1. a ferramenta recomenda versioná-lo?;
2. o conteúdo é determinístico entre `dev`, `build`, CI e produção?;
3. versioná-lo melhora reprodutibilidade ou apenas cria churn no working tree?;
4. existe comando oficial para regenerá-lo em clone limpo?;
5. o CI consegue provar que a geração funciona antes de typecheck/build?

## `apps/web/next-env.d.ts`

`next-env.d.ts` é gerado pelo Next.js. Os comandos `next dev`, `next build` e `next typegen` podem regenerá-lo e, no Next.js atual, development e production type generation podem produzir referências diferentes para diretórios sob `.next`.

Por isso, no LingoPilot:

- `apps/web/next-env.d.ts` **não é versionado**;
- o caminho permanece no `apps/web/tsconfig.json` `include`;
- `apps/web/package.json` executa `next typegen` antes de `tsc --noEmit`;
- o comando raiz `pnpm typecheck` carrega o runtime environment canônico antes de iniciar o Turborepo, pois `next typegen` carrega `next.config.ts`;
- o arquivo pode aparecer fisicamente após `pnpm dev`, `pnpm typecheck` ou `pnpm build`, mas deve permanecer ignorado pelo Git;
- nunca editar `next-env.d.ts` manualmente.

## Drizzle migrations

Arquivos sob `packages/db/drizzle/` também são gerados, mas **devem ser versionados** porque constituem o histórico executável de evolução do schema PostgreSQL.

Regras:

- SQL e metadata são produzidos por `drizzle-kit generate` a partir do schema revisado;
- snapshots em `packages/db/drizzle/meta/` ficam fora do Prettier para preservar a saída da ferramenta;
- uma migration deve ser revisada como código antes do merge;
- `pnpm db:check` valida a consistência do histórico;
- migrations não são geradas nem aplicadas pelo build da aplicação.

## Gate de working tree

O job `CI / build` verifica, após o build, que nenhum **arquivo rastreado** foi alterado por geração automática.

Isso protege o repositório contra regressões em que um comando oficial deixa a árvore Git suja apenas por ter sido executado.

Arquivos ignorados ou outputs deliberadamente não versionados, como `.next/` e `apps/web/next-env.d.ts`, podem ser gerados normalmente.

## Regra para agentes

Agentes de IA não devem resolver churn de arquivos gerados commitando a saída atual sem investigar a política da ferramenta. A ordem correta é:

1. confirmar se o arquivo é fonte ou derivado;
2. consultar o contrato/documentação da ferramenta;
3. garantir regeneração em clone limpo;
4. ignorar o derivado quando apropriado;
5. adicionar um gate para impedir que outputs gerados alterem arquivos rastreados silenciosamente.
