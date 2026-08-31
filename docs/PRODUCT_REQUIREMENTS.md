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

Dados mínimos do perfil de aprendizado:

- idioma de interface;
- idioma fonte;
- idioma alvo;
- nível inicial;
- meta diária em minutos;
- timezone;
- preferências de áudio e speaking.

### FR-02 — Onboarding

O onboarding deve:

1. explicar a proposta em linguagem curta;
2. perguntar objetivo principal;
3. coletar tempo diário;
4. permitir escolher “começar do zero” ou realizar diagnóstico futuramente;
5. criar `LearnerProfile` e matrícula no curso;
6. gerar a primeira sessão diária.

### FR-03 — Currículo

O sistema deve representar:

```text
Course → Level → Unit → Lesson → Activity
```

Cada lesson possui objetivos, pré-requisitos, conceitos e itens de vocabulário introduzidos.

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
- enviar para avaliação;
- receber feedback compreensível;
- excluir gravação conforme política de retenção.

### FR-12 — Reading

Textos devem respeitar vocabulário e estruturas do nível. Questões devem avaliar compreensão, não trivia.

### FR-13 — Writing

Prompts devem gerar respostas curtas e progressivas. Correção deve distinguir erro gramatical, escolha lexical, ordem, ortografia e naturalidade.

### FR-14 — AI Tutor

O tutor deve receber um contexto pedagógico derivado do estado real do aluno.

Deve ser capaz de:

- conversar dentro do nível permitido;
- explicar em português quando necessário;
- corrigir mensagens;
- propor microprática;
- evitar introduzir grande quantidade de conteúdo ainda não ensinado.

### FR-15 — Progresso

O aluno deve ver:

- nível/unidade atual;
- sessões realizadas;
- aulas concluídas;
- revisões pendentes;
- domínio por habilidade em representação simples;
- erros/conceitos que precisam de atenção.

### FR-16 — Histórico

O sistema deve manter histórico suficiente para reconstruir:

- sessão planejada;
- atividades executadas;
- respostas;
- revisões;
- mudanças de mastery relevantes.

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
- sessão parcialmente concluída deve ser retomável.

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

Regras de scheduler, mastery, progressão e autorização devem ser testáveis sem browser e sem provider externo real.

### NFR-08 — Evolução multi-idioma

Nenhuma tabela central deve codificar “english” ou “portuguese” como hipótese fixa do domínio.

## 6. Critérios de aceite macro da V1

A V1 está pronta para uso pessoal contínuo quando:

- onboarding cria perfil e curso corretamente;
- Home produz uma sessão diária válida;
- aluno conclui aula e atividades sem inconsistência de progresso;
- itens vencidos retornam via SRS;
- sessão é retomável após interrupção;
- progresso reflete desempenho;
- listening e speaking funcionam ponta a ponta;
- AI Tutor respeita contexto pedagógico e possui fallback;
- testes automatizados cobrem regras críticas;
- CI bloqueia regressões básicas;
- segurança, logs e dados pessoais possuem controles documentados.

## 7. Requisitos adiados

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
