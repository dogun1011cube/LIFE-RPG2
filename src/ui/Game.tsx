import React, { useEffect, useState } from 'react';
import { playSfx } from '../audio/sfx';
import { staminaMax } from '../game/core';
import { currentRank, deriveStats, levelProgress } from '../game/progression';
import { claimableCount } from '../game/quests';
import { fmtClock, todaySeconds } from '../game/study';
import { act, onSaved, useGame } from '../store/store';
import { Bar, PixelIcon, RankBadge, Ticker, useNow } from './components';
import { DayFlow } from './DayFlow';
import { askCancelReward, BigOverlays, ConfirmHost, RealRewardWatcher, Toasts } from './overlays';
import { BattleMenu } from './screens/BattleMenu';
import { BattleView } from './screens/BattleView';
import { Gacha } from './screens/Gacha';
import { Home } from './screens/Home';
import { Inventory } from './screens/Inventory';
import { Quests } from './screens/Quests';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Status } from './screens/Status';
import { Study } from './screens/Study';
import { Tower } from './screens/Tower';
import type { Screen } from './uiStore';
import { go, setUI, useUI } from './uiStore';

export const NAV: { id: Screen; en: string; ko: string; icon: string; tint: string }[] = [
  { id: 'home', en: 'HOME', ko: '홈', icon: 'home', tint: '#ffd43b' },
  { id: 'study', en: 'STUDY', ko: '공부', icon: 'book', tint: '#3ddc84' },
  { id: 'status', en: 'STATUS', ko: '상태', icon: 'person', tint: '#4dabf7' },
  { id: 'battle', en: 'BATTLE', ko: '전투', icon: 'swords', tint: '#ff6b6b' },
  { id: 'tower', en: 'TOWER', ko: '탑', icon: 'tower', tint: '#9b6bff' },
  { id: 'shop', en: 'SHOP', ko: '상점', icon: 'coin', tint: '#ffcf4a' },
  { id: 'gacha', en: 'GACHA', ko: '소환', icon: 'orb', tint: '#e599f7' },
  { id: 'inventory', en: 'INVENTORY', ko: '가방', icon: 'bag', tint: '#c8935a' },
  { id: 'quests', en: 'QUESTS', ko: '퀘스트', icon: 'quest', tint: '#e9c46a' },
  { id: 'settings', en: 'SETTINGS', ko: '설정', icon: 'gear', tint: '#adb5bd' },
];

const SCREENS: Record<Screen, () => React.ReactElement> = {
  home: Home,
  study: Study,
  status: Status,
  battle: BattleMenu,
  tower: Tower,
  shop: Shop,
  gacha: Gacha,
  inventory: Inventory,
  quests: Quests,
  settings: Settings,
};

export function Game() {
  const ui = useUI();
  const s = useGame();
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('lifeRPG3.screen') as Screen | null;
      if (saved && SCREENS[saved]) setUI({ screen: saved });
    } catch {
      /* ignore */
    }
  }, []);
  // keyboard shortcuts 1..0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.battle || ui.confirm || ui.dayFlow) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const idx = '1234567890'.indexOf(e.key);
      if (idx >= 0 && NAV[idx]) {
        playSfx('select');
        go(NAV[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.battle, ui.confirm, ui.dayFlow]);

  const Cur = SCREENS[ui.screen];
  const sleeping = s.day.status === 'sleeping';
  return (
    <div className={`game ${sleeping ? 'is-sleeping' : ''} ${ui.battle ? 'in-battle' : ''}`}>
      <Hud />
      <Nav />
      <main className="main" key={ui.transition}>
        {sleeping && ui.screen !== 'settings' && !ui.dayFlow && (
          <div className="sleep-banner win purple">
            <PixelIcon icon="moon" tint="#ffe066" size={22} />
            <span className="grow">
              <b>잠든 상태</b> — DAY {s.day.number}가 끝났어요. 일어나면 새로운 RPG 하루가 시작됩니다.
            </span>
            <button className="btn gold sm" onClick={() => setUI({ dayFlow: 'sleeping' })}>
              일어나기
            </button>
          </div>
        )}
        <div className="screen-anim">
          <Cur />
        </div>
      </main>
      {ui.battle && <BattleView key={ui.battle.waves[0].uid} setup={ui.battle} />}
      <DayFlow />
      <BigOverlays />
      <RealRewardWatcher />
      <ConfirmHost />
      <Toasts />
    </div>
  );
}

