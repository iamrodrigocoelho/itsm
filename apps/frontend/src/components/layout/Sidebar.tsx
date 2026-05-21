import { NavLink } from 'react-router-dom';
import { Users, ClipboardList, FileText, LayoutDashboard } from 'lucide-react';
import type { UserSummaryDto } from '@itsm/shared-types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard size={16} />,
    roles: ['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN'],
  },
  {
    to: '/admin/usuarios',
    label: 'Usuários',
    icon: <Users size={16} />,
    roles: ['ANALISTA_TI', 'ADMIN'],
  },
  {
    to: '/tickets',
    label: 'Chamados',
    icon: <ClipboardList size={16} />,
    roles: ['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN'],
  },
  {
    to: '/admin/auditoria',
    label: 'Auditoria',
    icon: <FileText size={16} />,
    roles: ['ANALISTA_TI', 'AUDITOR', 'ADMIN'],
  },
];

interface SidebarProps {
  user: UserSummaryDto;
}

export function Sidebar({ user }: SidebarProps) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-surface-1 border-r border-hairline flex flex-col">
      <div className="h-14 flex items-center px-spacing-lg border-b border-hairline">
        <span className="text-body-sm font-medium text-ink-muted uppercase tracking-wide">Menu</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-spacing-sm px-spacing-xs">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-spacing-xs px-spacing-sm py-2 rounded-sm text-body-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-surface-2 text-ink'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
              ].join(' ')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-spacing-sm border-t border-hairline">
        <div className="px-spacing-sm py-spacing-xs">
          <p className="text-body-sm font-medium text-ink truncate">{user.nome}</p>
          <p className="text-caption text-ink-muted truncate">{user.role.replace(/_/g, ' ')}</p>
        </div>
      </div>
    </aside>
  );
}
