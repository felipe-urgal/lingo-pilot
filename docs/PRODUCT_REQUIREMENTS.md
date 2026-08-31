# Product Requirements — LingoPilot V1

## 1. Objetivo

Construir uma aplicação web/PWA de estudo de inglês para falantes de português do Brasil, cobrindo A0, A1 e A2, em que o sistema define a sessão diária com base em currículo, progresso, revisão e desempenho.

## 2. Personas iniciais

### Iniciante absoluto

- não domina estrutura de frases;
- precisa de explicação em português;
- não conhece a sequência de estudos;
- pode se sentir sobrecarregado com menus e conteúdo avançado.

### Falso iniciante

- reconhece vocabulário básico;
- estudou fragmentos no passado;
- tem lacunas de gramática, listening e produção;
- precisa revisar sem reiniciar tudo desnecessariamente.

## 3. Jobs to be Done

- “Quando eu abrir o produto, quero saber exatamente o que estudar agora.”
- “Quando eu esquecer algo, quero que o sistema perceba e traga de volta.”
- “Quando eu errar, quero entender rapidamente por quê e praticar de novo.”
- “Quando eu falar ou escrever, quero feedback útil no meu nível.”
- “Quando eu avançar, quero saber que o progresso representa aprendizado, não só atividades concluídas.”

## 4. Requisitos funcionais

### FR-01 — Conta e perfil

O usuário deve poder criar sessão autenticada e manter progresso persistente.

Dados mínimos do perfil/jornada:

- idioma de interface;
- idioma fonte;
- idioma alvo;
- nível/ponto de entrada inicial;
- meta diária em minutos;
- timezone;
- preferências de áudio e speaking.

As preferências globais pertencem a `LearnerProfile`; a jornada idioma fonte → idioma alvo pertence a `LanguageProfile`.

### FR-02 — Onboarding

O onboarding deve:

1. explicar a proposta em linguagem curta;
2. perguntar objetivo principal;
3. coletar tempo diário;
4. oferecer duas rotas V1: **começar do zero (A0)** ou **já estudei antes**;
5. na rota de falso iniciante, permitir escolher um ponto de entrada A1 ou A2 com explicação simples de que isso não equivale a um diagnóstico formal;
6. criar de forma transacional e idempotente `LearnerProfile`, `LanguageProfile` e `Enrollment` inicial;
7. gerar a primeira sessão diária.

#### Semântica do ponto de entrada V1

A escolha manual de A1/A2 serve para posicionar o aluno na trilha sem obrigá-lo a refazer todo o conteúdo anterior.

Ela **não** pode:

- criar `Attempt` fictício;
- criar `ReviewEvent` fictício;
- marcar conceitos anteriores como dominados;
- fabricar evidência de mastery.

O `Enrollment` deve registrar o ponto de entrada e sua origem (`zero` ou `manual` na V1). O serviço de elegibilidade pode considerar conteúdo anterior ao ponto de entrada como dispensado para navegação/pré-requisito curricular, mas esse conteúdo permanece sem evidência de domínio e pode voltar como reforço quando sinais reais justificarem.

Um placement test adaptativo completo é posterior e não bloqueia a V1.

### FR-03 — Currículo e matrícula

O sistema deve representar:

```text
LanguageProfile → Enrollment → Course → Level → Unit → Lesson → Activity
```

Cada lesson possui objetivos, pré-requisitos, conceitos e itens de vocabulário introduzidos.

O `Enrollment` identifica a matrícula de uma jornada (`LanguageProfile`) em um `Course`, seu ponto de entrada e estado. Progresso pedagógico não deve ficar anexado apenas ao `User`, porque o mesmo usuário poderá ter múltiplas jornadas no futuro.

### FR-04 — Sessão Hoje

A Home deve exibir uma sessão ordenada composta por blocos como:

- aprender conteúdo novo;
- revisar itens vencidos;
- prática de recuperação;
- listening;
- speaking;
- reading/writing quando elegível.

O aluno deve conseguir iniciar com uma ação principal.

### FR-05 — Lesson Player

Uma aula deve suportar blocos estruturados:

- explicação;
- regra/padrão;
- exemplos;
- erro comum;
- vocabulário;
- checagem rápida;
- prática guiada;
- prática sem ajuda.

O player deve salvar progresso sem marcar a aula como concluída antes dos critérios mínimos.

### FR-06 — Exercícios

Tipos mínimos da V1:

- múltipla escolha;
- completar lacuna;
- ordenar palavras;
- correspondência;
- tradução curta;
- resposta curta escrita;
- listening + resposta;
- speaking prompt.

Toda tentativa relevante deve registrar resultado e vínculo com conceitos avaliados.

### FR-07 — Feedback

Feedback deve separar:

- correto/incorreto;
- resposta esperada ou exemplo válido;
- explicação curta quando necessária;
- conceito relacionado;
- possibilidade de nova tentativa conforme tipo de atividade.

Feedback por IA só pode ser liberado após provider abstraction, schema validation, guardrails e eval harness da feature estarem implementados.

### FR-08 — SRS

Itens memorizáveis devem possuir estado de revisão individual. O scheduler decide `dueAt` a partir de histórico de respostas e dificuldade.

### FR-09 — Mastery

O sistema deve calcular domínio por conceito/habilidade sem usar somente quantidade de aulas concluídas.

Sinais possíveis:

- acerto recente;
- recuperação sem pista;
- estabilidade no SRS;
- variedade de contexto;
- reincidência de erro;
- modalidade.

Escolha de ponto de entrada/placement não é sinal de mastery por si só.