function Hud() {
  const s = useGame();
  const d = deriveStats(s);
  const lp = levelProgress(s.player.totalExp);
  const rank = currentRank(s);
  const now = useNow(1000);
  const [saved, setSaved] = useState(0);
  useEffect(() => onSaved((t) => setSaved(t)), []);
  const today = todaySeconds(s);
  const rr = s.realReward && s.realReward.until > now ? s.realReward : null;
  const timerRunning = s.timer?.startedAt;
  return (
    <header className="hud">
      <div className="hud-logo" onClick={() => go('home')} role="button" tabIndex={0}>
        <span className="l1">LIFE</span>
        <span className="l2">RPG</span>
      </div>
      <button className={`hud-day ${s.day.status}`} onClick={() => setUI({ dayFlow: s.day.status === 'sleeping' ? 'sleeping' : 'summary' })} title="RPG 하루 관리 (잠들기/일어나기)">
        <PixelIcon icon={s.day.status === 'sleeping' ? 'moon' : 'sun'} tint={s.day.status === 'sleeping' ? '#ffe066' : '#ffcf4a'} size={20} />
        <span className="col0">
          <b>DAY {s.day.number}</b>
          <span className="tiny">{s.day.status === 'sleeping' ? '잠든 중' : `오늘 ${fmtClock(today)}`}</span>
        </span>
      </button>
      <div className="hud-char">
        <RankBadge rank={rank} />
        <div className="hud-bars">
          <div className="row tiny between">
            <span>
              <b className="gold-t">Lv {lp.level}</b> {s.player.name}
            </span>
            <span className="muted num">
              EXP {lp.into}/{lp.need}
            </span>
          </div>
          <Bar kind="exp" value={lp.into} max={lp.need} size="thin" />
          <div className="row" style={{ gap: 6, marginTop: 3 }}>
            <Bar kind="hp" value={s.player.hp} max={d.maxHp} size="thin" className="grow" />
            <Bar kind="mp" value={s.player.mp} max={d.maxMp} size="thin" className="grow" />
          </div>
        </div>
      </div>
      <div className="hud-res">
        <div className="hud-pill gold" title="골드">
          <PixelIcon icon="coin" tint="#ffcf4a" size={18} />
          <Ticker value={s.player.gold} />
        </div>
        <div className="hud-pill st" title="기력 (공부 10분 = 1)">
          <PixelIcon icon="bolt" tint="#9be15d" size={18} />
          <span className="num">
            {s.player.stamina}
            <span className="dim">/{staminaMax(s)}</span>
          </span>
        </div>
        {timerRunning && (
          <button className="hud-pill timer" onClick={() => go('study')} title="공부 타이머 진행 중">
            <span className="rec" /> REC
          </button>
        )}
        {rr && (
          <button
            className="hud-pill reward"
            title="현실 보상 타이머 (클릭해서 일찍 끝내기)"
            onClick={async () => {
              if (await askCancelReward())
                act((d) => {
                  d.realReward = null;
                });
            }}
          >
            <PixelIcon icon="ticket" tint="#ff8787" size={18} />
            {rr.name} {fmtClock((rr.until - now) / 1000).slice(3)}
          </button>
        )}
        <span className={`save-dot ${now - saved < 1500 ? 'on' : ''}`} title="자동 저장">
          SAVED
        </span>
      </div>
    </header>
  );
}

function Nav() {
  const ui = useUI();
  const s = useGame();
  const claim = claimableCount(s);
  return (
    <nav className="nav win" aria-label="메인 메뉴">
      {NAV.map((n, i) => (
        <button
          key={n.id}
          className={`nav-item ${ui.screen === n.id ? 'on' : ''}`}
          onClick={() => {
            playSfx('select');
            go(n.id);
          }}
          aria-current={ui.screen === n.id ? 'page' : undefined}
        >
          <span className="cursor-slot">{ui.screen === n.id && <span className="cursor-arrow" />}</span>
          <PixelIcon icon={n.icon} tint={n.tint} size={22} />
          <span className="nav-label">
            <b>{n.en}</b>
            <span className="tiny">{n.ko}</span>
          </span>
          {n.id === 'quests' && claim > 0 && <span className="badge">{claim}</span>}
          <span className="nav-key tiny dim">{(i + 1) % 10}</span>
        </button>
      ))}
    </nav>
  );
}
