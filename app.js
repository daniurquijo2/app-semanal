// App Semanal · lienzo infinito
// Interfaz (Preact + htm, sin compilación). La lógica de Google Calendar, Google Drive,
// calendarios .ics y fichas de evento vive en core.js, que se carga antes.
import { h, html, render as prender, Component } from './vendor/htm-preact.js';

/* ---------- Constantes del diseño ---------- */
const TCOLORS = ['#6D66F0', '#6FA8C9', '#4E9B72', '#A98BD6', '#C9695E', '#AEB6C2'];
const OLD_COLORS = ['#3b34b0', '#6366f1', '#0b6e79', '#4f6b7f', '#a3480f', '#9d2a6b'];
const GROUP_COLORS = ['#6D66F0', '#6FA8C9', '#4E9B72', '#A98BD6', '#C9695E', '#D9C37A'];
const NOTE_COLORS = ['#2A2318', '#17241E', '#1E1D2A', '#2A1C1A'];
const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const DIAS3 = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const UI = 'appSemanal.ui';
const SH = '0 18px 40px -12px rgba(0,0,0,0.75)';
const SHORTCUTS = [
  ['Ctrl/⌘ + Z', 'Deshacer'], ['Ctrl/⌘ + Mayús + Z', 'Rehacer'], ['E', 'Ocultar o mostrar completadas'],
  ['⌘K o /', 'Buscar'], ['T', 'Ir a hoy'], ['A', 'Vista del día de hoy'], ['S', 'Vista de la semana enfocada'],
  ['0 / 1', 'Ver todo / ajustar a la semana'], ['+ / −', 'Zoom'], ['↑ / ↓', 'Semana anterior / siguiente'],
  ['N', 'Nota adhesiva'], ['Q', 'Ordenar (vista día/semana)'], ['G o Enter', 'Crear grupo con la selección'],
  ['W', 'Ocultar selección / ver ocultas'], ['Ctrl/⌘ + A', 'Seleccionar todo (vista día/semana)'], ['Esc', 'Cerrar por capas']
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const weekOfTask = t => t.date ? weekKey(parseDkey(t.date)) : t.week;
const rangeLbl = m => { const b = addDays(m, 6); return (m.getMonth() === b.getMonth() ? m.getDate() : m.getDate() + ' ' + MES[m.getMonth()]) + ' – ' + b.getDate() + ' ' + MES[b.getMonth()]; };
const dow = d => (d.getDay() + 6) % 7;
const area = t => (t.w || 200) * (t.h || 136);
const lsGetUI = (k, d) => { try { const v = localStorage.getItem(UI + '.' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
const lsSetUI = (k, v) => { try { localStorage.setItem(UI + '.' + k, JSON.stringify(v)); } catch (_) {} };
const DATA = ['tasks', 'goals', 'notes', 'groups', 'layouts'];

function treemap(vals, rect) {
  const out = []; let row = []; const r = Object.assign({}, rect); let i = 0;
  const sum = a => a.reduce((p, q) => p + q, 0);
  const worst = (rw, len) => { const s = sum(rw); return Math.max(len * len * Math.max(...rw) / (s * s), (s * s) / (len * len * Math.min(...rw))); };
  const lay = rw => { const s = sum(rw); if (r.w >= r.h) { const cw = s / r.h; let y = r.y; rw.forEach(v => { const hh = v / cw; out.push({ x: r.x, y, w: cw, h: hh }); y += hh; }); r.x += cw; r.w -= cw; } else { const rh = s / r.w; let x = r.x; rw.forEach(v => { const ww = v / rh; out.push({ x, y: r.y, w: ww, h: rh }); x += ww; }); r.y += rh; r.h -= rh; } };
  while (i < vals.length) { const len = Math.min(r.w, r.h); const v = vals[i]; if (!row.length || worst(row.concat(v), len) <= worst(row, len)) { row.push(v); i++; } else { lay(row); row = []; } }
  if (row.length) lay(row); return out;
}

/* ---------- Iconos ---------- */
const svg = (d, o = {}) => html`<svg width=${o.s || 16} height=${o.s || 16} viewBox="0 0 24 24" fill="none" stroke=${o.c || 'currentColor'} stroke-width=${o.w || 2} stroke-linecap="round" stroke-linejoin="round" style=${o.st || ''} aria-hidden="true"><path d=${d}></path></svg>`;
const IC = {
  up: 'M18 15l-6-6-6 6', down: 'M6 9l6 6 6-6', left: 'M15 18l-6-6 6-6', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M6 6l12 12M18 6L6 18',
  arrowUp: 'M12 19V5M5 12l7-7 7 7', arrowDown: 'M12 5v14M5 12l7 7 7-7', check: 'M5 12l5 5L20 7', notes: 'M4 6h16M4 12h16M4 18h10',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5-5.9M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M3 3l18 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5', archive: 'M4 4h16a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 20 9H4a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 4 4zM5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4',
  tree: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM12 3v18M12 12h9M16.5 12v9', file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5', link: 'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1'
};
const LogoMark = ({ s = 28 }) => html`<svg width=${s} height=${s} viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="8" width="8" height="48" rx="4" fill="#1F252E"></rect><rect x="12" y="8" width="8" height="30" rx="4" fill="#6D66F0"></rect><path transform="translate(25 52) scale(0.046 -0.046)" fill="#E6E9EE" d=${window.S_PATH || ''}></path></svg>`;
const Check = ({ on, size = 18, onClick, nodrag }) => html`<button data-nodrag=${nodrag ? '1' : null} onClick=${onClick} aria-label=${on ? 'Marcar como pendiente' : 'Marcar como hecha'} style=${`width:${size}px;height:${size}px;flex:none;margin-top:${size > 18 ? 2 : 1}px;padding:0;border-radius:999px;border:1.5px solid ${on ? '#4E9B72' : '#3A434F'};background:${on ? '#4E9B72' : 'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s, border-color .2s`}>${svg(IC.check, { s: size > 18 ? 11 : 10, c: '#ffffff', w: 3.5, st: `opacity:${on ? 1 : 0};transition:opacity .2s` })}</button>`;
const Tick = ({ on }) => html`<span style=${`width:16px;height:16px;flex:none;box-sizing:border-box;border-radius:4px;border:1.5px solid ${on ? '#4E9B72' : '#3A434F'};background:${on ? '#4E9B72' : 'transparent'};display:flex;align-items:center;justify-content:center;transition:background .2s, border-color .2s`}>${svg(IC.check, { s: 10, c: '#fff', w: 3.5, st: `opacity:${on ? 1 : 0}` })}</span>`;
const Kbd = ({ k }) => html`<span class="mono" style="font-size:11px;color:#8B95A3;background:#151A21;padding:2px 7px;border-radius:6px;white-space:nowrap">${k}</span>`;
const SecLbl = ({ t }) => html`<span class="mono" style="padding:8px 10px 4px;font-size:10.5px;letter-spacing:.12em;color:#8B95A3">${t}</span>`;
const Div = () => html`<div style="height:1px;background:#242B34;margin:4px 6px"></div>`;
const MENU = 'border-radius:10px;background:#0E1116;border:1px solid #242B34;color:#E6E9EE;box-shadow:0 18px 44px rgba(0,0,0,0.75);display:flex;flex-direction:column;animation:pop .16s ease-out';
const FLOAT = 'height:46px;border:1px solid #242B34;border-radius:10px;background:#0E1116;color:#E6E9EE;box-shadow:0 10px 28px rgba(0,0,0,0.5)';
const MI = 'display:flex;align-items:center;justify-content:space-between;gap:12px;height:38px;padding:0 10px;border:0;border-radius:6px;background:transparent;cursor:pointer;font-size:13.5px;text-align:left;color:#E6E9EE;text-decoration:none';

/* ---------- Aplicación ---------- */
class App extends Component {
  constructor() {
    super();
    window.__app = this;
    this.migrate();
    this.state = {
      hideDone: lsGetUI('hideDone', false), hint: lsGetUI('hint', true), from: -3, to: 2, focus: weekKey(new Date()),
      menu: null, pop: null, q: '', drop: null, dragId: null, toast: null, flash: null,
      fv: null, fvLive: null, mqRect: null, ctx: null, dm: null, ge: null, vw: window.innerWidth
    };
    this.cam = { x: 0, y: 0, s: 1 };
    this._undo = []; this._redo = [];
    this.vpRef = { current: null }; this.worldRef = { current: null }; this.zoomRef = { current: null };
    this.searchRef = { current: null }; this.fvBoardRef = { current: null }; this.geRef = { current: null };
    this.pts = new Map();
  }

  /* ----- datos ----- */
  migrate() {
    state.notes = state.notes || []; state.groups = state.groups || []; state.layouts = state.layouts || {};
    state.tasks = state.tasks.map(t => {
      let n = t; const i = OLD_COLORS.indexOf(t.color);
      if (i >= 0) n = Object.assign({}, n, { color: TCOLORS[i] });
      if (!Array.isArray(n.groups)) n = Object.assign({}, n, { groups: n.group ? [n.group] : [] });
      if (!n.week) n = Object.assign({}, n, { week: n.date ? weekKey(parseDkey(n.date)) : weekKey(new Date()) });
      return n;
    });
  }
  refresh() { this.forceUpdate(); }
  data() { return { tasks: state.tasks, goals: state.goals, notes: state.notes, groups: state.groups, layouts: state.layouts }; }
  set(p, cb) {
    if (typeof p === 'function') p = p(Object.assign({}, this.data(), this.state));
    if (!p) { if (cb) cb(); return; }
    const d = {}, u = {}; let dch = false;
    for (const k in p) { if (DATA.includes(k)) { d[k] = p[k]; dch = true; } else u[k] = p[k]; }
    if (dch) { this.pushUndo(); Object.assign(state, d); this.saveSoon(); }
    if (Object.keys(u).length) this.setState(u, cb); else this.forceUpdate(cb);
  }
  saveSoon() { clearTimeout(this._sv); this._sv = setTimeout(() => save(), 350); }
  pushUndo() {
    if (this._restoring) return;
    if (!this._burst) { this._undo.push(this.data()); if (this._undo.length > 100) this._undo.shift(); this._redo = []; }
    clearTimeout(this._burst); this._burst = setTimeout(() => { this._burst = null; }, 700);
  }
  undoRedo(redo) {
    const from = redo ? this._redo : this._undo, to = redo ? this._undo : this._redo;
    if (!from.length) { this.toast(redo ? 'Nada que rehacer' : 'Nada que deshacer'); return; }
    const snap = from.pop(); to.push(this.data());
    clearTimeout(this._burst); this._burst = null;
    Object.assign(state, snap); this.saveSoon();
    this.setState({ fvLive: null, ctx: null, ge: null, dm: null, pop: null }); this.toast(redo ? 'Rehecho' : 'Deshecho');
  }
  cals() {
    const list = state.calendars.map(c => ({ id: c.id, name: c.name, color: hex6(c.color), on: c.visible !== false, src: c }));
    if (!list.length) list.push({ id: 'personal', name: 'Personal', color: '#A39CFB', on: true, src: null });
    return list;
  }
  defCal() { const p = state.calendars.find(c => c.google && c.primary); return p ? p.id : (state.calendars[0] ? state.calendars[0].id : 'personal'); }
  cOf(t) { const ids = this._calIds || []; return t.cal && ids.includes(t.cal) ? t.cal : this.defCal(); }
  updTask(id, p) { this.set(s => ({ tasks: s.tasks.map(t => t.id === id ? Object.assign({}, t, p) : t) })); }
  addTask(title, date, week, extra) { this.set(s => ({ tasks: [...s.tasks, Object.assign({ id: uid(), title, date, week, done: false, notes: '', color: null, cal: this.defCal(), groups: [], created: Date.now() }, extra || {})] })); }
  delTask(id) { this.set(s => ({ tasks: s.tasks.filter(t => t.id !== id), pop: null, dm: null })); this.toast('Tarea eliminada'); }
  taskFromEvent(o) { const d = new Date(o.start); this.addTask('Preparar: ' + o.ev.title, dkey(d), weekKey(d), { cal: o.c.id }); this.toast('Tarea creada'); }
  toast(m) { clearTimeout(this._tt); this.setState({ toast: m }); this._tt = setTimeout(() => this.setState({ toast: null }), 2600); }

  /* ----- ciclo de vida ----- */
  componentDidMount() {
    this._wheel = e => this.onWheel(e); this._move = e => this.onMove(e); this._up = e => this.onUp(e); this._key = e => this.onKey(e);
    this._rs = () => { this.updateFocus(); this.setState({ vw: window.innerWidth }); };
    const vp = this.vpRef.current; if (vp) vp.addEventListener('wheel', this._wheel, { passive: false });
    window.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up); window.addEventListener('pointercancel', this._up);
    window.addEventListener('keydown', this._key); window.addEventListener('resize', this._rs);
    this._pd = e => { if (this.state.menu && !(e.target.closest && e.target.closest('[data-menu]'))) this.setState({ menu: null }); };
    document.addEventListener('pointerdown', this._pd, true);
    this._wh = () => { if (this.state.ctx) this.setState({ ctx: null }); }; window.addEventListener('wheel', this._wh, { passive: true }); window.addEventListener('blur', this._wh);
    window.addEventListener('beforeunload', () => { clearTimeout(this._sv); save(); });
    this.applyCam(false);
    const t0 = Date.now(); const tryInit = () => { const el = this.rowEl(weekKey(new Date())); if (el && el.offsetWidth > 0) this.goToday(false); else if (Date.now() - t0 < 3000) setTimeout(tryInit, 50); }; tryInit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!this._moved) this.goToday(false); });
    this._tick = setInterval(() => this.forceUpdate(), 30000);
  }
  componentDidUpdate(pp, ps) {
    if (this.state.menu === 'search' && ps.menu !== 'search' && this.searchRef.current) this.searchRef.current.focus({ preventScroll: true });
    if (this.state.fv && !ps.fv) requestAnimationFrame(() => this.forceUpdate());
  }

  /* ----- cámara ----- */
  applyCam(anim) {
    const w = this.worldRef.current, vp = this.vpRef.current; if (!w || !vp) return;
    const { x, y, s } = this.cam; const ease = '.6s cubic-bezier(.2,.8,.2,1)';
    w.style.transition = anim ? 'transform ' + ease : 'none';
    w.style.transform = `translate(${x}px,${y}px) scale(${s})`;
    let gs = 24 * s; while (gs < 14) gs *= 2;
    vp.style.transition = anim ? 'background-position ' + ease + ', background-size ' + ease : 'none';
    vp.style.backgroundSize = gs + 'px ' + gs + 'px'; vp.style.backgroundPosition = x + 'px ' + y + 'px';
    vp.scrollTop = 0; vp.scrollLeft = 0;
    if (this.zoomRef.current) this.zoomRef.current.textContent = Math.round(s * 100) + '%';
    this.updateFocus();
  }
  updateFocus() {
    if (this._fr) return;
    this._fr = requestAnimationFrame(() => {
      this._fr = 0; const w = this.worldRef.current, vp = this.vpRef.current; if (!w || !vp) return;
      const cy = (vp.clientHeight * 0.45 - this.cam.y) / this.cam.s; let best = null;
      w.querySelectorAll('[data-week]').forEach(el => { if (!best || el.offsetTop <= cy) best = el.getAttribute('data-week'); });
      if (best && best !== this.state.focus) this.setState({ focus: best });
    });
  }
  zoomAt(sx, sy, f, anim) { const c = this.cam; const ns = clamp(c.s * f, 0.15, 2.5); c.x = sx - (sx - c.x) * (ns / c.s); c.y = sy - (sy - c.y) * (ns / c.s); c.s = ns; this.applyCam(anim); }
  zoomBtn(f) { const vp = this.vpRef.current; this.zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, f, true); }
  rowEl(k) { return this.worldRef.current && this.worldRef.current.querySelector(`[data-week="${k}"]`); }
  flyToWeek(k, anim = true) {
    const el = this.rowEl(k), vp = this.vpRef.current; if (!el || !vp) return;
    const vw = vp.clientWidth, vh = vp.clientHeight; const c = this.cam; const W = el.offsetWidth, H = el.offsetHeight, top = 76, bot = 74;
    const s = clamp(Math.min((vw - 32) / W, (vh - top - bot) / H), 0.3, 1.5);
    c.s = s; c.x = (vw - W * s) / 2 - el.offsetLeft * s; c.y = top + ((vh - top - bot) - H * s) / 2 - el.offsetTop * s; this.applyCam(anim);
  }
  goToday(anim = true) {
    const vp = this.vpRef.current;
    if (vp && vp.clientWidth < 700) { const el = this.worldRef.current && this.worldRef.current.querySelector(`[data-day="${dkey(new Date())}"]`); if (el) { this.flyToEl(el, anim); return; } }
    this.flyToWeek(weekKey(new Date()), anim);
  }
  flyToEl(el, anim) {
    const vp = this.vpRef.current; let x = 0, y = 0, n = el; const w = this.worldRef.current;
    while (n && n !== w) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    const vw = vp.clientWidth, vh = vp.clientHeight; const s = clamp(Math.min((vw - 32) / el.offsetWidth, (vh - 160) / el.offsetHeight), 0.3, 1.5);
    this.cam = { s, x: (vw - el.offsetWidth * s) / 2 - x * s, y: 76 + ((vh - 150) - el.offsetHeight * s) / 2 - y * s }; this.applyCam(anim);
  }
  fitAll() { const w = this.worldRef.current, vp = this.vpRef.current; const W = w.offsetWidth, H = w.offsetHeight; const s = clamp(Math.min(vp.clientWidth / W, vp.clientHeight / H) * 0.96, 0.15, 1); this.cam = { x: (vp.clientWidth - W * s) / 2, y: (vp.clientHeight - H * s) / 2, s }; this.applyCam(true); }
  weekKeys() { const m = mondayOf(new Date()); const a = []; for (let i = this.state.from; i <= this.state.to; i++) a.push(weekKey(addDays(m, i * 7))); return a; }
  extend(dir, cb) {
    const key = this.state.focus; const el = this.rowEl(key); const before = el ? el.offsetTop : 0;
    this.setState(s => dir < 0 ? { from: s.from - 1 } : { to: s.to + 1 }, () => {
      const el2 = this.rowEl(key);
      if (el2 && dir < 0) { const dy = el2.offsetTop - before; this.cam.y -= dy * this.cam.s; this.applyCam(false); if (dy) this.set(s => ({ notes: s.notes.map(n => Object.assign({}, n, { y: n.y + dy })) })); }
      if (cb) requestAnimationFrame(cb);
    });
  }
  stepWeek(dir) {
    const ks = this.weekKeys(); const i = ks.indexOf(this.state.focus) + dir;
    if (i < 0) return this.extend(-1, () => this.flyToWeek(this.weekKeys()[0]));
    if (i >= ks.length) return this.extend(1, () => { const a = this.weekKeys(); this.flyToWeek(a[a.length - 1]); });
    this.setState({ focus: ks[i] }); this.flyToWeek(ks[i]);
  }
  revealWeek(wk) {
    const off = Math.round((weekStart(wk) - mondayOf(new Date())) / 6048e5);
    this.setState(s => ({ from: Math.min(s.from, off), to: Math.max(s.to, off) }), () => requestAnimationFrame(() => this.flyToWeek(wk, true)));
  }

  /* ----- puntero y teclado en el lienzo ----- */
  onWheel(e) {
    const sc = e.target.closest && e.target.closest('[data-scroll]');
    if (!e.ctrlKey && !e.metaKey && sc && sc.scrollHeight > sc.clientHeight + 1 && this.wheelMode() !== 'zoom') { const up = e.deltaY < 0; if ((up && sc.scrollTop > 0) || (!up && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1)) return; }
    this._moved = true; e.preventDefault(); const r = this.vpRef.current.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey || this.wheelMode() === 'zoom') { const k = e.ctrlKey ? 0.01 : 0.0015; this.zoomAt(e.clientX - r.left, e.clientY - r.top, clamp(Math.exp(-e.deltaY * k), 0.8, 1.25), false); }
    else { this.cam.x -= e.shiftKey ? e.deltaY : e.deltaX; if (!e.shiftKey) this.cam.y -= e.deltaY; this.applyCam(false); }
  }
  wheelMode() { return lsGetUI('wheel', 'zoom'); }
  onVpDown(e) {
    if (!this._moved && this.state.hint) setTimeout(() => this.setState({ hint: false }), 4000);
    this._moved = true;
    if (this.state.menu) this.setState({ menu: null });
    if (e.pointerType === 'touch') { this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (this.pts.size === 2) { const [a, b] = [...this.pts.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.cam.s }; this.pan = null; return; } }
    if (e.button === 1 || (e.button === 0 && !e.target.closest('[data-nopan]'))) { e.preventDefault(); this.pan = { sx: e.clientX, sy: e.clientY, x: this.cam.x, y: this.cam.y }; this.vpRef.current.style.cursor = 'grabbing'; }
  }
  onMove(e) {
    if (this.fd) { this.fvMove(e); return; }
    if (this.mq) { this.fvMq(e); return; }
    if (this.pinch && this.pts.has(e.pointerId)) {
      this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...this.pts.values()]; if (!b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y); const r = this.vpRef.current.getBoundingClientRect();
      this.zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (this.pinch.s * d / this.pinch.d) / this.cam.s, false); return;
    }
    if (this.pan) { this.cam.x = this.pan.x + e.clientX - this.pan.sx; this.cam.y = this.pan.y + e.clientY - this.pan.sy; this.applyCam(false); }
    else if (this.nd) { const d = this.nd; const nx = d.ox + (e.clientX - d.sx) / this.cam.s, ny = d.oy + (e.clientY - d.sy) / this.cam.s; this.set(s => ({ notes: s.notes.map(n => n.id === d.id ? Object.assign({}, n, { x: nx, y: ny }) : n) })); }
  }
  onUp(e) {
    if (e && this.pts.has(e.pointerId)) { this.pts.delete(e.pointerId); if (this.pts.size < 2) this.pinch = null; }
    if (this.mq) { this.mq = null; this.setState({ mqRect: null }); return; }
    if (this.fd) { this.fvUp(); return; }
    if (this.pan) { this.pan = null; this.vpRef.current.style.cursor = 'grab'; }
    this.nd = null;
  }
  onVpDbl(e) { if (e.target.closest('[data-nopan]')) return; const r = this.vpRef.current.getBoundingClientRect(); this.addNote((e.clientX - r.left - this.cam.x) / this.cam.s - 115, (e.clientY - r.top - this.cam.y) / this.cam.s - 15); }
  addNoteCenter() { const vp = this.vpRef.current; this.addNote((vp.clientWidth / 2 - this.cam.x) / this.cam.s - 115, (vp.clientHeight / 2 - this.cam.y) / this.cam.s - 80); }
  addNote(x, y) {
    const n = { id: uid(), x, y, text: '', color: NOTE_COLORS[state.notes.length % 4], rot: Math.round((Math.random() * 3 - 1.5) * 10) / 10 };
    this.set(s => ({ notes: [...s.notes, n], menu: null }), () => { const ta = this.worldRef.current.querySelector(`[data-note="${n.id}"] textarea`); if (ta) ta.focus({ preventScroll: true }); });
  }
  onKey(e) {
    if (document.querySelector('dialog[open]')) return;
    const tag = e.target.tagName; const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Escape') {
      const S = this.state;
      if (S.ge || S.dm || S.ctx) this.setState({ ge: null, dm: null, ctx: null });
      else if (S.pop || S.menu) this.setState({ menu: null, pop: null });
      else if (S.fv && S.fv.showHidden) this.setFv({ showHidden: false });
      else if (S.fv && (S.fv.sel || []).length) this.setFv({ sel: [] });
      else if (S.fv) this.setState({ fv: null, fvLive: null });
      if (typing) e.target.blur(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !this.state.fv) { e.preventDefault(); this.setState({ menu: this.state.menu === 'search' ? null : 'search', pop: null }); return; }
    if (!typing && (e.metaKey || e.ctrlKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) { e.preventDefault(); this.undoRedo(e.key.toLowerCase() === 'y' || e.shiftKey); return; }
    if (this.state.fv && !typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); this.setFv({ sel: Object.keys(this._fvShown || {}) }); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'e' || e.key === 'E') { this.toggleHide(); return; }
    if (this.state.fv) {
      const k = e.key;
      if (k === 'w' || k === 'W') { this.fvHideKey(); return; }
      if (k === 'q' || k === 'Q') this.fvSort();
      else if ((k === 'Enter' || k === 'g' || k === 'G') && !this.state.ge && !this.state.dm && (this.state.fv.sel || []).length) { e.preventDefault(); this.openGroupMenu(); }
      return;
    }
    const k = e.key;
    if (k === '/') { e.preventDefault(); this.setState({ menu: 'search' }); }
    else if (k === 't' || k === 'T') this.goToday();
    else if (k === 'a' || k === 'A') this.openFV('day', dkey(new Date()));
    else if (k === 's' || k === 'S') this.openFV('week', this.state.focus);
    else if (k === '0') this.fitAll();
    else if (k === '1') this.flyToWeek(this.state.focus);
    else if (k === '+' || k === '=') this.zoomBtn(1.2);
    else if (k === '-') this.zoomBtn(1 / 1.2);
    else if (k === 'n' || k === 'N') this.addNoteCenter();
    else if (k === 'ArrowUp') { e.preventDefault(); this.stepWeek(-1); }
    else if (k === 'ArrowDown') { e.preventDefault(); this.stepWeek(1); }
  }
  toggleHide() { const v = !this.state.hideDone; this.setState({ hideDone: v }); lsSetUI('hideDone', v); this.toast(v ? 'Tareas hechas ocultas' : 'Mostrando tareas hechas'); }

  /* ----- vista de día / semana ----- */
  openFV(type, key) { this.setState({ fv: { type, key, sorted: false, calF: [], grpF: [], sel: [] }, fvLive: null, mqRect: null, ge: null, ctx: null, dm: null, menu: null, pop: null }); }
  setFv(p) { this.setState(s => s.fv ? { fv: Object.assign({}, s.fv, p) } : null); }
  fvKey() { const f = this.state.fv; return f ? f.type[0] + ':' + f.key : ''; }
  fvSort() { this.setState(s => s.fv ? { fv: Object.assign({}, s.fv, { sorted: !s.fv.sorted }), ge: null, ctx: null } : null); }
  boardPt(e) { const r = this.fvBoardRef.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  fvBoardDown(e) {
    if (e.button !== 0 || e.target.closest('[data-card]') || e.target.closest('[data-hull]')) return; e.preventDefault();
    const p = this.boardPt(e); const add = e.ctrlKey || e.metaKey || e.shiftKey;
    this.mq = { sx: p.x, sy: p.y, base: add ? (this.state.fv.sel || []) : [] };
    this.setState(s => ({ ge: null, ctx: null, dm: null, mqRect: null, fv: add ? s.fv : Object.assign({}, s.fv, { sel: [] }) }));
  }
  fvMq(e) {
    const p = this.boardPt(e), m = this.mq; const r = { x: Math.min(m.sx, p.x), y: Math.min(m.sy, p.y), w: Math.abs(p.x - m.sx), h: Math.abs(p.y - m.sy) };
    const S = this._fvShown || {}; const hit = Object.keys(S).filter(id => { const c = S[id]; return c.x < r.x + r.w && c.x + c.w > r.x && c.y < r.y + r.h && c.y + c.h > r.y; });
    const sel = Array.from(new Set(m.base.concat(hit)));
    this.setState(s => ({ mqRect: r, fv: s.fv ? Object.assign({}, s.fv, { sel }) : s.fv }));
  }
  fvDown(id, e) {
    if (e.button !== 0 || e.target.closest('[data-nodrag]')) return; e.stopPropagation(); e.preventDefault();
    let sel = this.state.fv.sel || [];
    if (e.ctrlKey || e.metaKey) { this.setFv({ sel: sel.includes(id) ? sel.filter(x => x !== id) : sel.concat(id) }); return; }
    const ce = e.target.closest('[data-corner]');
    if (!sel.includes(id)) { sel = [id]; this.setFv({ sel }); }
    const ids = ce ? [id] : sel; const B = this._fvRects || {}; const o = {}; ids.forEach(k => { if (B[k]) o[k] = Object.assign({}, B[k]); });
    this.fd = { id, ids: Object.keys(o), corner: ce ? ce.getAttribute('data-corner') : null, sx: e.clientX, sy: e.clientY, o, moved: false };
  }
  fvMove(e) {
    const d = this.fd; const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return; d.moved = true; if (this.state.fv && this.state.fv.sorted) return;
    const live = {};
    if (!d.corner) { d.ids.forEach(k => { const o = d.o[k]; live[k] = { x: Math.round(Math.max(0, o.x + dx)), y: Math.round(Math.max(0, o.y + dy)), w: o.w, h: o.h }; }); }
    else {
      const o = d.o[d.id]; if (!o) return; const MW = 110, MH = 72; const wst = d.corner.includes('w'), nth = d.corner.includes('n');
      let w = wst ? o.w - dx : o.w + dx, hh = nth ? o.h - dy : o.h + dy;
      if (e.shiftKey) { const k = Math.max(w / o.w, hh / o.h, MW / o.w, MH / o.h); w = o.w * k; hh = o.h * k; } else { w = Math.max(MW, w); hh = Math.max(MH, hh); }
      live[d.id] = { x: Math.round(wst ? o.x + o.w - w : o.x), y: Math.round(nth ? o.y + o.h - hh : o.y), w: Math.round(w), h: Math.round(hh) };
    }
    this.setState({ fvLive: live });
  }
  fvUp() {
    const d = this.fd; this.fd = null; const L = this.state.fvLive;
    if (!d.moved || !L) { this.setState({ fvLive: null }); return; }
    const vk = this.fvKey();
    this.set(s => {
      const lay = Object.assign({}, s.layouts[vk] || {}); Object.keys(L).forEach(k => { lay[k] = { x: L[k].x, y: L[k].y }; });
      return { fvLive: null, tasks: d.corner && L[d.id] ? s.tasks.map(t => t.id === d.id ? Object.assign({}, t, { w: L[d.id].w, h: L[d.id].h }) : t) : s.tasks, layouts: Object.assign({}, s.layouts, { [vk]: lay }) };
    });
  }
  fvDbl(id, e) { if (e.target.closest('[data-nodrag]')) return; const r = e.currentTarget.getBoundingClientRect(); this.setState({ dm: Object.assign({ id }, this.popPos(r)), ge: null, ctx: null }); }
  openGroupMenu() {
    const f = this.state.fv; if (!f || !(f.sel || []).length) return; const S = this._fvShown || {}; const b = this.fvBoardRef.current.getBoundingClientRect();
    let x1 = 1e9, y2 = -1e9, x2 = -1e9; f.sel.forEach(k => { const c = S[k]; if (!c) return; x1 = Math.min(x1, c.x); x2 = Math.max(x2, c.x + c.w); y2 = Math.max(y2, c.y + c.h); });
    if (x1 > 1e8) return; this.createGroupFor(f.sel, { x: b.left + (x1 + x2) / 2, y: b.top + y2 });
  }
  createGroupFor(ids, pos) {
    const n = state.groups.length; const g = { id: uid(), name: 'Grupo ' + (n + 1), color: GROUP_COLORS[n % GROUP_COLORS.length] };
    this.set(s => ({ groups: s.groups.concat(g), tasks: s.tasks.map(t => ids.includes(t.id) ? Object.assign({}, t, { groups: (t.groups || []).concat(g.id) }) : t), ctx: null }), () => this.openGE(g.id, pos, true));
  }
  toggleGroupFor(ids, gid, allIn) { this.set(s => ({ tasks: s.tasks.map(t => { if (!ids.includes(t.id)) return t; const gs = t.groups || []; return Object.assign({}, t, { groups: allIn ? gs.filter(x => x !== gid) : (gs.includes(gid) ? gs : gs.concat(gid)) }); }) })); }
  openCtx(id, e) {
    e.preventDefault(); e.stopPropagation(); let ids = [id];
    if (this.state.fv) { const sel = this.state.fv.sel || []; if (sel.includes(id)) ids = sel; else this.setFv({ sel: [id] }); }
    this.setState({ ctx: { ids, x: clamp(e.clientX, 8, innerWidth - 308), y: clamp(e.clientY, 8, innerHeight - 250) }, dm: null, ge: null, pop: null, menu: null });
  }
  openGE(gid, pos, select) {
    const W = 320, H = 440; const x = clamp(pos.x - W / 2, 12, innerWidth - W - 12); let y = pos.y + 12; if (y + H > innerHeight - 12) y = Math.max(72, innerHeight - H - 12);
    this.setState({ ge: { gid, x, y }, ctx: null, dm: null }, () => { const i = this.geRef.current; if (i) { i.focus({ preventScroll: true }); if (select) i.select(); } });
  }
  fvHideKey() {
    const f = this.state.fv; const sel = f.sel || [];
    if (sel.length) {
      const n = sel.length, v = !f.showHidden;
      this.set(s => ({ tasks: s.tasks.map(t => sel.includes(t.id) ? Object.assign({}, t, { hidden: v }) : t), fv: Object.assign({}, s.fv, { sel: [] }) }));
      this.toast(v ? n + (n > 1 ? ' tareas ocultas' : ' tarea oculta') + ' · W para verlas' : n + (n > 1 ? ' tareas restauradas' : ' tarea restaurada') + ' al lienzo');
    } else this.setFv({ showHidden: !f.showHidden, sel: [] });
  }
  popPos(r) { const W = 320, H = 460; let x = r.right + 10; if (x + W > innerWidth - 12) x = Math.max(12, r.left - W - 10); x = clamp(x, 12, Math.max(12, innerWidth - W - 12)); const y = clamp(r.top - 10, 72, Math.max(72, innerHeight - H - 12)); return { x, y }; }
  openTask(id, e) { const r = e.currentTarget.getBoundingClientRect(); this.setState({ menu: null, pop: Object.assign({ type: 'task', id }, this.popPos(r)) }); }
  dropH(k, date, week) {
    return {
      onDragOver: e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (this.state.drop !== k) this.setState({ drop: k }); },
      onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget) && this.state.drop === k) this.setState({ drop: null }); },
      onDrop: e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || this.state.dragId; if (id) this.updTask(id, { date, week }); this.setState({ drop: null, dragId: null }); }
    };
  }

  /* ----- piezas del lienzo principal ----- */
  taskRow(t, bucket) {
    const s = this.state; const drag = s.dragId === t.id, fl = s.flash === t.id;
    return html`<div key=${t.id} class=${'trow' + (bucket ? ' b' : '') + (fl ? ' flash' : '')} draggable="true"
      onContextMenu=${e => this.openCtx(t.id, e)}
      onDragStart=${e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => this.setState({ dragId: t.id }), 0); }}
      onDragEnd=${() => this.setState({ dragId: null, drop: null })}
      style=${`display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;opacity:${drag ? 0.4 : 1};cursor:grab;transition:background .3s, opacity .15s${bucket ? ';box-shadow:0 1px 2px rgba(0,0,0,0.3)' : ''}`}>
      <${Check} on=${t.done} onClick=${() => this.updTask(t.id, { done: !t.done })} />
      <button onClick=${e => this.openTask(t.id, e)} style=${`flex:1;min-width:0;padding:0;border:0;background:none;text-align:left;font-size:13px;line-height:18px;overflow-wrap:anywhere;cursor:pointer;color:${t.done ? '#6B7684' : '#E6E9EE'};text-decoration:${t.done ? 'line-through' : 'none'}`}>${t.title}</button>
      ${t.notes && !bucket ? svg(IC.notes, { s: 13, c: '#6B7684', st: 'flex:none;margin-top:3px' }) : null}
      ${t.color ? html`<span style=${`width:8px;height:8px;flex:none;margin-top:5px;border-radius:999px;background:${t.color}`}></span>` : null}
    </div>`;
  }
  evChip(it) {
    const o = OCC[it.i]; const col = evColor(o);
    return html`<button key=${'e' + it.i} class="h-ev" onClick=${() => openEvent(it.i)} style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;padding:7px 10px;border:1px solid #1B212A;border-radius:8px;background:#161B22;color:#E6E9EE;text-align:left;cursor:pointer;transition:all .2s cubic-bezier(.4,0,.2,1)">
      <span style="display:flex;align-items:flex-start;gap:7px;font-size:12.5px;line-height:16px;font-weight:600;overflow-wrap:anywhere"><span style=${`width:7px;height:7px;flex:none;margin-top:4.5px;border-radius:999px;background:${col}`}></span>${o.ev.title}</span>
      <span class="mono" style="font-size:10.5px;line-height:14px;color:#8B95A3;padding-left:14px">${it.label.replace('–', ' – ')}</span>
    </button>`;
  }
  dayCard(dd, j, wkKey, tw, evs, tk) {
    const s = this.state; const dk = dkey(dd), isT = dk === tk, over = s.drop === dk;
    const dT = tw.filter(t => t.date === dk), dD = dT.filter(t => t.done).length; const pct = dT.length ? Math.round(dD / dT.length * 100) : 0;
    const dh = this.dropH(dk, dk, wkKey);
    return html`<div key=${dk} data-nopan="1" data-day=${dk}
      onClick=${ev => { if (ev.target.closest('[draggable],button,input,textarea,select')) return; this.openFV('day', dk); }}
      onDragOver=${dh.onDragOver} onDragLeave=${dh.onDragLeave} onDrop=${dh.onDrop}
      style=${`position:relative;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;background:${over ? 'rgba(109,102,240,0.06)' : '#0E1116'};border:2px solid ${isT ? '#6D66F0' : over ? '#5A54C4' : '#1B212A'};cursor:pointer;transition:background .15s, border-color .15s`}>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 4px">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="disp" style=${`min-width:30px;height:30px;padding:0 6px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;background:${isT ? '#6D66F0' : 'transparent'};color:${isT ? '#FFFFFF' : '#E6E9EE'}`}>${dd.getDate()}</span>
          <span class="mono" style=${`font-size:11px;letter-spacing:.12em;color:${isT ? '#A39CFB' : '#8B95A3'}`}>${DIAS[j]}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="width:44px;height:4px;border-radius:999px;background:#1B212A;overflow:hidden"><span style=${`display:block;height:100%;width:${pct}%;border-radius:999px;background:#4E9B72;transition:width .4s cubic-bezier(.2,.8,.2,1)`}></span></span>
          <span class="mono" style=${`min-width:24px;text-align:right;font-size:11px;color:${dT.length && dD === dT.length ? '#4E9B72' : dT.length ? '#AEB6C2' : '#5A6472'}`}>${dD}/${dT.length}</span>
        </div>
      </div>
      <div data-scroll="1" style="flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;margin:0 -4px;padding:0 4px">
        ${(evs[dk] || []).map(it => this.evChip(it))}
        ${dT.filter(t => !(s.hideDone && t.done)).map(t => this.taskRow(t, false))}
      </div>
      <input class="addin" aria-label=${'Añadir tarea el ' + DIASL[j] + ' ' + dd.getDate()} onKeyDown=${ev => { const v = ev.target.value.trim(); if (ev.key === 'Enter' && v) { this.addTask(v, dk, wkKey); ev.target.value = ''; } }} placeholder="+ Añadir tarea" style="flex:none;width:100%;height:36px;padding:0 10px;border:1px dashed #242B34;border-radius:8px;background:transparent;font-size:13px" />
    </div>`;
  }
  weekRow(i, ctx) {
    const s = this.state; const { curMon, tk, curK } = ctx;
    const mon = addDays(curMon, i * 7), key = weekKey(mon), prevK = weekKey(addDays(mon, -7));
    const tw = state.tasks.filter(t => weekOfTask(t) === key); const done = tw.filter(t => t.done).length; const pct = tw.length ? Math.round(done / tw.length * 100) : 0;
    const evs = eventsForWeek(key); ctx.evByWeek[key] = evs;
    const pendN = i >= 0 ? state.tasks.filter(t => weekOfTask(t) === prevK && !t.done).length : 0;
    const isCur = key === curK; const sun = addDays(mon, 6); const showWE = lsGetUI('weekend', true);
    const bk = 'b:' + key, bOver = s.drop === bk, bt = tw.filter(t => !t.date); const bh = this.dropH(bk, null, key);
    const big = 'font-size:36px;line-height:38px;font-weight:600;letter-spacing:-.03em;width:40px;text-align:center';
    return html`<div key=${key} data-week=${key} style=${`position:relative;display:flex;align-items:stretch;gap:14px;padding:14px;border-radius:14px;background:${isCur ? 'rgba(109,102,240,0.04)' : 'rgba(255,255,255,0.012)'};border:${isCur ? '1.5px solid rgba(109,102,240,0.32)' : '1.5px dashed #242B34'};opacity:${i < 0 ? 0.82 : 1};transition:opacity .2s`}>
      <div data-nopan="1" style="width:80px;flex:none;display:flex;flex-direction:column;gap:14px;padding:16px 14px;border-radius:10px;background:#0E1116;border:1px solid #1B212A;cursor:default;user-select:text">
        ${isCur ? html`<div><span class="mono" style="font-size:10px;letter-spacing:.12em;font-weight:500;padding:2px 6px;border-radius:999px;background:#6D66F0;color:#FFFFFF">AHORA</span></div>` : null}
        <div style="display:flex;flex-direction:column;gap:2px"><span class="disp" style=${big}>${mon.getDate()}</span><span style="font-size:12px;color:#8B95A3">lun · ${MES[mon.getMonth()]}</span></div>
        <button onClick=${() => this.openFV('week', key)} title="Ver todas las tareas de la semana" aria-label=${'Abrir la semana ' + isoWeek(mon).week} class="h-tint" style="flex:1;min-height:40px;display:flex;justify-content:center;padding:0 0 0 2px;width:40px;border:0;background:transparent;cursor:pointer;border-radius:6px;transition:background .2s">
          <span style="position:relative;display:block;width:4px;height:100%;border-radius:999px;background:#1B212A;overflow:hidden"><span style=${`position:absolute;left:0;top:0;width:100%;height:${pct}%;border-radius:999px;background:#4E9B72;transition:height .5s cubic-bezier(.2,.8,.2,1)`}></span></span>
        </button>
        <div style="display:flex;flex-direction:column;gap:2px"><span class="disp" style=${big}>${sun.getDate()}</span><span style="font-size:12px;color:#8B95A3">dom · ${MES[sun.getMonth()]}</span></div>
        <div style="height:1px;background:#1B212A"></div>
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="disp" style="font-size:26px;line-height:30px;font-weight:600;letter-spacing:-.02em">${done}<span style="color:#6B7684">/${tw.length}</span></span>
          <span class="mono" style="font-size:11px;color:#4E9B72">${pct}%</span>
        </div>
        ${pendN > 0 ? html`<button class="h-tint2" onClick=${() => { this.set(st => ({ tasks: st.tasks.map(t => weekOfTask(t) === prevK && !t.done ? Object.assign({}, t, { date: null, week: key }) : t) })); this.toast(pendN + ' pendientes movidas a «sin fecha»'); }} style="padding:7px 8px;border:0;border-radius:6px;background:rgba(109,102,240,0.08);color:#A39CFB;font-size:11.5px;font-weight:600;text-align:left;cursor:pointer;line-height:15px">Traer ${pendN} pendientes</button>` : null}
      </div>
      <div style=${`display:grid;grid-template-columns:repeat(${showWE ? 4 : 3},264px);grid-auto-rows:330px;gap:14px`}>
        ${[0, 1, 2, 3, 4, 5, 6].filter(j => showWE || j < 5).map(j => this.dayCard(addDays(mon, j), j, key, tw, evs, tk))}
        <div data-nopan="1" onDragOver=${bh.onDragOver} onDragLeave=${bh.onDragLeave} onDrop=${bh.onDrop} style=${`min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;background:${bOver ? 'rgba(109,102,240,0.06)' : 'rgba(255,255,255,0.015)'};border:2px solid ${bOver ? '#5A54C4' : '#4E9B72'};cursor:default;transition:background .15s, border-color .15s`}>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 2px 6px"><span style="font-size:14px;font-weight:600">sin fecha</span><span class="mono" style="font-size:11px;color:#8B95A3">${bt.length}</span></div>
          <div data-scroll="1" style="flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:8px;margin:0 -4px;padding:0 4px">${bt.filter(t => !(s.hideDone && t.done)).map(t => this.taskRow(t, true))}</div>
          <input class="addin" aria-label="Añadir tarea sin fecha" onKeyDown=${ev => { const v = ev.target.value.trim(); if (ev.key === 'Enter' && v) { this.addTask(v, null, key); ev.target.value = ''; } }} placeholder="+ Para cuando sea" style="flex:none;width:100%;height:36px;padding:0 10px;border:1px dashed #2E3742;border-radius:8px;background:transparent;font-size:13px" />
        </div>
      </div>
    </div>`;
  }
  noteEl(n) {
    return html`<div key=${n.id} data-nopan="1" data-note=${n.id} style=${`position:absolute;left:${n.x}px;top:${n.y}px;width:230px;border-radius:6px;background:${n.color};border:1px solid rgba(255,255,255,0.06);box-shadow:${SH};transform:rotate(${n.rot || 0}deg);display:flex;flex-direction:column`}>
      <div onPointerDown=${e => { e.stopPropagation(); this.nd = { id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y }; }} style="height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 12px;cursor:move;touch-action:none">
        <span style="width:28px;height:4px;border-radius:999px;background:rgba(255,255,255,0.14)"></span>
        <button class="h-x" onPointerDown=${e => e.stopPropagation()} onClick=${() => this.set(st => ({ notes: st.notes.filter(x => x.id !== n.id) }))} aria-label="Borrar nota" style="width:26px;height:26px;padding:0;border:0;border-radius:8px;background:transparent;color:#8B95A3;cursor:pointer;display:flex;align-items:center;justify-content:center">${svg(IC.x, { s: 14 })}</button>
      </div>
      <textarea aria-label="Nota" value=${n.text} onInput=${e => { const v = e.target.value; this.set(st => ({ notes: st.notes.map(x => x.id === n.id ? Object.assign({}, x, { text: v }) : x) })); }} placeholder="Escribe una nota…" style="min-height:130px;resize:vertical;border:0;background:transparent;padding:0 14px 14px;font-size:14px;line-height:20px;outline:none;user-select:text"></textarea>
    </div>`;
  }

  /* ----- barras flotantes y menús ----- */
  topLeft() {
    const s = this.state; const m = () => this.setState(st => ({ menu: st.menu === 'main' ? null : 'main', pop: null }));
    const go = f => () => { this.setState({ menu: null }); f(); };
    const canEv = gStatus && gStatus.connected && gStatus.canWrite && state.calendars.some(c => c.google && c.writable);
    return html`<div data-menu="1" style="position:fixed;top:16px;left:16px;z-index:20">
      <button class="h-float" onClick=${m} aria-expanded=${s.menu === 'main'} style=${FLOAT + ';padding:0 14px 0 10px;display:flex;align-items:center;gap:10px;cursor:pointer'}>
        <${LogoMark} s=${28} /><span class="disp hide-sm" style="font-size:15px;font-weight:700;letter-spacing:-.01em">Semanal</span>${svg(IC.down, { s: 14, c: '#8B95A3', w: 2.2 })}
      </button>
      ${s.menu === 'main' ? html`<div style=${MENU + ';position:absolute;top:54px;left:0;width:280px;max-height:calc(100vh - 90px);overflow:auto;padding:6px;gap:2px'}>
        <${SecLbl} t="VISTA" />
        <button class="h-raise" style=${MI} onClick=${go(() => this.goToday())}><span>Ir a hoy</span><${Kbd} k="T" /></button>
        <button class="h-raise" style=${MI} onClick=${go(() => this.flyToWeek(s.focus))}><span>Ajustar a la semana</span><${Kbd} k="1" /></button>
        <button class="h-raise" style=${MI} onClick=${go(() => this.fitAll())}><span>Ver todo el lienzo</span><${Kbd} k="0" /></button>
        <button class="h-raise" style=${MI} onClick=${go(() => this.openFV('day', dkey(new Date())))}><span>Vista de hoy</span><${Kbd} k="A" /></button>
        <${Div} />
        <${SecLbl} t="CREAR" />
        <button class="h-raise" style=${MI} onClick=${() => this.addNoteCenter()}><span>Nota en el lienzo</span><${Kbd} k="N" /></button>
        ${canEv ? html`<button class="h-raise" style=${MI} onClick=${go(() => openEventEdit(null))}><span>Evento en Google Calendar</span></button>` : null}
        <button class="h-raise" style=${MI} onClick=${() => this.setState({ menu: 'search' })}><span>Buscar</span><${Kbd} k="⌘K" /></button>
        <${Div} />
        <${SecLbl} t="AJUSTES" />
        <button class="h-raise" style=${MI} onClick=${() => { const v = this.wheelMode() === 'zoom' ? 'desplazar' : 'zoom'; lsSetUI('wheel', v); this.forceUpdate(); }}><span>Rueda del ratón</span><span style="color:#A39CFB;font-size:12.5px">${this.wheelMode() === 'zoom' ? 'zoom' : 'desplazar'}</span></button>
        <button class="h-raise" style=${MI} onClick=${() => { lsSetUI('weekend', !lsGetUI('weekend', true)); this.forceUpdate(); }}><span>Fin de semana</span><span style="color:#A39CFB;font-size:12.5px">${lsGetUI('weekend', true) ? 'visible' : 'oculto'}</span></button>
        <${Div} />
        <${SecLbl} t="DATOS" />
        <button class="h-raise" style=${MI} onClick=${go(() => this.exportCopy())}><span>Exportar copia (.json)</span></button>
        <button class="h-raise" style=${MI} onClick=${go(() => document.getElementById('fileBackup').click())}><span>Importar copia</span></button>
        <a class="h-raise" href="privacidad.html" style=${MI}>Privacidad</a>
        <${Div} />
        <${SecLbl} t="ATAJOS" />
        <div style="display:flex;flex-direction:column;gap:2px;padding:2px 10px 8px">${SHORTCUTS.map(([k, d]) => html`<div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;line-height:22px;color:#AEB6C2"><span>${d}</span><${Kbd} k=${k} /></div>`)}</div>
      </div>` : null}
    </div>`;
  }
  exportCopy() {
    const blob = new Blob([JSON.stringify(Object.assign({}, state, { calendars: state.calendars.filter(c => !c.google) }), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'app-semanal-' + dkey(new Date()) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.toast('Copia descargada');
  }
  topCenter(weeks) {
    const s = this.state; const tk = dkey(new Date()); const fw = weeks.find(w => w.key === s.focus) || weeks.find(w => w.isCur) || weeks[0];
    const wide = s.vw >= 1180;
    const btn = 'width:38px;height:36px;border:0;border-radius:8px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#E6E9EE';
    return html`<div data-menu="1" class="wkbar" style="position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:20">
      <div style=${FLOAT + ';padding:4px;display:flex;align-items:center;gap:2px'}>
        <button class="h-raise" onClick=${() => this.stepWeek(-1)} aria-label="Semana anterior" style=${btn}>${svg(IC.up, { w: 2.2 })}</button>
        <button class="h-raise" onClick=${() => this.setState(st => ({ menu: st.menu === 'week' ? null : 'week', pop: null }))} style="flex:none;white-space:nowrap;height:36px;padding:0 12px;border:0;border-radius:8px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px">
          ${fw && fw.isCur ? html`<span style="width:7px;height:7px;border-radius:999px;background:#6D66F0"></span>` : null}
          <span style="font-weight:600;white-space:nowrap">Semana ${fw ? fw.num : ''}</span>
          ${wide && fw ? html`<span style="color:#8B95A3;font-size:13px;white-space:nowrap">${rangeLbl(weekStart(fw.key))}</span>` : null}
          ${svg(IC.down, { s: 14, c: '#8B95A3', w: 2.2 })}
        </button>
        <button class="h-raise" onClick=${() => this.stepWeek(1)} aria-label="Semana siguiente" style=${btn}>${svg(IC.down, { w: 2.2 })}</button>
      </div>
      ${s.menu === 'week' ? html`<div class="wkmenu" style=${MENU + ';position:absolute;top:54px;left:50%;margin-left:-180px;width:360px;max-width:calc(100vw - 24px);max-height:calc(100vh - 90px);overflow:auto;padding:6px;gap:2px'}>
        ${weeks.map(w => html`<button class="h-raise" onClick=${() => { this.setState({ menu: null, focus: w.key }); this.flyToWeek(w.key, true); }} style=${`display:grid;grid-template-columns:44px 1fr 80px;align-items:center;gap:12px;min-height:44px;padding:0 10px;border:0;border-radius:6px;background:${w.key === (fw && fw.key) ? '#151A21' : 'transparent'};cursor:pointer;text-align:left;color:#E6E9EE`}>
          <span class="mono" style=${`font-size:12px;color:${w.isCur ? '#A39CFB' : '#8B95A3'}`}>S${w.num}</span>
          <span style="font-size:13.5px">${w.range}<span style="color:#8B95A3">${w.isCur ? ' · esta semana' : ''}</span></span>
          <span style="height:4px;border-radius:999px;background:#242B34;overflow:hidden"><span style=${`display:block;height:100%;width:${w.pct}%;background:#4E9B72`}></span></span>
        </button>`)}
        <${Div} />
        <div style="display:flex;gap:6px;padding:4px">
          <button class="h-primary" onClick=${() => { this.setState({ menu: null }); this.goToday(); }} style="flex:1;height:38px;border:0;border-radius:6px;background:#6D66F0;color:#FFFFFF;font-weight:600;cursor:pointer">Ir a hoy</button>
          <button class="h-sec" onClick=${() => { this.setState({ menu: null }); this.fitAll(); }} style="flex:1;height:38px;border:0;border-radius:6px;background:#151A21;font-weight:500;cursor:pointer;color:#E6E9EE">Ver todas</button>
        </div>
      </div>` : null}
    </div>`;
  }
  hideBtn(inFv) {
    const s = this.state; const on = s.hideDone; const wide = s.vw >= 1180 || inFv;
    return html`<button onClick=${() => this.toggleHide()} title="Ocultar o mostrar tareas hechas (E)" aria-pressed=${on} style=${`height:${inFv ? 40 : 46}px;padding:0 ${inFv ? 12 : 14}px;border:1px solid ${on ? '#6D66F0' : '#242B34'};border-radius:${inFv ? 8 : 10}px;background:${on ? 'rgba(109,102,240,0.10)' : inFv ? '#151A21' : '#0E1116'};color:${on ? '#A39CFB' : '#E6E9EE'};display:flex;align-items:center;gap:8px;cursor:pointer;${inFv ? 'font-size:13px;' : 'box-shadow:0 10px 28px rgba(0,0,0,0.5);'}white-space:nowrap;transition:all .2s cubic-bezier(.4,0,.2,1)`}>${svg(on ? IC.eyeOff : IC.eye)}${wide ? html`<span style=${inFv ? '' : 'font-size:13.5px'}>Ocultar completadas</span>` : null}</button>`;
  }
  topRight(results, q) {
    const s = this.state; const wide = s.vw >= 1180; const cals = this.cals(); const g = gStatus || {};
    const m = k => () => this.setState(st => ({ menu: st.menu === k ? null : k, pop: null }));
    const letter = (g.email || 'D')[0].toUpperCase();
    const dotCol = !g.connected ? '#6B7684' : (g.error || (g.driveState || '').startsWith('error')) ? '#C9695E' : '#4E9B72';
    const mins = G.lastSync ? Math.round((Date.now() - G.lastSync) / 60000) : null;
    return html`<div data-menu="1" style="position:fixed;top:16px;right:16px;z-index:20;display:flex;gap:8px">
      <span class="hide-sm">${this.hideBtn(false)}</span>
      <button class="h-float" onClick=${m('search')} style=${FLOAT + ';padding:0 10px 0 14px;display:flex;align-items:center;gap:10px;cursor:pointer'} aria-label="Buscar">
        ${svg(IC.search, { w: 2.2 })}${wide ? html`<span style="font-size:13.5px">Buscar</span>` : null}<${Kbd} k="⌘K" />
      </button>
      <button class="h-float" onClick=${m('cals')} aria-label="Calendarios" style=${FLOAT + ';padding:0 14px;display:flex;align-items:center;gap:10px;cursor:pointer'}>
        <span style="display:flex;padding-left:3px">${cals.slice(0, 5).map(c => html`<span style=${`width:12px;height:12px;margin-left:-3px;border-radius:999px;border:2px solid #0E1116;background:${c.on ? c.color : '#262D37'}`}></span>`)}</span>
        ${wide ? html`<span style="font-size:13.5px">Calendarios</span>` : null}
      </button>
      <button class="h-float" onClick=${m('account')} aria-label="Cuenta de Google" style=${FLOAT + ';position:relative;width:46px;cursor:pointer;display:flex;align-items:center;justify-content:center'}>
        <span style=${`width:30px;height:30px;border-radius:999px;background:${g.connected ? '#6D66F0' : '#262D37'};color:#FFFFFF;font-weight:600;display:flex;align-items:center;justify-content:center`}>${g.connected ? letter : '?'}</span>
        <span style=${`position:absolute;right:7px;bottom:7px;width:10px;height:10px;border-radius:999px;background:${dotCol};border:2px solid #0E1116`}></span>
      </button>

      ${s.menu === 'search' ? html`<div style=${MENU + ';position:absolute;top:54px;right:0;width:400px;max-width:calc(100vw - 32px);padding:6px;gap:4px'}>
        <div style="display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;border-radius:8px;background:#151A21">
          ${svg(IC.search, { c: '#8B95A3', w: 2.2 })}
          <input ref=${this.searchRef} aria-label="Buscar" value=${s.q} onInput=${e => this.setState({ q: e.target.value })} onKeyDown=${e => { if (e.key === 'Enter' && results[0]) results[0].onPick(); }} placeholder="Tareas, notas o eventos…" style="flex:1;height:100%;border:0;background:transparent;outline:none;font-size:14px;color:#E6E9EE" />
        </div>
        ${!q ? html`<span style="padding:10px 12px;font-size:12.5px;color:#8B95A3">Escribe para buscar en todas tus semanas. Enter abre el primer resultado.</span>` : null}
        ${q && !results.length ? html`<span style="padding:10px 12px;font-size:12.5px;color:#8B95A3">Nada coincide con «${s.q}».</span>` : null}
        ${results.map(r => html`<button class="h-raise" onClick=${r.onPick} style="display:flex;align-items:center;gap:12px;min-height:46px;padding:6px 10px;border:0;border-radius:6px;background:transparent;cursor:pointer;text-align:left;color:#E6E9EE">
          <span style=${`width:8px;height:8px;flex:none;border-radius:999px;background:${r.color}`}></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style=${`font-size:13.5px;overflow-wrap:anywhere;text-decoration:${r.deco}`}>${r.title}</span><span style="font-size:12px;color:#8B95A3">${r.sub}</span></span>
          <span class="mono" style="font-size:10.5px;color:#8B95A3">${r.kind}</span>
        </button>`)}
      </div>` : null}

      ${s.menu === 'cals' ? html`<div style=${MENU + ';position:absolute;top:54px;right:54px;width:310px;max-width:calc(100vw - 32px);max-height:calc(100vh - 90px);overflow:auto;padding:6px;gap:2px'}>
        <${SecLbl} t=${state.calendars.some(c => c.google) ? 'GOOGLE CALENDAR' : 'CALENDARIOS'} />
        ${!state.calendars.length ? html`<span style="padding:6px 10px 10px;font-size:12.5px;color:#8B95A3">Conecta Google en el botón de tu cuenta para ver aquí tus calendarios.</span>` : null}
        ${state.calendars.length ? cals.map(c => html`<div class="h-raise" style="display:flex;align-items:center;gap:10px;min-height:44px;padding:0 10px;border-radius:6px">
          <label title="Cambiar color" style=${`position:relative;width:14px;height:14px;flex:none;border-radius:4px;background:${c.color};cursor:pointer;overflow:hidden`}><input type="color" aria-label=${'Color de ' + c.name} value=${c.color} onChange=${e => { const x = c.src; x.color = e.target.value; if (x.google) x.customColor = true; setCalPref(x); save(); this.forceUpdate(); }} style="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0" /></label>
          <button onClick=${() => { const x = c.src; x.visible = !c.on; setCalPref(x); save(); this.forceUpdate(); }} style="flex:1;display:flex;align-items:center;gap:10px;height:44px;padding:0;border:0;background:transparent;cursor:pointer;text-align:left;color:#E6E9EE">
            <span style="flex:1;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
            <span style=${`width:34px;height:20px;flex:none;border-radius:999px;background:${c.on ? '#6D66F0' : '#262D37'};position:relative;transition:background .2s`}><span style=${`position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;background:#ffffff;transform:translateX(${c.on ? 14 : 0}px);transition:transform .2s cubic-bezier(.2,.8,.2,1)`}></span></span>
          </button>
          ${c.src && !c.src.google ? html`<button class="h-dangert" onClick=${() => { if (confirm('¿Quitar «' + c.name + '»?')) { state.calendars = state.calendars.filter(x => x !== c.src); save(); this.forceUpdate(); } }} aria-label=${'Quitar ' + c.name} style="width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:#C9695E;cursor:pointer;display:flex;align-items:center;justify-content:center">${svg(IC.x, { s: 13 })}</button>` : null}
        </div>`) : null}
        <${Div} />
        <button class="h-dash" onClick=${() => { this.setState({ menu: null }); document.getElementById('fileIcs').click(); }} style="display:flex;align-items:center;gap:10px;height:40px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:#8B95A3;cursor:pointer;font-size:13.5px">${svg(IC.plus)}Importar calendario .ics</button>
        <a class="h-dash" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:10px;min-height:40px;padding:6px 10px;border-radius:6px;color:#8B95A3;text-decoration:none;font-size:13.5px">${svg(IC.link)}<span>Añadir Canvas u otro enlace<br /><span style="font-size:11.5px">en Google Calendar › Desde URL</span></span></a>
      </div>` : null}

      ${s.menu === 'account' ? html`<div style=${MENU + ';position:absolute;top:54px;right:0;width:300px;max-width:calc(100vw - 32px);padding:14px;gap:12px'}>
        ${!g.configured ? html`<span style="font-size:13px;color:#AEB6C2">La conexión con Google no está configurada (config.js).</span>`
        : !g.connected ? html`
          <div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:999px;background:#262D37;color:#AEB6C2;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:center">?</span><div style="display:flex;flex-direction:column"><span style="font-weight:600">Sin conectar</span><span style="font-size:12px;color:#8B95A3">${g.lost ? 'Google retiró el permiso' : 'Tus tareas solo están en este navegador'}</span></div></div>
          <span style="font-size:12.5px;line-height:18px;color:#8B95A3">Conecta una vez en este dispositivo: verás y editarás tu Google Calendar al momento y tus tareas se guardarán en tu Google Drive.</span>
          <button class="h-primary" onClick=${() => gConnect()} style="height:40px;border:0;border-radius:6px;background:#6D66F0;color:#FFFFFF;font-weight:600;cursor:pointer">${g.lost ? 'Volver a conectar' : 'Conectar con Google'}</button>`
        : html`
          <div style="display:flex;align-items:center;gap:12px"><span style="width:40px;height:40px;border-radius:999px;background:#6D66F0;color:#FFFFFF;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:center">${letter}</span><div style="display:flex;flex-direction:column;min-width:0"><span style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${g.email || 'Google'}</span><span style="font-size:12px;color:#8B95A3">Google conectado</span></div></div>
          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;background:#151A21;font-size:12.5px;color:#8B95A3"><span style=${`width:8px;height:8px;flex:none;border-radius:999px;background:${dotCol}`}></span><span>${g.error ? g.error : (g.driveState || '').startsWith('error:') ? 'Tareas: ' + g.driveState.slice(6) : 'Sincronizado ' + (mins == null ? '…' : mins < 1 ? 'hace un momento' : 'hace ' + mins + ' min') + ' · Drive y Calendar'}</span></div>
          ${!g.canWrite || !g.drive ? html`<button class="h-tint2" onClick=${() => gConnect()} style="height:36px;border:0;border-radius:6px;background:rgba(109,102,240,0.08);color:#A39CFB;font-weight:600;cursor:pointer">Dar permiso que falta</button>` : null}
          <div style="display:flex;gap:6px">
            <button class="h-primary" onClick=${() => { this.setState({ menu: null }); gTick(true).then(() => driveTick(true)).then(() => this.toast('Sincronizado con Google')); }} style="flex:1;height:38px;border:0;border-radius:6px;background:#6D66F0;color:#FFFFFF;font-weight:600;cursor:pointer">Sincronizar</button>
            <button class="h-sec" onClick=${() => { if (confirm('¿Desconectar Google en este dispositivo? Tus tareas siguen guardadas.')) { this.setState({ menu: null }); gDisconnect().then(() => this.toast('Google desconectado')); } }} style="flex:1;height:38px;border:0;border-radius:6px;background:#151A21;color:#C9695E;font-weight:500;cursor:pointer">Desconectar</button>
          </div>`}
      </div>` : null}
    </div>`;
  }
  bottomBar() {
    const b = 'width:38px;height:36px;border:0;border-radius:8px;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#E6E9EE';
    return html`<div style=${FLOAT + ';position:fixed;right:16px;bottom:16px;z-index:20;padding:4px;display:flex;align-items:center;gap:2px'}>
      <button class="h-raise hide-sm" onClick=${() => this.zoomBtn(1 / 1.2)} aria-label="Alejar" style=${b}>${svg(IC.minus, { w: 2.2 })}</button>
      <span ref=${this.zoomRef} class="mono hide-sm" aria-live="off" style="min-width:52px;text-align:center;font-size:12px;color:#AEB6C2"></span>
      <button class="h-raise hide-sm" onClick=${() => this.zoomBtn(1.2)} aria-label="Acercar" style=${b}>${svg(IC.plus, { w: 2.2 })}</button>
      <span class="hide-sm" style="width:1px;height:22px;background:#242B34;margin:0 4px"></span>
      <button class="h-raise" onClick=${() => this.goToday()} style="height:36px;padding:0 12px;border:0;border-radius:8px;background:transparent;cursor:pointer;font-size:13px;font-weight:500;color:#E6E9EE">Hoy</button>
      <button class="h-raise" onClick=${() => this.fitAll()} aria-label="Ver todo" style=${b}>${svg(IC.fit)}</button>
    </div>`;
  }

  /* ----- panel de tarea (lienzo principal) ----- */
  taskPop() {
    const s = this.state, pop = s.pop; if (!pop || pop.type !== 'task') return null;
    const t = state.tasks.find(x => x.id === pop.id); if (!t) return null;
    const wk = weekOfTask(t), mon = weekStart(wk); const u = p => this.updTask(t.id, p);
    const sel = 'height:40px;padding:0 10px;border:1px solid #242B34;border-radius:6px;background:#151A21;color:#E6E9EE';
    return html`<div onPointerDown=${() => this.setState({ pop: null })} style="position:fixed;inset:0;z-index:30;background:rgba(5,7,9,0.45)"></div>
    <div role="dialog" aria-label="Tarea" style=${`position:fixed;left:${pop.x}px;top:${pop.y}px;z-index:31;width:320px;max-width:calc(100vw - 24px);padding:16px;border-radius:10px;background:#0E1116;border:1px solid #242B34;color:#E6E9EE;box-shadow:0 24px 56px rgba(0,0,0,0.75);display:flex;flex-direction:column;gap:14px;animation:pop .16s ease-out`}>
      <input class="tin2" aria-label="Título" value=${t.title} onInput=${e => u({ title: e.target.value })} style="height:40px;padding:0 10px;margin:0 -4px;border:0;border-radius:6px;background:transparent;font-family:var(--disp);font-size:17px;font-weight:700;color:#E6E9EE;outline:none" />
      <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Día</span>
        <select value=${t.date || ''} onChange=${e => u({ date: e.target.value || null, week: wk })} style=${sel}>
          <option value="">Sin día concreto</option>
          ${[0, 1, 2, 3, 4, 5, 6].map(j => { const d = addDays(mon, j); return html`<option value=${dkey(d)}>${DIASL[j] + ' ' + d.getDate() + ' ' + MES[d.getMonth()]}</option>`; })}
        </select></label>
      <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Calendario</span>
        <select value=${this.cOf(t)} onChange=${e => u({ cal: e.target.value })} style=${sel}>${this.cals().map(c => html`<option value=${c.id}>${c.name}</option>`)}</select></label>
      <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Notas</span>
        <textarea rows="3" value=${t.notes || ''} onInput=${e => u({ notes: e.target.value })} placeholder="Detalles, enlaces…" style="resize:vertical;padding:10px;border:1px solid #242B34;border-radius:6px;background:#151A21;color:#E6E9EE;font-size:13px;line-height:18px;outline:none"></textarea></label>
      <div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Color</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${[null].concat(TCOLORS).map(c => html`<button onClick=${() => u({ color: c })} aria-label=${c ? 'Color ' + c : 'Sin color'} style=${`width:28px;height:28px;padding:0;border-radius:999px;background:${c || 'transparent'};border:2px dashed ${c ? 'transparent' : '#3A434F'};box-shadow:0 0 0 2px #0E1116, 0 0 0 4px ${(t.color || null) === c ? '#E6E9EE' : 'transparent'};cursor:pointer;transition:box-shadow .15s`}></button>`)}</div></div>
      <div style="display:flex;gap:6px;padding-top:2px">
        <button class="h-dangero" onClick=${() => this.delTask(t.id)} style="height:40px;padding:0 12px;border-radius:6px;background:transparent;border:1px solid #3A2725;color:#C9695E;font-weight:500;cursor:pointer">Eliminar</button>
        <button class="h-sec2" onClick=${() => u({ done: !t.done })} style="flex:1;height:40px;border:1px solid #242B34;border-radius:8px;background:#151A21;color:#E6E9EE;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;cursor:pointer"><${Tick} on=${t.done} />Completada</button>
      </div>
    </div>`;
  }

  /* ----- menús de la vista día/semana ----- */
  menus() {
    const s = this.state; const out = [];
    const gMap = {}; state.groups.forEach(g => { gMap[g.id] = g; }); const calMap = {}; this.cals().forEach(c => { calMap[c.id] = c; });
    if (s.ge && gMap[s.ge.gid]) {
      const g = gMap[s.ge.gid];
      const mem = state.tasks.filter(t => (t.groups || []).includes(g.id)).sort((p, q) => area(q) - area(p)); const mx = mem.length ? area(mem[0]) : 1;
      const upd = p => this.set(st => ({ groups: st.groups.map(x => x.id === g.id ? Object.assign({}, x, p) : x) }));
      out.push(html`<div onPointerDown=${() => this.setState({ ge: null })} style="position:fixed;inset:0;z-index:32;background:rgba(5,7,9,0.35)"></div>
      <div role="dialog" aria-label="Grupo" style=${`position:fixed;left:${s.ge.x}px;top:${s.ge.y}px;z-index:33;width:320px;max-height:calc(100vh - 96px);padding:14px;border-radius:10px;background:#0E1116;border:1px solid #242B34;box-shadow:${SH};display:flex;flex-direction:column;gap:12px;animation:pop .16s ease-out`}>
        <span class="mono" style="font-size:10px;letter-spacing:.12em;color:#6B7684">GRUPO · ${mem.length} TAREAS</span>
        <input class="fin" ref=${this.geRef} aria-label="Nombre del grupo" value=${g.name} onInput=${e => upd({ name: e.target.value })} placeholder="Nombre del grupo" style="height:40px;padding:0 10px;border:1px solid #1F252E;border-radius:8px;background:#12161C;color:#E6E9EE;outline:none;font-family:var(--disp);font-size:16px;font-weight:700" />
        <div style="display:flex;gap:8px;flex-wrap:wrap">${GROUP_COLORS.map(c => html`<button onClick=${() => upd({ color: c })} aria-label="Color del grupo" style=${`width:26px;height:26px;padding:0;border:0;border-radius:6px;background:${c};box-shadow:0 0 0 2px #0E1116, 0 0 0 4px ${c === g.color ? '#E6E9EE' : 'transparent'};cursor:pointer`}></button>`)}</div>
        <span class="mono" style="font-size:10px;letter-spacing:.12em;color:#6B7684">DE MÁS A MENOS PRIORITARIA</span>
        <div data-scroll="1" style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;margin:-4px -6px 0">
          ${mem.map((t, i) => html`<button class="h-raise" onClick=${e => { const r = e.currentTarget.getBoundingClientRect(); this.setState({ ge: null, dm: Object.assign({ id: t.id }, this.popPos(r)) }); }} style="display:flex;align-items:center;gap:10px;min-height:36px;padding:6px;border:0;border-radius:6px;background:transparent;text-align:left;cursor:pointer;color:#E6E9EE">
            <span class="mono" style="width:18px;flex:none;font-size:10.5px;color:#6B7684">${i + 1}</span>
            <span style=${`width:7px;height:7px;flex:none;border-radius:999px;background:${(calMap[this.cOf(t)] || { color: '#6B7684' }).color}`}></span>
            <span style=${`flex:1;min-width:0;font-size:13px;line-height:17px;overflow-wrap:anywhere;color:${t.done ? '#6B7684' : '#E6E9EE'};text-decoration:${t.done ? 'line-through' : 'none'}`}>${t.title}</span>
            <span style=${`width:${Math.round(8 + 40 * area(t) / mx)}px;height:4px;flex:none;border-radius:999px;background:${g.color}`}></span>
          </button>`)}
          ${!mem.length ? html`<span style="padding:8px 6px;font-size:12.5px;color:#6B7684">Este grupo aún no tiene tareas.</span>` : null}
        </div>
        <button class="h-dangert" onClick=${() => { this.set(st => ({ groups: st.groups.filter(x => x.id !== g.id), tasks: st.tasks.map(t => (t.groups || []).includes(g.id) ? Object.assign({}, t, { groups: t.groups.filter(x => x !== g.id) }) : t), ge: null })); this.toast('Grupo eliminado'); }} style="align-self:flex-start;height:32px;padding:0 10px;border:0;border-radius:6px;background:transparent;color:#C9695E;font-size:12.5px;cursor:pointer">Eliminar grupo</button>
      </div>`);
    }
    if (s.ctx) {
      const ts = s.ctx.ids.map(id => state.tasks.find(t => t.id === id)).filter(Boolean); const ids = ts.map(t => t.id);
      if (ts.length) {
        const allDone = ts.every(t => t.done); const allHid = ts.every(t => t.hidden);
        const item = 'display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;background:transparent;border:0;border-radius:6px;text-align:left;font-size:13px;color:#AEB6C2;cursor:pointer';
        out.push(html`<div onPointerDown=${() => this.setState({ ctx: null })} onContextMenu=${e => { e.preventDefault(); this.setState({ ctx: null }); }} style="position:fixed;inset:0;z-index:34"></div>
        <div role="menu" onContextMenu=${e => { e.preventDefault(); this.setState({ ctx: null }); }} style=${`position:fixed;left:${s.ctx.x}px;top:${s.ctx.y}px;z-index:35;min-width:190px;max-width:300px;padding:6px;border-radius:10px;background:#0E1116;border:1px solid #242B34;box-shadow:0 18px 44px -14px rgba(0,0,0,0.75);display:flex;flex-direction:column;animation:pop .12s ease-out`}>
          <div class="mono" style="padding:6px 10px 7px;margin-bottom:6px;border-bottom:1px solid #1C2128;font-size:10px;letter-spacing:.12em;color:#6B7684;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ts.length > 1 ? ts.length + ' tareas' : ts[0].title}</div>
          <span class="mono" style="padding:0 10px 4px;font-size:10px;letter-spacing:.12em;color:#6B7684">GRUPOS</span>
          <div style="display:flex;flex-wrap:wrap;gap:2px;padding:0 4px 6px">
            ${state.groups.map(g => { const n = ts.filter(t => (t.groups || []).includes(g.id)).length; const all = n === ts.length; return html`<button class="h-raise" onClick=${() => this.toggleGroupFor(ids, g.id, all)} title=${g.name} style="width:50px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px 0 4px;border:0;border-radius:6px;background:transparent;cursor:pointer">
              <span style=${`width:28px;height:28px;border-radius:6px;background:${g.color};box-shadow:0 0 0 2px #0E1116, 0 0 0 3.5px ${all ? '#E6E9EE' : 'transparent'};display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:700;font-size:14px;line-height:1`}>${all ? '✓' : n ? '–' : ''}</span>
              <span style="max-width:48px;font-size:10px;line-height:12px;color:#AEB6C2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name || 'Sin nombre'}</span></button>`; })}
            <button class="h-raise" onClick=${() => this.createGroupFor(ids, { x: s.ctx.x + 150, y: s.ctx.y })} title="Nuevo grupo" style="width:50px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:5px 0 4px;border:0;border-radius:6px;background:transparent;cursor:pointer">
              <span style="width:28px;height:28px;border-radius:6px;border:1.5px dashed #3A434F;display:flex;align-items:center;justify-content:center;color:#8B95A3;font-size:16px;line-height:1">+</span><span style="font-size:10px;line-height:12px;color:#8B95A3">Nuevo</span></button>
          </div>
          <div style="height:1px;background:#1C2128;margin:0 0 4px"></div>
          ${ts.length === 1 ? html`<button class="h-ctx" style=${item} onClick=${() => this.setState({ ctx: null, dm: Object.assign({ id: ids[0] }, this.popPos({ left: s.ctx.x, right: s.ctx.x, top: s.ctx.y })) })}>Detalles…</button>` : null}
          ${s.fv ? html`<button class="h-ctx" style=${item} onClick=${() => { const v = !allHid; this.set(st => ({ ctx: null, tasks: st.tasks.map(t => ids.includes(t.id) ? Object.assign({}, t, { hidden: v }) : t), fv: st.fv ? Object.assign({}, st.fv, { sel: [] }) : st.fv })); }}>${allHid ? 'Mostrar en el lienzo' : 'Ocultar del lienzo'}</button>` : null}
          <button class="h-ctx" style=${item} onClick=${() => this.set(st => ({ ctx: null, tasks: st.tasks.map(t => ids.includes(t.id) ? Object.assign({}, t, { done: !allDone }) : t) }))}><${Tick} on=${allDone} />Completada</button>
          <button class="h-ctxd" style=${item + ';color:#C9695E'} onClick=${() => { this.set(st => ({ ctx: null, tasks: st.tasks.filter(t => !ids.includes(t.id)), fv: st.fv ? Object.assign({}, st.fv, { sel: [] }) : st.fv })); this.toast(ts.length > 1 ? ts.length + ' tareas eliminadas' : 'Tarea eliminada'); }}>${ts.length > 1 ? 'Eliminar ' + ts.length + ' tareas' : 'Eliminar tarea'}</button>
        </div>`);
      }
    }
    if (s.dm) {
      const t = state.tasks.find(x => x.id === s.dm.id);
      if (t) {
        const imp = t.imp || 0; const u = p => this.updTask(t.id, p); const tgs = t.groups || [];
        const fld = 'height:40px;padding:0 10px;border:1px solid #1F252E;border-radius:8px;background:#12161C;color:#E6E9EE;font-size:13px;outline:none';
        out.push(html`<div onPointerDown=${() => this.setState({ dm: null })} style="position:fixed;inset:0;z-index:32;background:rgba(5,7,9,0.35)"></div>
        <div role="dialog" aria-label="Detalles de la tarea" style=${`position:fixed;left:${s.dm.x}px;top:${clamp(s.dm.y, 72, Math.max(72, innerHeight - 610))}px;z-index:33;width:330px;max-width:calc(100vw - 24px);max-height:calc(100vh - 84px);overflow:auto;padding:16px;border-radius:10px;background:#0E1116;border:1px solid #242B34;box-shadow:${SH};display:flex;flex-direction:column;gap:14px;animation:pop .16s ease-out`}>
          <input class="tin" aria-label="Título" value=${t.title} onInput=${e => u({ title: e.target.value })} style="height:40px;padding:0 8px;margin:0 -8px;border:0;border-radius:8px;background:transparent;color:#E6E9EE;font-family:var(--disp);font-size:18px;font-weight:700;outline:none" />
          <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Descripción</span>
            <textarea class="fin" rows="4" value=${t.notes || ''} onInput=${e => u({ notes: e.target.value })} placeholder="Detalles, enlaces, pasos…" style="resize:vertical;padding:10px;border:1px solid #1F252E;border-radius:8px;background:#12161C;color:#E6E9EE;font-size:13px;line-height:18px;outline:none"></textarea></label>
          <div style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px">
            <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Hora</span><input class="fin" type="time" value=${t.time || ''} onInput=${e => u({ time: e.target.value })} style=${fld} /></label>
            <label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Calendario</span><select class="fin" value=${this.cOf(t)} onChange=${e => u({ cal: e.target.value })} style=${fld}>${this.cals().map(c => html`<option value=${c.id}>${c.name}</option>`)}</select></label>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between"><span style="font-size:12px;font-weight:600;color:#8B95A3">Importancia</span><span style="font-size:12px;color:#A39CFB">${['Sin definir', 'Baja', 'Normal', 'Media', 'Alta', 'Urgente'][imp]}</span></div>
            <div style="display:flex;gap:6px">${[1, 2, 3, 4, 5].map(n => html`<button onClick=${() => u({ imp: imp === n ? 0 : n })} aria-pressed=${n <= imp} style=${`flex:1;height:36px;border-radius:8px;border:1px solid ${n <= imp ? '#6D66F0' : '#1F252E'};background:${n <= imp ? 'rgba(109,102,240,' + (0.08 + n * 0.05).toFixed(2) + ')' : '#12161C'};color:${n <= imp ? '#A39CFB' : '#8B95A3'};font-family:var(--disp);font-weight:700;cursor:pointer;transition:all .15s`}>${n}</button>`)}</div>
          </div>
          ${state.groups.length ? html`<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#8B95A3">Grupos</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${state.groups.map(g => { const on = tgs.includes(g.id); return html`<button onClick=${() => u({ groups: on ? tgs.filter(x => x !== g.id) : tgs.concat(g.id) })} aria-pressed=${on} style=${`height:28px;padding:0 10px;border-radius:999px;border:1px solid ${on ? g.color : '#1F252E'};background:${on ? g.color + '22' : '#12161C'};opacity:${on ? 1 : 0.7};display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;transition:all .15s;color:#E6E9EE`}><span style=${`width:8px;height:8px;border-radius:2px;background:${g.color}`}></span>${g.name || 'Sin nombre'}</button>`; })}</div></div>` : null}
          <div style="display:flex;gap:6px">
            <button class="h-dangero" onClick=${() => this.delTask(t.id)} style="height:40px;padding:0 12px;border:1px solid #3A2725;border-radius:8px;background:transparent;color:#C9695E;font-weight:500;cursor:pointer">Eliminar</button>
            <button class="h-sec2" onClick=${() => u({ done: !t.done })} style="flex:1;height:40px;border:1px solid #242B34;border-radius:8px;background:#151A21;color:#E6E9EE;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;cursor:pointer"><${Tick} on=${t.done} />Completada</button>
          </div>
        </div>`);
      }
    }
    return out;
  }

  /* ----- vista de día / semana ----- */
  fvView(calMap) {
    const s = this.state, f = s.fv; if (!f) return null;
    const isDay = f.type === 'day'; const vk = this.fvKey(); const lay = state.layouts[vk] || {};
    const gMap = {}; state.groups.forEach(g => gMap[g.id] = g);
    const tg = t => (t.groups || []).filter(g => gMap[g]), cOf = t => this.cOf(t); const inG = (t, arr) => { const g = tg(t); return g.length ? g.some(x => arr.includes(x)) : arr.includes('none'); };
    const all = state.tasks.filter(t => isDay ? t.date === f.key : weekOfTask(t) === f.key);
    const calF = f.calF || [], grpF = f.grpF || [], sel = f.sel || [];
    const listAll = all.filter(t => !(s.hideDone && t.done) && (!calF.length || calF.includes(cOf(t))) && (!grpF.length || inG(t, grpF)));
    const hiddenL = listAll.filter(t => t.hidden); const list = f.showHidden ? hiddenL : listAll.filter(t => !t.hidden);
    const b = this.fvBoardRef.current; const bw = b ? b.clientWidth : window.innerWidth, bh = b ? b.clientHeight : window.innerHeight - 110;
    const cols = Math.max(1, Math.floor((bw - 24) / 224));
    const base = {}; all.forEach((t, i) => { const p = lay[t.id]; const w = t.w || 200, hh = t.h || 136; base[t.id] = p ? { x: p.x, y: p.y, w, h: hh } : { x: 24 + (i % cols) * 224, y: 44 + Math.floor(i / cols) * 170, w, h: hh }; });
    this._fvRects = Object.assign({}, base);
    const L = s.fvLive || {}; if (!f.sorted) Object.keys(L).forEach(k => { if (base[k]) base[k] = L[k]; });
    const ar = t => base[t.id].w * base[t.id].h;
    const bySize = list.slice().sort((a, c) => ar(c) - ar(a));
    let rects = base;
    if (f.sorted && list.length) {
      const R0 = { x: 14, y: 14, w: Math.max(100, bw - 28), h: Math.max(100, bh - 28) }; const tot = bySize.reduce((p, t) => p + ar(t), 0);
      const tm = treemap(bySize.map(t => ar(t) * R0.w * R0.h / tot), R0); rects = {};
      bySize.forEach((t, i) => { const r = tm[i]; rects[t.id] = { x: Math.round(r.x + 5), y: Math.round(r.y + 5), w: Math.max(20, Math.round(r.w - 10)), h: Math.max(20, Math.round(r.h - 10)) }; });
    }
    const shown = {}; list.forEach(t => { shown[t.id] = rects[t.id]; }); this._fvShown = shown;
    const ease = '.45s cubic-bezier(.2,.8,.2,1)';
    let hulls = [];
    if (!f.sorted) {
      const byG = {}, lvl = {}, order = {}; state.groups.forEach((g, i) => { order[g.id] = i; });
      list.forEach(t => { tg(t).sort((p, q) => order[p] - order[q]).forEach((g, k) => { (byG[g] = byG[g] || []).push(rects[t.id]); lvl[g] = Math.max(lvl[g] || 0, k); }); });
      hulls = Object.keys(byG).map(g => { const rs = byG[g], lv = lvl[g], sp = 12 + 10 * lv, tp = 30 + 22 * lv; const x1 = Math.min(...rs.map(r => r.x)) - sp, y1 = Math.min(...rs.map(r => r.y)) - tp, x2 = Math.max(...rs.map(r => r.x + r.w)) + sp, y2 = Math.max(...rs.map(r => r.y + r.h)) + sp; return { g, lv, x: x1, y: y1, w: x2 - x1, h: y2 - y1, G: gMap[g] }; }).sort((p, q) => q.lv - p.lv);
    }
    const chip = (id, name, color, arr, key, n) => { const on = arr.includes(id); return html`<button onClick=${() => this.setFv({ [key]: on ? arr.filter(x => x !== id) : arr.concat(id), sel: [] })} aria-pressed=${on} style=${`height:28px;padding:0 10px;border-radius:999px;border:1px solid ${on ? color : '#1F252E'};background:${on ? color + '22' : '#12161C'};opacity:${arr.length && !on ? 0.5 : 1};display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;white-space:nowrap;color:#E6E9EE;transition:all .2s cubic-bezier(.4,0,.2,1)`}><span style=${`width:${key === 'calF' ? 7 : 8}px;height:${key === 'calF' ? 7 : 8}px;border-radius:${key === 'calF' ? 999 : 2}px;background:${color}`}></span>${name}<span class="mono" style="font-size:10.5px;color:#6B7684">${n}</span></button>`; };
    const calChips = this.cals().map(c => chip(c.id, c.name, c.color, calF, 'calF', all.filter(t => cOf(t) === c.id).length));
    const usedG = state.groups.filter(g => all.some(t => tg(t).includes(g.id)));
    const grpChips = usedG.map(g => chip(g.id, g.name || 'Sin nombre', g.color, grpF, 'grpF', all.filter(t => tg(t).includes(g.id)).length));
    if (usedG.length && all.some(t => !tg(t).length)) grpChips.push(chip('none', 'Sin grupo', '#6B7684', grpF, 'grpF', all.filter(t => !tg(t).length).length));
    const done = listAll.filter(t => t.done).length; const pct = listAll.length ? Math.round(done / listAll.length * 100) : 0;
    let title, sub, events = [];
    if (isDay) {
      const dd = parseDkey(f.key); const dn = DIASL[dow(dd)]; title = dn.charAt(0).toUpperCase() + dn.slice(1) + ' ' + dd.getDate(); sub = (MESL[dd.getMonth()] + ' · semana ' + isoWeek(dd).week).toUpperCase();
      const byDay = eventsForWeek(weekKey(dd)); events = (byDay[f.key] || []).filter(it => !calF.length || calF.includes(OCC[it.i].c.id));
    } else { const m = weekStart(f.key); title = 'Semana ' + isoWeek(m).week; sub = (rangeLbl(m) + ' · todas las tareas').toUpperCase(); }
    const n = sel.length;
    const hint = f.showHidden && !n ? 'Lienzo de ocultas · selecciona y pulsa W para restaurarlas · el ojo tachado restaura una · W o Esc para volver' : n ? (n + (n === 1 ? ' tarea seleccionada' : ' tareas seleccionadas') + (f.showHidden ? ' · W las restaura · ' : ' · W las oculta · G crea un grupo · ') + 'clic derecho para añadir a uno · Ctrl+clic añade o quita') : f.sorted ? 'Vista ordenada de más a menos prioritaria · «Deshacer orden» vuelve a tu disposición' : 'Q ordena · E oculta hechas · W tareas ocultas · Ctrl+Z deshace · Arrastra en el fondo para seleccionar · doble clic en una tarea o grupo para editar · clic derecho para grupos · esquinas para cambiar tamaño (⇧ proporción)';
    const onAdd = e => { const v = e.target.value.trim(); if (e.key === 'Enter' && v) { const ex = {}; if (calF.length === 1) ex.cal = calF[0]; if (grpF.length === 1 && grpF[0] !== 'none') ex.groups = [grpF[0]]; isDay ? this.addTask(v, f.key, weekKey(parseDkey(f.key)), ex) : this.addTask(v, null, f.key, ex); e.target.value = ''; } };
    const corner = (c, pos, mark, col, cur) => html`<span data-corner=${c} style=${`position:absolute;${pos};width:18px;height:18px;cursor:${cur}`}><span style=${`position:absolute;${mark};width:8px;height:8px;border-color:${col}`}></span></span>`;
    const card = (t, i) => {
      const r = rects[t.id]; const live = !!L[t.id] && !f.sorted; const isSel = sel.includes(t.id); const GS = tg(t).map(g => gMap[g]); const imp = t.imp || 0;
      let meta = 'PRIORIDAD ' + (i + 1); if (!isDay) { if (t.date) { const dd = parseDkey(t.date); meta = DIAS3[dow(dd)] + ' ' + dd.getDate() + ' · #' + (i + 1); } else meta = 'SIN FECHA · #' + (i + 1); }
      const fs = Math.round(clamp(12 + (Math.min(r.w, r.h * 1.6) - 90) / 12, 12, 34));
      return html`<div key=${t.id} data-card="1" onPointerDown=${e => this.fvDown(t.id, e)} onDblClick=${e => this.fvDbl(t.id, e)} onContextMenu=${e => this.openCtx(t.id, e)}
        style=${`position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;z-index:${live ? 99999 : i + 1};padding:12px 14px;border-radius:10px;background:#12161C;border:1px ${f.showHidden ? 'dashed' : 'solid'} ${live || isSel ? '#6D66F0' : t.color ? t.color + '80' : '#1F252E'};box-shadow:${isSel ? '0 0 0 2px rgba(109,102,240,0.4), ' + SH : SH};opacity:${t.done ? 0.55 : 1};cursor:${f.sorted ? 'pointer' : 'grab'};display:flex;flex-direction:column;gap:8px;overflow:hidden;transition:${live ? 'none' : 'left ' + ease + ', top ' + ease + ', width ' + ease + ', height ' + ease + ', opacity .2s, border-color .2s, box-shadow .2s'};touch-action:none`}>
        <div style="display:flex;align-items:flex-start;gap:10px;min-width:0">
          <${Check} on=${t.done} size=${20} nodrag=${true} onClick=${() => this.updTask(t.id, { done: !t.done })} />
          <span class="disp" style=${`flex:1;min-width:0;font-weight:600;font-size:${fs}px;line-height:1.2;letter-spacing:-.01em;overflow-wrap:anywhere;color:${t.done ? '#6B7684' : '#E6E9EE'};text-decoration:${t.done ? 'line-through' : 'none'}`}>${t.title}</span>
        </div>
        ${t.notes && r.h > 130 ? html`<span style="font-size:12.5px;line-height:17px;color:#8B95A3;overflow:hidden;min-height:0">${t.notes}</span>` : null}
        ${GS.length && r.h > 100 ? html`<div style="display:flex;flex-wrap:wrap;gap:4px;min-width:0">${GS.map(G => html`<span style=${`max-width:100%;padding:2px 8px;border-radius:999px;background:${G.color}26;color:${G.color};font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`}>${G.name || 'Sin nombre'}</span>`)}</div>` : null}
        <div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0">
          <span style="display:flex;align-items:center;gap:6px;min-width:0"><span style=${`width:7px;height:7px;flex:none;border-radius:999px;background:${(calMap[cOf(t)] || { color: '#6B7684' }).color}`}></span><span class="mono" style="font-size:10px;letter-spacing:.1em;color:#6B7684;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${meta}</span></span>
          <span style="display:flex;align-items:center;gap:8px;flex:none">
            ${f.showHidden ? html`<button class="h-show" data-nodrag="1" onClick=${() => { this.updTask(t.id, { hidden: false }); this.toast('Tarea restaurada al lienzo'); }} title="Mostrar en el lienzo" aria-label="Mostrar en el lienzo" style="width:26px;height:26px;margin:-4px 0;padding:0;border:0;border-radius:6px;background:transparent;color:#AEB6C2;cursor:pointer;display:flex;align-items:center;justify-content:center">${svg(IC.eyeOff, { s: 15 })}</button>` : null}
            ${t.time ? html`<span class="mono" style="font-size:11px;color:#AEB6C2">${t.time}</span>` : null}
            ${imp > 0 ? html`<span style="font-size:8px;letter-spacing:1px;color:#A39CFB" aria-label=${'Importancia ' + imp}>${'●'.repeat(imp) + '○'.repeat(5 - imp)}</span>` : null}
            ${t.color ? html`<span style=${`width:8px;height:8px;flex:none;border-radius:999px;background:${t.color}`}></span>` : null}
          </span>
        </div>
        ${!f.sorted ? html`
          ${corner('nw', 'left:0;top:0', 'left:4px;top:4px;border-left:2px solid;border-top:2px solid;border-top-left-radius:3px', '#3A434F', 'nwse-resize')}
          ${corner('ne', 'right:0;top:0', 'right:4px;top:4px;border-right:2px solid;border-top:2px solid;border-top-right-radius:3px', '#3A434F', 'nesw-resize')}
          ${corner('sw', 'left:0;bottom:0', 'left:4px;bottom:4px;border-left:2px solid;border-bottom:2px solid;border-bottom-left-radius:3px', '#3A434F', 'nesw-resize')}
          ${corner('se', 'right:0;bottom:0', 'right:4px;bottom:4px;border-right:2px solid;border-bottom:2px solid;border-bottom-right-radius:3px', '#6D66F0', 'nwse-resize')}` : null}
      </div>`;
    };
    const tb = (on, extra) => `height:40px;padding:0 12px;border-radius:8px;border:1px solid ${on ? '#6D66F0' : '#242B34'};background:${on ? 'rgba(109,102,240,0.10)' : '#151A21'};color:${on ? '#A39CFB' : '#E6E9EE'};display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;white-space:nowrap;transition:all .2s cubic-bezier(.4,0,.2,1);${extra || ''}`;
    return html`<div style="position:fixed;inset:0;z-index:25;background:#0B0D10;display:flex;flex-direction:column;animation:fvIn .22s ease-out">
      <div style="flex:none;min-height:64px;padding:10px 16px;display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;background:#0E1116;border-bottom:1px solid #1C2128">
        <button class="h-sec2" onClick=${() => this.setState({ fv: null, fvLive: null, ge: null, ctx: null, dm: null })} style="height:40px;padding:0 12px 0 8px;border:1px solid #242B34;border-radius:8px;background:#151A21;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;color:#E6E9EE">${svg(IC.left, { w: 2.2 })}Lienzo</button>
        <div style="display:flex;flex-direction:column;min-width:0"><span class="disp" style="font-size:21px;line-height:26px;font-weight:700;letter-spacing:-.01em;white-space:nowrap">${title}</span><span class="mono" style="font-size:10px;letter-spacing:.12em;color:#8B95A3;white-space:nowrap">${sub}</span></div>
        <div style="display:flex;align-items:center;gap:8px"><span style="width:64px;height:4px;border-radius:999px;background:#1B212A;overflow:hidden"><span style=${`display:block;height:100%;width:${pct}%;border-radius:999px;background:#4E9B72;transition:width .4s cubic-bezier(.2,.8,.2,1)`}></span></span><span class="mono" style="font-size:11px;color:#AEB6C2">${done}/${listAll.length}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;min-width:0">${events.map(it => { const o = OCC[it.i]; return html`<button class="h-ev" onClick=${() => openEvent(it.i)} style="height:30px;padding:0 10px;border:1px solid #1B212A;border-radius:999px;background:#161B22;display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;white-space:nowrap;color:#E6E9EE"><span style=${`width:7px;height:7px;border-radius:999px;background:${evColor(o)}`}></span><span class="mono" style="font-size:10.5px;color:#8B95A3">${o.ev.allDay ? 'Todo el día' : fmtTime(o.start)}</span>${o.ev.title}</button>`; })}</div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <input class="fin" aria-label="Nueva tarea" onKeyDown=${onAdd} placeholder="+ Nueva tarea" style="height:40px;width:200px;padding:0 12px;border:1px solid #1F252E;border-radius:8px;background:#12161C;font-size:13px" />
          <button onClick=${() => this.setFv({ showHidden: !f.showHidden, sel: [] })} title="Tareas ocultas (W)" aria-pressed=${!!f.showHidden} style=${tb(!!f.showHidden)}>${svg(IC.archive)}Ocultas<span class="mono" style="font-size:11px;color:#8B95A3">${hiddenL.length}</span></button>
          ${this.hideBtn(true)}
          <button onClick=${() => this.fvSort()} title="Atajo: Q" aria-pressed=${!!f.sorted} style=${`height:40px;padding:0 14px;border-radius:8px;border:1px solid ${f.sorted ? '#6D66F0' : '#242B34'};background:${f.sorted ? '#6D66F0' : '#151A21'};color:${f.sorted ? '#FFFFFF' : '#E6E9EE'};font-family:var(--disp);font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap;transition:all .2s cubic-bezier(.4,0,.2,1)`}>${svg(IC.tree)}${f.sorted ? 'Deshacer orden' : 'Ordenar'}</button>
        </div>
        <div style="flex-basis:100%;display:flex;align-items:center;gap:8px 18px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="mono" style="font-size:10px;letter-spacing:.12em;color:#6B7684;margin-right:2px">CALENDARIOS</span>${calChips}</div>
          ${grpChips.length ? html`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span class="mono" style="font-size:10px;letter-spacing:.12em;color:#6B7684;margin-right:2px">GRUPOS</span>${grpChips}</div>` : null}
          ${calF.length + grpF.length ? html`<button class="h-tint" onClick=${() => this.setFv({ calF: [], grpF: [] })} style="height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:#A39CFB;font-size:12px;font-weight:500;cursor:pointer">Ver todo</button>` : null}
        </div>
      </div>
      <div ref=${this.fvBoardRef} onPointerDown=${e => this.fvBoardDown(e)} style="position:relative;flex:1;min-height:0;overflow:hidden;background-color:#0B0D10;background-image:radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.4px);background-size:24px 24px;user-select:none">
        ${!list.length ? html`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#6B7684;font-size:14px">${f.showHidden ? 'No hay tareas ocultas con estos filtros. Selecciona tareas en el lienzo y pulsa W para ocultarlas.' : listAll.length ? 'Todas las tareas están ocultas. Pulsa W para verlas.' : 'Aún no hay tareas. Escribe arriba para crear la primera.'}</div>` : null}
        ${hulls.map(hh => html`<div key=${'h' + hh.g} data-hull="1" onDblClick=${e => { e.stopPropagation(); this.openGE(hh.g, { x: e.clientX, y: e.clientY }); }} title="Doble clic para editar el grupo" style=${`position:absolute;left:${hh.x}px;top:${hh.y}px;width:${hh.w}px;height:${hh.h}px;border-radius:14px;background:${hh.G.color}12;border:1.5px dashed ${hh.G.color}66;z-index:0`}><span class="disp" style=${`position:absolute;left:12px;top:6px;font-size:12.5px;font-weight:700;color:${hh.G.color};white-space:nowrap`}>${hh.G.name || 'Sin nombre'}</span></div>`)}
        ${bySize.map((t, i) => card(t, i))}
        ${f.showHidden ? html`<div class="mono" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:100000;padding:6px 12px;border-radius:999px;background:rgba(14,17,22,0.9);border:1px dashed #6D66F0;color:#A39CFB;font-size:10.5px;letter-spacing:.12em;pointer-events:none;white-space:nowrap">LIENZO DE OCULTAS · W RESTAURA LA SELECCIÓN</div>` : null}
        ${s.mqRect ? html`<div style=${`position:absolute;left:${s.mqRect.x}px;top:${s.mqRect.y}px;width:${s.mqRect.w}px;height:${s.mqRect.h}px;z-index:100001;background:rgba(109,102,240,0.08);border:1px solid rgba(109,102,240,0.6);border-radius:4px;pointer-events:none`}></div>` : null}
        <div class="hide-sm" style="position:absolute;left:16px;bottom:16px;right:16px;z-index:100000;pointer-events:none"><span style="display:inline-block;padding:8px 12px;border-radius:8px;background:rgba(14,17,22,0.88);border:1px solid #1B212A;color:#8B95A3;font-size:12px">${hint}</span></div>
      </div>
    </div>`;
  }

  /* ----- render ----- */
  render() {
    const s = this.state; resetOcc();
    const today = new Date(), tk = dkey(today), curMon = mondayOf(today), curK = weekKey(today);
    const cals = this.cals(); this._calIds = cals.map(c => c.id); const calMap = {}; cals.forEach(c => calMap[c.id] = c);
    const ctx = { curMon, tk, curK, evByWeek: {} };
    const rows = []; const weeks = [];
    for (let i = s.from; i <= s.to; i++) {
      rows.push(this.weekRow(i, ctx));
      const mon = addDays(curMon, i * 7), key = weekKey(mon); const tw = state.tasks.filter(t => weekOfTask(t) === key); const dn = tw.filter(t => t.done).length;
      weeks.push({ key, num: isoWeek(mon).week, range: rangeLbl(mon) + ' ' + addDays(mon, 6).getFullYear(), isCur: key === curK, pct: tw.length ? Math.round(dn / tw.length * 100) : 0 });
    }
    // búsqueda
    const q = s.q.trim().toLowerCase(); const results = [];
    if (q) {
      state.tasks.filter(t => (t.title + ' ' + (t.notes || '')).toLowerCase().includes(q)).slice(0, 6).forEach(t => {
        const wk = weekOfTask(t); const sub = t.date ? (() => { const d = parseDkey(t.date); return DIASL[dow(d)] + ' ' + d.getDate() + ' ' + MES[d.getMonth()]; })() : 'Sin día · semana ' + Number(wk.split('-W')[1]);
        results.push({ title: t.title, sub, kind: 'TAREA', color: t.color || '#6B7684', deco: t.done ? 'line-through' : 'none', onPick: () => { this.setState({ menu: null, q: '', flash: t.id }); clearTimeout(this._ft); this._ft = setTimeout(() => this.setState({ flash: null }), 1800); this.revealWeek(wk); } });
      });
      state.notes.filter(n => (n.text || '').toLowerCase().includes(q)).slice(0, 3).forEach(n => {
        results.push({ title: (n.text || '').split('\n')[0].slice(0, 80), sub: 'Nota del lienzo', kind: 'NOTA', color: '#AEB6C2', deco: 'none', onPick: () => { this.setState({ menu: null, q: '' }); const vp = this.vpRef.current; const sc = Math.max(this.cam.s, 0.8); this.cam = { s: sc, x: vp.clientWidth / 2 - (n.x + 115) * sc, y: vp.clientHeight / 2 - (n.y + 80) * sc }; this.applyCam(true); } });
      });
      const seen = new Set();
      Object.values(ctx.evByWeek).forEach(byDay => Object.entries(byDay).forEach(([dk, items]) => items.forEach(it => {
        const o = OCC[it.i]; if (results.filter(r => r.kind === 'EVENTO').length >= 4 || seen.has(it.i) || !o.ev.title.toLowerCase().includes(q)) return; seen.add(it.i);
        const d = parseDkey(dk); results.push({ title: o.ev.title, sub: DIASL[dow(d)] + ' ' + d.getDate() + ' ' + MES[d.getMonth()] + (o.ev.allDay ? '' : ' · ' + fmtTime(o.start)), kind: 'EVENTO', color: evColor(o), deco: 'none', onPick: () => { this.setState({ menu: null, q: '' }); this.revealWeek(weekKey(d)); } });
      })));
    }
    return html`
      <div ref=${this.vpRef} onPointerDown=${e => this.onVpDown(e)} onDblClick=${e => this.onVpDbl(e)} style="position:fixed;inset:0;overflow:hidden;cursor:grab;background-color:#0B0D10;background-image:radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.4px);background-size:24px 24px;touch-action:none;user-select:none">
        <div ref=${this.worldRef} style="position:absolute;left:0;top:0;transform-origin:0 0;padding:160px 600px 240px 120px;display:flex;flex-direction:column;align-items:flex-start;gap:56px;will-change:transform">
          <button class="h-dash" data-nopan="1" onClick=${() => this.extend(-1, () => this.flyToWeek(this.weekKeys()[0]))} style="height:44px;padding:0 18px;border:1.5px dashed #2E3742;border-radius:8px;background:transparent;color:#8B95A3;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px">${svg(IC.arrowUp)}Cargar semana anterior</button>
          ${rows}
          <button class="h-dash" data-nopan="1" onClick=${() => this.extend(1, () => { const a = this.weekKeys(); this.flyToWeek(a[a.length - 1]); })} style="height:44px;padding:0 18px;border:1.5px dashed #2E3742;border-radius:8px;background:transparent;color:#8B95A3;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px">${svg(IC.arrowDown)}Cargar semana siguiente</button>
          ${state.notes.map(n => this.noteEl(n))}
        </div>
      </div>
      ${this.topLeft()}
      ${this.topCenter(weeks)}
      ${this.topRight(results, q)}
      ${this.bottomBar()}
      ${s.hint && s.vw >= 900 ? html`<div style="position:fixed;left:16px;bottom:16px;z-index:20;max-width:calc(100vw - 340px);min-height:40px;padding:6px 6px 6px 14px;border-radius:8px;background:rgba(14,17,22,0.88);border:1px solid #1B212A;color:#AEB6C2;font-size:12.5px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 14px rgba(0,0,0,0.35);backdrop-filter:blur(8px)">
        <span>Arrastra el fondo para moverte · <b style="font-weight:600">rueda</b> para zoom · <b style="font-weight:600">doble clic</b> crea una nota · arrastra tareas entre días</span>
        <button class="h-raise" onClick=${() => { this.setState({ hint: false }); lsSetUI('hint', false); }} aria-label="Ocultar ayuda" style="width:28px;height:28px;flex:none;padding:0;border:0;border-radius:8px;background:transparent;color:#8B95A3;cursor:pointer;display:flex;align-items:center;justify-content:center">${svg(IC.x, { s: 14 })}</button>
      </div>` : null}
      ${this.fvView(calMap)}
      ${this.menus()}
      ${this.taskPop()}
      ${s.toast ? html`<div role="status" style="position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:40;padding:10px 16px;border-radius:8px;background:#0E1116;border:1px solid #242B34;color:#E6E9EE;font-size:13px;box-shadow:0 12px 32px rgba(0,0,0,0.6);animation:rise .2s ease-out;max-width:calc(100vw - 32px)">${s.toast}</div>` : null}
    `;
  }
}

/* ---------- Arranque ---------- */
state.calPrefs = state.calPrefs || {};
prender(html`<${App} />`, document.getElementById('root'));
stamp(); saveLocal();
updateGStatus(); render();
handleRedirect().then(() => { updateGStatus(); render(); if (configured()) gTick(true).then(() => driveTick(true)); });
setInterval(() => { if (configured()) gTick(); }, 10000);
setInterval(() => { if (configured()) driveTick(); }, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && configured()) { gTick(true); driveTick(true); } });
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
