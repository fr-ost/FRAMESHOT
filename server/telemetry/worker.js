/**
 * FrameShot tracker (Cloudflare Workers + D1)
 * ------------------------------------------------------------------
 * Anonymous install numbers for FrameShot, with a built-in dashboard:
 * installs, updates and uninstalls per day, how many installs are still
 * active, how long people keep FrameShot, and which versions, countries,
 * operating systems and languages they use.
 *
 * The extension sends only an install or update event (a random install id,
 * the version, the OS and the browser language), and Chrome opens the
 * uninstall address when FrameShot is removed. It never sends page
 * addresses, titles, screenshots, recordings, file names or settings.
 * Country is Cloudflare's 2-letter code for the request (request.cf.country);
 * the IP address is never read or stored.
 *
 * Endpoints
 *   POST /e          an event from the extension (see EVENT BODY)
 *   GET  /u?id=&v=   uninstall address (chrome.runtime.setUninstallURL):
 *                    records the uninstall and shows a short goodbye page
 *   GET  /           the dashboard
 *   GET  /api/stats  the dashboard's numbers as JSON (?days=7|30|90|365)
 *   GET  /health     "ok"
 *
 * If the STATS_KEY secret is set, the dashboard asks for it once and
 * /api/stats requires it (header x-stats-key or ?key=).
 *
 * EVENT BODY (JSON; unknown fields are ignored)
 *   ev   "install" | "update" | "usage"
 *   id   random install id (hex)   v  version   pv  previous version (updates)
 *   p    OS: win|mac|linux|cros|other           l  browser language, e.g. "en"
 *   For "usage" only (not sent by FrameShot 1.0.1; ready for a later version):
 *   sv sf sa se  screenshots (visible, full page, area, element) since the last event
 *   rc rm        recordings and recorded minutes      gf  GIFs      ex  exports
 *
 * Storage: a D1 database bound as DB. Tables are created on the first
 * request. Usage rows are deleted after 400 days.
 */

const DAY = 86400000;
const EVENTS = new Set(['install', 'update', 'usage']);
const PLATFORMS = new Set(['win', 'mac', 'linux', 'cros', 'other']);
const USAGE = { sv: 2000, sf: 2000, sa: 2000, se: 2000, rc: 500, rm: 1440, gf: 500, ex: 5000 };
const STORE = 'https://chromewebstore.google.com/detail/adcgjmghjagflmmndoajdidcopodacac';
const FEEDBACK = 'https://t.me/igfrostt';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, x-stats-key',
  'access-control-max-age': '86400',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });

const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);
const clean = (v, max) => String(v == null ? '' : v).replace(/[^\w.+-]/g, '').slice(0, max);
const anonId = (v) => (/^[a-f0-9]{16,64}$/i.test(String(v || '')) ? String(v).toLowerCase() : '');
const int = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const country = (req) => {
  const c = String((req.cf && req.cf.country) || '').toUpperCase();
  return /^[A-Z][A-Z0-9]$/.test(c) ? c : 'XX';
};

