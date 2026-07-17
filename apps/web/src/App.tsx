import { useEffect, useState } from 'react';
import { listAgencies, type Agency } from './api/client';

export default function App() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAgencies()
      .then(setAgencies)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <h1>Jengkol — Creator Ops Dashboard</h1>
      <p>Agencies (from the API):</p>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">Error: {error}</p>}
      {!loading && !error && agencies.length === 0 && <p>No agencies yet.</p>}
      <ul>
        {agencies.map((agency) => (
          <li key={agency.id}>{agency.name}</li>
        ))}
      </ul>
    </main>
  );
}
