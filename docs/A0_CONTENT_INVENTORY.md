# Inventário editorial A0 — English Zero → LingoPilot

Este documento é o mapa editorial da issue #28. Ele não transforma material externo em conteúdo publicado automaticamente.

## Proveniência e limite da fonte

Fontes editoriais disponíveis para este recorte:

- `Mapa_do_curso.pdf` — confirma 43 aulas A0, foco em sobrevivência, `be`, presente, perguntas e vocabulário essencial;
- `Plano_de_31_semanas.pdf` — fornece ordem e títulos das aulas A0 001–043.

Não foram encontrados, entre os materiais disponíveis ao agente neste recorte, arquivos detalhados por aula com explicações, exemplos e exercícios originais. Portanto:

- **ordem e títulos** abaixo são rastreados às fontes;
- **objetivos, conceitos, vocabulário candidato, exemplos, ContentBlocks e Activities** adicionados no repositório são elaboração editorial assistida por IA;
- conteúdo assistido por IA entra somente com `status: review`;
- conteúdo `review` não é adicionado a `level.a0.unitIds` nem ao runtime web até revisão humana explícita;
- promoção para `published` exige revisão pedagógica, validação de conteúdo e smoke no Lesson Player.

O bootstrap `unit.a0.bootstrap` continua sendo orientação de produto, não uma das 43 aulas pedagógicas.

## Convenção de IDs

A numeração da fonte é mantida para rastreabilidade, mas nunca é o único identificador:

```text
unit.a0.01.first-contact
lesson.a0.001.alphabet-spelling
concept.a0.spelling.letter-names
activity.a0.001.spell-short-name
vocab.good-morning
```

Reordenação futura de Units não exige renomear a Lesson porque o slug semântico continua fazendo parte do ID.

## Units editoriais propostas

| Unit | Aulas | Foco |
|---|---:|---|
| `unit.a0.01.first-contact` | 001–006 | primeiro contato, apresentação, pronomes e `be` afirmativo |
| `unit.a0.02.personal-information` | 007–012 | `be` negativo/perguntas, números e dados pessoais |
| `unit.a0.03.time-and-basic-nouns` | 013–018 | calendário, horas, artigos e plural |
| `unit.a0.04.people-and-possessions` | 019–024 | demonstrativos, posse, família e objetos |
| `unit.a0.05.places-and-ability` | 025–030 | existência, localização, casa, imperativos e `can` |
| `unit.a0.06.present-simple` | 031–036 | verbos frequentes e estrutura do simple present |
| `unit.a0.07.everyday-survival` | 037–043 | rotina, comida, preferências, perguntas, descrição e diálogos |

## Mapa das 43 aulas

Os objetivos abaixo são **rascunhos editoriais** e devem ser revisados antes de publicação.

