import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUi } from '../../state/uiStore';
import { playSfx } from '../../audio/sfx';
import { costEntries, count, stackName } from '../../game/resources/inventory';
import { ResourceIcon } from './ResourceIcon';
import { formatNumber } from '../../utils/math';
import type { Cost } from '../../game/types';

export function closePanel() {
  playSfx('click');
  useUi.getState().openPanel(null);
}

export function Panel({
  title,
  subtitle,
  icon,
  children,
  wide,
  onClose = closePanel,
  className = '',
  hotkey,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  onClose?: () => void;
  className?: string;
  hotkey?: string;
}) {
  return (
    <div className="panel-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className={`panel ${wide ? 'panel-wide' : ''} ${className}`} role="dialog" aria-label={title}>
        <header className="panel-header">
          <div className="panel-title">
            {icon && <span className="panel-icon">{icon}</span>}
            <div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="panel-header-right">
            {hotkey && <kbd>{hotkey}</kbd>}
            <button className="icon-btn" onClick={onClose} aria-label="닫기" title="닫기 (Esc)">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}

export function Bar({ value, max, color = 'var(--cyan)', label, small }: { value: number; max: number; color?: string; label?: string; small?: boolean }) {
  const k = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`bar ${small ? 'bar-small' : ''}`}>
      <div className="bar-fill" style={{ width: `${k * 100}%`, background: color }} />
      {label && <span className="bar-label">{label}</span>}
    </div>
  );
}

export function CostList({ cost, inventory }: { cost: Cost; inventory: Record<string, number> }) {
  const entries = costEntries(cost);
  if (entries.length === 0) return <span className="muted">비용 없음</span>;
  return (
    <ul className="cost-list">
      {entries.map(([id, n]) => {
        const have = count(inventory, id);
        const ok = have >= n;
        return (
          <li key={id} className={ok ? 'ok' : 'missing'} title={stackName(id)}>
            <ResourceIcon id={id} size={15} />
            <span className="cost-name">{stackName(id)}</span>
            <span className="cost-num">
              {formatNumber(Math.floor(have))}/{n}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
