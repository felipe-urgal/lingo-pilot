import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  Button,
  Dialog,
  IconButton,
  Input,
  Progress,
  Select,
  Textarea,
} from "../../../packages/ui/src/index.ts";

test("loading button prevents duplicate interaction", () => {
  render(<Button isLoading>Salvar</Button>);

  const button = screen.getByRole("button", { name: "Carregando" });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
});

test("form primitives expose labels and field errors", () => {
  render(
    <form>
      <Input error="Email inválido" id="email" label="Email" />
      <Textarea id="answer" label="Resposta" />
      <Select id="level" label="Nível" defaultValue="a0">
        <option value="a0">A0</option>
      </Select>
    </form>,
  );

  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
    "Email inválido",
  );
  expect(screen.getByLabelText("Resposta")).toBeInTheDocument();
  expect(screen.getByLabelText("Nível")).toBeInTheDocument();
});

test("icon button requires an accessible name", () => {
  render(
    <IconButton aria-label="Ajuda">
      <span aria-hidden="true">?</span>
    </IconButton>,
  );

  expect(screen.getByRole("button", { name: "Ajuda" })).toBeInTheDocument();
});

test("dialog maps keyboard cancellation to its close contract", () => {
  const onClose = vi.fn();
  render(
    <Dialog isOpen onClose={onClose} title="Confirmar">
      Conteúdo
    </Dialog>,
  );

  fireEvent.cancel(screen.getByRole("dialog", { name: "Confirmar" }));
  expect(onClose).toHaveBeenCalledOnce();
});

test("progress exposes value and visible percentage", () => {
  render(<Progress label="Sessão" value={40} />);

  expect(screen.getByRole("progressbar", { name: "Sessão" })).toHaveAttribute(
    "value",
    "40",
  );
  expect(screen.getByText("40%")).toBeInTheDocument();
});
