export default function ProtectedHomePage() {
  return (
    <section className="foundation" aria-labelledby="private-title">
      <p className="eyebrow">Área privada</p>
      <h1 id="private-title">Sessão autenticada.</h1>
      <p className="description">
        O shell protegido já resolve a identidade no servidor. As próximas
        features podem reutilizar o mesmo contrato de sessão e ownership.
      </p>
    </section>
  );
}