### FR-10 — Listening

Deve ser possível:

- tocar áudio;
- repetir;
- controlar velocidade quando suportado;
- exibir transcript após momento apropriado;
- responder perguntas;
- registrar desempenho.

### FR-11 — Speaking

Deve ser possível:

- visualizar prompt;
- ouvir modelo quando aplicável;
- gravar resposta;
- enviar de forma segura;
- obter transcrição quando aplicável;
- receber feedback compreensível dentro dos sinais realmente disponíveis;
- repetir a tentativa;
- excluir gravação conforme política de retenção.

Avaliação linguística por IA deve reutilizar a foundation compartilhada e não pode inferir pronúncia precisa apenas de transcript textual.

### FR-12 — Reading

Textos devem respeitar vocabulário e estruturas do nível. Questões devem avaliar compreensão, não trivia.

### FR-13 — Writing

Prompts devem gerar respostas curtas e progressivas. A V1 deve suportar submissão/revisão mesmo quando a IA estiver indisponível.

Quando houver correção por IA, ela deve distinguir erro gramatical, escolha lexical, ordem, ortografia e naturalidade através de output estruturado validado e evals específicos por nível.

### FR-14 — AI Tutor

O tutor deve receber um contexto pedagógico derivado do estado real do aluno.

Deve ser capaz de:

- conversar dentro do nível permitido;
- explicar em português quando necessário;
- corrigir mensagens;
- propor microprática;
- evitar introduzir grande quantidade de conteúdo ainda não ensinado.

O tutor V1 cobre A0, A1 e A2; readiness exige casos de avaliação representativos dos três níveis.

### FR-15 — Progresso

O aluno deve ver:

- nível/unidade atual;
- sessões realizadas;
- aulas concluídas;
- revisões pendentes;
- domínio por habilidade em representação simples;
- erros/conceitos que precisam de atenção.

Conteúdo dispensado por ponto de entrada deve ser distinguível de conteúdo realmente concluído/dominado.

### FR-16 — Histórico

O sistema deve manter histórico suficiente para reconstruir:

- sessão planejada;
- atividades executadas;
- respostas;
- revisões;
- mudanças de mastery relevantes;
- origem do ponto de entrada quando isso afetar elegibilidade.

### FR-17 — Conteúdo versionado

Conteúdo publicado não pode ser alterado sem revisão identificável. Tentativas devem apontar para a revisão de conteúdo apresentada ao aluno.

### FR-18 — Administração de conteúdo

Na primeira fase, conteúdo pode ser mantido como arquivos estruturados versionados no repositório. Uma interface editorial é posterior.

## 5. Requisitos não funcionais

### NFR-01 — Performance

- páginas principais devem carregar de forma perceptivelmente rápida em conexão comum;
- evitar dependência de IA para renderizar navegação básica;
- sessão “Hoje” deve poder ser calculada deterministicamente quando IA estiver indisponível.

### NFR-02 — Resiliência

- reenvio de atividade não pode duplicar progresso;
- falha de IA não perde tentativa;
- falha de upload de áudio deve permitir recuperação/retry;
- sessão parcialmente concluída deve ser retomável;
- onboarding repetido/retry não cria `LanguageProfile`/`Enrollment` duplicados.

### NFR-03 — Acessibilidade

Meta mínima: WCAG 2.2 AA para fluxos principais.

### NFR-04 — Segurança

- autenticação segura;
- autorização por ownership;
- proteção de dados pessoais;
- secrets fora do código;
- validação de entrada;
- logs sem conteúdo sensível desnecessário.

### NFR-05 — Privacidade

Atender princípios de minimização de dados e LGPD desde a modelagem inicial.

### NFR-06 — Observabilidade

Erros, latência e operações críticas devem ser rastreáveis sem depender de reprodução manual.

### NFR-07 — Testabilidade

Regras de scheduler, mastery, progressão, placement/entry point e autorização devem ser testáveis sem browser e sem provider externo real.

### NFR-08 — Evolução multi-idioma

Nenhuma tabela central deve codificar “english” ou “portuguese” como hipótese fixa do domínio.

## 6. Critérios de aceite macro da V1

A V1 está pronta para uso pessoal contínuo quando:

- onboarding cria `LearnerProfile`, `LanguageProfile` e `Enrollment` corretamente e sem duplicidade;
- iniciante absoluto consegue entrar por A0 e falso iniciante consegue escolher A1/A2 sem fabricar mastery;
- A0, A1 e A2 possuem cobertura curricular representativa validada pelo Study Engine;
- Home produz uma sessão diária válida nos três níveis;
- aluno conclui aula e atividades sem inconsistência de progresso;
- itens vencidos retornam via SRS;
- sessão é retomável após interrupção;
- progresso reflete desempenho real, não apenas completion/placement;
- listening, reading, writing e speaking possuem caminhos ponta a ponta integrados à sessão;
- avaliação por IA de writing/speaking passa por provider abstraction, schemas, guardrails e evals;
- AI Tutor respeita contexto pedagógico A0/A1/A2 e possui fallback;
- testes automatizados cobrem regras críticas e transições entre níveis;
- CI bloqueia regressões básicas;
- segurança, logs e dados pessoais possuem controles documentados.

## 7. Requisitos adiados

- placement test/diagnóstico adaptativo completo;
- billing;
- planos pagos;
- organizações/escolas;
- professores;
- certificado;
- ranking social;
- cursos criados pelo usuário;
- marketplace;
- app nativo dedicado;
- C1/C2;
- tradução de UI para muitos idiomas.
