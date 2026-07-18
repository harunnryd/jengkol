import { useEffect, useState, type FormEvent } from 'react';
import {
  listSubmissions,
  createSubmission,
  syncSubmission,
  type Submission,
} from '@/api/submissions';
import { recalculatePayout, markPayoutPaid } from '@/api/payouts';
import { listCampaigns, type Campaign } from '@/api/campaigns';
import { listCreators, type Creator } from '@/api/creators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const emptyForm = { campaignId: '', creatorId: '', contentUrl: '', externalContentId: '' };

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listSubmissions(page)
      .then((result) => {
        setSubmissions(result.data);
        setTotalPages(result.meta.totalPages);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset loading state on page change
  useEffect(load, [page]);

  useEffect(() => {
    listCampaigns(1, 100).then((r) => setCampaigns(r.data));
    listCreators(1, 100).then((r) => setCreators(r.data));
  }, []);

  const openCreateDialog = () => {
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      await createSubmission(form);
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      load();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? id;
  const creatorName = (id: string) => creators.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <Button onClick={openCreateDialog}>New submission</Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.creator.name}</TableCell>
                  <TableCell>{campaignName(submission.campaignId)}</TableCell>
                  <TableCell>{submission.views.toLocaleString()}</TableCell>
                  <TableCell>
                    {submission.payout ? (
                      <span className="flex items-center gap-2">
                        {submission.payout.amount.toLocaleString()}
                        <Badge
                          variant={submission.payout.status === 'PAID' ? 'default' : 'secondary'}
                        >
                          {submission.payout.status}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAction(() => syncSubmission(submission.id))}
                    >
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAction(() => recalculatePayout(submission.id))}
                    >
                      Recalculate
                    </Button>
                    {submission.payout && submission.payout.status !== 'PAID' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runAction(() => markPayoutPaid(submission.id))}
                      >
                        Mark paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New submission</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Campaign</Label>
              <Select
                value={form.campaignId}
                onValueChange={(v) => setForm({ ...form, campaignId: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign">
                    {(value: string | null) => (value ? campaignName(value) : 'Select a campaign')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Creator</Label>
              <Select
                value={form.creatorId}
                onValueChange={(v) => setForm({ ...form, creatorId: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a creator">
                    {(value: string | null) => (value ? creatorName(value) : 'Select a creator')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contentUrl">Content URL</Label>
              <Input
                id="contentUrl"
                type="url"
                value={form.contentUrl}
                onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="externalContentId">External content ID</Label>
              <Input
                id="externalContentId"
                value={form.externalContentId}
                onChange={(e) => setForm({ ...form, externalContentId: e.target.value })}
                required
              />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={!form.campaignId || !form.creatorId}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
