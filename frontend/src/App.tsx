import "./index.css";

const statusItems = [
  "Backend: Django + DRF (health em /health)",
  "Frontend: React + Vite (TypeScript habilitado)",
  "Compose: backend, frontend, Postgres, Redis prontos",
];

const stackPills = [
  { label: "Django/DRF", tone: "primary" },
  { label: "React + TS", tone: "primary" },
  { label: "CI pronto para lint/test", tone: "neutral" },
];

export default function App() {
  return (
    <div className="shell">
      <header className="hero">
        <p className="eyebrow">Agendador · Tetê Araújo</p>
        <h1>Escala clínica com cadastros auditáveis e publicação segura</h1>
        <p className="lede">
          Stack inicial pronta para modelar Profissional, Local e geração da escala. Jobs, Google
          Calendar e edição manual virão na sequência.
        </p>
        <div className="pill-row">
          {stackPills.map((pill) => (
            <span className="pill" key={pill.label} data-tone={pill.tone}>
              {pill.label}
            </span>
          ))}
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Estado do projeto</h2>
          <span className="badge">MVP · Setup</span>
        </div>
        <ul className="bullet-list">
          {statusItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
