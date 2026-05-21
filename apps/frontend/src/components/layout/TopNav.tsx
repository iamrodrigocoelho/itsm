import { LogOut } from 'lucide-react';
import type { UserSummaryDto } from '@itsm/shared-types';

interface TopNavProps {
  user: UserSummaryDto;
  onLogout: () => void;
}

export function TopNav({ user, onLogout }: TopNavProps) {
  return (
    <header className="top-nav flex items-center justify-between px-spacing-xl">
      <span className="text-body-sm font-medium text-ink">ITSM — Conexão Tech</span>

      <div className="flex items-center gap-spacing-md">
        <span className="text-body-sm text-ink-muted hidden tablet:block">{user.email}</span>

        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary flex items-center gap-2 px-spacing-sm py-spacing-xxs text-body-sm"
          aria-label="Sair"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </header>
  );
}
