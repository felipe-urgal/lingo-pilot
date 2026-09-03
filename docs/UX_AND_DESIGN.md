# UX & Design — LingoPilot

## 1. Objetivo de experiência

LingoPilot deve reduzir ansiedade decisória. O aluno deve abrir o produto e encontrar uma próxima ação clara.

A interface não deve se comportar como biblioteca de conteúdo. O catálogo existe em segundo plano; a experiência primária é uma jornada conduzida.

## 2. Princípios

### Clareza antes de densidade

Mostrar somente informação necessária para a decisão atual.

### Ação principal inequívoca

Cada tela de estudo deve possuir uma ação primária evidente.

### Progresso sem pressão artificial

Streak e XP podem ser motivadores, mas não devem constranger o usuário ou mascarar aprendizado fraco.

### Feedback imediato, explicação curta

Em atividades objetivas, o usuário recebe retorno rápido. Explicações detalhadas aparecem sob demanda ou quando o erro exige.

### Mobile-first

Sessões devem funcionar confortavelmente em tela pequena e com uma mão quando possível.

## 3. Arquitetura de informação inicial

Navegação principal sugerida:

```text
Hoje
Trilha
Revisar
Progresso
Tutor
Configurações
```

Durante V1, evitar mais itens de primeiro nível sem necessidade comprovada.

## 4. Tela Hoje

Objetivo: iniciar estudo em poucos segundos.

Conteúdo prioritário:

- saudação contextual opcional;
- meta e duração estimada;
- sequência resumida da sessão;
- ação `Começar estudo` ou `Continuar estudo`;
- reviews vencidos se exigirem atenção;
- estado de conclusão quando sessão terminar.

Exemplo conceitual:

```text
Hoje · 26 min

Aprender
A0 · Aula 08 · This / That

Revisar
12 itens · ~6 min

Listening
Apresentando-se · 4 min

Speaking
Falar sobre você · 5 min

[ Começar estudo ]
```

Não colocar gráficos históricos, badges e configurações acima da ação de estudar.

### Baseline executável da Fase 1

A vertical #18–#20 implementa o primeiro Today orientado por sessão real:

- o servidor resolve uma `StudySession` persistida por matrícula + data local;
- a sessão inicial contém uma única lesson elegível enquanto o planner completo da #25 ainda não existe;
- refresh não troca silenciosamente o item já planejado;
- `Começar estudo` vira `Continuar estudo` quando a sessão já foi iniciada;
- empty, loading, error, success e completed possuem estados explícitos;
- conteúdo/revision incompatível não é apresentado como se a sessão estivesse íntegra.

Essa simplificação é intencional: Today já responde “o que estudar agora?” sem antecipar review, skill balancing ou algoritmo avançado de prioridade.

## 5. Study flow

Ao iniciar, entrar em modo focado.

Estrutura:

```text
Header mínimo
progresso da sessão
conteúdo/atividade
feedback
CTA próximo
```

A navegação global pode ser reduzida durante a sessão para evitar abandono acidental.

Na baseline executável, iniciar uma lesson sempre revalida no servidor o ownership da matrícula/sessão, a elegibilidade curricular e a `ContentRevision` planejada. A URL por si só nunca concede acesso à lesson.

## 6. Lesson Player

Tipos de tela/bloco:

- introdução do objetivo;
- mapa visual;
- exemplo;
- comparação;
- erro comum;
- micro checkpoint;
- prática guiada;
- recuperação sem pista.

Princípio: uma lesson longa deve ser quebrada em passos curtos, mas sem transformar cada linha em uma tela artificial.

### Comportamento implementado na baseline #20

- a lesson é renderizada exclusivamente a partir de `ContentBlock` validado;
- cada passo apresenta um bloco pedagógico com largura de leitura controlada;
- voltar/avançar depende de ação explícita do aluno;
- a posição persistida só muda após navegação válida, nunca por refresh;
- o backend compara o índice esperado com o persistido para impedir POST duplicado de pular conteúdo;
- abrir o último bloco não conclui a lesson;
- conclusão exige ação explícita `Concluir aula`;
- revisão de conteúdo diferente da planejada/progress existente bloqueia retomada de forma segura;
- tipo de bloco desconhecido deve falhar com estado seguro em vez de renderização genérica silenciosa.

O Exercise Engine da #21 entra dentro desse fluxo depois; a baseline #20 não inventa tentativa ou avaliação para checkpoints ainda não implementados como Activity.

## 7. Feedback de exercício

### Correto

- confirmação discreta;
- reforçar resposta correta;
- CTA para continuar.

### Incorreto

