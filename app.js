import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* =========================================================
   Helpers
   ========================================================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ds = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds();
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = s => { const d = parse(s); return `${WD[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };
const short = s => { const d = parse(s); return `${MON[d.getMonth()]} ${d.getDate()}`; };
const clone = o => JSON.parse(JSON.stringify(o || {}));
const hash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const other = w => (w === 'a' ? 'b' : 'a');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

const I = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 3.4 4.8 5.6 4.8 10.6A4.8 4.8 0 0 1 12 22a5 5 0 0 1-5-5c0-2.5 1.4-3.9 2.3-5.5.6 1.4 1.4 2.3 2.4 2.7C12 11 11 6 12 2z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7M16 5h3v3"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/><path d="m3 3 18 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'
};

/* =========================================================
   Content
   ========================================================= */
const QUESTS = {
  gain: ['Eat a breakfast with 30g+ protein', 'Add a 300-calorie snack before bed', 'Blend a homemade mass shake', 'Hit 3 meals and 2 snacks today', '50 push-ups spread through the day', 'Lights out by 10:30 for recovery', 'Add one extra set to your last exercise', 'Drink a big glass of whole milk with dinner'],
  lose: ['Take a 20-minute walk', '100 squats spread through the day', 'Swap one sugary drink for water', 'Fill half your dinner plate with veggies', 'Plank 3 × 45 seconds', 'Dance to 3 full songs', 'Take the stairs every time today', 'No snacking after 8pm']
};
const QUICK = ['15-min Tabata: squats, push-ups, mountain climbers, jump lunges (20s on, 10s off)', 'Glute burner: 3 rounds of 15 bridges, 12 lunges each leg, 20 donkey kicks', 'Core crusher: 3 rounds of 40s plank, 15 crunches, 20 bicycles', 'Upper pump: 4 × 10 push-ups, 4 × 12 chair dips, 3 × 30s pike hold', 'Couples challenge: wall-sit side by side, 3 × 45 seconds', 'Walk and talk: a 25-minute walk together', 'Leg day lite: 4 × 15 goblet squats, 3 × 12 step-ups each leg', 'Arm finisher: 3 × 12 curls, 3 × 12 overhead extensions, 3 × 15 band pull-aparts'];
const PRESETS = {
  gain: [['Protein shake', 350, 40], ['3 eggs', 220, 18], ['PB&J sandwich', 450, 15], ['Chicken & rice bowl', 650, 45], ['Greek yogurt + granola', 320, 20], ['Steak, 8 oz', 550, 56], ['Trail mix, ½ cup', 350, 10], ['Whole milk, 16 oz', 300, 16]],
  lose: [['Greek yogurt cup', 120, 15], ['Grilled chicken salad', 380, 35], ['Egg white omelet', 180, 22], ['Protein shake (water)', 160, 30], ['Apple + 1 tbsp PB', 190, 4], ['Turkey wrap', 340, 26], ['Cottage cheese, 1 cup', 180, 24], ['Salmon + veggies', 450, 38]]
};
const LEVELS = ['Rookie', 'Warm-Up', 'Rep Runner', 'Iron Curious', 'Gym Regular', 'Sweat Machine', 'Beast Mode', 'Legend'];
const XP_PER = 300;
const TEAM_GOAL = 6;

/* =========================================================
   State + Supabase data layer
   ========================================================= */
const S = { profiles: {}, plans: {}, days: {}, status: 'loading', foodDate: today(), progWho: null, filter: 'all', edit: null, spin: null, live: true };
let me = LS.get('bfc.me', null);
const configured = /^https:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('PASTE');
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;

const fromRow = {
  profiles: r => ({ name: r.name, goal: r.goal, start: r.start_weight != null ? +r.start_weight : null, goalW: r.goal_weight != null ? +r.goal_weight : null, cal: r.calories, protein: r.protein, water: r.water_goal || 8 }),
  plans: r => ({ title: r.title, for: r.assignee, day: r.weekday, ex: r.exercises || [], notes: r.notes || '', created: r.created_at }),
  days: r => ({ who: r.who, date: r.date, foods: r.foods || [], water: r.water || 0, weight: r.weight != null ? +r.weight : null, done: r.done || {}, workouts: r.workouts || [], quests: r.quests || [], extra: r.extra || [], cheers: r.cheers || 0 })
};
const toRow = {
  profiles: (id, p) => ({ id, name: p.name, goal: p.goal, start_weight: p.start, goal_weight: p.goalW, calories: p.cal, protein: p.protein, water_goal: p.water, updated_at: new Date().toISOString() }),
  plans: (id, p) => ({ id, title: p.title, assignee: p.for, weekday: String(p.day), exercises: p.ex, notes: p.notes || '' }),
  days: (id, d) => ({ id, who: d.who, date: d.date, foods: d.foods, water: d.water, weight: d.weight, done: d.done, workouts: d.workouts, quests: d.quests, extra: d.extra, cheers: d.cheers, updated_at: new Date().toISOString() })
};

const queues = {};
function put(table, id, data) {
  S[table] = { ...S[table], [id]: data };
  render();
  const key = table + '/' + id;
  queues[key] = (queues[key] || Promise.resolve()).then(async () => {
    const { error } = await sb.from(table).upsert(toRow[table](id, data));
    if (error) { console.error(error); toast(`Couldn’t save. ${dbReason(error)}`, 8000); resync(); }
  });
}
// Turn a Supabase error into a reason a person can act on.
function dbReason(e) {
  const m = `${e.code || ''} ${e.message || ''}`;
  if (/42501|row-level security|permission denied/i.test(m)) return 'The database refused the change. Run fix-permissions.sql in Supabase.';
  if (/PGRST205|schema cache|does not exist/i.test(m)) return 'A database table is missing. Run schema.sql in Supabase.';
  if (/23514|check constraint/i.test(m)) return 'One of the values isn’t allowed. Check the form and try again.';
  if (/fetch|network/i.test(m)) return 'No connection. Check your internet and try again.';
  return `Supabase said: ${e.message || e.code || 'unknown error'}`;
}
// After a failed save, reload from the database so the screen shows what's really stored.
async function resync() { try { await loadAll(); } catch {} render(); }
function remove(table, id) {
  const n = { ...S[table] }; delete n[id]; S[table] = n; render();
  const key = table + '/' + id;
  queues[key] = (queues[key] || Promise.resolve()).then(async () => {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) { console.error(error); toast(`Couldn’t delete. ${dbReason(error)}`, 8000); resync(); }
  });
}

async function loadAll() {
  const since = addDays(today(), -400);
  const [p, pl, d] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('plans').select('*'),
    sb.from('days').select('*').gte('date', since).order('date', { ascending: false }).limit(2000)
  ]);
  const err = p.error || pl.error || d.error;
  if (err) throw err;
  const map = (rows, t) => Object.fromEntries(rows.map(r => [r.id, fromRow[t](r)]));
  S.profiles = map(p.data, 'profiles');
  S.plans = map(pl.data, 'plans');
  S.days = map(d.data, 'days');
}

async function init() {
  render();
  if (!configured) { S.status = 'config'; render(); return; }
  try {
    await loadAll();
    S.status = 'ready';
  } catch (e) {
    console.error(e);
    S.status = 'error'; S.error = e && e.message ? e.message : String(e);
    render(); return;
  }
  render();
  sb.channel('fitclub')
    .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
      const t = payload.table;
      if (!fromRow[t]) return;
      if (payload.eventType === 'DELETE') {
        const id = payload.old && payload.old.id; if (!id) return;
        const n = { ...S[t] }; delete n[id]; S[t] = n;
      } else {
        S[t] = { ...S[t], [payload.new.id]: fromRow[t](payload.new) };
      }
      render();
    })
    .subscribe(status => {
      const live = status === 'SUBSCRIBED';
      if (live !== S.live) { S.live = live; render(); }
    });
  // Refresh when the app comes back to the foreground (phones pause live updates in the background).
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) return;
    if (S.foodDate > today()) S.foodDate = today();
    try { await loadAll(); } catch {}
    render();
  });
}

/* =========================================================
   Derived data
   ========================================================= */
const dayId = (w, d) => `${w}_${d}`;
function day(w, d) {
  return Object.assign({ who: w, date: d, foods: [], water: 0, weight: null, done: {}, workouts: [], quests: [], extra: [], cheers: 0 }, clone(S.days[dayId(w, d)]));
}
const saveDay = o => put('days', dayId(o.who, o.date), o);
const P = w => S.profiles[w] || { name: w === 'a' ? 'Sean' : 'Partner', goal: w === 'a' ? 'gain' : 'lose', cal: 2400, protein: 150, water: 8 };
const daysOf = w => Object.values(S.days).filter(d => d.who === w);
const isActive = d => d.foods.length || d.workouts.length || d.extra.length || d.quests.length || d.weight || d.water;
function xpOf(w) { let x = 0; for (const d of daysOf(w)) x += d.foods.length * 5 + d.water * 2 + (d.weight ? 10 : 0) + d.workouts.length * 40 + d.extra.length * 30 + d.quests.length * 15 + d.cheers * 5; return x; }
function levelOf(w) { const x = xpOf(w); const l = Math.floor(x / XP_PER); return { x, lvl: l + 1, title: LEVELS[Math.min(l, LEVELS.length - 1)], into: x % XP_PER }; }
function streakOf(w) { const set = new Set(daysOf(w).filter(isActive).map(d => d.date)); let d = today(); if (!set.has(d)) d = addDays(d, -1); let n = 0; while (set.has(d)) { n++; d = addDays(d, -1); } return n; }
function bestStreak(w) { const dates = [...new Set(daysOf(w).filter(isActive).map(d => d.date))].sort(); let b = 0, c = 0, prev = null; for (const d of dates) { c = prev && addDays(prev, 1) === d ? c + 1 : 1; b = Math.max(b, c); prev = d; } return b; }
function weekStart() { const d = parse(today()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ds(d); }
const weekWorkouts = w => { const ws = weekStart(); return daysOf(w).filter(d => d.date >= ws).reduce((n, d) => n + d.workouts.length + d.extra.length, 0); };
const weighins = w => daysOf(w).filter(d => d.weight).map(d => ({ date: d.date, w: d.weight })).sort((a, b) => (a.date < b.date ? -1 : 1));
function plansFor(w, dateStr) { const wd = parse(dateStr).getDay(); return Object.entries(S.plans).filter(([, p]) => (p.for === w || p.for === 'both') && (p.day === 'any' || +p.day === wd)).sort((a, b) => a[1].title.localeCompare(b[1].title)); }
const totalsOf = d => d.foods.reduce((t, f) => ({ cal: t.cal + (+f.cal || 0), p: t.p + (+f.p || 0) }), { cal: 0, p: 0 });
function progressOf(w) {
  const pr = P(w), ws = weighins(w);
  const start = pr.start || (ws[0] && ws[0].w) || null;
  const cur = ws.length ? ws[ws.length - 1].w : start;
  const goal = pr.goalW || null;
  let pct = null;
  if (start && goal && cur != null && start !== goal) pct = Math.max(0, Math.min(100, Math.round((cur - start) / (goal - start) * 100)));
  return { start, cur, goal, pct, change: cur != null && start ? +(cur - start).toFixed(1) : null };
}

/* =========================================================
   Render
   ========================================================= */
let pendingRender = false;
let lastTab = null;
function render() {
  const v = document.getElementById('view');
  const ae = document.activeElement;
  if (ae && v.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) { pendingRender = true; return; }
  pendingRender = false;
  document.body.dataset.me = me || 'a';
  const tabs = document.getElementById('tabs');
  tabs.hidden = true;

  if (S.status === 'loading') { v.innerHTML = splash('Loading your workouts…'); return; }
  if (S.status === 'config') { v.innerHTML = splash(`Almost there. In Vercel, add the <span class="code">SUPABASE_URL</span> and <span class="code">SUPABASE_ANON_KEY</span> Environment Variables, then redeploy.`, true); return; }
  if (S.status === 'error') { v.innerHTML = splash(`Couldn’t reach your database. Check the <span class="code">SUPABASE_URL</span> and <span class="code">SUPABASE_ANON_KEY</span> values in Vercel, and that you ran <span class="code">schema.sql</span> in Supabase.<br><br><span class="muted" style="font-size:12.5px">${esc(S.error)}</span>`, true); return; }
  if (!S.profiles.a && !S.profiles.b) { if (!v.querySelector('[data-form="setup"]')) v.innerHTML = setupView(); return; }
  if (!me) { v.innerHTML = pickView(); return; }

  tabs.hidden = false;
  const h = (location.hash || '#today').slice(1);
  const tab = ['today', 'workouts', 'food', 'progress'].includes(h) ? h : 'today';
  tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const y = window.scrollY;
  v.innerHTML = appbar() + `<main class="page">${notices()}${({ today: todayView, workouts: workoutsView, food: foodView, progress: progressView })[tab]()}</main>`;
  window.scrollTo(0, lastTab === tab ? y : 0);
  lastTab = tab;
}
document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) render(); }, 60));

function splash(msg, err) {
  return `<div class="splash"><div><img src="/icons/icon.svg" alt=""><h1 style="font-size:22px;font-weight:800">Ball Fit Club</h1><p class="muted" style="margin-top:8px;max-width:340px">${msg}</p>${err ? '<button class="btn secondary sm" style="margin-top:16px" onclick="location.reload()">Try again</button>' : ''}</div></div>`;
}
function appbar() {
  const p = P(me);
  return `<header class="appbar"><div class="appbar-in">
    <button class="avatar" data-act="switch" aria-label="Switch to ${esc(P(other(me)).name)}">${esc((p.name || '?')[0].toUpperCase())}</button>
    <div class="who"><div class="greet">${greeting()}</div><h1>${esc(p.name)}</h1></div>
    <button class="iconbtn" data-act="settings" aria-label="Settings">${I.gear}</button>
  </div></header>`;
}
function notices() {
  let h = '';
  if (!S.live) h += `<div class="notice warn">${I.cloud}<span>Live sync paused. Changes still save, and you’ll see your partner’s updates when it reconnects.</span></div>`;
  const c = day(me, today()).cheers;
  if (c) h += `<div class="notice cheer">${I.hand}<span>${esc(P(other(me)).name)} sent you ${c} high-five${c > 1 ? 's' : ''} today.</span></div>`;
  return h;
}

function ringsSvg(vals) {
  const rs = [52, 39, 26], cls = ['ring-cal', 'ring-pro', 'ring-h2o'];
  return `<svg viewBox="0 0 132 132" role="img" aria-label="Daily progress rings">${rs.map((r, i) => {
    const c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, vals[i]));
    return `<circle cx="66" cy="66" r="${r}" fill="none" class="ring-track" stroke-width="11"/>
      <circle cx="66" cy="66" r="${r}" fill="none" class="${cls[i]}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 66 66)" ${f === 0 ? 'opacity="0"' : ''}/>`;
  }).join('')}</svg>`;
}
function miniRing(f) {
  const r = 14, c = 2 * Math.PI * r;
  return `<svg class="progress-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="${r}" fill="none" class="ring-track" stroke-width="4"/><circle cx="18" cy="18" r="${r}" fill="none" style="stroke:var(--me)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 18 18)" ${f === 0 ? 'opacity="0"' : ''}/></svg>`;
}

