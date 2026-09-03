export default function TodayLoading() {
  return (
    <section
      className="today-card"
      aria-busy="true"
      aria-labelledby="today-loading-title"
    >
      <p className="eyebrow">Hoje</p>
      <h1 id="today-loading-title">Preparando sua próxima ação...</h1>
      <p className="description">
        Carregando sua sessão e o conteúdo elegível.
      </p>
    </section>
  );
}
