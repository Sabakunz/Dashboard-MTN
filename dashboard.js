/**
 * dashboard.js  — Maintenance Monitoring
 * Connects the HTML UI to the PostgreSQL backend via:
 *   - REST API  (fetch)
 *   - WebSocket (socket.io) for real-time pushes
 *
 * HOW IT WORKS:
 *   1. loadAll()   fetches all data from the backend on page open
 *   2. Every render function reads STATE and updates the DOM
 *   3. socket.on() events push live changes from the server
 *      (new breakdowns, machine status changes, imports)
 *   4. Form submissions POST to the backend, then reload data
 */

'use strict';

/* ══════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════ */
const API_BASE = 'http://localhost:3001/api';

/* ══════════════════════════════════════════════════
   GLOBAL STATE
══════════════════════════════════════════════════ */
const STATE = {
  machines:    [],
  breakdowns:  [],
  pareto:      [],
  downtime:    [],
  kpi:         {},
  sortKey:     'name',
  sortDir:     1,
  statusFilter:'all',
  sevFilter:   'all',
  notifications: [],
  connected:   false,
  loading:     false,
};

/* ══════════════════════════════════════════════════
   DEMO DATA  (shown when backend is unreachable)
══════════════════════════════════════════════════ */
const DEMO = {
  kpi:{ breakdowns:14, downtime_hrs:37.5, availability:83.2,
        performance:91.4, quality:96.8, oee:73.5, mtbf:18.4, mttr:2.7 },
  machines:[
    {name:'CNC-01',type:'Turning', location:'Bay A',status:'running',    availability:88.4,breakdowns:3,downtime_hrs:8.2, last_incident:'Spindle overheat'},
    {name:'CNC-02',type:'Milling', location:'Bay A',status:'down',       availability:61.2,breakdowns:5,downtime_hrs:14.6,last_incident:'Tool holder broken'},
    {name:'CNC-03',type:'Turning', location:'Bay B',status:'running',    availability:91.5,breakdowns:1,downtime_hrs:3.1, last_incident:'Coolant leak'},
    {name:'CNC-04',type:'Grinding',location:'Bay B',status:'idle',       availability:79.8,breakdowns:2,downtime_hrs:7.4, last_incident:'Belt wear'},
    {name:'CNC-05',type:'Milling', location:'Bay C',status:'maintenance',availability:72.3,breakdowns:3,downtime_hrs:4.2, last_incident:'Scheduled PM'},
    {name:'CNC-06',type:'EDM',     location:'Bay C',status:'running',    availability:95.1,breakdowns:0,downtime_hrs:0.0, last_incident:'—'},
  ],
  breakdowns:[
    {id:1,machine:'CNC-02',cause:'Tool holder broken', severity:'critical',start:'08:15',duration:'4.5 hrs',date:'Today',    status:'open'},
    {id:2,machine:'CNC-01',cause:'Spindle overheat',   severity:'warning', start:'06:30',duration:'1.2 hrs',date:'Today',    status:'resolved'},
    {id:3,machine:'CNC-04',cause:'Belt wear',          severity:'warning', start:'14:00',duration:'2.0 hrs',date:'Yesterday',status:'resolved'},
    {id:4,machine:'CNC-03',cause:'Coolant leak',       severity:'resolved',start:'09:10',duration:'0.8 hrs',date:'Yesterday',status:'resolved'},
    {id:5,machine:'CNC-05',cause:'Scheduled PM',       severity:'resolved',start:'08:00',duration:'4.2 hrs',date:'Monday',  status:'resolved'},
    {id:6,machine:'CNC-01',cause:'Electrical fault',   severity:'critical',start:'11:30',duration:'1.0 hrs',date:'Monday',  status:'resolved'},
    {id:7,machine:'CNC-02',cause:'Tool breakage',      severity:'warning', start:'15:20',duration:'2.0 hrs',date:'Sunday',  status:'resolved'},
  ],
  pareto:[
    {cause:'Tool Wear / Breakage',count:6,pct:42},
    {cause:'Spindle Issues',      count:3,pct:21},
    {cause:'Coolant System',      count:2,pct:14},
    {cause:'Belt / Drive Failure',count:2,pct:14},
    {cause:'Electrical Fault',    count:1,pct:7},
  ],
  downtime:[
    {day:'Mon',hrs:8.2},{day:'Tue',hrs:4.5},{day:'Wed',hrs:12.1},
    {day:'Thu',hrs:3.8},{day:'Fri',hrs:6.4},{day:'Sat',hrs:2.5},{day:'Sun',hrs:0.0},
  ],
};