function todayView() {
  const d = day(me, today()), p = P(me), o = other(me), L = levelOf(me), st = streakOf(me);
  const wa = weekWorkouts('a'), wb = weekWorkouts('b'), tot = wa + wb;
  const qs = QUESTS[p.goal] || QUESTS.gain, qi = hash(today() + me) % qs.length, qid = 'q' + qi, qDone = d.quests.includes(qid);
  const plans = plansFor(me, today());
  const t = totalsOf(d), wg = p.water || 8;
  const pa = Math.min(100, wa / TEAM_GOAL * 100), pb = Math.min(100 - pa, wb / TEAM_GOAL * 100);

  return `
  <section class="card">
    <div class="xp">
      <div class="xp-badge num">${L.lvl}</div>
      <div class="grow"><div class="t">Level ${L.lvl} · ${esc(L.title)}</div>
        <div class="bar" style="margin-top:7px"><i class="fill-gold" style="width:${L.into / XP_PER * 100}%"></i></div></div>
    </div>
    <div class="pills"><span class="pill fire">${I.flame}<span class="num">${st}-day streak</span></span><span class="pill num">${XP_PER - L.into} XP to Level ${L.lvl + 1}</span></div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Today’s goals</h3><a class="link" href="#food">Log food</a></div>
    <div class="rings">${ringsSvg([p.cal ? t.cal / p.cal : 0, p.protein ? t.p / p.protein : 0, d.water / wg])}
      <div class="legend">
        <div class="legend-item"><span class="sw cal"></span><span class="lbl">Calories</span><span class="val num">${Math.round(t.cal).toLocaleString()} <small>/ ${(p.cal || 0).toLocaleString()}</small></span></div>
        <div class="legend-item"><span class="sw pro"></span><span class="lbl">Protein</span><span class="val num">${Math.round(t.p)}g <small>/ ${p.protein || 0}g</small></span></div>
        <div class="legend-item"><span class="sw h2o"></span><span class="lbl">Water</span><span class="val num">${d.water} <small>/ ${wg} glasses</small></span></div>
      </div></div>
    <div class="water" role="group" aria-label="Water glasses">${Array.from({ length: wg }, (_, i) => `<button class="glass ${i < d.water ? 'on' : ''}" data-act="water" data-i="${i}" aria-label="Glass ${i + 1}"></button>`).join('')}</div>
  </section>

  <section class="quest card" style="flex-direction:row">
    <div class="quest-ico">${I.target}</div>
    <div class="q"><span class="eyebrow">Daily quest · +15 XP</span><b>${esc(qs[qi])}</b></div>
    ${qDone ? '<span class="tag done">Done</span>' : `<button class="btn gold sm" data-act="quest" data-id="${qid}">Done</button>`}
  </section>

  <section class="card">
    <div class="card-head"><h3>Today’s workouts</h3><a class="link" href="#workouts">All plans</a></div>
    ${plans.length ? plans.map(([id, pl]) => planCard(id, pl, d)).join('') : `<p class="empty">No workout scheduled for ${WD_LONG[parse(today()).getDay()]}. Try the bonus round below, or add a plan in Workouts.</p>`}
    ${bonusBlock(d)}
  </section>

  <section class="card">
    <div class="card-head"><h3>Team this week</h3><span class="muted num" style="font-size:13px;font-weight:700">${tot} of ${TEAM_GOAL} workouts</span></div>
    <div class="bar thick stack"><i class="fill-a" style="width:${pa}%"></i><i class="fill-b" style="width:${pb}%"></i></div>
    <div class="team">${['a', 'b'].map(w => `<div class="member"><div class="nm"><span class="avatar sm ${w}">${esc(P(w).name[0] || '?')}</span><span>${esc(P(w).name)}</span></div><div class="big num">${w === 'a' ? wa : wb}</div><div class="sub">workouts · ${streakOf(w)}-day streak</div></div>`).join('')}</div>
    ${tot >= TEAM_GOAL ? '<p style="font-weight:700;color:var(--good)">Team goal reached this week. Nice work, you two.</p>' : ''}
    <button class="btn outline" data-act="cheer">${I.hand} Send ${esc(P(o).name)} a high-five</button>
  </section>

  <section class="card">
    <div class="card-head"><h3>Weigh-in</h3><a class="link" href="#progress">See trend</a></div>
    ${d.weight
      ? `<div class="row"><span class="grow">Today</span><b class="num" style="font-size:20px">${d.weight} lb</b><button class="btn secondary sm" data-act="clearweight">Edit</button></div>`
      : `<form class="row" data-form="weight"><input id="wt" type="number" inputmode="decimal" step="0.1" placeholder="Weight (lb)" aria-label="Weight in pounds" required><button class="btn">Save</button></form>`}
  </section>`;
}
const exLine = e => [e.s && e.r ? `${e.s} × ${e.r}` : e.s ? `${e.s} sets` : e.r ? e.r : '', e.w].filter(Boolean).join(' · ');
function planCard(id, pl, d) {
  const done = d.workouts.includes(id), checks = d.done[id] || [], ex = pl.ex || [];
  const f = done ? 1 : ex.length ? checks.length / ex.length : 0;
  return `<details class="plan" ${done ? '' : 'open'}>
    <summary>${miniRing(f)}<div class="grow"><div class="pt">${esc(pl.title)}</div><div class="ps">${ex.length} exercises${pl.for === 'both' ? ' · together' : ''}</div></div>${done ? '<span class="tag done">Done</span>' : `<span class="muted num" style="font-size:13px;font-weight:700">${checks.length}/${ex.length}</span>`}</summary>
    <div class="body">
      ${ex.map((e, i) => `<button class="ex ${done || checks.includes(i) ? 'on' : ''}" data-act="check" data-id="${esc(id)}" data-i="${i}"><span class="box"></span><span class="en">${esc(e.n)}</span><span class="ed num">${esc(exLine(e))}</span></button>`).join('')}
      ${pl.notes ? `<p class="muted" style="font-size:13.5px;padding:4px 2px 0">${esc(pl.notes)}</p>` : ''}
      ${done ? `<button class="btn secondary sm" data-act="undo" data-id="${esc(id)}" style="align-self:flex-start">Mark as not done</button>` : `<button class="btn block" data-act="finish" data-id="${esc(id)}">Finish workout · +40 XP</button>`}
    </div></details>`;
}
function bonusBlock(d) {
  return `${d.extra.map((e, i) => `<div class="li"><span class="tag done">Bonus</span><span class="grow" style="font-size:14px">${esc(e.n)}</span><button class="x" data-act="rmextra" data-i="${i}" aria-label="Remove">${I.x}</button></div>`).join('')}
  <div class="bonus"><span class="eyebrow">Bonus round · +30 XP</span>
    <div class="res" id="spinres">${S.spin ? esc(S.spin) : 'Roll for a surprise 15-minute workout'}</div>
    <div class="row">${S.spin ? '<button class="btn sm" data-act="spindone">I did it</button>' : ''}<button class="btn ${S.spin ? 'secondary' : 'gold'} sm" data-act="spin">${I.dice} ${S.spin ? 'Roll again' : 'Roll'}</button></div></div>`;
}

