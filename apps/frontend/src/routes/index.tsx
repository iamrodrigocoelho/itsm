import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { UsuariosPage } from '@/pages/admin/UsuariosPage';
import { NovoUsuarioPage } from '@/pages/admin/NovoUsuarioPage';
import { EditarUsuarioPage } from '@/pages/admin/EditarUsuarioPage';
import { ImportarUsuariosPage } from '@/pages/admin/ImportarUsuariosPage';
import { AuditoriaPage } from '@/pages/admin/AuditoriaPage';
import { CatalogoPage } from '@/pages/CatalogoPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { NovoTicketPage } from '@/pages/NovoTicketPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import type { UserSummaryDto } from '@itsm/shared-types';

interface AppRoutesProps {
  user: UserSummaryDto | null;
  onLogout: () => void;
  onPasswordChanged: (updated: UserSummaryDto) => void;
}

function RequireRole({
  user,
  roles,
  children,
}: {
  user: UserSummaryDto | null;
  roles: string[];
  children: React.ReactNode;
}) {
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes({ user, onLogout, onPasswordChanged }: AppRoutesProps) {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Password change — accessible even when mustChangePassword=true */}
      <Route
        path="/change-password"
        element={
          user ? (
            <ChangePasswordPage user={user} onPasswordChanged={onPasswordChanged} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Styleguide: public in dev, Admin-only in prod */}
      <Route
        path="/styleguide"
        element={
          import.meta.env.DEV ? (
            <StyleguidePage />
          ) : (
            <RequireRole user={user} roles={['ADMIN']}>
              <StyleguidePage />
            </RequireRole>
          )
        }
      />

      {/* Authenticated layout shell */}
      <Route element={<AppLayout user={user} onLogout={onLogout} />}>
        {/* Dashboard — all authenticated roles */}
        <Route
          path="/"
          element={
            <div className="max-w-content">
              <h1 className="text-headline font-semibold text-ink">Dashboard</h1>
              <p className="mt-spacing-xs text-body text-ink-muted">Em desenvolvimento — Sprint 5.</p>
            </div>
          }
        />

        {/* Catálogo */}
        <Route
          path="/catalogo"
          element={
            user ? <CatalogoPage /> : <Navigate to="/login" replace />
          }
        />

        {/* Tickets */}
        <Route
          path="/tickets"
          element={
            user ? <TicketsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/tickets/novo/:slug"
          element={
            user ? <NovoTicketPage user={user} /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/tickets/:id"
          element={
            user ? <TicketDetailPage user={user} /> : <Navigate to="/login" replace />
          }
        />

        {/* Admin — Usuários */}
        <Route
          path="/admin/usuarios"
          element={
            <RequireRole user={user} roles={['ANALISTA_TI', 'ADMIN']}>
              <UsuariosPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/usuarios/novo"
          element={
            <RequireRole user={user} roles={['ADMIN']}>
              <NovoUsuarioPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/usuarios/importar"
          element={
            <RequireRole user={user} roles={['ADMIN']}>
              <ImportarUsuariosPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/usuarios/:id"
          element={
            <RequireRole user={user} roles={['ADMIN']}>
              <EditarUsuarioPage />
            </RequireRole>
          }
        />

        {/* Admin — Auditoria */}
        <Route
          path="/admin/auditoria"
          element={
            <RequireRole user={user} roles={['ANALISTA_TI', 'AUDITOR', 'ADMIN']}>
              <AuditoriaPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