- não usar linguagem punitiva;
- destacar parte relevante;
- explicar a regra de forma curta;
- mostrar resposta/exemplo quando apropriado;
- registrar erro para reforço futuro;
- oferecer nova tentativa conforme design da atividade.

## 8. Revisão

A UI de review deve ser extremamente rápida.

Evitar elementos que adicionam tempo entre itens. O aluno deve perceber ritmo de recuperação.

## 9. Progresso

A página deve responder:

1. Onde estou?
2. O que já concluí?
3. O que estou dominando?
4. Onde estou com dificuldade?
5. O que acontece depois?

Visualizações iniciais:

- nível e unidade atual;
- trilha concluída;
- sessões/semana;
- domínio por reading/listening/writing/speaking;
- conceitos frágeis;
- backlog de revisão.

Evitar métricas cuja interpretação pedagógica não esteja clara.

## 10. Tutor

Tutor não deve parecer chat genérico vazio.

Entradas rápidas podem ser:

- “Praticar o que estudei hoje”;
- “Explicar meu último erro”;
- “Conversar por 5 minutos”;
- “Treinar apresentação pessoal”.

O sistema deve informar quando simplificou a linguagem para o nível do aluno, sem expor detalhes internos de prompt.

## 11. Estados obrigatórios

Todo componente assíncrono precisa considerar:

- initial;
- loading;
- empty;
- partial;
- success;
- error recoverable;
- error terminal;
- offline quando aplicável.

Exemplo: speaking precisa diferenciar falta de permissão de microfone, falha de upload, falha de transcrição e falha de avaliação.

Para Today/Lesson Player, a baseline diferencia pelo menos:

- sessão ainda não disponível;
- sessão pronta;
- sessão em andamento;
- sessão concluída;
- conteúdo planejado ausente/incompatível;
- erro recuperável de carregamento;
- lesson inacessível por ownership/elegibilidade/revision.

## 12. Design system

Tokens mínimos:

- spacing;
- typography;
- radius;
- border;
- semantic colors;
- elevation;
- motion duration;
- focus ring.

Cores semânticas:

- neutral;
- accent/primary;
- success;
- warning;
- danger;
- info.

Não codificar hex espalhado em features.

## 13. Componentes prioritários

- Button;
- IconButton;
- Input;
- Textarea;
- Select;
- Dialog;
- Sheet/Drawer;
- Tooltip;
- Progress;
- Tabs quando necessário;
- Alert;
- Toast com parcimônia;
- StudyCard;
- ExerciseShell;
- FeedbackPanel;
- AudioPlayer;
- Recorder;
- SessionProgress.

## 14. Acessibilidade

Meta: WCAG 2.2 AA nos fluxos principais.

Obrigatório:

- HTML semântico;
- ordem de foco previsível;
- foco restaurado após dialogs;
- elementos clicáveis com alvo confortável;
- keyboard operation;
- `aria-live` para feedback quando apropriado;
- labels explícitos;
- erro associado ao campo;
- transcrição de áudio;
- alternativa a drag-only;
- `prefers-reduced-motion`.

Today e Lesson Player devem manter heading/landmarks previsíveis, CTAs nativos de teclado e nenhuma informação essencial dependente apenas de cor.

## 15. Motion

Animações devem indicar continuidade, feedback ou mudança de estado.

Não usar animação contínua sem função. Respeitar redução de movimento.

## 16. Conteúdo e tom

Interface em português inicial deve ser:

- direta;
- curta;
- não infantilizada;
- encorajadora sem exagero;
- consistente em termos.

Exemplos:

Preferir: `Tente novamente`.
Evitar: `Opsie! Quase lá, campeão!`.

## 17. Responsividade

Breakpoints são implementação; comportamento esperado:

- mobile: uma coluna, CTA acessível;
- tablet: ampliar espaço do conteúdo sem aumentar densidade desnecessariamente;
- desktop: limitar largura de leitura e evitar cards gigantes.

## 18. Evidência visual em PR

PR que altera UI deve incluir:

- screenshot ou vídeo do before/after quando aplicável;
- mobile e desktop para mudança relevante;
- estados loading/error quando foram alterados;
- observação de acessibilidade testada.

## 19. Não objetivos de design

- copiar Duolingo;
- maximizar quantidade de elementos na Home;
- gamificar cada clique;
- usar ilustração decorativa como substituto de hierarquia;
- esconder progresso real atrás de XP.

## 20. Critério de qualidade

Uma pessoa iniciante deve conseguir iniciar e concluir a sessão sem entender a arquitetura curricular, o algoritmo de SRS ou a estrutura interna do produto.
