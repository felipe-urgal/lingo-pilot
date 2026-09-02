# Design System — LingoPilot

Este documento registra a baseline implementada pela issue #13. `docs/UX_AND_DESIGN.md` continua sendo a fonte de princípios de experiência; aqui ficam os contratos concretos de implementação.

## Objetivo

O design system existe para reduzir divergência entre features e garantir que acessibilidade, estados e linguagem visual não precisem ser reinventados em cada tela.

A baseline é deliberadamente pequena. Novos primitives entram somente quando uma feature real demonstrar necessidade.

## Localização

```text
packages/ui/src/
  styles.css    tokens semânticos e estilos dos primitives
  button.tsx    Button e IconButton
  field.tsx     Input, Textarea e Select
  feedback.tsx  Alert e Progress
  dialog.tsx    Dialog e Sheet
  index.ts      API pública do package
```

A aplicação web importa `styles.css` uma única vez no root layout. CSS específico de layout pode permanecer em `apps/web/app/globals.css`, mas deve consumir tokens semânticos em vez de duplicar valores de cor, foco, radius ou spacing.

## Tokens

A baseline cobre:

- cores de canvas, surface, texto, border e estados semânticos;
- tipografia e line-height;
- spacing;
- radius;
- elevation;
- altura mínima de controles;
- focus ring;
- duração/easing de motion.

Features não devem espalhar hex de significado semântico. Se um novo significado visual for realmente necessário, crie ou ajuste um token no design system e documente a intenção.

Dark mode está fora da baseline porque ampliaria o escopo sem necessidade de produto comprovada. Os nomes dos tokens são semânticos para permitir uma evolução futura sem acoplar features a uma paleta específica.

## Primitives

### Button e IconButton

- `Button` possui variantes `primary`, `secondary` e `danger`;
- `isLoading` desabilita a ação para evitar clique duplicado e expõe `aria-busy`;
- `IconButton` exige `aria-label` por contrato de tipo;
- controles interativos têm alvo mínimo de 44px.

### Campos

`Input`, `Textarea` e `Select` exigem `id` e `label`. `hint` e `error` são associados via `aria-describedby`, e erro também define `aria-invalid`.

### Alert e Progress

`Alert` usa variantes semânticas e live region apropriada. `Progress` usa o elemento HTML nativo, mostra percentual em texto e mantém accessible name explícito.

### Dialog e Sheet

`Dialog` usa o elemento nativo `dialog` com `showModal()` para aproveitar gerenciamento de foco e interação modal do browser. Escape chama o mesmo contrato `onClose`. `Sheet` reutiliza o comportamento e altera somente a apresentação.

## Motion e acessibilidade

- todos os controles têm foco visível;
- informação essencial não depende somente de cor;
- `prefers-reduced-motion: reduce` elimina spinner contínuo e reduz durações;
- skip link global permite chegar diretamente ao conteúdo principal;
- login e shell usam landmarks semânticos e o mesmo conjunto de primitives.

A meta dos fluxos principais permanece WCAG 2.2 AA conforme `docs/UX_AND_DESIGN.md`.

## Validação

A rota autenticada `/app/design-system` é uma página interna de demonstração para inspeção manual de states/primitives sem transformar o produto em catálogo de componentes.

Component tests ficam em `apps/web/test/**/*.component.test.tsx` e devem priorizar queries por role/label. A baseline cobre loading/disabled, labels/erros, nome acessível de IconButton, cancelamento de Dialog e valor de Progress.

## Regra de evolução

Antes de criar um novo componente compartilhado, confirme:

1. existe comportamento ou linguagem visual repetida em uma feature real;
2. o primitive reduz decisões inconsistentes sem esconder regra de negócio;
3. estados de disabled/loading/error e acessibilidade aplicáveis estão definidos;
4. o componente não introduz dependência de domínio, banco ou provider externo.
