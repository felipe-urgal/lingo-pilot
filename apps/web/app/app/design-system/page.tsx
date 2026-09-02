import { DesignSystemDemo } from "./design-system-demo";

export default function DesignSystemPage() {
  return (
    <section
      className="design-system-page"
      aria-labelledby="design-system-title"
    >
      <div>
        <p className="eyebrow">Foundation</p>
        <h1 id="design-system-title">Design system</h1>
        <p className="description">
          Página interna para validar tokens, estados e primitives essenciais.
        </p>
      </div>
      <DesignSystemDemo />
    </section>
  );
}
