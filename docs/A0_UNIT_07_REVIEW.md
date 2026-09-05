# A0 Unit 07 — revisão editorial

Este documento registra o recorte da issue #28 para as aulas 037–043. A Unit 07 fecha a materialização das **43 aulas A0** em schema `review`, mas isso **não** equivale a publicação ou aprovação pedagógica.

## Escopo materializado

- 7 Lessons (`037`–`043`);
- 7 Concepts;
- 25 VocabularyItems novos;
- 7 Activities determinísticas, uma por objetivo;
- ponte explícita `036 → 037` e sequência até 043;
- reutilização de Concepts/VocabularyItems das Units anteriores;
- nenhum documento entra em `level.a0.unitIds` ou no runtime publicado.

## Decisões pedagógicas do recorte

### 037 — Rotina diária

Integra simple present, horas e frequency adverbs. Introduz apenas `wake up`, `start` e `finish`; verbos já ensinados continuam sendo reutilizados.

O conector `at + horário` ficou explícito em um bloco de regra para não depender de gramática implícita. A Activity avalia o objetivo inteiro com verbo + frequency adverb + horário (`I usually wake up at seven`) e aceita tanto `seven` quanto `7` como representação válida do horário.

### 038 — Comida e bebida

Formaliza somente quatro itens essenciais (`water`, `coffee`, `bread`, `rice`) e reutiliza `eat`/`drink`. Não transforma refeições, pratos ou listas extensas em vocabulário sem necessidade.

### 039 — Preferências

`like`, `love` e `hate` são praticados antes de substantivos conhecidos. Construções com verbo em `-ing` ficam deliberadamente fora deste recorte para não introduzir uma regra adicional de forma implícita.

### 040 — Question words

Formaliza `what`, `who`, `where`, `when` e `how` e reaproveita estruturas de pergunta já estudadas. A Lesson não cria uma gramática paralela para cada palavra interrogativa.

### 041 — Adjetivos e opostos

Usa três pares controlados: `big/small`, `new/old`, `good/bad`. O recorte precisa de revisão humana para naturalidade, polissemia de `old` e carga lexical.

### 042 — Descrever pessoas

Integra `be` e `have/has` com `tall`, `short`, `hair` e `eyes`. A Activity usa `black`, já introduzido na Unit 04, para preservar provenance lexical.

### 043 — Mini diálogos de sobrevivência

É uma Lesson de integração. **Nenhum VocabularyItem novo é introduzido nela.** O objetivo é combinar cumprimentos, pedidos e necessidades já estudados sem esconder conteúdo novo dentro do checkpoint final.

Como `hello` e `hi` foram ambos ensinados como traduções válidas de um cumprimento básico, a Activity final aceita as duas variantes para `Olá` em vez de marcar uma resposta previamente ensinada como incorreta.

## Auto-review do recorte

Antes de abrir o slice para revisão humana, uma segunda passada encontrou e corrigiu dois riscos de retrabalho:

1. a Activity 037 inicialmente avaliava apenas rotina + horário, embora o objetivo declarasse também frequência; agora ela cobre os três sinais e o teste trava esse contrato;
2. a Activity 043 inicialmente aceitava apenas `hello`; agora também aceita `hi`, preservando variante já ensinada na Lesson 002.

`packages/content/src/a0-review-unit-07-activity-contracts.test.ts` protege esses dois contratos além da cobertura estrutural geral da Unit.

## Pontos que exigem revisão humana

Antes de qualquer promoção para `published`, revisar explicitamente:

- se `at + horário`, `wake up at seven` e demais exemplos de rotina são adequados ao contrato A0 existente;
- carga lexical de 25 itens na Unit 07 como um todo;
- traduções de `old`, `short`, `like`, `love` e `hate` no contexto iniciante;
- naturalidade e escopo de `What/Who/Where/When/How`;
- se a descrição de pessoas precisa de vocabulário adicional ou se isso deve ficar para A1;
- se o diálogo final avalia integração suficiente ou precisa de uma Activity adicional em revisão futura.

## Gate

A Unit 07 permanece em `status: review`.

Merge técnico exige CI verde. Publicação exige, separadamente:

1. revisão pedagógica humana explícita;
2. revisão de português/inglês e naturalidade;
3. `pnpm content:validate` verde;
4. smoke no Lesson Player;
5. revisão ponta a ponta da progressão 001–043;
6. atualização explícita de `revision`/`status`.

A issue #28 só pode ser considerada concluída depois desses gates; **43/43 materializadas** não significa **43/43 publicadas**.
