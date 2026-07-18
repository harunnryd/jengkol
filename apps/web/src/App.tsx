import { useEffect, useState } from 'react';
import { getOwnAgency, getToken, login, type Agency } from './api/client';

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Jengkol — Sign in</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function Dashboard() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getOwnAgency()
      .then((result) => {
        if (!cancelled) setAgency(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Jengkol — Creator Ops Dashboard</h1>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">Error: {error}</p>}
      {agency && <p>Signed in to: {agency.name}</p>}
    </main>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getToken()));

  return authed ? <Dashboard /> : <LoginForm onSuccess={() => setAuthed(true)} />;
}
