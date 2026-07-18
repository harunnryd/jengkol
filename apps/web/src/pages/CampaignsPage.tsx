import { useEffect, useState, type FormEvent } from 'react';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  type Campaign,
  type CampaignInput,
  type RateModel,
} from '@/api/campaigns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const emptyForm: CampaignInput = {
  name: '',
  budget: 0,
  rateModel: 'PER_VIEW',
  ratePerView: 0,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listCampaigns(page)
      .then((result) => {
        setCampaigns(result.data);
        setTotalPages(result.meta.totalPages);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset loading state on page change
  useEffect(load, [page]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm({
      name: campaign.name,
      brief: campaign.brief ?? undefined,
      budget: campaign.budget,
      rateModel: campaign.rateModel,
      flatRate: campaign.flatRate ?? undefined,
      ratePerView: campaign.ratePerView ?? undefined,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      if (editingId) {
        await updateCampaign(editingId, form);
      } else {
        await createCampaign(form);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!window.confirm(`Delete ${campaign.name}?`)) return;
    await deleteCampaign(campaign.id);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <Button onClick={openCreateDialog}>New campaign</Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Rate model</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>{campaign.budget.toLocaleString()}</TableCell>
                  <TableCell>{campaign.rateModel}</TableCell>
                  <TableCell>
                    {campaign.rateModel === 'FLAT' ? campaign.flatRate : campaign.ratePerView}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(campaign)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(campaign)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No campaigns yet.
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
            <DialogTitle>{editingId ? 'Edit campaign' : 'New campaign'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brief">Brief</Label>
              <Input
                id="brief"
                value={form.brief ?? ''}
                onChange={(e) => setForm({ ...form, brief: e.target.value || undefined })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rate model</Label>
              <Select
                value={form.rateModel}
                onValueChange={(v) => setForm({ ...form, rateModel: v as RateModel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FLAT">Flat</SelectItem>
                  <SelectItem value="PER_VIEW">Per view</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.rateModel === 'FLAT' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="flatRate">Flat rate</Label>
                <Input
                  id="flatRate"
                  type="number"
                  min={0}
                  value={form.flatRate ?? ''}
                  onChange={(e) => setForm({ ...form, flatRate: Number(e.target.value) })}
                  required
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ratePerView">Rate per view</Label>
                <Input
                  id="ratePerView"
                  type="number"
                  min={0}
                  value={form.ratePerView ?? ''}
                  onChange={(e) => setForm({ ...form, ratePerView: Number(e.target.value) })}
                  required
                />
              </div>
            )}
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
