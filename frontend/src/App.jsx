import "./index.css";

export default function App() {
  return (
    <div className="app">
      <header>
        <h1>Agendador</h1>
        <p>Dashboard inicial em construção</p>
      </header>
      <section className="card">
        <h2>Status</h2>
        <ul>
          <li>Backend: Django + DRF (health em /health)</li>
          <li>Frontend: Vite + React</li>
          <li>Docker: compose com Postgres e Redis</li>
        </ul>
      </section>
    </div>
  );
}
