import { useEffect, useState, type FormEvent } from 'react';
import {
  listCreators,
  createCreator,
  updateCreator,
  deleteCreator,
  type Creator,
  type CreatorInput,
  type CreatorType,
  type Platform,
} from '@/api/creators';
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

const emptyForm: CreatorInput = {
  name: '',
  type: 'KOL',
  platform: 'YOUTUBE',
  externalHandle: '',
};

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreatorInput>(emptyForm);
  const [nicheText, setNicheText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listCreators(page)
      .then((result) => {
        setCreators(result.data);
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
    setNicheText('');
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (creator: Creator) => {
    setEditingId(creator.id);
    setForm({
      name: creator.name,
      type: creator.type,
      platform: creator.platform,
      externalHandle: creator.externalHandle,
      followers: creator.followers ?? undefined,
      avgEngagementRate: creator.avgEngagementRate ?? undefined,
    });
    setNicheText(creator.niche.join(', '));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const niche = nicheText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    try {
      if (editingId) {
        await updateCreator(editingId, { ...form, niche });
      } else {
        await createCreator({ ...form, niche });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleDelete = async (creator: Creator) => {
    if (!window.confirm(`Delete ${creator.name}?`)) return;
    await deleteCreator(creator.id);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Creators</h1>
        <Button onClick={openCreateDialog}>New creator</Button>
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
                <TableHead>Type</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((creator) => (
                <TableRow key={creator.id}>
                  <TableCell>{creator.name}</TableCell>
                  <TableCell>{creator.type}</TableCell>
                  <TableCell>{creator.platform}</TableCell>
                  <TableCell>{creator.externalHandle}</TableCell>
                  <TableCell>{creator.followers ?? '—'}</TableCell>
                  <TableCell>{creator.niche.length > 0 ? creator.niche.join(', ') : '—'}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(creator)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(creator)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {creators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No creators yet.
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
            <DialogTitle>{editingId ? 'Edit creator' : 'New creator'}</DialogTitle>
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
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as CreatorType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KOL">KOL</SelectItem>
                  <SelectItem value="CLIPPER">Clipper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm({ ...form, platform: v as Platform })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YOUTUBE">YouTube</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="externalHandle">Handle</Label>
              <Input
                id="externalHandle"
                value={form.externalHandle}
                onChange={(e) => setForm({ ...form, externalHandle: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="followers">Followers</Label>
              <Input
                id="followers"
                type="number"
                value={form.followers ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    followers: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="niche">Niche (comma-separated)</Label>
              <Input
                id="niche"
                placeholder="beauty, skincare"
                value={nicheText}
                onChange={(e) => setNicheText(e.target.value)}
              />
            </div>
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
