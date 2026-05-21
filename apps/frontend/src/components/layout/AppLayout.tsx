import { Outlet, Navigate } from 'react-router-dom';
import type { UserSummaryDto } from '@itsm/shared-types';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface AppLayoutProps {
  user: UserSummaryDto | null;
  onLogout: () => void;
}

export function AppLayout({ user, onLogout }: AppLayoutProps) {
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav user={user} onLogout={onLogout} />

        <main className="flex-1 overflow-y-auto p-spacing-xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