| # | Stable ID | Título de origem | Objetivo editorial resumido | Foco conceitual | Vocabulário candidato |
|---:|---|---|---|---|---|
| 001 | `lesson.a0.001.alphabet-spelling` | Alfabeto e soletração | Reconhecer nomes de letras e soletrar um nome curto. | nomes das letras; spelling | letras; spell |
| 002 | `lesson.a0.002.essential-greetings` | Cumprimentos essenciais | Usar cumprimento/despedida adequados em troca curta. | greetings por contexto | hello, hi, good morning, goodbye |
| 003 | `lesson.a0.003.self-introduction` | Apresentar-se | Dizer nome e origem com chunks curtos. | self-introduction | name, from, Brazil |
| 004 | `lesson.a0.004.subject-pronouns` | Pronomes sujeito | Escolher `I/you/he/she/it/we/they` para referentes simples. | subject pronouns | person, people |
| 005 | `lesson.a0.005.be-affirmative` | Verb to be - afirmativa | Formar frases afirmativas simples com `am/is/are`. | affirmative `be` | student, ready |
| 006 | `lesson.a0.006.be-contractions` | Verb to be - contrações | Reconhecer e usar contrações afirmativas de `be`. | `I'm/you're/he's/...` | — |
| 007 | `lesson.a0.007.be-negative` | Verb to be - negativa | Negar identidade/estado com `not`. | negative `be` | not |
| 008 | `lesson.a0.008.be-questions` | Verb to be - perguntas | Formar perguntas simples invertendo `be` e sujeito. | questions with `be` | — |
| 009 | `lesson.a0.009.be-short-answers` | Respostas curtas com be | Responder perguntas de `be` com `Yes/No + pronoun + be`. | short answers | yes, no |
| 010 | `lesson.a0.010.numbers-0-20` | Números 0-20 | Reconhecer e produzir números de 0 a 20. | cardinal numbers | zero–twenty |
| 011 | `lesson.a0.011.numbers-20-100` | Números 20-100 | Reconhecer dezenas e formar números até 100. | tens + compounds | twenty–one hundred |
| 012 | `lesson.a0.012.age-and-phone` | Idade e telefone | Informar idade e número de telefone em frases curtas. | personal information | years old, phone number |
| 013 | `lesson.a0.013.days-of-week` | Dias da semana | Nomear dias e reconhecer referências simples de agenda. | days | Monday–Sunday |
| 014 | `lesson.a0.014.months-and-dates` | Meses e datas | Dizer mês e reconhecer datas básicas. | months; basic dates | January–December |
| 015 | `lesson.a0.015.telling-time` | Horas | Perguntar e informar horas cheias/meias-horas em padrão básico. | clock time | o'clock, half past |
| 016 | `lesson.a0.016.articles-a-an` | A / An | Escolher `a/an` antes de substantivos singulares simples. | indefinite articles | — |
| 017 | `lesson.a0.017.regular-plurals` | Plural regular | Formar plurais regulares frequentes. | plural `-s/-es` | common nouns |
| 018 | `lesson.a0.018.irregular-plurals` | Plural irregular | Reconhecer plurais irregulares essenciais. | irregular plural | person/people, child/children |
| 019 | `lesson.a0.019.demonstratives` | This / That / These / Those | Escolher demonstrativo por número e distância. | demonstratives | this, that, these, those |
| 020 | `lesson.a0.020.possessive-adjectives` | Possessivos my/your/his/her | Indicar posse com adjetivos possessivos básicos. | my/your/his/her | — |
| 021 | `lesson.a0.021.family` | Família | Identificar relações familiares em frases curtas. | family lexicon | mother, father, sister, brother |
| 022 | `lesson.a0.022.have-has` | Have / Has | Expressar posse/relação com `have/has`. | `have/has` affirmative | have, has |
| 023 | `lesson.a0.023.colors` | Cores | Nomear cores e associá-las a objetos simples. | adjective + noun | basic colors |
| 024 | `lesson.a0.024.everyday-objects` | Objetos do dia a dia | Nomear objetos cotidianos e combiná-los com estruturas já vistas. | everyday nouns | phone, key, bag, book |
| 025 | `lesson.a0.025.there-is-are` | There is / There are | Dizer que algo existe em um lugar. | `there is/are` | — |
| 026 | `lesson.a0.026.place-prepositions` | Preposições de lugar | Localizar objetos com preposições frequentes. | in, on, under, next to | place relations |
| 027 | `lesson.a0.027.rooms-at-home` | Casa: cômodos | Nomear cômodos e descrever localização simples em casa. | home lexicon | kitchen, bedroom, bathroom |
| 028 | `lesson.a0.028.imperatives` | Imperativos | Entender e produzir instruções/comandos curtos. | imperative base form | open, close, sit, come |
| 029 | `lesson.a0.029.can-ability` | Can - habilidade | Dizer habilidades simples com `can/can't`. | modal `can` ability | swim, cook, drive |
| 030 | `lesson.a0.030.can-requests-permission` | Can - pedidos e permissão | Fazer pedido/perguntar permissão com `Can I/you...?`. | modal requests | please |
| 031 | `lesson.a0.031.essential-verbs` | Verbos essenciais | Reconhecer verbos de alta frequência em ações cotidianas. | lexical verbs | go, work, live, study, eat, drink |
| 032 | `lesson.a0.032.present-simple-plural-subjects` | Simple present - I/you/we/they | Descrever rotina/fatos com verbo base. | present simple base form | routine verbs |
| 033 | `lesson.a0.033.present-simple-third-person` | Simple present - he/she/it | Aplicar terceira pessoa afirmativa básica. | third-person `-s` | — |
| 034 | `lesson.a0.034.present-simple-negative` | Simple present - negativa | Negar rotina/fatos com `don't/doesn't`. | present simple negative | — |
| 035 | `lesson.a0.035.present-simple-questions` | Simple present - perguntas | Perguntar sobre rotina/fatos com `do/does`. | present simple questions | — |
| 036 | `lesson.a0.036.frequency-adverbs` | Advérbios de frequência | Indicar frequência em frases de rotina. | always/usually/sometimes/never | frequency adverbs |
| 037 | `lesson.a0.037.daily-routine` | Rotina diária | Combinar simple present e horários para falar da rotina. | integrated routine | wake up, start, finish |
| 038 | `lesson.a0.038.food-and-drinks` | Comida e bebida | Nomear alimentos/bebidas essenciais em preferências e pedidos simples. | food lexicon | water, coffee, bread, rice |
| 039 | `lesson.a0.039.like-love-hate` | Like / love / hate | Expressar preferências básicas. | preference verbs | like, love, hate |
| 040 | `lesson.a0.040.question-words` | Question words | Escolher `what/who/where/when/how` em perguntas simples. | wh-questions | what, who, where, when, how |
| 041 | `lesson.a0.041.adjectives-opposites` | Adjetivos e opostos | Descrever qualidades básicas e reconhecer pares opostos. | basic adjectives | big/small, new/old, good/bad |
| 042 | `lesson.a0.042.describe-people` | Descrever pessoas | Combinar `be`, `have` e adjetivos em descrição simples. | integrated description | tall, short, hair, eyes |
| 043 | `lesson.a0.043.survival-dialogues` | Mini diálogos de sobrevivência | Participar de trocas curtas combinando estruturas A0 já vistas. | integrated survival exchanges | greetings, requests, directions/basic needs |

