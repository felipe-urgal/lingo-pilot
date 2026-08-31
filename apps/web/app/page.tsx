export default function HomePage() {
  return (
    <main className="shell">
      <section className="foundation" aria-labelledby="foundation-title">
        <p className="eyebrow">LingoPilot</p>
        <h1 id="foundation-title">Fundação pronta para construir.</h1>
        <p className="description">
          O shell técnico está ativo. Produto, Study Engine e design system
          entram nas issues dedicadas.
        </p>
        <dl className="status" aria-label="Contrato local">
          <div>
            <dt>Web</dt>
            <dd>127.0.0.1:5400</dd>
          </div>
          <div>
            <dt>E2E</dt>
            <dd>127.0.0.1:5401</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
