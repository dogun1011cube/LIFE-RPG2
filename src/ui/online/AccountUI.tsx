import { useState, useSyncExternalStore } from 'react';
import { createNewGame } from '../../game/state';
import type { GameState } from '../../game/types';
import { getProfile } from '../../store/persistence';
import type { EnterResult } from '../../online/session';
import { changePassword, logout, resolveConflict, signInAndEnter, signUpAndEnter, startAccountGame, syncNow, useOnline } from '../../online/session';
import { describeSave } from '../../online/sync';
import { formatUid, normalizeUsername, PASSWORD_MIN, passwordProblem, usernameProblem } from '../../online/types';
import { Btn, Modal, Win } from '../components';
import { confirmDialog, go } from '../uiStore';

// ─────────────────────────────────────────────────────────────
// Account UI: login / sign-up modal (rendered at the app root, outside the
// game screen, because logging in swaps the whole save), save-conflict
// modal, the settings panel, the HUD UID chip and the title-screen box.
// ─────────────────────────────────────────────────────────────

type ModalMode = 'login' | 'signup';
let modal: { mode: ModalMode; username?: string } | null = null;
let conflictHidden = false;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
const sub = (l: () => void) => {
  ls.add(l);
  return () => {
    ls.delete(l);
  };
};

export function openAccount(mode: ModalMode, username?: string) {
  modal = { mode, username };
  emit();
}
function closeAccount() {
  modal = null;
  emit();
}
export function showConflict() {
  conflictHidden = false;
  emit();
}
function useAccountUi() {
  return useSyncExternalStore(sub, () => modal, () => modal);
}
function useConflictHidden() {
  return useSyncExternalStore(sub, () => conflictHidden, () => conflictHidden);
}

const timeText = (t: number) => (t ? new Date(t).toLocaleString('ko-KR') : '—');

function SaveCard({ title, s, accent }: { title: string; s: GameState; accent?: boolean }) {
  const d = describeSave(s);
  return (
    <div className={`save-card ${accent ? 'accent' : ''}`}>
      <div className="small gold-t">{title}</div>
      <div>
        <b>{d.name}</b> · DAY {d.day}
      </div>
      <div className="tiny muted">
        누적 공부 {d.study} · EXP {d.exp.toLocaleString()}
      </div>
      <div className="tiny dim">저장 {timeText(d.savedAt)}</div>
    </div>
  );
}

