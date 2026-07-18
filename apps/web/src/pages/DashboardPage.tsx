import { useEffect, useState } from 'react';
import { getOwnAgency, type Agency } from '@/api/agencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {agency && (
        <Card>
          <CardHeader>
            <CardTitle>{agency.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the nav above to manage creators, campaigns, and submissions.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
