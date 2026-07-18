import { NavLink, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { clearAuth } from '@/api/http';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/creators', label: 'Creators' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/submissions', label: 'Submissions' },
  { to: '/settings', label: 'Settings' },
];

export default function Nav() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="font-semibold">jengkol</span>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Log out
      </Button>
    </nav>
  );
}
