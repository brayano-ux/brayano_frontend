export default function AgentPage() {
  return (
    <section className="page-section">
      <div className="panel-card">
        <h3>Agent IA</h3>
        <form className="settings-form">
          <label>
            Nom de l’agent
            <input defaultValue="Brayano Sales Agent" />
          </label>
          <label>a
            Prompt système
            <textarea defaultValue="Tu qualifies les prospects et demandes des informations utiles avant de passer à l’action." rows={5} />
          </label>
          <button type="button" className="primary-button">Enregistrer</button>
        </form>
      </div>
    </section>
  );
}
