import { Navigate, Outlet } from 'react-router';
import { getToken } from '@/api/http';

export default function ProtectedRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
