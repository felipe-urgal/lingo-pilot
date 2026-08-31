# AI Tutor — Arquitetura e Guardrails

## 1. Papel da IA

A IA complementa o currículo. Ela não substitui o Learning Engine, não decide sozinha progressão e não pode transformar uma resposta livre em verdade de domínio sem validação.

Casos de uso iniciais:

- conversa graduada;
- explicação de erro;
- correção de writing;
- avaliação de speaking a partir de transcript/metadata;
- geração de microprática;
- reformulação de exemplo dentro do vocabulário permitido.

## 2. Regra de dependência

Nenhum fluxo de IA voltado ao aluno é considerado implementável antes de existir a foundation compartilhada mínima:

1. provider abstraction;
2. structured output/schema validation quando aplicável;
3. prompt registry/versioning;
4. timeout/retry/fallback;
5. guardrails de privacidade e nível;
6. provider fake para testes;
7. eval harness/dataset versionado da feature.

Writing/speaking podem implementar captura, persistência, self-check e UX antes disso, mas **avaliação por IA** só entra depois dessa foundation. Tutor e prática adaptativa reutilizam a mesma infraestrutura; não criam integração direta paralela com provider.

## 3. Contexto pedagógico

Toda chamada relevante deve receber um `LearnerContext` construído pelo sistema, não por texto arbitrário concatenado.

Campos conceituais:

```ts
type LearnerContext = {
  sourceLanguage: string;
  targetLanguage: string;
  curriculumLevel: string;
  unlockedConceptIds: string[];
  masteredConceptIds: string[];
  weakConceptIds: string[];
  introducedVocabularyIds: string[];
  recentErrorPatterns: ErrorPattern[];
  currentLesson?: LessonContext;
  interactionGoal: TutorGoal;
  constraints: TutorConstraints;
};
```

O context builder deve aplicar limite de tamanho e escolher somente informação relevante.

## 4. Vocabulary/grammar ceiling

O tutor deve privilegiar palavras e construções já introduzidas.

Pode usar palavra nova quando necessária para comunicação, mas deve:

- limitar quantidade;
- explicar quando útil;
- não assumir domínio;
- não alterar progressão curricular automaticamente.

O teto deve ser calculado a partir de conteúdo realmente introduzido/elegível e de evidências reais. Um ponto de entrada manual A1/A2 não transforma automaticamente todo o conteúdo anterior em “mastered”.

## 5. Provider abstraction

```ts
interface LanguageModelProvider {
  generateStructured<T>(
    request: StructuredRequest<T>,
  ): Promise<ProviderResult<T>>;
  generateText(request: TextRequest): Promise<ProviderResult<string>>;
}
```

Use cases dependem de serviços de alto nível, não de SDK de provider.

## 6. Structured outputs

Correções e avaliações devem usar schema validado.

Exemplo conceitual:

```ts
type WritingEvaluation = {
  isAcceptable: boolean;
  correctedText?: string;
  feedback: {
    category:
      "grammar" | "word-choice" | "word-order" | "spelling" | "naturalness";
    messagePtBr: string;
    relatedConceptIds: string[];
  }[];
  reinforcementConceptIds: string[];
};
```

Se o output falhar na validação, o sistema não deve inventar campos faltantes. Deve retry controlado ou fallback.

## 7. Prompt registry

Prompts relevantes precisam de identificador e versão:

```text
writing-evaluator:v1
speaking-feedback:v1
tutor-conversation:a0-v1
tutor-conversation:a1-v1
tutor-conversation:a2-v1
micropractice-generator:v1
```

Metadata armazenada em avaliações importantes:

- prompt id/version;
- provider;
- model;
- schema version;
- timestamp;
- latency;
- status;
- token/cost metadata quando disponível e permitido.

## 8. Guardrails pedagógicos

O tutor deve evitar:

- responder toda conversa em português quando o objetivo é prática em inglês;
- usar estrutura muito acima do nível sem necessidade;
- corrigir estilo avançado quando o aluno ainda está consolidando estrutura básica;
- criar dez correções simultâneas para uma mensagem iniciante;
- ensinar regra contraditória com conteúdo publicado;
- tratar variação aceitável como erro absoluto.

Feedback para iniciante deve priorizar 1–3 pontos de maior impacto.

## 9. Guardrails de produto

