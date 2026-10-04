export default function InboxPage() {
  const conversations = [
    { name: 'Amadou', status: 'En cours', time: 'Il y a 2 min' },
    { name: 'Awa', status: 'Nouveau', time: 'Il y a 8 min' },
    { name: 'Kévin', status: 'IA active', time: 'Il y a 14 min' },
  ];

  return (
    <section className="page-section">
      <div className="panel-card">
        <h3>Inbox</h3>
        <ul className="conversation-list">
          {conversations.map((item) => (
            <li key={item.name} className="conversation-row">
              <div>
                <strong>{item.name}</strong>
                <small>{item.status}</small>
              </div>
              <span>{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
