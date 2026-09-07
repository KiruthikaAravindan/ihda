// ── Touch controls layout — drag to reposition, slider to resize, localStorage persist ──

const STORAGE_KEY = 'marioRushCtrlLayout';

// Base dimensions and default positions in 800×450 game-wrap coordinates.
// btn-jump default: right:18 → left = 800 - 18 - 112 = 670
const BASE = {
  'btn-left':  { w: 80,  h: 80,  fs: 28, defBottom: 20, defLeft: 14  },
  'btn-right': { w: 80,  h: 80,  fs: 28, defBottom: 20, defLeft: 104 },
  'btn-jump':  { w: 112, h: 112, fs: 42, defBottom: 10, defLeft: 670 },
};

const HUD_H = 38; // height of top HUD strip — keep buttons below it

let layout = null;
let editMode = false;

function defaultLayout() {
  const d = { scale: 1 };
  for (const [id, b] of Object.entries(BASE))
    d[id] = { bottom: b.defBottom, left: b.defLeft };
  return d;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const d   = defaultLayout();
    return {
      scale:       typeof raw.scale === 'number' ? Math.max(0.6, Math.min(1.6, raw.scale)) : 1,
      'btn-left':  raw['btn-left']  ?? { ...d['btn-left']  },
      'btn-right': raw['btn-right'] ?? { ...d['btn-right'] },
      'btn-jump':  raw['btn-jump']  ?? { ...d['btn-jump']  },
    };
  } catch (_) { return defaultLayout(); }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch (_) {}
}

// Apply position + size for one button via inline styles (overrides CSS class)
function applyBtn(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const pos  = layout[id];
  const base = BASE[id];
  const s    = layout.scale;
  el.style.bottom   = pos.bottom + 'px';
  el.style.left     = pos.left   + 'px';
  el.style.right    = 'auto';  // override .tbtn-jump { right: 18px }
  el.style.top      = 'auto';
  el.style.width    = (base.w  * s) + 'px';
  el.style.height   = (base.h  * s) + 'px';
  el.style.fontSize = (base.fs * s) + 'px';
}

function applyAll() {
  for (const id of Object.keys(BASE)) applyBtn(id);
}

// Read the CSS scale applied to #game-wrap by resizeGame()
function getWrapScale() {
  const wrap = document.getElementById('game-wrap');
  if (!wrap) return 1;
  const m = (wrap.style.transform || '').match(/scale\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function makeDraggable(id) {
  const el = document.getElementById(id);
  if (!el) return;

  let active = false, startPX, startPY, startLeft, startBottom;

  el.addEventListener('pointerdown', e => {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    active      = true;
    startPX     = e.clientX;
    startPY     = e.clientY;
    startLeft   = layout[id].left;
    startBottom = layout[id].bottom;
  }, { passive: false });

  el.addEventListener('pointermove', e => {
    if (!active) return;
    e.preventDefault();
    const sc   = getWrapScale();
    const dx   =  (e.clientX - startPX) / sc;
    const dy   = -(e.clientY - startPY) / sc; // screen y↓ = game bottom↑

    const s    = layout.scale;
    const effW = BASE[id].w * s;
    const effH = BASE[id].h * s;

    layout[id] = {
      left:   Math.round(Math.max(0,             Math.min(800 - effW,            startLeft   + dx))),
      bottom: Math.round(Math.max(0,             Math.min(450 - HUD_H - effH,   startBottom + dy))),
    };
    applyBtn(id);
  }, { passive: false });

  const end = () => { active = false; };
  el.addEventListener('pointerup',     end);
  el.addEventListener('pointercancel', end);
}

export function enterEditMode() {
  editMode = true;
  document.getElementById('ctrl-layout-bar').classList.add('visible');
  ['btn-left', 'btn-right', 'btn-jump'].forEach(id =>
    document.getElementById(id)?.classList.add('ctrl-edit')
  );
  const slider = document.getElementById('ctrl-size');
  if (slider) slider.value = layout.scale;
}

function exitEditMode() {
  editMode = false;
  document.getElementById('ctrl-layout-bar').classList.remove('visible');
  ['btn-left', 'btn-right', 'btn-jump'].forEach(id =>
    document.getElementById(id)?.classList.remove('ctrl-edit')
  );
  save();
}

export function initControlsLayout() {
  const isTouch = ('ontouchstart' in window) || window.matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return;

  layout = load();
  applyAll();

  for (const id of Object.keys(BASE)) makeDraggable(id);

  const slider = document.getElementById('ctrl-size');
  if (slider) {
    slider.value = layout.scale;
    slider.addEventListener('input', () => {
      layout.scale = parseFloat(slider.value);
      applyAll();
    });
  }

  document.getElementById('btn-ctrl-done')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    exitEditMode();
  });

  document.getElementById('btn-ctrl-reset')?.addEventListener('pointerdown', e => {
    e.preventDefault();
    const d = defaultLayout();
    layout['btn-left']  = d['btn-left'];
    layout['btn-right'] = d['btn-right'];
    layout['btn-jump']  = d['btn-jump'];
    layout.scale        = d.scale;
    applyAll();
    if (slider) slider.value = layout.scale;
  });
}
