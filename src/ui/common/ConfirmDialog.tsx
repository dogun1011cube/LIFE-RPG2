import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useUi } from '../../state/uiStore';
import { playSfx } from '../../audio/sfx';

/** In-page replacement for window.confirm(), which sandboxed frames refuse. */
export function ConfirmDialog() {
  const req = useUi((s) => s.confirmRequest);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (req) confirmBtn.current?.focus();
  }, [req]);
  if (!req) return null;
  const close = () => useUi.getState().closeConfirm();
  return (
    <div className="confirm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={`confirm-icon ${req.danger ? 'danger' : ''}`}>
          <AlertTriangle size={18} />
        </div>
        <div className="confirm-text">
          <h2 id="confirm-title">{req.title}</h2>
          {req.body && <p>{req.body}</p>}
        </div>
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={close}>
            취소
          </button>
          <button
            ref={confirmBtn}
            className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              playSfx('click');
              close();
              req.onConfirm();
            }}
          >
            {req.confirmLabel ?? '확인'}
          </button>
        </div>
      </section>
    </div>
  );
}
