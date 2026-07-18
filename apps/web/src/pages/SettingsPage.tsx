import { useEffect, useState, type FormEvent } from 'react';
import { getCurrentUser } from '@/api/http';
import { getOwnAgency, updateOwnAgency, inviteMember } from '@/api/agencies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  const isOwner = getCurrentUser()?.role === 'OWNER';

  const [agencyName, setAgencyName] = useState('');
  const [renameStatus, setRenameStatus] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    getOwnAgency().then((agency) => setAgencyName(agency.name));
  }, []);

  const handleRename = async (event: FormEvent) => {
    event.preventDefault();
    setRenameStatus(null);
    setRenameError(null);
    try {
      await updateOwnAgency(agencyName);
      setRenameStatus('Saved.');
    } catch (err) {
      setRenameError((err as Error).message);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    setInviteStatus(null);
    setInviteError(null);
    try {
      const member = await inviteMember(inviteEmail, invitePassword);
      setInviteStatus(`Invited ${member.email} as ${member.role}.`);
      setInviteEmail('');
      setInvitePassword('');
    } catch (err) {
      setInviteError((err as Error).message);
    }
  };

  if (!isOwner) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Only the agency owner can change settings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Agency name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRename} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agencyName">Name</Label>
              <Input
                id="agencyName"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-fit">
              Save
            </Button>
            {renameStatus && <p className="text-sm text-muted-foreground">{renameStatus}</p>}
            {renameError && (
              <p role="alert" className="text-sm text-destructive">
                {renameError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite a team member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invitePassword">Temporary password</Label>
              <Input
                id="invitePassword"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-fit">
              Invite
            </Button>
            {inviteStatus && <p className="text-sm text-muted-foreground">{inviteStatus}</p>}
            {inviteError && (
              <p role="alert" className="text-sm text-destructive">
                {inviteError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