/* ══════════════════════════════════════════════════
   API LAYER  (fetch with demo fallback)
══════════════════════════════════════════════════ */
async function api(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      signal: AbortSignal.timeout(4000),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return await res.json();
  } catch (err) {
    // Only throw for non-GET (mutations must surface errors)
    if (options.method && options.method !== 'GET') throw err;
    return null; // GET failure → caller uses demo data
  }
}

/* ══════════════════════════════════════════════════
   WEBSOCKET  — real-time events from PostgreSQL via server
══════════════════════════════════════════════════ */
function initSocket() {
  if (typeof io === 'undefined') { setConn(false); return; }

  const socket = io(API_BASE.replace('/api', ''), { timeout: 3000 });

  socket.on('connect', () => {
    setConn(true);
    addNotif('✅ Connected to server — live data active', 'green');
  });

  socket.on('disconnect', () => {
    setConn(false);
    showToast('⚠ Server disconnected — showing last data', 'red');
  });

  socket.on('connect_error', () => setConn(false));

  /* ── Events pushed by the backend ── */

  // New breakdown logged (from any user, any device)
  socket.on('breakdown:new', (data) => {
    // Prepend to local list and update the UI immediately
    STATE.breakdowns.unshift({
      ...data,
      id:   data.id || Date.now(),
      date: data.date || 'Just now',
    });
    renderTimeline(STATE.breakdowns, 'breakdown-timeline', 5);
    // Flash the KPI counter
    flashKPI('kpi-breakdowns');
    addNotif(`⚡ ${data.machine}: ${data.cause}`, 'red');
    showToast(`⚡ Breakdown: ${data.machine} — ${data.cause}`, 'red');
    // Full reload after 2s to get accurate numbers
    setTimeout(loadAll, 2000);
  });

  // Machine status changed (e.g. operator set it to 'down')
  socket.on('machine:status', (data) => {
    const m = STATE.machines.find(x => x.name === data.name);
    if (m) {
      m.status = data.status;
      renderMachineTable(STATE.machines);
      renderMachineSidebar(STATE.machines);
      updateDetailPanel(data.name);
    }
    addNotif(`📡 ${data.name} → ${data.status}`, data.status === 'down' ? 'red' : 'yellow');
  });

  // Breakdown resolved
  socket.on('breakdown:resolved', () => setTimeout(loadAll, 1000));

  // File imported → reload everything
  socket.on('data:imported', (info) => {
    showToast(`✅ Imported ${info.imported} records`, 'green');
    setTimeout(loadAll, 800);
  });
}

function setConn(on) {
  STATE.connected = on;
  const dot = $('connDot'), lbl = $('connLabel');
  dot.className = 'conn-dot' + (on ? '' : ' off');
  lbl.textContent = on ? '● Live' : '○ Demo mode';
  $('errorBanner').classList.toggle('show', !on);
}

/* ══════════════════════════════════════════════════
   LOAD ALL DATA FROM BACKEND
══════════════════════════════════════════════════ */
async function loadAll() {
  if (STATE.loading) return;
  STATE.loading = true;
  const period = $('periodSelect').value;
  const lu     = $('lastUpdate');
  lu.textContent = 'Updating…';

  const [kpi, machines, breakdowns, pareto, downtime] = await Promise.all([
    api(`/kpi?period=${period}`),
    api(`/machines?period=${period}`),
    api(`/breakdowns?period=${period}`),
    api(`/pareto?period=${period}`),
    api(`/downtime?period=${period}`),
  ]);

  // Use backend data if available, else demo
  STATE.kpi        = kpi        || DEMO.kpi;
  STATE.machines   = machines   || DEMO.machines;
  STATE.breakdowns = breakdowns || DEMO.breakdowns;
  STATE.pareto     = pareto     || DEMO.pareto;
  STATE.downtime   = downtime   || DEMO.downtime;

  // Tell user if we fell back to demo
  if (!kpi) showToast('Running in demo mode — backend not connected', 'red', 4000);

  renderKPIs(STATE.kpi);
  renderOEE(STATE.kpi);
  renderMachineTable(STATE.machines);
  renderMachineSidebar(STATE.machines);
  renderTimeline(STATE.breakdowns, 'breakdown-timeline', 5);
  renderPareto(STATE.pareto);
  renderTrendChart(STATE.downtime);
  populateMachineDropdown(STATE.machines);

  lu.textContent = 'Updated ' + new Date().toLocaleTimeString();
  STATE.loading = false;
}

