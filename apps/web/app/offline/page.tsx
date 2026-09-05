export default function OfflinePage() {
  return (
    <main className="shell" id="main-content">
      <section className="foundation auth-card" aria-labelledby="offline-title">
        <p className="eyebrow">LingoPilot</p>
        <h1 id="offline-title">Você está offline</h1>
        <p className="description">
          O conteúdo privado e os envios de estudo não são armazenados no
          navegador para replay automático. Reconecte-se para continuar com
          seus dados atualizados.
        </p>
        <p>
          <a className="text-link" href="/app/today">
            Tentar novamente
          </a>
        </p>
      </section>
    </main>
  );
}
