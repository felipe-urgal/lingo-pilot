# Visão do Produto — LingoPilot

## Problema

Aprender um idioma sozinho exige decisões demais: o que estudar, em qual ordem, quando revisar, como praticar fala, quando avançar e como saber se houve progresso real. Plataformas tradicionais frequentemente otimizam engajamento superficial ou quantidade de exercícios, enquanto tutores de IA tendem a responder bem isoladamente, mas sem respeitar uma progressão pedagógica individual.

## Visão

LingoPilot deve ser um sistema pessoal de aprendizagem que **planeja, conduz e adapta a jornada do aluno**.

A promessa do produto é:

> Abra o LingoPilot todos os dias e faça o que aparece. O sistema cuida da ordem, da revisão e da progressão.

## Usuário inicial

O primeiro usuário-alvo é uma pessoa falante de português do Brasil que:

- está começando inglês do zero ou quase zero;
- sente dificuldade em montar uma rotina;
- não sabe quais assuntos estudar primeiro;
- precisa de explicações claras em português no início;
- quer desenvolver leitura, escrita, listening e speaking;
- prefere uma sessão objetiva a navegar por centenas de conteúdos.

## Resultado desejado

Ao concluir o primeiro percurso A0 → A2, o aluno deve ser capaz de:

- compreender e produzir frases frequentes do cotidiano;
- participar de interações simples e previsíveis;
- entender mensagens e diálogos graduados;
- escrever textos curtos e funcionais;
- falar sobre rotina, passado simples, planos e necessidades comuns;
- manter uma base de vocabulário revisada por recuperação espaçada;
- perceber claramente quais habilidades estão fortes e quais precisam de reforço.

## Diferencial central

O diferencial não é “ter IA”. O diferencial é **IA integrada a uma progressão pedagógica explícita**.

O tutor deve saber:

- quais conceitos o aluno já viu;
- quais palavras foram introduzidas;
- quais itens estão dominados;
- quais erros são recorrentes;
- qual nível de complexidade está permitido;
- qual é o objetivo da sessão atual.

A IA deve adaptar a prática sem destruir a sequência de aprendizagem.

## Princípios de experiência

### 1. Today first

A tela principal mostra a sessão atual, não um catálogo.

### 2. Uma decisão por vez

A interface conduz a próxima ação sempre que possível.

### 3. Aprender exige recuperar

Cada conceito novo deve aparecer posteriormente em atividades de recuperação sem consulta.

### 4. Erro gera informação

Erros alimentam revisão, mastery e prática adaptativa. Não são apenas “resposta vermelha”.

### 5. Progresso precisa significar domínio

XP, streak e tempo estudado podem existir, mas não substituem medidas de retenção e desempenho.

### 6. Conteúdo visual, linguagem simples

Explicações iniciais devem ser curtas, visuais e com exemplos suficientes para uso imediato.

### 7. A dificuldade cresce gradualmente

O aluno deve enfrentar desafio produtivo, não saltos arbitrários.

## Fora do escopo inicial

Na V1, não são prioridade:

- marketplace de professores;
- feed social;
- ranking global;
- multiplayer;
- gamificação complexa;
- dezenas de idiomas;
- certificação oficial;
- conteúdo C1/C2;
- criação livre de cursos por usuários;
- app nativo separado antes de validar a experiência web/PWA.

## Estratégia de produto

### Etapa 1 — Produto pessoal

Construir para uso diário real do primeiro aluno. Corrigir fricções com base em uso concreto.

### Etapa 2 — Produto replicável

Remover pressupostos específicos do primeiro usuário, melhorar onboarding, confiabilidade e privacidade.

### Etapa 3 — Plataforma de idiomas

Generalizar idioma fonte/alvo, conteúdo e regras necessárias para novos cursos.

## Métricas de produto

Métricas devem medir aprendizagem e continuidade, não apenas cliques.

### Core

- sessões concluídas por semana;
- taxa de retorno D1/D7/D30;
- percentual de revisão feita no vencimento;
- retenção de itens revisados;
- evolução de mastery por habilidade;
- conclusão de unidades;
- taxa de abandono no meio da sessão.

### Qualidade pedagógica

- erro por conceito;
- reincidência do mesmo erro;
- tempo até recuperar item corretamente após falha;
- diferença entre desempenho guiado e recuperação livre;
- desempenho por modalidade: reading/listening/writing/speaking.

### Guardrails

- sessões excessivamente longas;
- volume de revisões atrasadas;
- conteúdo pulado pelo scheduler;
- respostas de IA fora do nível permitido;
- correções inconsistentes;
- falhas de áudio/transcrição.

## Critério de sucesso da V1

A V1 é bem-sucedida quando um aluno iniciante consegue usar o produto por várias semanas sem precisar decidir manualmente o que estudar e o sistema consegue:

1. apresentar conteúdo em ordem coerente;
2. criar sessões diárias equilibradas;
3. revisar memória no momento adequado;
4. registrar erros e progresso;
5. adaptar prática sem perder controle curricular;
6. oferecer uma experiência simples o suficiente para virar hábito.
