"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  IconButton,
  Input,
  Progress,
  Select,
  Sheet,
  Textarea,
} from "../../../../../packages/ui/src/index.ts";

function ActionExamples() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="demo-section">
      <h2>Ações e overlays</h2>
      <p>Estados essenciais com alvos confortáveis e foco visível.</p>
      <div className="demo-row">
        <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
        <Button onClick={() => setSheetOpen(true)} variant="secondary">
          Abrir sheet
        </Button>
        <IconButton aria-label="Ajuda">
          <span aria-hidden="true">?</span>
        </IconButton>
        <Button isLoading>Salvar</Button>
      </div>
      <Dialog
        actions={<Button onClick={() => setDialogOpen(false)}>Entendi</Button>}
        description="Escape e o botão de fechar usam o mesmo contrato de fechamento."
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Diálogo de exemplo"
      >
        Conteúdo focado, curto e sem decisões desnecessárias.
      </Dialog>
      <Sheet
        actions={<Button onClick={() => setSheetOpen(false)}>Fechar</Button>}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sheet de exemplo"
      >
        O mesmo primitive pode assumir apresentação lateral em telas amplas.
      </Sheet>
    </section>
  );
}

function FormExamples() {
  return (
    <section className="demo-section">
      <h2>Campos</h2>
      <p>Labels e mensagens permanecem associadas aos controles.</p>
      <div className="demo-form">
        <Input id="demo-name" label="Nome" placeholder="Seu nome" />
        <Textarea
          hint="Use uma frase curta."
          id="demo-answer"
          label="Resposta"
        />
        <Select id="demo-level" label="Nível inicial" defaultValue="a0">
          <option value="a0">A0</option>
          <option value="a1">A1</option>
          <option value="a2">A2</option>
        </Select>
        <Input
          error="Informe um email válido."
          id="demo-error"
          label="Campo com erro"
        />
      </div>
    </section>
  );
}

function FeedbackExamples() {
  return (
    <section className="demo-section">
      <h2>Feedback</h2>
      <Alert variant="info">Informação contextual.</Alert>
      <Alert variant="success">Ação concluída.</Alert>
      <Alert variant="warning">Atenção antes de continuar.</Alert>
      <Alert variant="danger">Não foi possível concluir a ação.</Alert>
      <Progress label="Progresso da sessão" value={42} />
    </section>
  );
}

export function DesignSystemDemo() {
  return (
    <div className="design-system-grid">
      <ActionExamples />
      <FormExamples />
      <FeedbackExamples />
    </div>
  );
}
