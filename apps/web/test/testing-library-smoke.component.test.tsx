import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

function TestingLibraryProbe() {
  return (
    <form>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" />
      <button type="submit">Entrar</button>
    </form>
  );
}

test("web component tests run with Testing Library and DOM matchers", () => {
  render(<TestingLibraryProbe />);

  expect(screen.getByLabelText("Email")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
});