/* ══════════════════════════════════════════════════
   RENDER KPIs  (animated counter)
══════════════════════════════════════════════════ */
function animateNumber(el, target, decimals = 0) {
  const start = parseFloat(el.textContent) || 0;
  const steps = 24, dur = 600;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const val = start + (target - start) * (step / steps);
    el.textContent = val.toFixed(decimals);
    if (step >= steps) { el.textContent = target.toFixed(decimals); clearInterval(timer); }
  }, dur / steps);
}

function renderKPIs(d) {
  const fields = [
    ['kpi-breakdowns', d.breakdowns,   0],
    ['kpi-downtime',   d.downtime_hrs, 1],
    ['kpi-availability',d.availability,1],
    ['kpi-performance', d.performance, 1],
    ['kpi-oee',         d.oee,         1],
  ];
  fields.forEach(([id, val, dec]) => {
    const el = $(id); if (el && val != null) animateNumber(el, val, dec);
  });
  colorTrend('kpi-av-trend',  d.availability, 90,  `${d.availability?.toFixed(1)}% · target 90%`);
  colorTrend('kpi-pf-trend',  d.performance,  95,  `${d.performance?.toFixed(1)}% · target 95%`);
  colorTrend('kpi-oee-trend', d.oee,          85,  `${d.oee?.toFixed(1)}% · world class 85%`);
  setText('kpi-dt-trend',  `${d.downtime_hrs?.toFixed(1)} hrs`);
  setText('kpi-bd-trend',  `${d.breakdowns} events`);
  setText('sb-breakdown-count', d.breakdowns);
  setText('sb-bd-mobile', d.breakdowns);
  // Bottom nav alert dot
  const bn = document.querySelector('.bn-item[data-page="maintenance"]');
  if (bn) bn.classList.toggle('has-alert', d.breakdowns > 0);
}

function flashKPI(id) {
  const el = $(id); if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
}

function colorTrend(id, val, target, text) {
  const el = $(id); if (!el) return;
  el.textContent = text;
  el.className = 'kpi-trend ' + (val >= target ? 'up' : 'down');
}

/* ══════════════════════════════════════════════════
   OEE GAUGE  (canvas arc)
══════════════════════════════════════════════════ */
function renderOEE(d) {
  const av = d.availability ?? 0, pf = d.performance ?? 0, ql = d.quality ?? 0, oee = d.oee ?? 0;
  setText('oeeGaugePct', oee.toFixed(0) + '%');
  ['av', 'pf', 'ql'].forEach((k, i) => {
    const v = [av, pf, ql][i];
    setText(`oee-${k}`,     v.toFixed(1) + '%');
    const bar = $(`oee-${k}-bar`); if (bar) bar.style.width = v + '%';
  });
  setText('mtbf-val', (d.mtbf ?? '—') + ' h');
  setText('mttr-val', (d.mttr ?? '—') + ' h');
  drawGauge(oee / 100);
}

function drawGauge(fraction) {
  const canvas = $('oeeCanvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 65, cy = 68, r = 50, s = Math.PI * .75, e = Math.PI * 2.25;
  ctx.clearRect(0, 0, 130, 130);
  const color = fraction >= .85 ? '#00d084' : fraction >= .65 ? '#f0a500' : '#ff4455';
  // track
  ctx.beginPath(); ctx.arc(cx, cy, r, s, e);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
  // value arc
  ctx.beginPath(); ctx.arc(cx, cy, r, s, s + fraction * (e - s));
  ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.stroke();
  // tick marks
  for (let i = 0; i <= 10; i++) {
    const a = s + (i / 10) * (e - s);
    ctx.beginPath();
    ctx.moveTo(cx + (r-13)*Math.cos(a), cy + (r-13)*Math.sin(a));
    ctx.lineTo(cx + (r-7) *Math.cos(a), cy + (r-7) *Math.sin(a));
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  }
  const el = $('oeeGaugePct'); if (el) el.style.color = color;
}

/* ══════════════════════════════════════════════════
   MACHINE TABLE  (sortable + searchable)
══════════════════════════════════════════════════ */
function renderMachineTable(machines) {
  setText('machine-count', `${machines.length} machines monitored`);
  applySort(machines, 'machine-tbody', 7);
}

function applySort(machines, tbodyId, cols) {
  const q = ($('machineSearch')?.value || '').toLowerCase();
  let data = machines.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)
  );
  data.sort((a, b) => {
    const av = a[STATE.sortKey] ?? '', bv = b[STATE.sortKey] ?? '';
    return STATE.sortDir * (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv)));
  });
  const tbody = $(tbodyId);
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:20px;color:var(--muted)">No machines found</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => {
    const av = m.availability ?? 0;
    const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
    return `<tr onclick="showMachineDetail('${m.name}')">
      <td><strong style="font-size:12px">${m.name}</strong></td>
      <td style="color:var(--muted)">${m.type}</td>
      <td><span class="status-pill ${m.status}"><span class="status-dot"></span>${m.status}</span></td>
      <td>
        <span style="font-family:var(--mono);font-size:11px">${av.toFixed(1)}%</span>
        <span class="pct-bar"><span class="pct-fill" style="width:${av}%;background:${bc}"></span></span>
      </td>
      <td style="font-family:var(--mono);color:${m.breakdowns > 3 ? 'var(--red)' : 'var(--text)'}">${m.breakdowns}</td>
      <td style="font-family:var(--mono)">${parseFloat(m.downtime_hrs || 0).toFixed(1)}</td>
      <td style="color:var(--muted);font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.last_incident || '—'}</td>
    </tr>`;
  }).join('');
}