/** Login / sign-up modal. `onEntered` tells the app whether to show the intro (brand-new game). */
export function AccountModal({ onEntered }: { onEntered: (kind: 'game' | 'new') => void }) {
  const m = useAccountUi();
  const online = useOnline();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState<{ guest: GameState | null } | null>(null);
  const [newName, setNewName] = useState('');
  const [lastMode, setLastMode] = useState<ModalMode | null>(null);
  if (!m) return null;
  if (m.mode !== lastMode) {
    // (re)opened: reset the form
    setLastMode(m.mode);
    setUsername(m.username ?? '');
    setPassword('');
    setPassword2('');
    setError('');
    setEmpty(null);
  }
  const signup = m.mode === 'signup';

  const finish = (r: EnterResult) => {
    if (r.kind === 'empty') {
      setEmpty({ guest: r.guest });
      setNewName(r.guest?.player.name ?? '');
      return;
    }
    closeAccount();
    setLastMode(null);
    onEntered('game');
  };

  const submit = async () => {
    setError('');
    if (signup) {
      const bad = usernameProblem(username) ?? passwordProblem(password) ?? (password !== password2 ? '비밀번호 확인이 일치하지 않아요.' : null);
      if (bad) return setError(bad);
    }
    setBusy(true);
    try {
      const r = signup ? await signUpAndEnter(username, password) : await signInAndEnter(username, password);
      finish(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const start = async (state: GameState, kind: 'game' | 'new') => {
    setBusy(true);
    try {
      await startAccountGame(state);
      closeAccount();
      setLastMode(null);
      onEntered(kind);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (empty) {
    return (
      <Modal title="NEW ACCOUNT" sub="새 계정 시작" color="gold">
        <div className="col">
          <div className="uid-big">
            {online.account ? formatUid(online.account.uid) : ''} <span className="small muted">{online.account?.username}</span>
          </div>
          <p className="small">계정이 준비됐어요! 어떤 진행 상황으로 시작할까요?</p>
          {empty.guest && (
            <div className="col">
              <SaveCard title="이 브라우저의 게스트 진행 상황" s={empty.guest} accent />
              <Btn variant="gold" block disabled={busy} onClick={() => start(JSON.parse(JSON.stringify(empty.guest)) as GameState, 'game')}>
                이 진행 상황을 계정으로 가져오기
              </Btn>
              <div className="tiny dim">게스트 세이브는 지워지지 않고 이 브라우저에 그대로 남아요.</div>
              <div className="sep" />
            </div>
          )}
          <div className="small">새 게임으로 시작</div>
          <div className="row">
            <input className="input grow" maxLength={12} placeholder="모험가 이름 (최대 12자)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Btn variant={empty.guest ? 'ghost' : 'gold'} disabled={busy} onClick={() => start(createNewGame(newName.trim() || '모험가'), 'new')}>
              새로 시작
            </Btn>
          </div>
          {error && <div className="warn-line">{error}</div>}
          <div className="modal-actions">
            <Btn
              variant="ghost"
              size="sm"
              sfx="cancel"
              disabled={busy}
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
            >
              취소하고 로그아웃
            </Btn>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={signup ? 'SIGN UP' : 'LOGIN'}
      sub={signup ? '회원가입 · 고유 번호(UID) 발급' : '로그인'}
      color="gold"
      onClose={busy ? undefined : () => (closeAccount(), setLastMode(null))}
    >
      <form
        className="col account-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!online.configured && <div className="warn-line">온라인 서버가 아직 연결되지 않았어요. (관리자 설정 필요)</div>}
        <label className="field">
          <span className="small muted">아이디</span>
          <input className="input" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="영문 소문자·숫자·_ 4~16자" maxLength={16} />
        </label>
        <label className="field">
          <span className="small muted">비밀번호</span>
          <input className="input" type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`${PASSWORD_MIN}자 이상`} maxLength={64} />
        </label>
        {signup && (
          <label className="field">
            <span className="small muted">비밀번호 확인</span>
            <input className="input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} maxLength={64} />
          </label>
        )}
        {signup && username && !usernameProblem(username) && <div className="tiny green-t">아이디: {normalizeUsername(username)}</div>}
        {error && <div className="warn-line">{error}</div>}
        <button type="submit" className="btn gold lg block" disabled={busy || !online.configured || !online.ready}>
          {busy ? '처리 중…' : signup ? '가입하고 UID 받기' : '로그인'}
        </button>
        <div className="row between">
          <button type="button" className="link-btn small" onClick={() => openAccount(signup ? 'login' : 'signup', username)}>
            {signup ? '이미 계정이 있어요 → 로그인' : '처음이에요 → 회원가입'}
          </button>
          <span className="tiny dim">{signup ? '가입 순서대로 고유 번호가 발급돼요' : '비밀번호를 잊으면 관리자에게 문의'}</span>
        </div>
        <div className="tiny dim">로그인하면 진행 상황이 클라우드에 저장되어 다른 기기·브라우저에서도 이어할 수 있어요.</div>
      </form>
    </Modal>
  );
}

/** Shown when this device and the cloud both changed since they last agreed. */
export function ConflictModal() {
  const online = useOnline();
  const hidden = useConflictHidden();
  const [busy, setBusy] = useState(false);
  if (!online.conflict || hidden) return null;
  const pick = async (keep: 'cloud' | 'local') => {
    setBusy(true);
    try {
      await resolveConflict(keep);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="SAVE CONFLICT" sub="진행 상황 선택" color="red">
      <p className="small">다른 기기와 이 기기에서 각각 진행한 기록이 있어요. 어느 쪽으로 계속할까요?</p>
      <div className="save-cards">
        <SaveCard title="☁ 클라우드" s={online.conflict.cloud.state} />
        <SaveCard title="💻 이 기기" s={online.conflict.local} />
      </div>
      <div className="tiny muted">선택하지 않은 쪽도 지워지지 않고 설정 → 자동 백업에 보관됩니다.</div>
      <div className="modal-actions">
        <Btn
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            conflictHidden = true;
            emit();
          }}
        >
          나중에
        </Btn>
        <Btn variant="purple" disabled={busy} onClick={() => pick('local')}>
          이 기기 진행 상황 사용
        </Btn>
        <Btn variant="gold" disabled={busy} onClick={() => pick('cloud')}>
          클라우드 진행 상황 사용
        </Btn>
      </div>
    </Modal>
  );
}

const STATUS_TEXT: Record<string, string> = {
  off: '오프라인',
  guest: '게스트',
  connecting: '서버 연결 중…',
  synced: '클라우드 저장됨',
  pending: '저장 대기 중',
  syncing: '클라우드 저장 중…',
  error: '클라우드 저장 실패',
  conflict: '진행 상황 충돌',
  relogin: '다시 로그인 필요',
};

/** Small HUD chip: UID + sync state. */
export function UidChip() {
  const online = useOnline();
  const p = getProfile();
  if (!online.configured || p.id === 'guest') return null;
  const uid = online.account?.uid ?? p.uid;
  const tone = online.status === 'synced' ? 'ok' : online.status === 'error' || online.status === 'conflict' || online.status === 'relogin' ? 'bad' : 'busy';
  return (
    <button
      className={`hud-pill uid ${tone}`}
      title={`${p.username ?? ''} · ${STATUS_TEXT[online.status] ?? ''}${online.message ? ' — ' + online.message : ''}`}
      onClick={() => {
        if (online.conflict) showConflict();
        go('settings');
      }}
    >
      <span className="uid-dot" /> {uid ? formatUid(uid) : 'UID'}
    </button>
  );
}

/** Settings → ACCOUNT panel. */
export function AccountPanel() {
  const online = useOnline();
  const p = getProfile();
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!online.configured) {
    return (
      <Win title="ACCOUNT" sub="계정">
        <p className="small muted">온라인 계정(고유 번호·로그인·클라우드 저장) 기능이 아직 서버에 연결되지 않았어요. 지금은 이 브라우저에만 저장됩니다.</p>
        <div className="tiny dim">관리자: 저장소의 docs/FIREBASE_SETUP.md 를 참고해 Firebase 설정값을 넣으면 활성화됩니다.</div>
      </Win>
    );
  }

  if (p.id === 'guest') {
    return (
      <Win title="ACCOUNT" sub="계정" color="gold">
        <p className="small">
          지금은 <b>게스트</b>로 플레이 중이에요. 진행 상황이 이 브라우저에만 저장됩니다.
        </p>
        <div className="small muted">회원가입하면 고유 번호(UID)가 발급되고, 어느 기기에서든 로그인해 이어할 수 있어요. 가입할 때 지금 진행 상황을 그대로 가져갈 수 있습니다.</div>
        <div className="row" style={{ marginTop: 8 }}>
          <Btn variant="gold" disabled={!online.ready} onClick={() => openAccount('signup')}>
            회원가입
          </Btn>
          <Btn variant="ghost" disabled={!online.ready} onClick={() => openAccount('login')}>
            로그인
          </Btn>
        </div>
      </Win>
    );
  }

  const uid = online.account?.uid ?? p.uid;
  return (
    <Win title="ACCOUNT" sub="계정" color="gold">
      <div className="row between wrap">
        <div>
          <div className="uid-big">{uid ? formatUid(uid) : 'UID —'}</div>
          <div className="small">
            아이디 <b>{online.account?.username ?? p.username}</b>
            {online.account && <span className="tiny muted"> · 가입 {new Date(online.account.createdAt).toLocaleDateString('ko-KR')}</span>}
          </div>
        </div>
        <div className={`sync-state ${online.status}`}>
          <span className="uid-dot" /> {STATUS_TEXT[online.status]}
          {online.lastSyncAt ? <div className="tiny dim">마지막 동기화 {timeText(online.lastSyncAt)}</div> : null}
        </div>
      </div>
      {online.message && <div className="tiny warn-line">{online.message}</div>}
      <div className="row wrap" style={{ marginTop: 8 }}>
        {online.status === 'relogin' ? (
          <Btn variant="gold" onClick={() => openAccount('login', p.username)}>
            다시 로그인
          </Btn>
        ) : (
          <Btn
            variant="gold"
            disabled={busy || online.status === 'syncing' || !online.account}
            onClick={async () => {
              setBusy(true);
              const ok = await syncNow();
              setBusy(false);
              setMsg(ok ? '클라우드에 저장했어요.' : '');
            }}
          >
            지금 클라우드에 저장
          </Btn>
        )}
        {online.conflict && (
          <Btn variant="red" onClick={showConflict}>
            충돌 해결하기
          </Btn>
        )}
        <Btn variant="ghost" size="sm" disabled={!online.account} onClick={() => setPwOpen((v) => !v)}>
          비밀번호 변경
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          onClick={async () => {
            const ok = await confirmDialog({ title: '로그아웃', text: '로그아웃할까요?\n진행 상황은 클라우드와 이 기기에 저장되어 있어요. 로그아웃하면 게스트 모드로 돌아갑니다.', ok: '로그아웃' });
            if (!ok) return;
            await logout();
            window.location.reload();
          }}
        >
          로그아웃
        </Btn>
      </div>
      {msg && <div className="tiny green-t">{msg}</div>}
      {pwOpen && (
        <form
          className="col pw-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg('');
            try {
              await changePassword(cur, next);
              setMsg('비밀번호를 변경했어요.');
              setPwOpen(false);
              setCur('');
              setNext('');
            } catch (err) {
              setMsg((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <input className="input" type="password" placeholder="현재 비밀번호" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <input className="input" type="password" placeholder={`새 비밀번호 (${PASSWORD_MIN}자 이상)`} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Btn variant="purple" size="sm" disabled={busy}>
            변경
          </Btn>
        </form>
      )}
      <div className="tiny dim" style={{ marginTop: 6 }}>
        진행 상황은 이 기기에 먼저 저장되고, 변경 후 약 30초 안에 클라우드에도 저장돼요. 인터넷이 끊겨도 계속 플레이할 수 있습니다.
      </div>
    </Win>
  );
}

/** Title-screen box: login / sign-up buttons, or the logged-in account. */
export function TitleAccountBox() {
  const online = useOnline();
  const p = getProfile();
  if (!online.configured) return null;
  if (p.id === 'guest') {
    return (
      <div className="title-account win">
        <div className="tiny muted">로그인하면 어느 기기에서든 이어할 수 있어요</div>
        <div className="row">
          <Btn variant="gold" size="sm" className="grow" disabled={!online.ready} onClick={() => openAccount('login')}>
            로그인
          </Btn>
          <Btn variant="ghost" size="sm" className="grow" disabled={!online.ready} onClick={() => openAccount('signup')}>
            회원가입
          </Btn>
        </div>
        {!online.ready && <div className="tiny dim">서버 연결 중…</div>}
      </div>
    );
  }
  const uid = online.account?.uid ?? p.uid;
  return (
    <div className="title-account win gold">
      <div className="uid-big">{uid ? formatUid(uid) : ''}</div>
      <div className="small">
        {p.username} · <span className={`sync-inline ${online.status}`}>{STATUS_TEXT[online.status]}</span>
      </div>
      {online.status === 'relogin' && (
        <Btn variant="gold" size="sm" onClick={() => openAccount('login', p.username)}>
          다시 로그인
        </Btn>
      )}
      <button
        className="link-btn tiny"
        onClick={async () => {
          await logout();
          window.location.reload();
        }}
      >
        로그아웃 (게스트로 플레이)
      </button>
    </div>
  );
}

/** True while the title screen should wait before continuing (first cloud check). */
export function useAccountBusy() {
  const online = useOnline();
  return online.configured && getProfile().id !== 'guest' && (online.status === 'connecting' || (online.status === 'syncing' && online.lastSyncAt === 0));
}
