export default function SettingsPage() {
  return (
    <section className="page-section">
      <div className="panel-card">
        <h3>Paramètres</h3>
        <form className="settings-form">
          <label>
            Délai de réponse IA (secondes)
            <input type="number" defaultValue={7} />
          </label>
          <label>
            Fallback responsable
            <input defaultValue="Aucun" />
          </label>
          <button type="button" className="primary-button">Sauvegarder</button>
        </form>
      </div>
    </section>
  );
}