function workoutsView() {
  const f = S.filter, nm = w => esc(P(w).name);
  const all = Object.entries(S.plans).filter(([, p]) => f === 'all' || p.for === f)
    .sort((x, y) => { const dx = x[1].day === 'any' ? 7 : +x[1].day, dy = y[1].day === 'any' ? 7 : +y[1].day; return dx - dy || x[1].title.localeCompare(y[1].title); });
  return `<div class="section-head"><h2>Workouts</h2><button class="btn sm" data-act="newplan">${I.plus} New plan</button></div>
  <p class="muted" style="margin-top:-6px">Plans appear on each person’s Today screen on the day you choose.</p>
  <div class="seg">${[['all', 'All'], ['a', nm('a')], ['b', nm('b')], ['both', 'Together']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
  ${all.length ? all.map(([id, p]) => `<article class="card plan-card">
    <div class="card-head"><div class="grow"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="tag ${p.for}">${p.for === 'both' ? 'Together' : nm(p.for)}</span><span class="tag day">${p.day === 'any' ? 'Any day' : WD_LONG[+p.day]}</span></div>
      <h3 style="font-size:17px;font-weight:800;margin-top:8px">${esc(p.title)}</h3></div>
      <button class="btn secondary sm" data-act="editplan" data-id="${esc(id)}">Edit</button></div>
    <div class="ex-list">${(p.ex || []).map(e => `<div class="ex-line"><span>${esc(e.n)}</span><span class="muted num" style="font-weight:600;white-space:nowrap">${esc(exLine(e))}</span></div>`).join('')}</div>
    ${p.notes ? `<p class="muted" style="font-size:13.5px">${esc(p.notes)}</p>` : ''}
  </article>`).join('') : `<div class="card"><p class="empty">No plans here yet. Tap <b>New plan</b> to write your first workout.</p></div>`}`;
}
function planSheet() {
  const e = S.edit, nm = w => esc(P(w).name);
  return `<div class="scrim" data-act="closesheet"><form class="sheet" data-form="plan" novalidate>
    <div class="grab"></div>
    <div class="card-head"><h2>${e.id ? 'Edit workout' : 'New workout'}</h2><button type="button" class="x" data-act="closesheet" aria-label="Close">${I.x}</button></div>
    <div class="field"><label for="pl-title">Workout name</label><input id="pl-title" value="${esc(e.title)}" placeholder="e.g. Push Day, Booty Burn" autocomplete="off"></div>
    <div class="field"><label>Who is it for?</label><div class="seg">${[['a', nm('a')], ['b', nm('b')], ['both', 'Both of us']].map(([k, l]) => `<button type="button" class="${e.for === k ? 'on' : ''}" data-act="pfor" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><label for="pl-day">Day</label><select id="pl-day">${[['any', 'Any day'], ...WD_LONG.map((w, i) => [String(i), w])].map(([v, l]) => `<option value="${v}" ${String(e.day) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>Exercises</label>
      <div class="exrow eyebrow exhead"><span>Exercise</span><span>Sets</span><span>Reps</span><span>Weight</span><span></span></div>
      ${e.ex.map((x, i) => `<div class="exrow"><input id="ex-n-${i}" value="${esc(x.n)}" placeholder="Squat" aria-label="Exercise ${i + 1} name" autocomplete="off"><input id="ex-s-${i}" value="${esc(x.s)}" inputmode="numeric" placeholder="4" aria-label="Sets"><input id="ex-r-${i}" value="${esc(x.r)}" placeholder="8" aria-label="Reps"><input id="ex-w-${i}" value="${esc(x.w)}" placeholder="135 lb" aria-label="Weight"><button type="button" class="x" data-act="rmex" data-i="${i}" aria-label="Remove exercise">${I.x}</button></div>`).join('')}
      <button type="button" class="btn secondary sm" data-act="addex" style="align-self:flex-start">${I.plus} Add exercise</button></div>
    <div class="field"><label for="pl-notes">Notes <span class="muted" style="font-weight:500">(optional)</span></label><textarea id="pl-notes" rows="2" placeholder="Rest 90 seconds between sets">${esc(e.notes)}</textarea></div>
    <button class="btn block">Save workout</button>
    ${e.id ? (e.confirmDel
      ? `<div class="notice"><span class="grow">Delete this workout for both of you?</span><button type="button" class="btn danger sm" data-act="delplan">Delete</button><button type="button" class="btn secondary sm" data-act="canceldel">Keep</button></div>`
      : '<button type="button" class="btn danger" data-act="askdel">Delete workout</button>') : ''}
  </form></div>`;
}
function readEditor() {
  const e = S.edit; if (!e) return;
  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  e.title = g('pl-title'); e.day = g('pl-day') || e.day; e.notes = g('pl-notes');
  e.ex = e.ex.map((_, i) => ({ n: g('ex-n-' + i), s: g('ex-s-' + i), r: g('ex-r-' + i), w: g('ex-w-' + i) }));
}

function macro(lbl, v, goal, unit, cls) {
  const pct = goal ? Math.min(100, v / goal * 100) : 0;
  return `<div class="macro"><div class="row"><span class="eyebrow">${lbl}</span><span class="v num">${Math.round(v).toLocaleString()}${unit} <small>/ ${(goal || 0).toLocaleString()}${unit}</small></span></div><div class="bar"><i class="${cls}" style="width:${pct}%"></i></div></div>`;
}
function foodView() {
  const d = day(me, S.foodDate), p = P(me), t = totalsOf(d), isToday = S.foodDate === today();
  const left = (p.cal || 0) - t.cal;
  return `<div class="section-head"><h2>Nutrition</h2></div>
  <div class="datebar"><button class="iconbtn" data-act="fd" data-n="-1" aria-label="Previous day">${I.back}</button><b>${isToday ? 'Today' : pretty(S.foodDate)}</b><button class="iconbtn" data-act="fd" data-n="1" ${isToday ? 'disabled' : ''} aria-label="Next day">${I.fwd}</button></div>
  <section class="card">
    ${macro('Calories', t.cal, p.cal, '', 'fill-me')}${macro('Protein', t.p, p.protein, 'g', 'fill-gold')}
    <p class="hint">${p.goal === 'gain'
      ? (left > 0 ? `${left.toLocaleString()} calories to go. For a bulk, hitting this number matters most.` : 'Calorie goal hit. Going over a little is fine on a bulk.')
      : (left >= 0 ? `${left.toLocaleString()} calories left. Keep protein high to hold on to muscle.` : `${Math.abs(left).toLocaleString()} over today. One day won’t undo your progress.`)}</p>
  </section>
  <section class="card"><div class="card-head"><h3>Quick add</h3><span class="hint">Typical estimates</span></div>
    <div class="presets">${(PRESETS[p.goal] || PRESETS.gain).map((x, i) => `<button class="preset" data-act="preset" data-i="${i}"><b>${esc(x[0])}</b><span class="num">${x[1]} kcal · ${x[2]}g protein</span></button>`).join('')}</div>
  </section>
  <section class="card"><h3 style="font-size:16.5px;font-weight:800">Add your own</h3>
    <form data-form="food" style="display:flex;flex-direction:column;gap:10px" novalidate>
      <div class="field"><label for="fd-n">Food</label><input id="fd-n" placeholder="e.g. Chipotle bowl" autocomplete="off"></div>
      <div class="grid2"><div class="field"><label for="fd-c">Calories</label><input id="fd-c" type="number" inputmode="numeric" placeholder="750"></div><div class="field"><label for="fd-p">Protein (g)</label><input id="fd-p" type="number" inputmode="numeric" placeholder="40"></div></div>
      <button class="btn">Add food</button>
    </form>
  </section>
  <section class="card"><div class="card-head"><h3>${isToday ? 'Logged today' : 'Logged'}</h3><span class="muted num" style="font-size:13px;font-weight:700">${d.foods.length} items</span></div>
    ${d.foods.length ? `<div class="list">${d.foods.map((f, i) => `<div class="li"><span class="grow">${esc(f.n)}</span><span class="meta num">${f.cal} kcal · ${f.p || 0}g</span><button class="x" data-act="rmfood" data-i="${i}" aria-label="Remove ${esc(f.n)}">${I.x}</button></div>`).join('')}</div>` : '<p class="empty">Nothing logged yet. Tap a quick add to start.</p>'}
  </section>`;
}

function progressView() {
  const w = S.progWho || me, pr = P(w), g = progressOf(w), ws = weighins(w), dir = pr.goal === 'gain' ? 1 : -1;
  const ds_ = daysOf(w);
  const totalW = ds_.reduce((n, d) => n + d.workouts.length + d.extra.length, 0);
  const meals = ds_.reduce((n, d) => n + d.foods.length, 0);
  const cheers = ds_.reduce((n, d) => n + d.cheers, 0);
  const hydro = ds_.some(d => d.water >= (pr.water || 8));
  const moved = g.change != null ? g.change * dir : 0;
  const badges = [['First Sweat', 'Finish a workout', totalW >= 1], ['Ten Strong', '10 workouts', totalW >= 10], ['Iron Habit', '25 workouts', totalW >= 25], ['On Fire', '7-day streak', bestStreak(w) >= 7], ['Fuel Logger', 'Log 50 foods', meals >= 50], ['Hydrated', 'Fill every glass', hydro], [pr.goal === 'gain' ? '5 lb Up' : '5 lb Down', '5 lb toward goal', moved >= 5], ['Halfway', '50% to goal', (g.pct || 0) >= 50], ['Fan Favorite', '10 high-fives', cheers >= 10]];
  const sign = n => (n > 0 ? '+' : '') + n;
  return `<div class="section-head"><h2>Progress</h2></div>
  <div class="seg">${['a', 'b'].map(k => `<button class="${w === k ? 'on' : ''}" data-act="progwho" data-w="${k}">${esc(P(k).name)}</button>`).join('')}</div>
  <section class="card">
    <div class="card-head"><h3>Body weight</h3><span class="tag ${w}">${pr.goal === 'gain' ? 'Bulking' : 'Toning'}</span></div>
    <div class="stats">
      <div class="stat"><b class="num">${g.cur ?? '–'}</b><span>Current (lb)</span></div>
      <div class="stat"><b class="num">${g.change == null ? '–' : sign(g.change)}</b><span>Since start</span></div>
      <div class="stat"><b class="num">${g.goal && g.cur != null ? Math.abs(+(g.goal - g.cur).toFixed(1)) : '–'}</b><span>lb to goal</span></div>
    </div>
    ${g.pct != null ? `<div class="macro"><div class="row"><span class="eyebrow">Goal progress</span><span class="v num">${g.pct}%</span></div><div class="bar"><i class="fill-good" style="width:${g.pct}%"></i></div></div>` : ''}
    ${chart(ws, g.goal, w)}
  </section>
  <section class="card"><div class="card-head"><h3>Achievements</h3><span class="muted num" style="font-size:13px;font-weight:700">${badges.filter(b => b[2]).length} of ${badges.length}</span></div>
    <div class="badges">${badges.map(([n, s, got]) => `<div class="badge ${got ? 'got' : ''}"><span class="medal">${I.star}</span>${esc(n)}<small>${esc(s)}</small></div>`).join('')}</div>
  </section>
  <section class="card"><h3 style="font-size:16.5px;font-weight:800">Weigh-in history</h3>
    ${ws.length ? `<div class="list">${ws.slice().reverse().slice(0, 30).map(x => `<div class="li"><span class="grow">${pretty(x.date)}</span><b class="num">${x.w} lb</b>${w === me ? `<button class="x" data-act="rmweight" data-d="${x.date}" aria-label="Remove weigh-in">${I.x}</button>` : ''}</div>`).join('')}</div>` : '<p class="empty">No weigh-ins yet. Add one from the Today screen.</p>'}
  </section>`;
}
function chart(ws, goal, w) {
  if (ws.length < 2) return '<p class="empty">Log two weigh-ins to see your trend.</p>';
  const W = 340, H = 180, L = 38, R = 12, T = 14, B = 26;
  const vals = ws.map(x => x.w).concat(goal ? [goal] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 4) { lo -= 2; hi += 2; }
  const padv = (hi - lo) * 0.12; lo = Math.floor(lo - padv); hi = Math.ceil(hi + padv);
  const t0 = parse(ws[0].date).getTime(), t1 = parse(ws[ws.length - 1].date).getTime();
  const X = d => L + (W - L - R) * ((parse(d).getTime() - t0) / ((t1 - t0) || 1));
  const Y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const pts = ws.map(x => [X(x.date), Y(x.w)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${H - B} L${pts[0][0].toFixed(1)} ${H - B} Z`;
  const ticks = [lo, Math.round((lo + hi) / 2), hi], col = `var(--${w})`, last = pts.at(-1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend">
    ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${L - 8}" y="${Y(t) + 4}" text-anchor="end" font-size="11" font-weight="600" fill="var(--muted)">${t}</text>`).join('')}
    ${goal ? `<line x1="${L}" x2="${W - R}" y1="${Y(goal)}" y2="${Y(goal)}" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - R}" y="${Y(goal) - 6}" text-anchor="end" font-size="11" font-weight="800" fill="var(--good)">Goal ${goal}</text>` : ''}
    <path d="${area}" fill="${col}" opacity=".1"/>
    <path d="${line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="5" fill="${col}" stroke="var(--surface)" stroke-width="2.5"/>
    <text x="${L}" y="${H - 6}" font-size="11" font-weight="600" fill="var(--muted)">${short(ws[0].date)}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end" font-size="11" font-weight="600" fill="var(--muted)">${short(ws.at(-1).date)}</text>
  </svg>`;
}

/* ---------- setup / profiles ---------- */
const draft = {};
function profileFields(w, p) {
  return `<section class="card">
    <div class="person-head"><span class="avatar sm ${w}">${w === 'a' ? '1' : '2'}</span><h3 style="font-size:16.5px;font-weight:800">${w === 'a' ? 'You' : 'Your partner'}</h3></div>
    <div class="field"><label for="${w}-name">Name</label><input id="${w}-name" value="${esc(p.name || '')}" placeholder="${w === 'a' ? 'Sean' : 'Her name'}" autocomplete="off"></div>
    <div class="field"><label>Goal</label><div class="seg"><button type="button" class="${p.goal === 'gain' ? 'on' : ''}" data-act="goal" data-w="${w}" data-v="gain">Gain weight & bulk</button><button type="button" class="${p.goal === 'lose' ? 'on' : ''}" data-act="goal" data-w="${w}" data-v="lose">Lose weight & tone</button></div></div>
    <div class="grid2"><div class="field"><label for="${w}-start">Starting weight (lb)</label><input id="${w}-start" type="number" step="0.1" inputmode="decimal" value="${esc(p.start ?? '')}"></div>
      <div class="field"><label for="${w}-goalW">Goal weight (lb)</label><input id="${w}-goalW" type="number" step="0.1" inputmode="decimal" value="${esc(p.goalW ?? '')}"></div></div>
    <div class="grid2"><div class="field"><label for="${w}-cal">Daily calories</label><input id="${w}-cal" type="number" inputmode="numeric" value="${esc(p.cal ?? '')}" placeholder="Auto"></div>
      <div class="field"><label for="${w}-protein">Daily protein (g)</label><input id="${w}-protein" type="number" inputmode="numeric" value="${esc(p.protein ?? '')}" placeholder="Auto"></div></div>
    <div class="field"><label for="${w}-water">Water goal (glasses per day)</label><input id="${w}-water" type="number" inputmode="numeric" value="${esc(p.water || 8)}"></div>
    <p class="hint">Leave calories and protein blank for a suggested starting point: about 17 calories per pound of body weight to bulk or 12 to lean out, and roughly 1g of protein per pound of goal weight. Adjust as you see results.</p>
  </section>`;
}
function readProfile(w) {
  const g = id => { const el = document.getElementById(`${w}-${id}`); return el ? el.value.trim() : ''; };
  const goal = (draft[w] && draft[w].goal) || P(w).goal;
  const start = +g('start') || null, goalW = +g('goalW') || null, base = start || goalW;
  let cal = +g('cal') || null, protein = +g('protein') || null;
  if (!cal && base) cal = Math.round(base * (goal === 'gain' ? 17 : 12) / 50) * 50;
  if (!protein && (goalW || base)) protein = Math.round((goalW || base) * (goal === 'gain' ? 1 : 0.9) / 5) * 5;
  return { name: g('name') || (w === 'a' ? 'Sean' : 'Partner'), goal, start, goalW, cal: cal || (goal === 'gain' ? 2800 : 1800), protein: protein || (goal === 'gain' ? 160 : 120), water: Math.max(1, Math.min(16, +g('water') || 8)) };
}
function setupView() {
  const a = Object.assign({ name: 'Sean', goal: 'gain' }, draft.a), b = Object.assign({ name: '', goal: 'lose' }, draft.b);
  return `<form class="onboard" data-form="setup" novalidate>
    <div class="brand"><img src="/icons/icon.svg" alt="">Ball Fit Club</div>
    <h1>Let’s set you both up.</h1>
    <p class="muted">This takes a minute. You can change any of it later in Settings.</p>
    ${profileFields('a', a)}${profileFields('b', b)}
    <button class="btn block" style="padding:15px">Get started</button>
  </form>`;
}
function pickView() {
  return `<div class="onboard">
    <div class="brand"><img src="/icons/icon.svg" alt="">Ball Fit Club</div>
    <h1>Who’s using this phone?</h1>
    <p class="muted">We’ll remember on this device. Tap your initial at the top any time to switch.</p>
    <div class="pick">${['a', 'b'].map(w => { const p = P(w); return `<button class="pickcard" data-act="pick" data-w="${w}"><span class="avatar ${w}">${esc(p.name[0] || '?')}</span><span class="grow"><b>${esc(p.name)}</b><span>${p.goal === 'gain' ? 'Gaining weight & bulking' : 'Losing weight & toning'}</span></span>${I.fwd.replace('<svg', '<svg width="20" height="20"')}</button>`; }).join('')}</div>
  </div>`;
}
function settingsSheet() {
  return `<div class="scrim" data-act="closesheet"><form class="sheet" data-form="settings" novalidate>
    <div class="grab"></div>
    <div class="card-head"><h2>Settings</h2><button type="button" class="x" data-act="closesheet" aria-label="Close">${I.x}</button></div>
    ${profileFields('a', Object.assign({}, P('a'), draft.a))}${profileFields('b', Object.assign({}, P('b'), draft.b))}
    <button class="btn block">Save changes</button>
    <button type="button" class="btn outline" data-act="switch">Switch this phone to ${esc(P(other(me)).name)}</button>
  </form></div>`;
}

/* ---------- sheets ---------- */
let sheetKind = null;
function openSheet(kind) { sheetKind = kind; drawSheet(); }
function drawSheet() {
  const el = document.getElementById('sheet');
  el.innerHTML = sheetKind === 'plan' ? planSheet() : sheetKind === 'settings' ? settingsSheet() : '';
  document.body.style.overflow = sheetKind ? 'hidden' : '';
}
function closeSheet() { sheetKind = null; S.edit = null; for (const k in draft) delete draft[k]; drawSheet(); render(); }

/* ---------- feedback ---------- */
let toastTimer;
function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), ms);
}
function confetti() {
  if (reduced) return;
  const c = document.getElementById('fx'); c.hidden = false;
  const ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.body);
  const cols = ['--a', '--b', '--gold', '--good'].map(v => cs.getPropertyValue(v).trim() || '#f59e0b');
  const parts = Array.from({ length: 110 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 6, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * 4)] }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) { p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore(); }
    if (++f < 110) requestAnimationFrame(tick); else { ctx.clearRect(0, 0, innerWidth, innerHeight); c.hidden = true; }
  })();
}
function award(fn, msg, party) {
  const before = levelOf(me).lvl;
  fn();
  if (msg) toast(msg);
  if (party) confetti();
  const after = levelOf(me);
  if (after.lvl > before) setTimeout(() => { toast(`Level up! You’re now Level ${after.lvl}: ${after.title}`); confetti(); }, 700);
}

/* =========================================================
   Events
   ========================================================= */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'closesheet') { if (!t.classList.contains('scrim') || e.target === t) closeSheet(); return; }
  const d = () => day(me, today());
  switch (a) {
    case 'pick': me = t.dataset.w; LS.set('bfc.me', me); S.progWho = null; render(); break;
    case 'switch': me = other(me || 'b'); LS.set('bfc.me', me); S.progWho = null; S.spin = null; if (sheetKind) closeSheet(); render(); toast(`Switched to ${P(me).name}`); break;
    case 'settings': openSheet('settings'); break;
    case 'goal': { const w = t.dataset.w; draft[w] = Object.assign(draft[w] || {}, { goal: t.dataset.v }); t.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); break; }
    case 'quest': award(() => { const o = d(); o.quests = [...new Set([...o.quests, t.dataset.id])]; saveDay(o); }, 'Quest complete · +15 XP', true); break;
    case 'cheer': { const o = day(other(me), today()); o.cheers += 1; saveDay(o); toast(`High-five sent to ${P(other(me)).name}`); break; }
    case 'check': {
      const id = t.dataset.id, i = +t.dataset.i, o = d(); if (o.workouts.includes(id)) break;
      const set = new Set(o.done[id] || []); set.has(i) ? set.delete(i) : set.add(i); o.done[id] = [...set];
      const pl = S.plans[id];
      if (pl && set.size > 0 && set.size === (pl.ex || []).length) award(() => { o.workouts = [...o.workouts, id]; saveDay(o); }, 'Workout complete · +40 XP', true);
      else saveDay(o);
      break;
    }
    case 'finish': { const id = t.dataset.id; award(() => { const o = d(); o.workouts = [...new Set([...o.workouts, id])]; o.done[id] = (S.plans[id]?.ex || []).map((_, i) => i); saveDay(o); }, 'Workout complete · +40 XP', true); break; }
    case 'undo': { const id = t.dataset.id, o = d(); o.workouts = o.workouts.filter(x => x !== id); o.done[id] = []; saveDay(o); break; }
    case 'spin': {
      const res = document.getElementById('spinres'), pick = QUICK[Math.floor(Math.random() * QUICK.length)];
      if (reduced || !res) { S.spin = pick; render(); break; }
      t.disabled = true; let n = 0;
      const iv = setInterval(() => { res.textContent = QUICK[n++ % QUICK.length]; if (n > 14) { clearInterval(iv); S.spin = pick; render(); } }, 70);
      break;
    }
    case 'spindone': award(() => { const o = d(); o.extra = [...o.extra, { n: S.spin }]; S.spin = null; saveDay(o); }, 'Bonus workout done · +30 XP', true); break;
    case 'rmextra': { const o = d(); o.extra.splice(+t.dataset.i, 1); saveDay(o); break; }
    case 'water': {
      const i = +t.dataset.i, goal = P(me).water || 8;
      award(() => { const o = d(); o.water = o.water === i + 1 ? i : i + 1; saveDay(o); if (o.water === goal) { toast('Water goal reached'); confetti(); } });
      break;
    }
    case 'clearweight': { const o = d(); o.weight = null; saveDay(o); setTimeout(() => document.getElementById('wt')?.focus(), 30); break; }
    case 'rmweight': { const o = day(me, t.dataset.d); o.weight = null; saveDay(o); break; }
    case 'preset': { const x = (PRESETS[P(me).goal] || PRESETS.gain)[+t.dataset.i]; award(() => { const o = day(me, S.foodDate); o.foods = [...o.foods, { n: x[0], cal: x[1], p: x[2] }]; saveDay(o); }, `Added ${x[0]} · +5 XP`); break; }
    case 'rmfood': { const o = day(me, S.foodDate); o.foods.splice(+t.dataset.i, 1); saveDay(o); break; }
    case 'fd': { const nd = addDays(S.foodDate, +t.dataset.n); if (nd <= today()) { S.foodDate = nd; render(); } break; }
    case 'progwho': S.progWho = t.dataset.w; render(); break;
    case 'filter': S.filter = t.dataset.f; render(); break;
    case 'newplan': S.edit = { id: null, title: '', for: me, day: 'any', ex: [0, 1, 2].map(() => ({ n: '', s: '', r: '', w: '' })), notes: '' }; openSheet('plan'); break;
    case 'editplan': { const p = S.plans[t.dataset.id]; if (!p) break; S.edit = Object.assign({ id: t.dataset.id }, clone(p)); if (!S.edit.ex.length) S.edit.ex = [{ n: '', s: '', r: '', w: '' }]; openSheet('plan'); break; }
    case 'pfor': readEditor(); S.edit.for = t.dataset.v; drawSheet(); break;
    case 'addex': readEditor(); S.edit.ex.push({ n: '', s: '', r: '', w: '' }); drawSheet(); document.getElementById('ex-n-' + (S.edit.ex.length - 1))?.focus(); break;
    case 'rmex': readEditor(); S.edit.ex.splice(+t.dataset.i, 1); if (!S.edit.ex.length) S.edit.ex.push({ n: '', s: '', r: '', w: '' }); drawSheet(); break;
    case 'askdel': readEditor(); S.edit.confirmDel = true; drawSheet(); break;
    case 'canceldel': readEditor(); S.edit.confirmDel = false; drawSheet(); break;
    case 'delplan': remove('plans', S.edit.id); toast('Workout deleted'); closeSheet(); break;
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form;
  if (kind === 'weight') {
    const v = parseFloat(document.getElementById('wt').value);
    if (!(v > 40 && v < 800)) { toast('Enter your weight in pounds, like 172.4'); return; }
    document.activeElement?.blur();
    award(() => { const o = day(me, today()); o.weight = +v.toFixed(1); saveDay(o); }, 'Weigh-in saved · +10 XP');
  }
  if (kind === 'food') {
    const n = document.getElementById('fd-n').value.trim(), c = +document.getElementById('fd-c').value, p = +document.getElementById('fd-p').value || 0;
    if (!n || !(c >= 0) || document.getElementById('fd-c').value === '') { toast('Add a food name and its calories'); return; }
    document.activeElement?.blur();
    award(() => { const o = day(me, S.foodDate); o.foods = [...o.foods, { n, cal: Math.round(c), p: Math.round(p) }]; saveDay(o); }, `Added ${n} · +5 XP`);
  }
  if (kind === 'plan') {
    readEditor();
    const ed = S.edit, ex = ed.ex.filter(x => x.n.trim()).map(x => ({ n: x.n.trim(), s: x.s.trim(), r: x.r.trim(), w: x.w.trim() }));
    if (!ed.title.trim()) { toast('Give the workout a name'); return; }
    if (!ex.length) { toast('Add at least one exercise'); return; }
    const id = ed.id || newId();
    put('plans', id, { title: ed.title.trim(), for: ed.for, day: ed.day, ex, notes: (ed.notes || '').trim() });
    toast(ed.id ? 'Workout updated' : 'Workout added');
    closeSheet();
  }
  if (kind === 'setup' || kind === 'settings') {
    const a = readProfile('a'), b = readProfile('b');
    document.activeElement?.blur();
    put('profiles', 'a', a); put('profiles', 'b', b);
    for (const k in draft) delete draft[k];
    if (kind === 'settings') { toast('Settings saved'); closeSheet(); } else render();
  }
});

window.addEventListener('hashchange', render);
init();