## Progressão e prerequisites

Proposta atual para revisão:

- a ordem 001 → 043 é preservada como progressão principal;
- dentro da Unit 01, cada lesson posterior depende da anterior para garantir uma sequência de revisão previsível;
- a Unit 02 mantém a ponte explícita `006 → 007` e a sequência `007 → 012`; a dependência entre Lessons preserva a trilha editorial, enquanto Concept prerequisites continuam representando necessidade pedagógica real;
- a Unit 03 mantém a ponte explícita `012 → 013` e a sequência `013 → 018`; calendário e horas reutilizam Concepts numéricos apenas onde a regra depende deles, enquanto artigos/plurais não recebem dependências artificiais pela posição;
- `months-and-dates` depende do sistema numérico até 100 porque datas podem exigir 21–31; `clock-time` depende dos números 0–20; `irregular-plurals` depende do contraste estabelecido por `regular-plurals`;
- a Unit 04 mantém a ponte explícita `018 → 019` e a sequência `019 → 024`; `demonstratives` depende do contraste singular/plural, enquanto `possessive-adjectives` e `have-has` dependem de subject pronouns;
- família, cores e objetos são Concepts lexicais sem prerequisite conceitual artificial; as Lessons continuam lineares para manter a trilha editorial;
- `phone` e `book` preservam a primeira aparição real: `vocab.phone` é introduzido na Lesson 012 e `vocab.book` na 017, mesmo sendo reutilizados pela Lesson 024;
- a Unit 05 mantém a ponte explícita `024 → 025` e a sequência `025 → 030`; `there-is-are` depende do contraste singular/plural já estabelecido, `can-ability` reutiliza subject pronouns e `can-requests-permission` depende de `can-ability` por continuidade semântica;
- preposições de lugar, cômodos e imperativos não recebem prerequisite conceitual artificial apenas por posição na trilha;
- a Unit 06 mantém a ponte explícita `030 → 031` e a sequência `031 → 036`; `essential-verbs` não recebe prerequisite artificial, `present-simple-base` reutiliza subject pronouns + léxico essencial, terceira pessoa depende da forma base, negativa depende do contraste base/terceira pessoa, perguntas dependem do contraste `do/does` já introduzido pela negativa e frequency adverbs dependem da forma base — não da posição da Lesson 035;
- a Unit 07 mantém a ponte explícita `036 → 037` e a sequência `037 → 043`; rotina integra simple present + horas + frequência, preferências dependem da forma base, question words reutilizam perguntas com `be` e simple present, descrição de pessoas depende de `be` + `have/has` + adjetivos e o diálogo final depende apenas de linguagem já introduzida;
- a Lesson 043 é integração e não introduz VocabularyItem novo; qualquer linguagem adicional necessária deve virar decisão editorial explícita em vez de entrar escondida no checkpoint final;
- o bootstrap de produto não é tratado como prerequisite pedagógico.

