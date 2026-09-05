# A0 Unit 05 — recorte editorial em review

Este documento registra o recorte 5 da issue #28. Todo o material abaixo é elaboração editorial assistida por IA a partir do inventário já rastreado em `A0_CONTENT_INVENTORY.md` e permanece obrigatoriamente em `status: review` até revisão humana.

## Escopo

`unit.a0.05.places-and-ability` cobre as Lessons 025–030:

1. `there is / there are`;
2. `in / on / under / next to`;
3. `kitchen / bedroom / bathroom`;
4. imperativos com `open / close / sit / come`;
5. `can / can't` para habilidade com `swim / cook / drive`;
6. `Can I...? / Can you...?` para permissão/pedido com `please`.

A Unit não é adicionada a `level.a0.unitIds` e não é importada pelo runtime publicado.

## Progressão

A ponte editorial de Lessons é linear e explícita:

```text
024 → 025 → 026 → 027 → 028 → 029 → 030
```

Isso preserva a ordem da fonte. Concept prerequisites, porém, continuam seletivos:

- `there-is-are` depende de plural regular porque a escolha `is/are` exige contraste singular/plural;
- preposições de lugar, cômodos e imperativos não recebem prerequisite conceitual artificial;
- `can-ability` reutiliza subject pronouns;
- `can-requests-permission` depende de `can-ability` porque muda a função comunicativa de uma forma já apresentada.

## Modelagem lexical

Foram criados 11 VocabularyItems realmente lexicais:

- cômodos: `kitchen`, `bedroom`, `bathroom`;
- ações: `open`, `close`, `sit`, `come`, `swim`, `cook`, `drive`;
- marcador de cortesia: `please`.

`there is/are`, preposições e padrões com `can` continuam modelados como Concepts/ContentBlocks, não como VocabularyItems artificiais. Esse recorte mantém o mesmo princípio usado para números, dias, meses e chunks das Units anteriores.

## Activities

Cada Lesson possui exatamente uma Activity determinística ligada ao seu único Objective. O objetivo é provar rastreabilidade de avaliação no schema `review`, não produzir variedade de exercício antes da revisão editorial humana.

Os formatos usados são `translation`, `fill-blank` e `short-answer`, sempre com respostas fechadas e adequadas ao foco da Lesson.

## Gates antes de published

Além de `pnpm content:validate` e dos testes estruturais, a promoção exige:

- revisão humana de naturalidade de exemplos e traduções;
- confirmação do teto A0 e da carga lexical;
- revisão de todas as accepted answers;
- smoke das seis Lessons no Lesson Player;
- confirmação de estimated minutes em uso real;
- atualização explícita de revision/status;
- somente então inclusão no catálogo publicado.

Até esses gates ocorrerem, nenhum arquivo deste recorte deve ser promovido para `published` nem adicionado ao runtime.