- IA não desbloqueia lesson diretamente.
- IA não altera `MasteryState` sem produzir evidência validável por regra definida.
- IA não cria `ReviewEvent` falso.
- IA não transforma placement/entry point em mastery.
- IA não escreve diretamente no banco fora de use cases controlados.
- IA não executa ferramenta externa em nome do usuário na V1.

## 10. Falhas

Categorias:

- timeout;
- rate limit;
- provider unavailable;
- invalid schema;
- safety refusal;
- context overflow;
- empty result;
- internal integration error.

UX deve distinguir somente o necessário para recuperação. Internamente, logs precisam preservar categoria sem gravar conteúdo sensível por padrão.

## 11. Retry

- retry apenas em erros potencialmente transitórios;
- backoff limitado;
- não retry infinito;
- operação precisa ser idempotente;
- uma avaliação duplicada não pode duplicar progresso.

## 12. Evals

Antes de liberar um fluxo de IA, criar dataset de avaliação com casos reais/sintéticos.

### Tutor A0/A1/A2

Os três níveis fazem parte do escopo V1 e precisam de cobertura explícita.

Avaliar em A0, A1 e A2:

- usa vocabulário permitido;
- tamanho da resposta;
- clareza;
- não pula nível;
- corrige sem sobrecarregar;
- mantém objetivo da conversa;
- não considera conteúdo apenas dispensado por placement como dominado.

Cobertura mínima por nível deve incluir:

- aluno no início do nível;
- aluno com parte do nível desbloqueada;
- weak concepts;
- resposta correta com variante aceitável;
- erro típico de brasileiro;
- pedido do aluno que induz o tutor a usar estrutura acima do nível;
- tentativa de prompt injection/conteúdo não confiável compatível com o fluxo.

Não é aceitável liberar A2 usando apenas fixtures A0/A1 e assumir que os mesmos thresholds generalizam.

### Writing

Avaliar, com casos representativos A0/A1/A2 quando a feature estiver disponível:

- identifica erro real;
- não inventa erro;
- aceita variantes válidas;
- correção preserva intenção;
- feedback em português é compreensível;
- `relatedConceptIds` são válidos;
- feedback respeita o nível e o objetivo da atividade.

### Speaking

Separar avaliação de:

- conteúdo linguístico;
- pronúncia quando houver sinal apropriado;
- fluência;
- inteligibilidade.

Não inferir pronúncia precisa apenas de transcript textual.

Casos A0/A1/A2 devem verificar também se grammar/vocabulary feedback não ultrapassa o teto do aluno.

## 13. AI-generated practice

Microprática gerada deve passar por:

1. schema validation;
2. concept allowlist;
3. vocabulary constraints;
4. resposta esperada verificável quando determinística;
5. filtro de duplicação quando necessário;
6. fallback para conteúdo editorial.

## 14. Segurança de prompt

Conteúdo do aluno é dado não confiável.

- delimitar entradas;
- não concatenar instruções do usuário como system prompt;
- tool use desabilitado por default;
- não expor secrets/context interno;
- tratar prompt injection como possibilidade mesmo em app educacional.

## 15. Privacidade

Não enviar ao provider informação de perfil que não seja necessária.

Preferir IDs internos e contexto pedagógico mínimo a nome/email.

Transcript e writing podem conter PII inserida pelo usuário; política de retenção e logging deve refletir isso.

## 16. Cost controls

Mesmo produto pessoal precisa de limites e deve respeitar o objetivo de operar dentro de free tiers sempre que possível:

- model selection por tarefa;
- max tokens;
- context trimming;
- cache somente onde semântica permitir;
- rate limit;
- métricas de custo por feature;
- evitar chamada de IA para avaliação determinística simples;
- nenhuma feature deve exigir gasto recorrente sem decisão explícita de produto/operação.

## 17. Observabilidade

Métricas:

- chamadas por feature;
- success/failure;
- invalid schema rate;
- latency p50/p95;
- retries;
- estimated cost;
- level-violation eval rate por A0/A1/A2;
- fallback rate.

## 18. Critério de pronto

Um fluxo de IA só está pronto quando:

- interface/provider desacoplados;
- schema validado;
- timeout/fallback implementados;
- testes com provider fake;
- eval set inicial cobrindo os níveis suportados pela feature;
- observabilidade;
- política de dados revisada;
- docs atualizadas.

Para o tutor V1, “níveis suportados” significa **A0, A1 e A2**.
