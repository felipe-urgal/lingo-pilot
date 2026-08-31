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