function sortBy(key) {
  STATE.sortDir = STATE.sortKey === key ? -STATE.sortDir : 1;
  STATE.sortKey = key;
  document.querySelectorAll('.machine-table th').forEach(th => th.classList.remove('sorted'));
  document.querySelectorAll(`.machine-table th[data-sort="${key}"]`).forEach(th => th.classList.add('sorted'));
  applySort(STATE.machines, 'machine-tbody', 7);
}

function filterMachineTable() { applySort(STATE.machines, 'machine-tbody', 7); }

/* Machines full page */
function renderMachinesFull() {
  const q  = ($('mSearchFull')?.value || '').toLowerCase();
  const sf = STATE.statusFilter;
  let data = STATE.machines.filter(m =>
    (!q || m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)) &&
    (sf === 'all' || m.status === sf)
  );
  const tbody = $('machine-full-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted)">No machines match</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(m => {
    const av = m.availability ?? 0;
    const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
    return `<tr onclick="showMachineDetail('${m.name}')">
      <td><strong>${m.name}</strong><div style="font-size:10px;color:var(--muted)">${m.location || ''}</div></td>
      <td style="color:var(--muted)">${m.type}</td>
      <td><span class="status-pill ${m.status}"><span class="status-dot"></span>${m.status}</span></td>
      <td>
        <span style="font-family:var(--mono);font-size:11px">${av.toFixed(1)}%</span>
        <span class="pct-bar"><span class="pct-fill" style="width:${av}%;background:${bc}"></span></span>
      </td>
      <td style="font-family:var(--mono)">${m.breakdowns}</td>
      <td style="font-family:var(--mono)">${parseFloat(m.downtime_hrs || 0).toFixed(1)}</td>
      <td><button class="btn" style="padding:3px 8px;font-size:11px"
          onclick="event.stopPropagation();showMachineDetail('${m.name}')">Details</button></td>
    </tr>`;
  }).join('');
}

function setStatusFilter(el) {
  document.querySelectorAll('[data-sf]').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  STATE.statusFilter = el.dataset.sf;
  renderMachinesFull();
}

/* ══════════════════════════════════════════════════
   MACHINE DETAIL SIDE PANEL
══════════════════════════════════════════════════ */
function showMachineDetail(name) {
  const m = STATE.machines.find(x => x.name === name);
  if (!m) return;
  const panel = $('detailPanel');
  setText('dpName', m.name);
  setText('dpType', m.type + (m.location ? ' · ' + m.location : ''));
  const av  = m.availability ?? 0;
  const col = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
  const relBDs = STATE.breakdowns.filter(b => b.machine === name);

  $('dpBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="detail-stat"><div class="detail-stat-val" style="color:${col}">${av.toFixed(1)}%</div><div class="detail-stat-lbl">Availability</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${m.breakdowns}</div><div class="detail-stat-lbl">Breakdowns</div></div>
      <div class="detail-stat"><div class="detail-stat-val" style="color:${m.status==='running'?'var(--green)':m.status==='down'?'var(--red)':'var(--yellow)'}">${m.status}</div><div class="detail-stat-lbl">Status</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${parseFloat(m.downtime_hrs||0).toFixed(1)}h</div><div class="detail-stat-lbl">Downtime</div></div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;color:var(--muted)">Recent Events</div>
      ${relBDs.length
        ? relBDs.slice(0, 4).map(b => `
          <div style="display:flex;justify-content:space-between;font-size:12px;padding:7px 0;border-bottom:1px solid var(--border)">
            <span>${b.cause}</span>
            <span style="color:var(--muted);font-family:var(--mono)">${b.duration}</span>
          </div>`).join('')
        : '<div style="color:var(--muted);font-size:12px">No recent events</div>'}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" onclick="setMachineStatus('${name}','running')" style="flex:1;padding:10px">▶ Running</button>
      <button class="btn danger"  onclick="setMachineStatus('${name}','down')"    style="flex:1;padding:10px">■ Down</button>
      <button class="btn"         onclick="setMachineStatus('${name}','maintenance')" style="flex:1;padding:10px">🔧 PM</button>
    </div>`;
  panel.classList.add('show');
}

function closeDetailPanel() { $('detailPanel').classList.remove('show'); }

function updateDetailPanel(name) {
  if ($('detailPanel').classList.contains('show') && $('dpName')?.textContent === name) {
    showMachineDetail(name);
  }
}

/* Update status → PATCH /api/machines/:code/status → WebSocket broadcasts back */
async function setMachineStatus(name, status) {
  try {
    showToast(`Updating ${name}…`, 'green');
    await api(`/machines/${name}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    // Optimistic local update (WebSocket will confirm)
    const m = STATE.machines.find(x => x.name === name);
    if (m) m.status = status;
    renderMachineTable(STATE.machines);
    renderMachineSidebar(STATE.machines);
    showMachineDetail(name);
    showToast(`${name} → ${status}`, status === 'down' ? 'red' : 'green');
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'red');
  }
}

