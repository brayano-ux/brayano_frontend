export default function OverviewPage() {
  const stats = [
    { label: 'Conversations actives', value: '128' },
    { label: 'Messages aujourd’hui', value: '2 340' },
    { label: 'WhatsApp', value: 'Connecté' },
    { label: 'Prospects qualifiés', value: '76' },
  ];

  return (
    <section className="page-section">
      <div className="stats-grid">
        {stats.map((item) => (
          <div key={item.label} className="stat-card">
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel-card">
          <h3>Conversations récentes</h3>
          <ul className="list-soft">
            <li>Marie — Demande de devis</li>
            <li>Ali — Besoin urgent</li>
            <li>Françoise — Suivi commercial</li>
          </ul>
        </div>

        <div className="panel-card">
          <h3>Métriques commerciales</h3>
          <ul className="list-soft">
            <li>Zone Dakar : 42 messages</li>
            <li>Zone Abidjan : 26 messages</li>
            <li>Zone Saint-Louis : 18 messages</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
