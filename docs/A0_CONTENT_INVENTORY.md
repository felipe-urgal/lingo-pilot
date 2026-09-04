# A0 Content Inventory

Este inventário acompanha a migração editorial da issue #28. O objetivo é manter IDs estáveis, ordem explícita e uma fronteira clara entre conteúdo materializado para revisão e conteúdo publicado no runtime.

## Política editorial

- Conteúdo novo assistido por IA entra primeiro em `status=review`.
- `review` não entra em `level.a0.unitIds` nem no runtime publicado.
- Promoção para `published` exige revisão humana de naturalidade, progressão, adequação CEFR e smoke no Lesson Player.
- Lessons preservam sequência editorial por `prerequisiteLessonIds`; Concepts usam prerequisites conceituais apenas quando há dependência pedagógica real.
- VocabularyItems representam léxico real. Sistemas gramaticais, listas numéricas e categorias produtivas não devem virar entidades artificiais apenas para aumentar cobertura.

## Progresso

Após o recorte da Unit 04, **24/43 aulas A0** estão materializadas em schema `review`.

| Unit | Aulas | Status |
|---|---:|---|
| Unit 01 — First contact | 001–006 | review |
| Unit 02 — Personal information | 007–012 | review |
| Unit 03 — Calendar and nouns | 013–018 | review |
| Unit 04 — People and possessions | 019–024 | review |
| Unit 05 | 025–030 | planejada |
| Unit 06 | 031–036 | planejada |
| Unit 07 | 037–043 | planejada |

## Unit 04 — People and possessions

| Aula | Stable ID | Tema | Conceito principal | Vocabulário materializado |
|---|---|---|---|---|
| 019 | `lesson.a0.019.demonstratives` | demonstratives | `concept.a0.demonstratives` | — |
| 020 | `lesson.a0.020.possessive-adjectives` | possessive adjectives | `concept.a0.possessive-adjectives` | — |
| 021 | `lesson.a0.021.family` | family | `concept.a0.family` | mother, father, sister, brother |
| 022 | `lesson.a0.022.have-has` | have/has | `concept.a0.have-has` | — |
| 023 | `lesson.a0.023.colors` | colors | `concept.a0.colors` | red, blue, black, white |
| 024 | `lesson.a0.024.everyday-objects` | everyday objects | `concept.a0.everyday-objects` | key, bag; reutiliza phone e book |

### Proveniência lexical corrigida

A Unit 04 revelou dois itens que já apareciam em conteúdo anterior e precisavam ter a primeira ocorrência formalizada onde realmente são introduzidos:

- `vocab.phone` pertence à Lesson 012 (`lesson.a0.012.age-and-phone`);
- `vocab.book` pertence à Lesson 017 (`lesson.a0.017.regular-plurals`).

As Lessons 012 e 017 continuam em `status=review` e tiveram `revision` elevada para refletir essa correção editorial. A Lesson 024 reutiliza os itens, sem reivindicar introdução tardia.

## Sequência

A progressão editorial preservada neste recorte é:

```text
018 → 019 → 020 → 021 → 022 → 023 → 024
```

Isso não significa que todo Concept dependa conceitualmente do Concept da aula anterior. Prerequisites conceituais permanecem seletivos; por exemplo, `have/has` pode depender de subject pronouns sem criar uma cadeia gramatical artificial por simples proximidade editorial.

## Próximo recorte

A próxima fatia planejada da #28 é a **Unit 05 / aulas 025–030**. Ela deve seguir a mesma política `review-only`, com regressões de grafo e sem promoção automática para `published`.
