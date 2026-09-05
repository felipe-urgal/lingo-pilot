# AI Evals — contrato de qualidade

Este documento define o contrato operacional da issue #41 para avaliar comportamento probabilístico sem misturar evals com testes unitários nem fazer o CI rápido depender de provider pago.

## Objetivos

O harness deve permitir que cada feature de IA registre casos versionados, execute checks determinísticos quando a propriedade for verificável e preserve revisão humana explícita quando uma dimensão não puder ser reduzida honestamente a uma heurística.

As dimensões canônicas são:

- `correctness`;
- `pedagogical_fit`;
- `level_adherence`;
- `safety_privacy`;
- `latency_cost`.

## Dataset versionado

Um dataset possui `id`, `version`, `feature` e uma lista de casos com IDs estáveis. Mudança semântica no conjunto de casos ou na interpretação do baseline exige nova versão.

Casos podem carregar tags editoriais e um pedido explícito de revisão humana (`rubricId` + motivo). Input e output brutos **não** fazem parte do relatório padrão.

## Scorers determinísticos

Scorers retornam score entre `0` e `1`, dimensão e severidade:

- `critical`: qualquer falha torna o relatório `failed`, mesmo que a média das demais propriedades seja alta;
- `warning`: informa regressão/local de atenção, sem mascarar checks críticos.

A foundation inclui scorers reutilizáveis para:

- tamanho máximo de texto;
- IDs restritos a uma allowlist de currículo/contexto;
- substrings explicitamente proibidas;
- versão esperada de schema.

Features podem adicionar scorers próprios sem depender da UI.

## Thresholds

Thresholds por dimensão são opcionais e também variam de `0` a `1`. Eles servem para detectar regressões agregadas, mas nunca substituem falhas `critical`.

Não usar apenas média global: uma resposta pode ser curta e natural e ainda assim violar o teto de nível, citar Concept inexistente ou vazar dado sensível.

## Baseline versionado e comparação

`packages/ai/src/eval-baseline.ts` transforma um `EvalReport` em um artefato de baseline redigido com `schemaVersion`, identidade/versionamento do dataset, score por dimensão e score por par estável `caseId/scorerId`.

O baseline deliberadamente **não** persiste input, output nem metadata de provider/prompt. Ele registra apenas o necessário para detectar regressão e pode ser serializado pelo runner futuro sem ampliar a superfície de dados sensíveis.

A comparação falha de forma explícita quando:

- dataset id/version/feature não corresponde ao baseline;
- o `EvalReport` atual já está `failed`, inclusive por um scorer crítico novo que não existia no baseline;
- um check existente no baseline desaparece do relatório atual;
- um score por case/scorer cai abaixo do baseline;
- um score agregado por dimensão cai abaixo do baseline.

A severidade do check é preservada na regressão. Assim, remover silenciosamente um scorer crítico, degradar um caso crítico ou adicionar um guard crítico que passa a falhar continua visível mesmo que o baseline seja anterior àquele guard.

O contrato de baseline não fabrica um baseline de produção. O primeiro arquivo de baseline real deve nascer junto de uma feature candidata real, depois de execução válida e revisão do resultado. Alterar semanticamente o dataset exige nova versão em vez de comparar conjuntos incompatíveis.

## Revisão humana

Naturalidade, qualidade pedagógica ou aceitabilidade linguística podem exigir julgamento humano. Nesses casos o case declara `humanReview` e o harness retorna `needs_review` se todos os checks automáticos passarem.

Não criar scorer pseudo-objetivo somente para transformar uma decisão subjetiva em número.

## Privacidade do relatório

O relatório padrão contém somente:

- identidade/versionamento do dataset;
- IDs dos casos;
- checks e scores;
- pedido de revisão humana quando houver;
- metadata operacional permitida: provider/model, prompt id/version, schema version, latency e token counts.

Input e output completos ficam fora do relatório padrão. Dataset versionado usa dados sintéticos/redigidos; PII real não entra em fixtures.

## Execução offline

O CI rápido usa provider fake e fixtures determinísticas. Isso valida o próprio harness, parsing, metadata, allowlists, fail-closed, baseline/comparison e regressões de contratos sem chave externa.

Nenhum teste offline deve fazer chamada de rede para provider de IA.

## Execução online

A execução online é um pipeline separado do `pnpm check`. Ela deve reutilizar exatamente o mesmo `EvalDataset`, `EvalScorer`, `EvalReport` e `EvalBaseline` da execução offline; não haverá uma segunda implementação de scoring/comparison em script JavaScript paralelo.

Antes de habilitar a primeira execução paga, o runner online precisa definir explicitamente:

- feature/dataset selecionados;
- provider/model e prompt versions;
- credencial server-only;
- budget máximo de casos/tokens/custo;
- destino/retention do relatório e baseline;
- baseline versionado aprovado para comparação;
- comportamento de falha do job.

Essa ativação deve acontecer junto da primeira feature real que possua dataset e prompt executáveis. A foundation #41 não deve fazer uma chamada artificial apenas para provar conectividade.

## Cobertura por nível

A foundation não fabrica casos A1/A2 para features que ainda não existem. Cada feature V1 deve adicionar cobertura A0/A1/A2 proporcional aos níveis que realmente suporta antes de release.

Entry point manual nunca deve transformar conteúdo dispensado em mastery. Evals de tutor/writing/speaking precisam incluir essa regressão quando essas features forem habilitadas.

## Adicionando uma regressão

Quando uma falha real for encontrada:

1. remover/redigir qualquer PII;
2. criar um case sintético mínimo que reproduza a propriedade;
3. escolher scorer determinístico quando possível ou rubric humana quando necessário;
4. versionar o dataset se a mudança alterar seu contrato/baseline;
5. registrar prompt/model/schema metadata do resultado comparado;
6. revisar/atualizar o baseline somente quando a mudança esperada for intencional;
7. impedir release se a regressão for `critical`.

## Estado desta foundation

O núcleo tipado, a execução offline com fake provider e o contrato de baseline/comparação pertencem à #41. Runner online e baseline real/pago só devem ser ligados quando houver uma feature candidata real, para evitar custo e integração artificial sem valor pedagógico.
