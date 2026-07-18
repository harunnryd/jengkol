import { Outlet } from 'react-router';
import Nav from './Nav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
