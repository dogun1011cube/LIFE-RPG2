// Centralized input state. Listeners are attached exactly once (attachInput) and
// removed on dispose, so remounting the game never duplicates handlers.

export const input = {
  keys: new Set<string>(),
  pressed: new Set<string>(),
  mouseDX: 0,
  mouseDY: 0,
  wheel: 0,
  /** buttons pressed since last frame (0 = left, 2 = right) */
  clicks: new Set<number>(),
  /** normalized device coordinates of the cursor (for unlocked build placement) */
  ndcX: 0,
  ndcY: 0,
  cursorOverCanvas: false,
};

function isTyping() {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/** Timestamp of the last pointer-lock loss (Esc exits lock before/alongside keydown). */
export const lockState = { lostAt: 0 };

let attached = false;
let canvasEl: HTMLElement | null = null;

const onKeyDown = (e: KeyboardEvent) => {
  if (isTyping()) return;
  if (!e.repeat) input.pressed.add(e.code);
  input.keys.add(e.code);
  if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
};
const onKeyUp = (e: KeyboardEvent) => {
  input.keys.delete(e.code);
};
const onMouseMove = (e: MouseEvent) => {
  if (document.pointerLockElement) {
    input.mouseDX += e.movementX;
    input.mouseDY += e.movementY;
  }
  if (canvasEl) {
    const r = canvasEl.getBoundingClientRect();
    input.ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
    input.ndcY = -((e.clientY - r.top) / r.height) * 2 + 1;
    input.cursorOverCanvas = e.target === canvasEl;
  }
};
const onMouseDown = (e: MouseEvent) => {
  // Only canvas clicks (or any click while pointer-locked) reach gameplay
  if (document.pointerLockElement || e.target === canvasEl) input.clicks.add(e.button);
};
const onWheel = (e: WheelEvent) => {
  if (document.pointerLockElement || e.target === canvasEl) input.wheel += Math.sign(e.deltaY);
};
const onContext = (e: MouseEvent) => {
  if (e.target === canvasEl) e.preventDefault();
};
const clearAll = () => {
  input.keys.clear();
  input.pressed.clear();
  input.clicks.clear();
  input.mouseDX = 0;
  input.mouseDY = 0;
};

export function attachInput(canvas: HTMLElement) {
  canvasEl = canvas;
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('contextmenu', onContext);
  window.addEventListener('blur', clearAll);
}

export function detachInput() {
  if (!attached) return;
  attached = false;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('wheel', onWheel);
  window.removeEventListener('contextmenu', onContext);
  window.removeEventListener('blur', clearAll);
  canvasEl = null;
}

/** Called at the end of each frame */
export function endInputFrame() {
  input.pressed.clear();
  input.clicks.clear();
  input.mouseDX = 0;
  input.mouseDY = 0;
  input.wheel = 0;
}

export function clearInput() {
  clearAll();
}

export function requestLock() {
  const el = canvasEl as (HTMLElement & { requestPointerLock?: () => Promise<void> | void }) | null;
  if (!el || document.pointerLockElement) return;
  try {
    const r = el.requestPointerLock?.();
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
  } catch {
    /* pointer lock unavailable: mouse-drag fallback is used */
  }
}

export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}