/* ══════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════ */
function renderMachineSidebar(machines) {
  const html = machines.map(m => `
    <div class="sb-item" onclick="showMachineDetail('${m.name}')">
      <span class="sb-icon">⚙</span>${m.name}
      <span class="machine-status ${m.status}"></span>
    </div>`).join('');
  setHTML('machine-sidebar',     html);
  setHTML('drawer-machine-list', html);
}

/* ══════════════════════════════════════════════════
   BREAKDOWN TIMELINE
══════════════════════════════════════════════════ */
function renderTimeline(breakdowns, containerId, limit = 999, animate = false) {
  const el = $(containerId); if (!el) return;
  const data = breakdowns.slice(0, limit);
  if (!data.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px">No events</div>';
    return;
  }
  el.innerHTML = data.map((b, i) => `
    <div class="tl-item${animate && i === 0 ? ' new' : ''}">
      <div class="tl-dot ${b.status === 'open' ? 'critical' : b.severity}"></div>
      <div class="tl-content">
        <div class="tl-title">${b.machine} — ${b.cause}</div>
        <div class="tl-meta">${b.date} · ${b.start}
          ${b.status === 'open' ? '<span class="tl-open"> ● OPEN</span>' : ''}
        </div>
      </div>
      <div class="tl-duration">${b.duration}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   MAINTENANCE PAGE
══════════════════════════════════════════════════ */
async function renderMaintenancePage() {
  // Try to get live summary from backend
  const summary = await api('/maintenance/summary');
  if (summary) {
    setText('m-open',     summary.open_count);
    setText('m-resolved', summary.resolved_week);
    setText('m-mttr',     summary.avg_repair_hrs ? summary.avg_repair_hrs + ' h' : '—');
  } else {
    const bds = STATE.breakdowns;
    setText('m-open',     bds.filter(b => b.status === 'open').length);
    setText('m-resolved', bds.filter(b => b.status === 'resolved').length);
    setText('m-mttr',     STATE.kpi.mttr ? STATE.kpi.mttr + ' h' : '—');
  }
  applyLogFilter();
}

async function applyLogFilter() {
  const search   = $('mSearchLog')?.value || '';
  const severity = STATE.sevFilter;

  // Try live filtered query from backend
  const params = new URLSearchParams();
  if (search)                params.set('search', search);
  if (severity !== 'all')    params.set('severity', severity);

  const data = await api(`/maintenance/log?${params}`) || STATE.breakdowns.filter(b => {
    const ms = !search || b.machine.toLowerCase().includes(search.toLowerCase()) || b.cause.toLowerCase().includes(search.toLowerCase());
    const ss = severity === 'all' || (severity === 'resolved' ? b.status === 'resolved' : b.severity === severity);
    return ms && ss;
  });

  renderTimeline(data, 'full-timeline');
}

function setSeverityFilter(el) {
  document.querySelectorAll('[data-sv]').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  STATE.sevFilter = el.dataset.sv;
  applyLogFilter();
}

/* ══════════════════════════════════════════════════
   PARETO CHART
══════════════════════════════════════════════════ */
function renderPareto(pareto) {
  const el = $('pareto-list'); if (!el) return;
  const maxPct = Math.max(...pareto.map(p => p.pct));
  el.innerHTML = pareto.map((p, i) => `
    <div class="pareto-row" onclick="showToast('${p.cause}: ${p.count}x (${p.pct}%)','green')">
      <div class="pareto-rank">${i + 1}</div>
      <div class="pareto-name">${p.cause}</div>
      <div class="pareto-bar-wrap">
        <div class="pareto-bar-fill" style="width:${(p.pct / maxPct) * 100}%"></div>
      </div>
      <div class="pareto-pct">${p.pct}%</div>
      <div class="pareto-count">${p.count}x</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   TREND LINE CHART  (Canvas)
══════════════════════════════════════════════════ */
function renderTrendChart(days) {
  if (!days?.length) return;
  const canvas = $('trendCanvas');
  const W = canvas.parentElement.offsetWidth || 360;
  canvas.width = W; canvas.height = 110;
  const ctx = canvas.getContext('2d');
  const pad = { t: 8, b: 4, l: 4, r: 4 };
  const iW = W - pad.l - pad.r, iH = 110 - pad.t - pad.b;
  const vals = days.map(d => d.hrs), maxV = Math.max(...vals, 1);
  const xOf = i => pad.l + (i / (days.length - 1)) * iW;
  const yOf = v => pad.t + (1 - v / maxV) * iH;

  ctx.clearRect(0, 0, W, 110);
  // grid
  for (let i = 0; i < 4; i++) {
    const y = pad.t + iH * (i / 3);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // fill
  const g = ctx.createLinearGradient(0, pad.t, 0, 110);
  g.addColorStop(0, 'rgba(68,136,255,.3)'); g.addColorStop(1, 'rgba(68,136,255,0)');
  ctx.beginPath(); ctx.moveTo(xOf(0), 110);
  for (let i = 0; i < vals.length; i++) {
    if (i === 0) ctx.lineTo(xOf(0), yOf(vals[0]));
    else { const cx = (xOf(i) + xOf(i-1)) / 2; ctx.bezierCurveTo(cx, yOf(vals[i-1]), cx, yOf(vals[i]), xOf(i), yOf(vals[i])); }
  }
  ctx.lineTo(xOf(vals.length-1), 110); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  // line
  ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#4488ff'; ctx.lineCap = 'round';
  for (let i = 0; i < vals.length; i++) {
    if (i === 0) ctx.moveTo(xOf(0), yOf(vals[0]));
    else { const cx = (xOf(i) + xOf(i-1)) / 2; ctx.bezierCurveTo(cx, yOf(vals[i-1]), cx, yOf(vals[i]), xOf(i), yOf(vals[i])); }
  }
  ctx.stroke();
  // dots
  vals.forEach((v, i) => {
    ctx.beginPath(); ctx.arc(xOf(i), yOf(v), 3.5, 0, Math.PI*2);
    ctx.fillStyle = '#4488ff'; ctx.fill();
    ctx.strokeStyle = 'var(--bg, #09090c)'; ctx.lineWidth = 1.5; ctx.stroke();
  });
  // x-axis labels
  setHTML('trendXAxis', days.map(d => `<span>${d.day}</span>`).join(''));

  // Interactive tooltip (mouse + touch)
  const tip = $('trendTip');
  const showTip = (clientX, rect) => {
    const mx = (clientX - rect.left) * (W / rect.width);
    let cl = 0, mn = 9999;
    vals.forEach((_, i) => { const d = Math.abs(mx - xOf(i)); if (d < mn) { mn = d; cl = i; } });
    if (mn < 36) {
      tip.style.display = 'block';
      tip.style.left    = Math.min(xOf(cl), W - 90) + 'px';
      tip.style.top     = (yOf(vals[cl]) - 30) + 'px';
      tip.textContent   = `${days[cl].day}: ${vals[cl].toFixed(1)} hrs`;
    } else { tip.style.display = 'none'; }
  };
  canvas.onmousemove  = e => showTip(e.clientX, canvas.getBoundingClientRect());
  canvas.onmouseleave = () => tip.style.display = 'none';
  canvas.ontouchmove  = e => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
  canvas.ontouchend   = () => setTimeout(() => tip.style.display = 'none', 1800);
}

/* ══════════════════════════════════════════════════
   LOG BREAKDOWN FORM
   POST → /api/breakdowns → triggers WebSocket push
══════════════════════════════════════════════════ */
function populateMachineDropdown(machines) {
  const sel = $('bd-machine'); if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Select machine…</option>' +
    machines.map(m => `<option value="${m.name}">${m.name} (${m.type})</option>`).join('');
  if (cur) sel.value = cur;
  const di = $('bd-date'); if (di && !di.value) di.value = new Date().toISOString().slice(0, 10);
}

async function submitBreakdown() {
  const machine = $('bd-machine').value;
  const cause   = $('bd-cause').value.trim();

  // Validation
  $('err-m').textContent = machine ? '' : 'Required';
  $('err-c').textContent = cause   ? '' : 'Required';
  $('bd-machine').classList.toggle('error', !machine);
  $('bd-cause').classList.toggle('error', !cause);
  if (!machine || !cause) return;

  const btn = $('bd-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  const payload = {
    machine_code:      machine,
    breakdown_date:    $('bd-date').value,
    start_time:        $('bd-start').value  || null,
    end_time:          $('bd-end').value    || null,
    failure_cause:     cause,
    failure_category:  $('bd-cat').value,
    severity:          $('bd-sev').value,
    technician:        $('bd-tech').value,
    notes:             $('bd-notes').value,
  };

  try {
    await api('/breakdowns', { method: 'POST', body: JSON.stringify(payload) });
    showToast(`✅ Breakdown logged: ${machine}`, 'green');
    addNotif(`⚡ ${machine}: ${cause}`, 'red');
    closeModal('addBreakdownModal');
    // Clear form
    ['bd-machine','bd-cause','bd-tech','bd-notes','bd-start','bd-end'].forEach(id => {
      const el = $(id); if (el) el.value = '';
    });
    setTimeout(loadAll, 600);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'red');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Breakdown';
  }
}

/* ══════════════════════════════════════════════════
   CSV IMPORT  →  POST /api/import  (multipart)
══════════════════════════════════════════════════ */
let importedFile = null;

function handleFileImport(input) {
  importedFile = input.files[0];
  if (!importedFile) return;
  $('dropText').textContent = `✅ ${importedFile.name}`;
  $('importBtn').disabled = false;
}

async function submitImport() {
  if (!importedFile) { showToast('Select a file first', 'red'); return; }
  const btn = $('importBtn');
  btn.disabled = true; btn.textContent = 'Importing…';

  try {
    const fd = new FormData();
    fd.append('file', importedFile);
    const res = await fetch(`${API_BASE}/import`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`✅ Imported ${data.imported} records${data.skipped ? ` (${data.skipped} skipped)` : ''}`, 'green');
    addNotif(`📥 Imported ${data.imported} records from ${importedFile.name}`, 'green');
    closeModal('importModal');
    setTimeout(loadAll, 800);
  } catch (err) {
    showToast(`Import failed: ${err.message}`, 'red');
  } finally {
    btn.disabled = false; btn.textContent = 'Import';
    importedFile = null;
  }
}

// Drag and drop
const dz = $('dropZone');
if (dz) {
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (!f) return;
    try { const dt = new DataTransfer(); dt.items.add(f); $('fileInput').files = dt.files; }
    catch {}
    handleFileImport({ files: [f] });
  });
}

