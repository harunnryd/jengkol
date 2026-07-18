import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CreatorsPage from '@/pages/CreatorsPage';
import CampaignsPage from '@/pages/CampaignsPage';
import SubmissionsPage from '@/pages/SubmissionsPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="creators" element={<CreatorsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="submissions" element={<SubmissionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
