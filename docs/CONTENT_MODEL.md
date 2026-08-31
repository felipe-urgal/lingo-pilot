# Modelo de Conteúdo — LingoPilot

## 1. Objetivo

Conteúdo pedagógico deve ser dado estruturado, versionado e validável. A aplicação não deve depender de PDFs ou HTML estático como fonte de verdade.

O material A0 → A2 já produzido serve como matéria-prima editorial, mas precisa ser migrado para schemas do produto.

## 2. Hierarquia

```text
Course
  Level
    Unit
      Lesson
        ContentBlock[]
        Activity[]
```

Entidades transversais:

- Concept;
- VocabularyItem;
- PhrasePattern;
- AudioAsset;
- Reading;
- Dialogue;
- Assessment.

## 3. Identificadores

Conteúdo deve ter identificador estável independente de título.

Exemplo:

```text
course.en.ptbr.v1
level.a0
unit.a0.01
lesson.a0.01.greetings
concept.grammar.be.identity
vocab.hello
```

Não usar posição como único identificador, porque unidades podem ser reordenadas.

## 4. Lesson schema conceitual

```ts
type Lesson = {
  id: string;
  version: number;
  status: "draft" | "review" | "published" | "retired";
  level: string;
  unitId: string;
  title: LocalizedText;
  estimatedMinutes: number;
  objectives: LearningObjectiveRef[];
  prerequisites: PrerequisiteRef[];
  introduces: ConceptRef[];
  reinforces: ConceptRef[];
  vocabulary: VocabularyRef[];
  blocks: ContentBlock[];
  activities: ActivityRef[];
  editorial: EditorialMetadata;
};
```

O schema real será definido no package `content` e validado em CI.

## 5. Content blocks

Tipos iniciais:

### `explanation`

Explicação curta e orientada ao objetivo.

### `rule`

Padrão formal resumido.

### `example`

Exemplo em idioma alvo com tradução/opcional metadata.

### `comparison`

Contrasta formas semelhantes.

### `common-error`

Erro frequente e correção.

### `vocabulary`

Conjunto pequeno de itens relevantes para a lesson.

### `pronunciation`

Dica de produção/percepção sonora.

### `media`

Imagem ou áudio com metadata acessível.

### `checkpoint`

Pergunta curta antes de avançar.

## 6. Activity schema

Toda Activity deve declarar:

- `id` estável;
- tipo;
- prompt;
- respostas/avaliador;
- conceitos avaliados;
- modalidade;
- nível de suporte/hint;
- metadata de dificuldade;
- feedback editorial quando determinístico.

Tipos iniciais:

```text
single-choice
multiple-choice
fill-blank
word-order
matching
short-answer
translation
listening-comprehension
speaking-prompt
writing-prompt
```

## 7. Conceito versus atividade

Uma atividade não é o conceito. Várias atividades podem produzir evidência para o mesmo conceito em contextos diferentes.

Isso permite:

- gerar revisão variada;
- separar conteúdo de progresso;
- medir domínio além da memorização de uma pergunta específica.

## 8. Vocabulário

`VocabularyItem` deve suportar:

- lemma/headword;
- surface forms;
- multiword expressions;
- part of speech;
- senses relevantes ao curso;
- tradução inicial;
- exemplos;
- áudio/pronúncia;
- nível/introduction lesson;
- tags de uso;
- variantes quando necessário.

Não tentar construir dicionário completo. Armazenar apenas o necessário ao currículo.

## 9. Localização

Separar idioma da interface, idioma fonte e idioma alvo.

Texto editorial pode ter:

```ts
{ 'pt-BR': '...', 'en': '...' }
```

Mas estruturas que representam a frase estudada devem marcar explicitamente o idioma, não depender da locale da UI.

## 10. Conteúdo publicado

Quando uma revision é `published`:

- não alterar silenciosamente significado;
- correções tipográficas sem impacto podem seguir política definida;
- mudança pedagógica cria nova revision;
- attempts continuam apontando para revision antiga;
- scheduler pode usar nova revision para novas sessões conforme migration policy.

## 11. Pipeline editorial inicial

A V1 pode usar arquivos versionados no Git:

```text
content/
  courses/
    pt-BR_en/
      course.yaml
      concepts/
      vocabulary/
      levels/
        a0/
        a1/
        a2/
```

JSON, YAML ou TypeScript data devem ser escolhidos no bootstrap com prioridade para:

- validação;
- diff legível;
- edição simples;
- toolchain estável.

## 12. CI de conteúdo

CI deve validar:

- schema;
- IDs duplicados;
- references quebradas;
- prerequisitos inexistentes;
- cycles inválidos no currículo;
- lesson sem objective;
- activity sem concept/evaluation;
- asset ausente;
- locale obrigatório ausente;
- published content usando draft dependency;
- duração/metadados dentro de limites razoáveis.

## 13. Migração do pacote English Zero → A2

A migração deve acontecer em etapas:

1. inventariar 183 aulas e materiais auxiliares;
2. mapear cada aula para Unit/Lesson;
3. deduplicar conceitos;
4. transformar palavras/expressões em VocabularyItems;
5. transformar exercícios em Activity;
6. classificar objetivo e modalidade;
7. revisar erros/explicações;
8. validar progressão;
9. publicar inicialmente A0 piloto;
10. expandir A1/A2 após feedback.

Não importar automaticamente como “produção” sem revisão editorial.

## 14. Conteúdo gerado por IA

Conteúdo gerado/adaptado por IA deve carregar metadata:

- origem;
- prompt/version;
- modelo;
- data;
- conceitos permitidos;
- status de validação.

Conteúdo gerado para uma sessão pode ser efêmero. Conteúdo promovido ao currículo requer revisão editorial.

## 15. Acessibilidade de conteúdo

- imagens informativas precisam de descrição;
- áudio deve oferecer transcript quando pedagogicamente permitido após tentativa;
- exercícios não podem depender apenas de arrastar se houver alternativa de teclado;
- exemplos devem ser legíveis em mobile;
- feedback deve funcionar com leitor de tela.

## 16. Qualidade editorial

Cada lesson publicada deve responder:

- O que o aluno deve conseguir fazer ao final?
- Que conhecimento novo foi introduzido?
- Qual pré-requisito é assumido?
- Existe prática guiada e recuperação?
- Os exemplos parecem linguagem real?
- O vocabulário está dentro do nível?
- O erro comum é relevante?
- Há excesso de informação para uma sessão?
- O conteúdo respeita variante definida?

## 17. Futuro CMS

Uma UI de autoria só deve ser construída quando o formato versionado estiver estável. O CMS deve escrever nos mesmos contratos, não criar um segundo modelo paralelo.