/* ══════════════════════════════════════════════════
   OEE DETAIL MODAL
══════════════════════════════════════════════════ */
function openOEEModal() {
  const d = STATE.kpi;
  setHTML('oeeDetailContent', `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="detail-stat"><div class="detail-stat-val" style="color:var(--blue)">${d.availability?.toFixed(1)}%</div><div class="detail-stat-lbl">Availability</div></div>
      <div class="detail-stat"><div class="detail-stat-val" style="color:var(--purple)">${d.performance?.toFixed(1)}%</div><div class="detail-stat-lbl">Performance</div></div>
      <div class="detail-stat"><div class="detail-stat-val" style="color:var(--green)">${d.quality?.toFixed(1)}%</div><div class="detail-stat-lbl">Quality</div></div>
    </div>
    <div style="background:var(--s2);border-radius:8px;padding:12px;margin-bottom:14px;font-family:var(--mono);font-size:13px">
      ${d.availability?.toFixed(1)}% × ${d.performance?.toFixed(1)}% × ${d.quality?.toFixed(1)}%
      = <span style="color:var(--accent);font-weight:700">${d.oee?.toFixed(1)}%</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div class="detail-stat"><div class="detail-stat-val">${d.mtbf ?? '—'} h</div><div class="detail-stat-lbl">MTBF</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${d.mttr ?? '—'} h</div><div class="detail-stat-lbl">MTTR</div></div>
    </div>
    <div style="background:var(--s2);border-radius:8px;padding:11px;font-size:11.5px;margin-bottom:16px">
      <div style="margin-bottom:5px;font-weight:600">OEE Benchmark</div>
      <span style="color:var(--green)">● ≥85% World Class &nbsp;</span>
      <span style="color:var(--yellow)">● 65–84% Good &nbsp;</span>
      <span style="color:var(--red)">● &lt;65% Needs Work</span>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal('oeeModal')">Close</button></div>
  `);
  openModal('oeeModal');
}