## Estado da migração em `review`

### Unit 01 — aulas 001–006

Materializada no PR #97 com:

- 6 Lessons;
- 6 Concepts;
- 7 VocabularyItems essenciais;
- 6 Activities determinísticas;
- ContentBlocks curtos;
- revision metadata.

### Unit 02 — aulas 007–012

Materializada originalmente no PR #98 e reconciliada no recorte 4 com:

- 6 Lessons;
- 6 Concepts;
- 4 VocabularyItems lexicais (`not`, `yes`, `no`, `phone`);
- 6 Activities determinísticas;
- ContentBlocks de regra, exemplo, vocabulário fechado e checkpoint;
- ponte explícita da Lesson 006 para a 007;
- `lesson.a0.012.age-and-phone` em revision 2 para registrar `vocab.phone` na primeira Lesson em que a palavra já era usada.

Números 0–100 não viram dezenas de `VocabularyItem` artificiais. O conjunto numérico é modelado por Concepts + `ContentBlock` de vocabulário; chunks como `years old` e `phone number` permanecem em regra/exemplo porque o schema v1 ainda não possui entidade `PhrasePattern`. `phone` é um substantivo lexical real e, por isso, passa a ser rastreado sem transformar o chunk inteiro em VocabularyItem.

### Unit 03 — aulas 013–018

Materializada no PR #103 e reconciliada no recorte 4 com:

- 6 Lessons;
- 6 Concepts;
- 1 VocabularyItem lexical (`book`) formalizado na primeira Lesson em que já era usado;
- 6 Activities determinísticas;
- conjuntos fechados de dias e meses em `ContentBlock` de vocabulário;
- horas cheias/meias-horas, `a/an`, plural regular e dois pares essenciais de plural irregular;
- ponte explícita da Lesson 012 para a 013 e sequência até 018;
- Concept prerequisites seletivos para números e contraste regular/irregular;
- `lesson.a0.017.regular-plurals` em revision 2 para registrar `vocab.book` sem fingir introdução posterior.

Dias e meses continuam identificados como vocabulário candidato no inventário, mas não geram 19 `VocabularyItem`s neste recorte. Como ocorre com números, o conjunto fechado fica explícito no conteúdo da Lesson enquanto a revisão editorial decide se granularidade lexical individual agrega valor ao modelo. `o'clock` e `half past` permanecem em regra/exemplo porque funcionam como chunks da estrutura de horas, não como substitutos improvisados para uma entidade de phrase pattern inexistente.

### Unit 04 — aulas 019–024

Materializada neste recorte com:

- 6 Lessons;
- 6 Concepts;
- 12 VocabularyItems formalizados no recorte: família (`mother`, `father`, `sister`, `brother`), cores (`red`, `blue`, `black`, `white`) e objetos (`phone`, `key`, `bag`, `book`);
- 10 desses itens são introduzidos dentro da Unit 04; `phone` e `book` preservam introdução nas Lessons 012 e 017;
- 6 Activities determinísticas ligadas diretamente aos objetivos;
- ponte explícita `018 → 019` e sequência até 024;
- demonstrativos usam o contraste singular/plural; possessivos e `have/has` reutilizam subject pronouns; Concepts lexicais não recebem prerequisites artificiais;
- `phone`, `key`, `bag` e `book` são reutilizados em combinações com artigos e cores na Lesson 024;
- revision metadata preservada em todos os documentos.

### Unit 05 — aulas 025–030

Materializada no PR #112 com:

- 6 Lessons;
- 6 Concepts;
- 11 VocabularyItems lexicais (`kitchen`, `bedroom`, `bathroom`, `open`, `close`, `sit`, `come`, `swim`, `cook`, `drive`, `please`);
- 6 Activities determinísticas ligadas diretamente aos objetivos;
- ponte explícita `024 → 025` e sequência até 030;
- `there-is-are` ligado ao contraste singular/plural, `can-ability` reutilizando subject pronouns e `can-requests-permission` ligado ao Concept de habilidade;
- preposições, padrões gramaticais e modal `can` mantidos em Concept/ContentBlock em vez de virarem VocabularyItems artificiais;
- todos os documentos permanecem em `status: review` e fora do runtime publicado.

### Unit 06 — aulas 031–036

Materializada neste recorte com:

- 6 Lessons;
- 6 Concepts;
- 10 VocabularyItems lexicais (`go`, `work`, `live`, `study`, `eat`, `drink`, `always`, `usually`, `sometimes`, `never`);
- 6 Activities determinísticas ligadas diretamente aos objetivos;
- ponte explícita `030 → 031` e sequência até 036;
- Concept prerequisites seletivos: léxico essencial sem dependência artificial, forma base ligada a subject pronouns + léxico essencial, terceira pessoa ligada à forma base, negativa ao contraste base/terceira pessoa, perguntas ao contraste `do/does` e frequency adverbs à forma base;
- `do`, `does`, `don't` e `doesn't` permanecem em Concept/ContentBlock, sem virar VocabularyItems artificiais;
- exemplos de terceira pessoa usam neste recorte apenas formas regulares transparentes (`works`, `lives`, `eats`, `drinks`); `goes`/`studies` exigem decisão editorial explícita antes de serem ensinados;
- todos os documentos permanecem em `status: review` e fora do runtime publicado.

### Unit 07 — aulas 037–043

Materializada no draft PR #118 com:

- 7 Lessons;
- 7 Concepts;
- 25 VocabularyItems novos, com reutilização explícita de léxico das Units anteriores;
- 7 Activities determinísticas ligadas diretamente aos objetivos;
- ponte explícita `036 → 037` e sequência até 043;
- rotina integrando forma base, horário e frequency adverb, com `at + horário` explicitado como regra;
- preferências limitadas a `like/love/hate + substantivo` para não introduzir `-ing` implicitamente;
- question words apoiadas nas estruturas de pergunta já estudadas;
- descrição de pessoas reutilizando `be`, `have/has`, adjetivos e `black` da Unit 04;
- Lesson 043 de integração sem VocabularyItem novo e Activity aceitando `hello`/`hi`, variantes já ensinadas;
- todos os documentos permanecem em `status: review` e fora do runtime publicado.

As sete Units **não** entram em `level.a0.unitIds` e **não** são importadas por `apps/web/server/content/runtime.ts`. Com #117 + #118, **43/43 aulas A0** estão materializadas em schema `review`; nenhuma foi promovida para `published`.

Isso fecha a cobertura técnica do inventário, mas não o DoD editorial da #28: ainda são obrigatórias revisão humana ponta a ponta, validação de naturalidade, `pnpm content:validate` no PR final, smoke no Lesson Player e promoção explícita de revision/status apenas do conteúdo aprovado.

## Checklist de promoção para `published`

Antes de publicar qualquer Unit/Lesson da #28:

- [ ] objetivo revisado por humano;
- [ ] conceitos introduzidos/reforçados revisados e deduplicados;
- [ ] vocabulary novo revisado e limitado ao necessário;
- [ ] prerequisites revisados do início ao fim;
- [ ] português e inglês revisados editorialmente;
- [ ] exemplos confirmados como naturais e adequados a A0;
- [ ] Activity confirma o objetivo da Lesson e não apenas reconhecimento superficial irrelevante;
- [ ] duração estimada revisada em uso real;
- [ ] `pnpm content:validate` 100% verde;
- [ ] smoke da Unit no Lesson Player;
- [ ] revision/status atualizados explicitamente;
- [ ] conteúdo assistido por IA recebe aprovação editorial explícita antes de `published`.