// ── Schema ────────────────────────────────────────────────────────────
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS installs (
     id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
     v TEXT, p TEXT, l TEXT, c TEXT, updates INTEGER DEFAULT 0,
     uninstalled_at INTEGER, uninstall_v TEXT)`,
  `CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, ev TEXT NOT NULL, n INTEGER DEFAULT 0, PRIMARY KEY (day, ev))`,
  `CREATE TABLE IF NOT EXISTS usage (
     day TEXT NOT NULL, id TEXT NOT NULL,
     sv INTEGER DEFAULT 0, sf INTEGER DEFAULT 0, sa INTEGER DEFAULT 0, se INTEGER DEFAULT 0,
     rc INTEGER DEFAULT 0, rm INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ex INTEGER DEFAULT 0,
     PRIMARY KEY (day, id))`,
  `CREATE INDEX IF NOT EXISTS installs_first ON installs(first_seen)`,
  `CREATE INDEX IF NOT EXISTS installs_unin ON installs(uninstalled_at)`,
  `CREATE INDEX IF NOT EXISTS usage_day ON usage(day)`,
];
const ready = new WeakSet();
async function ensureSchema(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  ready.add(db);
}
const bump = (db, day, ev) => db.prepare('INSERT INTO counts (day, ev, n) VALUES (?1, ?2, 1) ON CONFLICT(day, ev) DO UPDATE SET n = n + 1').bind(day, ev);

// ── Writes ────────────────────────────────────────────────────────────
async function record(env, req, body, now) {
  const db = env.DB;
  const ev = String(body.ev || '');
  const id = anonId(body.id);
  if (!EVENTS.has(ev) || !id) return false;
  const day = dayOf(now);
  const v = clean(body.v, 16);
  const p = PLATFORMS.has(body.p) ? body.p : body.p ? 'other' : '';
  const l = clean(body.l, 8).toLowerCase();
  const c = country(req);
  const known = await db.prepare('SELECT id, uninstalled_at FROM installs WHERE id = ?1').bind(id).first();
  const stmts = [
    db
      .prepare(
        `INSERT INTO installs (id, first_seen, last_seen, v, p, l, c) VALUES (?1, ?2, ?2, NULLIF(?3, ''), COALESCE(NULLIF(?4, ''), 'other'), COALESCE(NULLIF(?5, ''), 'other'), ?6)
         ON CONFLICT(id) DO UPDATE SET last_seen = ?2, v = COALESCE(NULLIF(?3, ''), v), p = COALESCE(NULLIF(?4, ''), p), l = COALESCE(NULLIF(?5, ''), l), c = ?6,
           updates = updates + ?7, uninstalled_at = NULL, uninstall_v = NULL`,
      )
      .bind(id, now, v, p, l, c, ev === 'update' ? 1 : 0),
  ];
  // An install is counted once per id (a repeated install event only refreshes the row).
  if (ev === 'install' && !known) stmts.push(bump(db, day, 'install'));
  if (ev === 'install' && known && known.uninstalled_at) stmts.push(bump(db, day, 'reinstall'));
  if (ev === 'update') stmts.push(bump(db, day, 'update'));
  if (ev === 'usage') {
    const n = Object.fromEntries(Object.entries(USAGE).map(([k, max]) => [k, int(body[k], max)]));
    stmts.push(
      db
        .prepare(
          `INSERT INTO usage (day, id, sv, sf, sa, se, rc, rm, gf, ex) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
           ON CONFLICT(day, id) DO UPDATE SET sv = sv + ?3, sf = sf + ?4, sa = sa + ?5, se = se + ?6, rc = rc + ?7, rm = MIN(1440, rm + ?8), gf = gf + ?9, ex = ex + ?10`,
        )
        .bind(day, id, n.sv, n.sf, n.sa, n.se, n.rc, n.rm, n.gf, n.ex),
    );
  }
  await db.batch(stmts);
  return true;
}

async function uninstall(env, id, v, now) {
  const db = env.DB;
  if (!id) return;
  const row = await db.prepare('SELECT uninstalled_at FROM installs WHERE id = ?1').bind(id).first();
  if (row && row.uninstalled_at) return; // counted once
  const stmts = [bump(db, dayOf(now), 'uninstall')];
  if (row) stmts.push(db.prepare('UPDATE installs SET uninstalled_at = ?2, uninstall_v = NULLIF(?3, \'\') WHERE id = ?1').bind(id, now, v));
  await db.batch(stmts);
}

// ── Reads ─────────────────────────────────────────────────────────────
async function stats(env, days, now) {
  const db = env.DB;
  const since = now - days * DAY;
  const sinceDay = dayOf(since);
  const all = (sql, ...b) => db.prepare(sql).bind(...b).all().then((r) => r.results || []);
  const one = (sql, ...b) => db.prepare(sql).bind(...b).first();
  const keepAfter = (n) =>
    one(
      `SELECT COUNT(*) AS base, SUM(CASE WHEN uninstalled_at IS NULL OR uninstalled_at - first_seen >= ?1 THEN 1 ELSE 0 END) AS kept
       FROM installs WHERE first_seen <= ?2`,
      n * DAY,
      now - n * DAY,
    );
  const [totals, life, series, countries, platforms, languages, versions, buckets, k1, k7, k30, usage, usageSeries] = await Promise.all([
    one(`SELECT COUNT(*) AS installs, SUM(CASE WHEN uninstalled_at IS NULL THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN uninstalled_at IS NOT NULL THEN 1 ELSE 0 END) AS uninstalled,
                SUM(CASE WHEN first_seen >= ?1 THEN 1 ELSE 0 END) AS newInRange,
                SUM(CASE WHEN uninstalled_at >= ?1 THEN 1 ELSE 0 END) AS goneInRange
         FROM installs`, since),
    one(`SELECT AVG((uninstalled_at - first_seen) / 86400000.0) AS avgDays FROM installs WHERE uninstalled_at IS NOT NULL`),
    all(`SELECT day, ev, n FROM counts WHERE day >= ?1 ORDER BY day`, sinceDay),
    all(`SELECT c AS k, COUNT(*) AS n FROM installs WHERE uninstalled_at IS NULL GROUP BY c ORDER BY n DESC LIMIT 25`),
    all(`SELECT p AS k, COUNT(*) AS n FROM installs WHERE uninstalled_at IS NULL GROUP BY p ORDER BY n DESC`),
    all(`SELECT l AS k, COUNT(*) AS n FROM installs WHERE uninstalled_at IS NULL GROUP BY l ORDER BY n DESC LIMIT 15`),
    all(`SELECT v AS k, COUNT(*) AS n FROM installs WHERE uninstalled_at IS NULL GROUP BY v ORDER BY n DESC LIMIT 15`),
    all(`SELECT CASE WHEN d < 1 THEN 'Same day' WHEN d < 7 THEN '1–6 days' WHEN d < 30 THEN '1–4 weeks' WHEN d < 90 THEN '1–3 months' ELSE '3+ months' END AS k, COUNT(*) AS n
         FROM (SELECT (uninstalled_at - first_seen) / 86400000.0 AS d FROM installs WHERE uninstalled_at IS NOT NULL) GROUP BY k`),
    keepAfter(1),
    keepAfter(7),
    keepAfter(30),
    one(`SELECT COUNT(DISTINCT id) AS users, SUM(sv) AS sv, SUM(sf) AS sf, SUM(sa) AS sa, SUM(se) AS se, SUM(rc) AS rc, SUM(rm) AS rm, SUM(gf) AS gf, SUM(ex) AS ex FROM usage WHERE day >= ?1`, sinceDay),
    all(`SELECT day, COUNT(DISTINCT id) AS users, SUM(sv + sf + sa + se) AS shots, SUM(rc) AS recs FROM usage WHERE day >= ?1 GROUP BY day ORDER BY day`, sinceDay),
  ]);
  // One row per day in the range, zeros included, so charts have no gaps.
  const byDay = {};
  for (let t = since + DAY; t <= now + 1; t += DAY) byDay[dayOf(t)] = { day: dayOf(t), install: 0, update: 0, uninstall: 0, reinstall: 0 };
  for (const r of series) if (byDay[r.day]) byDay[r.day][r.ev] = r.n;
  const pct = (k) => (k && k.base ? Math.round((1000 * (k.kept || 0)) / k.base) / 10 : null);
  const order = ['Same day', '1–6 days', '1–4 weeks', '1–3 months', '3+ months'];
  return {
    days,
    totals: { ...totals, avgKeepDays: life && life.avgDays != null ? Math.round(life.avgDays * 10) / 10 : null },
    retention: { day1: pct(k1), day7: pct(k7), day30: pct(k30), base7: k7 ? k7.base : 0, base30: k30 ? k30.base : 0 },
    series: Object.values(byDay),
    countries,
    platforms,
    languages,
    versions,
    lifeBuckets: order.map((k) => ({ k, n: (buckets.find((b) => b.k === k) || {}).n || 0 })),
    usage: usage && usage.users ? { ...usage, series: usageSeries } : null,
  };
}

// ── Router ────────────────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (path === '/health') return new Response('ok', { headers: { 'content-type': 'text/plain', ...CORS } });
    if (!env.DB) return path === '/' ? html(setupPage(), 500) : json({ error: 'No D1 database is bound as DB. See README.md, step 3.' }, 500);
    await ensureSchema(env.DB);
    const now = Date.now();

    if (path === '/e' && req.method === 'POST') {
      const text = await req.text();
      if (text.length > 2048) return json({ error: 'too large' }, 413);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: 'bad json' }, 400);
      }
      const ok = await record(env, req, body || {}, now);
      return json({ ok }, ok ? 200 : 400);
    }
    if (path === '/u') {
      ctx.waitUntil(uninstall(env, anonId(url.searchParams.get('id')), clean(url.searchParams.get('v'), 16), now));
      return html(goodbyePage());
    }
    if (path === '/api/stats' || path === '/stats') {
      if (env.STATS_KEY && (req.headers.get('x-stats-key') || url.searchParams.get('key')) !== env.STATS_KEY) return json({ error: 'key required' }, 401);
      const days = [7, 30, 90, 365].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
      // Old usage rows are trimmed now and then (about 1 in 50 dashboard loads).
      if (Math.random() < 0.02) ctx.waitUntil(env.DB.prepare('DELETE FROM usage WHERE day < ?1').bind(dayOf(now - 400 * DAY)).run());
      return json(await stats(env, days, now));
    }
    if (path === '/') return html(dashboardPage(Boolean(env.STATS_KEY)));
    return json({ error: 'not found' }, 404);
  },
};

// ── Pages ─────────────────────────────────────────────────────────────
const BASE_CSS = `
:root{--bg:#fff;--soft:#fafafa;--ink:#171717;--mute:#707070;--line:#dfdfdf;--green:#3ecf8e;--green2:#24b47e;--night:#1c1c1c}
@media (prefers-color-scheme:dark){:root{--bg:#1c1c1c;--soft:#232323;--ink:#ededed;--mute:#a0a0a0;--line:#2e2e2e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-weight:500;margin:0;letter-spacing:-.02em}a{color:inherit}
.btn{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit;font-weight:500;font-size:14px;text-decoration:none;cursor:pointer}
.btn.primary{background:var(--green);border-color:var(--green2);color:#171717}
.logo{width:28px;height:28px;border-radius:7px;background:#4f46e5;display:inline-grid;place-items:center;color:#fff;font-weight:600;font-size:14px}`;

function goodbyePage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>FrameShot was removed</title><style>${BASE_CSS}
main{max-width:560px;margin:12vh auto;padding:0 20px;text-align:center}h1{font-size:34px;margin-top:18px}p{color:var(--mute);font-size:17px;margin:14px 0 0}.row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px}small{display:block;margin-top:40px;color:var(--mute);font-size:13px}</style></head>
<body><main><span class="logo">F</span><h1>FrameShot was removed</h1><p>Thanks for trying it. If something didn’t work the way you hoped, a one-line message helps make it better for everyone.</p>
<div class="row"><a class="btn primary" href="${FEEDBACK}" rel="noopener">Send feedback</a><a class="btn" href="${STORE}" rel="noopener">Reinstall FrameShot</a></div>
<small>FrameShot never collected your screenshots or recordings. This page only counted that one install was removed.</small></main></body></html>`;
}

function setupPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FrameShot tracker: setup needed</title><style>${BASE_CSS}main{max-width:620px;margin:10vh auto;padding:0 20px}p{color:var(--mute)}</style></head>
<body><main><h1>Almost there</h1><p>This Worker has no D1 database bound as <code>DB</code>. Create a D1 database, add it under Settings → Bindings with the variable name <code>DB</code>, and reload. The full steps are in <code>server/telemetry/README.md</code>.</p></main></body></html>`;
}

function dashboardPage(needsKey) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>FrameShot tracker</title><style>${BASE_CSS}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
.bar{max-width:1200px;margin:auto;padding:14px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar h1{font-size:17px;display:flex;align-items:center;gap:10px}.bar .sp{flex:1}
.seg{display:flex;padding:3px;border:1px solid var(--line);border-radius:8px;gap:2px}.seg button{height:30px;padding:0 12px;border:0;border-radius:6px;background:none;color:var(--mute);font:inherit;font-size:13px;font-weight:500;cursor:pointer}.seg button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
main{max-width:1200px;margin:auto;padding:24px 20px 60px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{border:1px solid var(--line);border-radius:12px;padding:18px}.tile b{display:block;font-size:30px;font-weight:500;letter-spacing:-.02em;line-height:1.1}.tile span{display:block;margin-top:6px;color:var(--mute);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.card{border:1px solid var(--line);border-radius:12px;padding:20px;min-width:0}.card.wide{grid-column:1/-1}
.card h2{font-size:16px}.card p.note{margin:4px 0 14px;color:var(--mute);font-size:13px}
canvas{max-height:280px}table{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}td{padding:7px 4px;border-bottom:1px solid var(--line)}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.barcell{position:relative}.barcell i{position:absolute;left:0;top:50%;height:6px;margin-top:8px;border-radius:3px;background:var(--green)}
.empty{color:var(--mute);font-size:14px;padding:18px 0}
#login{max-width:420px;margin:14vh auto;padding:0 20px;display:none}#login input{width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit;margin:14px 0}
#err{color:#e11d48;font-size:14px}footer{margin-top:28px;color:var(--mute);font-size:13px;display:flex;gap:14px;flex-wrap:wrap}
@media (max-width:800px){.grid{grid-template-columns:1fr}}
</style></head><body>
<div id="login"><span class="logo">F</span><h1 style="margin-top:14px">FrameShot tracker</h1><p style="color:var(--mute)">Enter the dashboard key (the STATS_KEY secret).</p><input id="key" type="password" autocomplete="current-password" aria-label="Dashboard key"><button class="btn primary" id="go">Open dashboard</button><p id="err"></p></div>
<div id="app" hidden>
<header><div class="bar"><h1><span class="logo">F</span>FrameShot tracker</h1><span class="sp"></span>
<div class="seg" role="group" aria-label="Range"><button data-d="7">7 days</button><button data-d="30">30 days</button><button data-d="90">90 days</button><button data-d="365">1 year</button></div>
<button class="btn" id="refresh" aria-label="Refresh">↻</button></div></header>
<main>
<div class="tiles" id="tiles"></div>
<div class="grid">
<section class="card wide"><h2>Installs, updates and uninstalls</h2><p class="note">Per day (UTC). Reinstalls are installs from an id that had uninstalled before.</p><canvas id="c-series"></canvas></section>
<section class="card"><h2>Still installed after…</h2><p class="note">Share of installs that kept FrameShot at least this long (only installs old enough to tell).</p><div id="retention"></div></section>
<section class="card"><h2>How long before uninstalling</h2><p class="note">For installs that were removed.</p><canvas id="c-life"></canvas></section>
<section class="card"><h2>Countries</h2><p class="note">Active installs, from Cloudflare’s country code. IP addresses are never stored.</p><div id="countries"></div></section>
<section class="card"><h2>Operating systems</h2><p class="note">Active installs.</p><div id="platforms"></div></section>
<section class="card"><h2>Versions</h2><p class="note">Active installs.</p><div id="versions"></div></section>
<section class="card"><h2>Browser languages</h2><p class="note">Active installs.</p><div id="languages"></div></section>
<section class="card wide" id="usage-card"><h2>Feature usage</h2><div id="usage"></div></section>
</div>
<footer><span id="updated"></span><a href="#" id="forget">Forget key</a><span>Anonymous: a random install id, version, OS, language and country. Nothing about pages, screenshots or recordings.</span></footer>
</main></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>
const NEEDS_KEY=${needsKey ? 'true' : 'false'};
const $=(s)=>document.querySelector(s);let days=Number(localStorage.getItem('fs-days'))||30;const charts={};
const OS={win:'Windows',mac:'macOS',linux:'Linux',cros:'ChromeOS',other:'Other'};
const regionName=(()=>{try{const d=new Intl.DisplayNames(['en'],{type:'region'});return (c)=>c==='XX'?'Unknown':(d.of(c)||c)}catch(e){return (c)=>c}})();
const langName=(()=>{try{const d=new Intl.DisplayNames(['en'],{type:'language'});return (c)=>c==='other'?'Other':(d.of(c)||c)}catch(e){return (c)=>c}})();
const fmt=(n)=>n==null?'–':Number(n).toLocaleString('en-US');
const css=(v)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function key(){return localStorage.getItem('fs-key')||''}
async function load(){
  const r=await fetch('/api/stats?days='+days,{headers:{'x-stats-key':key()}});
  if(r.status===401){showLogin(key()?'That key didn’t work.':'');return}
  const s=await r.json();$('#login').style.display='none';$('#app').hidden=false;render(s);
}
function showLogin(msg){$('#app').hidden=true;$('#login').style.display='block';$('#err').textContent=msg||'';$('#key').focus()}
function tile(v,label){return '<div class="tile"><b>'+v+'</b><span>'+label+'</span></div>'}
function list(el,rows,name){const max=Math.max(1,...rows.map(r=>r.n));$(el).innerHTML=rows.length?'<table>'+rows.map(r=>'<tr><td class="barcell">'+name(r.k)+'<i style="width:'+Math.round(100*r.n/max)+'%"></i></td><td>'+fmt(r.n)+'</td></tr>').join('')+'</table>':'<p class="empty">No data yet.</p>'}
function chart(id,cfg){if(charts[id])charts[id].destroy();if(window.Chart)charts[id]=new Chart(document.getElementById(id),cfg)}
function render(s){
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.d)===days)));
  const t=s.totals;
  $('#tiles').innerHTML=tile(fmt(t.active),'active installs')+tile(fmt(t.newInRange),'new installs, last '+s.days+' days')+tile(fmt(t.goneInRange),'uninstalls, last '+s.days+' days')+tile(fmt(t.installs),'installs, all time')+tile(t.avgKeepDays==null?'–':t.avgKeepDays+' d','average time kept (uninstalled)')+tile(s.retention.day7==null?'–':s.retention.day7+'%','still installed after 7 days');
  const ink=css('--ink'),mute=css('--mute'),line=css('--line');
  window.Chart&&(Chart.defaults.color=mute,Chart.defaults.borderColor=line,Chart.defaults.font.family='Inter, system-ui, sans-serif');
  chart('c-series',{type:'line',data:{labels:s.series.map(r=>r.day.slice(5)),datasets:[
    {label:'Installs',data:s.series.map(r=>r.install),borderColor:'#24b47e',backgroundColor:'rgba(62,207,142,.15)',fill:true,tension:.3,pointRadius:0},
    {label:'Updates',data:s.series.map(r=>r.update),borderColor:mute,borderDash:[4,4],tension:.3,pointRadius:0},
    {label:'Uninstalls',data:s.series.map(r=>r.uninstall),borderColor:ink,tension:.3,pointRadius:0}]},
    options:{responsive:true,interaction:{mode:'index',intersect:false},scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{position:'bottom'}}}});
  chart('c-life',{type:'bar',data:{labels:s.lifeBuckets.map(b=>b.k),datasets:[{label:'Uninstalls',data:s.lifeBuckets.map(b=>b.n),backgroundColor:'#3ecf8e',borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
  const rt=s.retention,cell=(v,b,l)=>'<tr><td>'+l+'</td><td>'+(v==null?'not enough data yet':v+'%')+'</td></tr>';
  $('#retention').innerHTML='<table>'+cell(rt.day1,0,'1 day')+cell(rt.day7,rt.base7,'7 days')+cell(rt.day30,rt.base30,'30 days')+'</table>';
  list('#countries',s.countries,regionName);list('#platforms',s.platforms,(k)=>OS[k]||k);list('#versions',s.versions,(k)=>k||'unknown');list('#languages',s.languages,langName);
  const u=s.usage;$('#usage').innerHTML=u?'<div class="tiles">'+tile(fmt(u.users),'users who sent usage')+tile(fmt(u.sv+u.sf+u.sa+u.se),'screenshots')+tile(fmt(u.sf),'full-page screenshots')+tile(fmt(u.rc),'recordings')+tile(fmt(u.rm),'minutes recorded')+tile(fmt(u.gf),'GIFs')+tile(fmt(u.ex),'exports')+'</div>':'<p class="empty">FrameShot doesn’t send feature usage. Only install, update and uninstall counts are collected. This section fills in if a later version adds feature counts.</p>';
  $('#updated').textContent='Updated '+new Date().toLocaleTimeString();
}
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{days=Number(b.dataset.d);localStorage.setItem('fs-days',days);load()});
$('#refresh').onclick=load;$('#go').onclick=()=>{localStorage.setItem('fs-key',$('#key').value.trim());load()};$('#key').onkeydown=(e)=>{if(e.key==='Enter')$('#go').click()};
$('#forget').onclick=(e)=>{e.preventDefault();localStorage.removeItem('fs-key');showLogin('')};
if(NEEDS_KEY&&!key())showLogin('');else load();setInterval(()=>{if(!$('#app').hidden)load()},120000);
</script></body></html>`;
}