/* ══════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════ */
function navigate(page) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(el => el.classList.remove('active'));
  const pEl = $('page-' + page); if (pEl) pEl.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));
  // Update bottom nav
  document.querySelectorAll('.bn-item').forEach(el => el.classList.remove('active'));
  const bn = document.querySelector(`.bn-item[data-page="${page}"]`); if (bn) bn.classList.add('active');
  closeDetailPanel();
  $('mainContent').scrollTo(0, 0);
  if (page === 'machines')    renderMachinesFull();
  if (page === 'maintenance') renderMaintenancePage();
}

/* ══════════════════════════════════════════════════
   DRAWER (mobile sidebar)
══════════════════════════════════════════════════ */
function toggleDrawer() { $('mobileDrawer').classList.toggle('show'); }

/* ══════════════════════════════════════════════════
   MODALS
══════════════════════════════════════════════════ */
function openModal(id)  { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    $('notifPanel').classList.remove('show');
    closeDetailPanel();
  }
});

/* ══════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════ */
function addNotif(text, color = 'yellow') {
  STATE.notifications.unshift({ text, color, time: new Date(), unread: true });
  renderNotifications();
  const badge = $('notifBadge');
  const count = STATE.notifications.filter(n => n.unread).length;
  badge.textContent = count;
  badge.style.display = count ? 'inline-block' : 'none';
}

