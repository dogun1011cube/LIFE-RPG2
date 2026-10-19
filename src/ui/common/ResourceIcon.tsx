import { RESOURCES, isResourceId } from '../../data/resources';
import { ITEMS } from '../../data/items';
import type { StackId } from '../../game/types';

// Custom SVG glyphs per resource so each one is distinguishable by shape and colour.
function glyph(id: StackId) {
  switch (id) {
    case 'gold':
      return (
        <>
          <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.25" />
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" stroke="currentColor" strokeWidth="1.4" fill="none" />
        </>
      );
    case 'iron':
      return <path d="M5 16l4-9 6 1 4 8-7 3z" fill="currentColor" opacity="0.9" stroke="#0b0f14" strokeWidth="0.8" />;
    case 'copper':
      return (
        <>
          <path d="M6 15l3-8h6l3 8-6 4z" fill="currentColor" />
          <path d="M9 7l3 4 3-4M12 11v8" stroke="#0b0f14" strokeWidth="0.8" fill="none" opacity="0.6" />
        </>
      );
    case 'silicon':
      return (
        <>
          <path d="M12 3l3 6-3 12-3-12z" fill="currentColor" />
          <path d="M7 9l2 2-1 6-3-4zM17 9l-2 2 1 6 3-4z" fill="currentColor" opacity="0.6" />
        </>
      );
    case 'energy':
      return <path d="M13 3L6 13h5l-1 8 7-10h-5z" fill="currentColor" />;
    case 'research':
      return (
        <>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="8" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.3" transform="rotate(-60 12 12)" />
        </>
      );
    case 'alloy':
      return (
        <>
          <path d="M4 15l4-4h10l-4 4z" fill="currentColor" />
          <path d="M4 15h10v3H4zM14 15l4-4v3l-4 4z" fill="currentColor" opacity="0.6" />
        </>
      );
    default: {
      const item = ITEMS[id];
      if (item?.slot === 'weapon') return <path d="M6 18l9-9 2-4-4 2-9 9zM4 20l3-1-2-2z" fill="currentColor" />;
      if (item?.slot === 'armor') return <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" fill="currentColor" />;
      if (item?.slot === 'tool') return <path d="M4 20l9-9M11 5c3-2 7-1 9 2-3-1-5 0-6 1l2 2-3 3-2-2c-1 1-2 3-1 6-3-2-4-6-2-9z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" />;
      if (item?.slot === 'module') return <path d="M7 4h10l3 4v8l-3 4H7l-3-4V8zM9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.4" fill="none" />;
      if (item?.category === 'consumable') return <path d="M5 8h14v11H5zM9 8V5h6v3M12 11v5M9.5 13.5h5" stroke="currentColor" strokeWidth="1.5" fill="none" />;
      return <path d="M12 3l8 5v8l-8 5-8-5V8z" fill="currentColor" opacity="0.85" />;
    }
  }
}

export function ResourceIcon({ id, size = 18 }: { id: StackId; size?: number }) {
  const color = isResourceId(id) ? RESOURCES[id].color : ITEMS[id]?.color ?? '#fff';
  return (
    <svg className="res-icon" width={size} height={size} viewBox="0 0 24 24" style={{ color }} aria-hidden>
      {glyph(id)}
    </svg>
  );
}
