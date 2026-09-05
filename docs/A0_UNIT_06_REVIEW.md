# Revisão editorial A0 — Unit 06: Present simple

Issue: #28

## Status

Este recorte materializa as aulas 031–036 somente em `status: review`.

Nada desta Unit é adicionado a `level.a0.unitIds` ou ao runtime web. Objetivos, explicações, exemplos e Activities são elaboração editorial assistida e precisam de revisão humana explícita antes de qualquer promoção para `published`.

## Escopo materializado

| Aula | Foco | Evidência determinística do recorte |
|---:|---|---|
| 031 | verbos essenciais | produzir `I study` |
| 032 | simple present com I/you/we/they | produzir `We work` |
| 033 | terceira pessoa afirmativa | produzir `She works` |
| 034 | negativa com don't/doesn't | produzir `He doesn't work` |
| 035 | perguntas com do/does | produzir `Do you study?` |
| 036 | advérbios de frequência | produzir `I always study` |

A Activity de cada Lesson mede o objetivo declarado e usa avaliação determinística. As traduções são curtas de propósito: o recorte deve validar a estrutura-alvo sem exigir vocabulário ainda não introduzido.

## Decisões editoriais

### Progressão

A ponte de Lesson é `030 → 031`, seguida por sequência linear até 036. Isso preserva a ordem da fonte sem fingir que toda sequência de Lesson é também prerequisite conceitual.

Os Concepts usam dependências semânticas:

- verbos essenciais não recebem prerequisite artificial;
- simple present base reutiliza subject pronouns + léxico essencial;
- terceira pessoa depende do contraste com a forma base;
- negativa depende do contraste base/terceira pessoa para explicar `don't`/`doesn't` e o retorno ao verbo base;
- perguntas reutilizam o contraste `do/does` já introduzido na negativa;
- advérbios de frequência dependem do simple present base, não da posição da Lesson 035.

### Vocabulário

A Lesson 031 formaliza seis verbos de alta frequência: `go`, `work`, `live`, `study`, `eat`, `drink`.

A Lesson 036 formaliza `always`, `usually`, `sometimes`, `never`. `do`, `does`, `don't` e `doesn't` permanecem no Concept/regra gramatical; não são transformados em VocabularyItems artificiais apenas para aumentar contagem.

### Terceira pessoa

Este primeiro contraste usa exemplos regulares transparentes (`works`, `lives`, `eats`, `drinks`). As variações ortográficas `goes` e `studies` não são ensinadas implicitamente sem explicação. Elas devem ser avaliadas editorialmente em revisão ou em um recorte posterior caso sejam necessárias para a progressão A0.

## Checklist de revisão humana

Antes de promover a Unit 06:

- [ ] confirmar que a carga de seis verbos na Lesson 031 é apropriada para A0;
- [ ] revisar naturalidade e tradução de todos os exemplos;
- [ ] decidir se `goes`/`studies` precisam entrar nesta Unit e, se sim, ensinar a regra explicitamente;
- [ ] confirmar que negativa e perguntas não introduzem complexidade excessiva no mesmo recorte;
- [ ] revisar posição dos advérbios de frequência com os padrões suportados pelo curso;
- [ ] executar `pnpm content:validate` sem referências quebradas;
- [ ] executar testes de conteúdo da Unit 06;
- [ ] fazer smoke pedagógico no Lesson Player;
- [ ] atualizar `revision`/`status` explicitamente se houver promoção.

## Gate de publicação

Merge desta branch pode adicionar conteúdo em `review`; isso **não equivale a publicação**. `published` continua exigindo aprovação editorial explícita, validação de conteúdo e smoke no player conforme `docs/A0_CONTENT_INVENTORY.md`.