function renderNotifications() {
  const list = $('notifList');
  if (!STATE.notifications.length) {
    list.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:12px">No notifications</div>';
    return;
  }
  list.innerHTML = STATE.notifications.slice(0, 12).map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-dot ${n.color}"></div>
      <div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${relTime(n.time)}</div>
      </div>
    </div>`).join('');
}

function toggleNotifications() {
  const p = $('notifPanel'); p.classList.toggle('show');
  if (p.classList.contains('show')) {
    STATE.notifications.forEach(n => n.unread = false);
    renderNotifications();
    $('notifBadge').style.display = 'none';
  }
}

function clearNotifications() { STATE.notifications = []; renderNotifications(); }

function relTime(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago';
}

document.addEventListener('click', e => {
  const p = $('notifPanel');
  if (p.classList.contains('show') && !p.contains(e.target) && !e.target.closest('.notif-btn'))
    p.classList.remove('show');
});

/* ══════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════ */
function showToast(msg, type = 'green', duration = 3200) {
  const c = $('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast-item';
  t.style.borderLeft = `3px solid ${type === 'red' ? 'var(--red)' : 'var(--green)'}`;
  t.textContent = msg;
  t.onclick = () => removeToast(t);
  c.appendChild(t);
  setTimeout(() => removeToast(t), duration);
}

function removeToast(t) {
  t.classList.add('out');
  setTimeout(() => t.remove(), 200);
}

/* ══════════════════════════════════════════════════
   REPORTS / EXPORT
══════════════════════════════════════════════════ */
function generateReport(type) {
  const names = { oee:'OEE Summary', breakdown:'Breakdown Analysis', pm:'PM Schedule' };
  showToast(`📊 Generating ${names[type] || type}…`, 'green');
  setTimeout(() => showToast(`✅ ${names[type]} ready — connect backend for PDF export`, 'green'), 1400);
}

function exportCSV() {
  const rows = [
    ['Machine','Type','Status','Availability%','Breakdowns','Downtime hrs','Last Incident'],
    ...STATE.machines.map(m => [
      m.name, m.type, m.status,
      m.availability?.toFixed(1),
      m.breakdowns,
      parseFloat(m.downtime_hrs || 0).toFixed(1),
      `"${m.last_incident || '—'}"`,
    ]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const a   = document.createElement('a');
  a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `cnc-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  showToast('✅ CSV downloaded', 'green');
}

/* ══════════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════════ */
function updateClock() {
  const now = new Date();
  setText('clockLabel',
    now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) +
    ' ' + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
  );
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════════════
   RESIZE: redraw canvas
══════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  if (STATE.downtime.length) renderTrendChart(STATE.downtime);
});

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
const $       = id => document.getElementById(id);
const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
const setHTML = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

/* ══════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  loadAll();
  setInterval(loadAll, 30_000); // auto-refresh every 30s

  // Seed initial notifications
  setTimeout(() => {
    addNotif('🚀 Dashboard started — loading data from PostgreSQL', 'green');
  }, 500);
});