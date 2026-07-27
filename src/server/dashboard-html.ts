// Auto-inlined at build time — edit here then run npm run build
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CostClaw — LLM Cost Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"><\/script>
  <style>
    :root {
      --bg-base:    #080b11;
      --bg-surface: #0f1420;
      --bg-raised:  #151b28;
      --bg-hover:   #1c2333;
      --border:     #1e2d45;
      --border-dim: #162033;
      --text-primary:   #e8edf5;
      --text-secondary: #7a8ba3;
      --text-dim:       #3f5168;
      --accent:   #3b82f6;
      --accent-dim: rgba(59,130,246,0.12);
      --green:    #22c55e;
      --green-dim: rgba(34,197,94,0.12);
      --amber:    #f59e0b;
      --amber-dim: rgba(245,158,11,0.12);
      --red:      #ef4444;
      --red-dim:  rgba(239,68,68,0.12);
      --purple:   #a855f7;
      --purple-dim: rgba(168,85,247,0.12);
      --teal:     #14b8a6;
      --orange:   #f97316;
      --radius:   10px;
      --radius-sm: 6px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Topbar ── */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      height: 56px;
      background: rgba(8,11,17,0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .topbar-left { display: flex; align-items: center; gap: 20px; }
    .logo { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; letter-spacing: -0.03em; color: var(--text-primary); }
    .logo-icon { width: 28px; height: 28px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 15px; }
    .tab-group { display: flex; gap: 2px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px; }
    .tab { padding: 5px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; border: none; background: none; }
    .tab:hover { color: var(--text-primary); }
    .tab.active { background: var(--bg-hover); color: var(--text-primary); }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .refresh-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
    .refresh-btn:hover { color: var(--text-primary); border-color: var(--accent); }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); }
    .last-update { font-size: 11px; color: var(--text-dim); }

    /* ── Layout ── */
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .section { margin-bottom: 24px; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.07em; }

    /* ── KPI Cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
    }
    @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 640px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.15s;
    }
    .kpi-card:hover { border-color: #2a3f5c; }
    .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
    .kpi-card.c-green::before  { background: var(--green); }
    .kpi-card.c-blue::before   { background: var(--accent); }
    .kpi-card.c-amber::before  { background: var(--amber); }
    .kpi-card.c-purple::before { background: var(--purple); }
    .kpi-card.c-teal::before   { background: var(--teal); }
    .kpi-card.c-orange::before { background: var(--orange); }
    .kpi-label { font-size: 11px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
    .kpi-value { font-size: 26px; font-weight: 700; letter-spacing: -0.04em; color: var(--text-primary); line-height: 1; }
    .kpi-value.money { color: var(--green); }
    .kpi-meta { margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .delta { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
    .delta.up   { color: var(--red);   background: var(--red-dim); }
    .delta.down { color: var(--green); background: var(--green-dim); }
    .delta.neu  { color: var(--text-secondary); background: var(--bg-hover); }
    .kpi-sub { font-size: 11px; color: var(--text-dim); }

    /* ── Charts grid ── */
    .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }
    .chart-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .chart-card h3 { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
    .chart-wrap { position: relative; }
    .chart-wrap canvas { width: 100% !important; }

    /* ── Tables ── */
    .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .table-card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-dim); }
    .table-card-header h3 { font-size: 13px; font-weight: 600; color: var(--text-primary); }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 10px 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); text-align: left; border-bottom: 1px solid var(--border-dim); cursor: pointer; user-select: none; white-space: nowrap; }
    thead th:hover { color: var(--text-secondary); }
    thead th.sort-asc::after  { content: ' ↑'; opacity: 0.7; }
    thead th.sort-desc::after { content: ' ↓'; opacity: 0.7; }
    tbody tr { border-bottom: 1px solid var(--border-dim); transition: background 0.1s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--bg-hover); }
    tbody td { padding: 11px 20px; font-size: 13px; color: var(--text-primary); vertical-align: middle; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }
    .text-right { text-align: right; }
    .text-dim { color: var(--text-secondary); }

    /* ── Progress bar (inline) ── */
    .bar-wrap { display: flex; align-items: center; gap: 8px; }
    .bar-bg { flex: 1; height: 4px; background: var(--bg-hover); border-radius: 2px; min-width: 60px; }
    .bar-fill { height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.4s ease; }
    .bar-pct { font-size: 11px; color: var(--text-secondary); min-width: 32px; text-align: right; }

    /* ── Trigger breakdown ── */
    .trigger-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
    .trigger-row { display: flex; align-items: center; gap: 12px; }
    .trigger-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .trigger-label { font-size: 13px; color: var(--text-primary); min-width: 130px; }
    .trigger-bar-wrap { flex: 1; height: 6px; background: var(--bg-hover); border-radius: 3px; }
    .trigger-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .trigger-cost { font-size: 13px; color: var(--text-primary); font-weight: 600; min-width: 72px; text-align: right; }
    .trigger-tokens { font-size: 11px; color: var(--text-dim); min-width: 68px; text-align: right; }

    /* ── Recommendations ── */
    .recs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
    .rec-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); display: flex; overflow: hidden; }
    .rec-stripe { width: 4px; flex-shrink: 0; }
    .rec-body { padding: 16px; flex: 1; }
    .rec-title { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    .rec-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
    .rec-savings { margin-top: 10px; font-size: 12px; font-weight: 600; color: var(--green); }

    /* ── Two-column bottom ── */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 900px) { .bottom-grid { grid-template-columns: 1fr; } }

    /* ── Empty states ── */
    .empty { padding: 40px 20px; text-align: center; color: var(--text-dim); font-size: 13px; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #2a3f5c; }

    /* ── Footer ── */
    footer { text-align: center; padding: 20px; font-size: 11px; color: var(--text-dim); border-top: 1px solid var(--border-dim); }
  </style>
</head>
<body>

<!-- ── Topbar ── -->
<header class="topbar">
  <div class="topbar-left">
    <div class="logo">
      <div class="logo-icon">🦀</div>
      CostClaw
    </div>
    <div class="tab-group">
      <button class="tab active" data-range="today" onclick="setRange('today')">Today</button>
      <button class="tab" data-range="7d" onclick="setRange('7d')">7 Days</button>
      <button class="tab" data-range="30d" onclick="setRange('30d')">30 Days</button>
    </div>
  </div>
  <div class="topbar-right">
    <span class="last-update" id="last-update">—</span>
    <div class="status-dot" id="status-dot"></div>
    <button class="refresh-btn" onclick="fetchAll()">↻ Refresh</button>
  </div>
</header>

<!-- ── Main content ── -->
<main class="container">

  <!-- KPI Cards -->
  <div class="section">
    <div class="kpi-grid">
      <div class="kpi-card c-green">
        <div class="kpi-label" id="kpi-spend-label">Today's Spend</div>
        <div class="kpi-value money" id="kpi-spend">$0.0000</div>
        <div class="kpi-meta" id="kpi-spend-meta"></div>
      </div>
      <div class="kpi-card c-blue">
        <div class="kpi-label" id="kpi-tokens-label">Today's Tokens</div>
        <div class="kpi-value" id="kpi-tokens">0</div>
        <div class="kpi-meta" id="kpi-tokens-meta"></div>
      </div>
      <div class="kpi-card c-amber">
        <div class="kpi-label">Cost / 1K Tokens</div>
        <div class="kpi-value" id="kpi-cpt">$0.000</div>
        <div class="kpi-meta">
          <span class="kpi-sub">this month</span>
        </div>
      </div>
      <div class="kpi-card c-purple">
        <div class="kpi-label">Models Used</div>
        <div class="kpi-value" id="kpi-models">0</div>
        <div class="kpi-meta">
          <span class="kpi-sub">all time</span>
        </div>
      </div>
      <div class="kpi-card c-teal">
        <div class="kpi-label">Sessions</div>
        <div class="kpi-value" id="kpi-sessions">0</div>
        <div class="kpi-meta">
          <span class="kpi-sub">all time</span>
        </div>
      </div>
      <div class="kpi-card c-orange">
        <div class="kpi-label">LLM Calls</div>
        <div class="kpi-value" id="kpi-calls">0</div>
        <div class="kpi-meta">
          <span class="kpi-sub">all time</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Charts: Trend + Doughnut -->
  <div class="charts-grid section">
    <div class="chart-card">
      <h3 id="trend-chart-title">Spend Trend — Last 7 Days</h3>
      <div class="chart-wrap" style="height:220px">
        <canvas id="trend-chart"></canvas>
      </div>
    </div>
    <div class="chart-card">
      <h3>Spend by Model</h3>
      <div class="chart-wrap" style="height:220px">
        <canvas id="donut-chart"></canvas>
      </div>
    </div>
  </div>

  <!-- Model breakdown table + Trigger breakdown -->
  <div class="bottom-grid section">
    <div class="table-card">
      <div class="table-card-header">
        <h3>Model Breakdown</h3>
        <span style="font-size:11px;color:var(--text-dim)">this month</span>
      </div>
      <table id="model-table">
        <thead>
          <tr>
            <th onclick="sortTable('model','model',this)">Model</th>
            <th class="text-right sort-desc" onclick="sortTable('model','costUsd',this)">Cost</th>
            <th class="text-right" onclick="sortTable('model','tokens',this)">Tokens</th>
            <th style="min-width:100px">Share</th>
          </tr>
        </thead>
        <tbody id="model-tbody"></tbody>
      </table>
    </div>
    <div class="table-card">
      <div class="table-card-header">
        <h3>Usage by Source</h3>
        <span style="font-size:11px;color:var(--text-dim)">this month</span>
      </div>
      <div class="trigger-list" id="trigger-list">
        <div class="empty">No data yet</div>
      </div>
    </div>
  </div>

  <!-- Sessions table -->
  <div class="section">
    <div class="table-card">
      <div class="table-card-header">
        <h3>Sessions by Cost</h3>
        <span style="font-size:11px;color:var(--text-dim)">top 20</span>
      </div>
      <table id="sessions-table">
        <thead>
          <tr>
            <th onclick="sortTable('sessions','sessionKey',this)">Session</th>
            <th class="text-right sort-desc" onclick="sortTable('sessions','costUsd',this)">Cost</th>
            <th class="text-right" onclick="sortTable('sessions','eventCount',this)">Calls</th>
            <th class="text-right" onclick="sortTable('sessions','startTs',this)">Started</th>
            <th class="text-right" onclick="sortTable('sessions','duration',this)">Duration</th>
          </tr>
        </thead>
        <tbody id="sessions-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- Recommendations -->
  <div class="section" id="recs-section">
    <div class="section-header">
      <span class="section-title">Recommendations</span>
    </div>
    <div class="recs-grid" id="recs-grid">
      <div class="empty">Analyzing your usage...</div>
    </div>
  </div>

</main>

<footer>CostClaw — all data stored locally in ~/.openclaw/costclaw.db — no external requests</footer>

<script>
(function() {
  // ── State ──────────────────────────────────────────────────────────────────
  let range = 'today';
  let latestData = {};
  let sortState = { model: { col: 'costUsd', dir: -1 }, sessions: { col: 'costUsd', dir: -1 } };
  let trendChart = null, donutChart = null;
  const CHART_COLORS = ['#3b82f6','#a855f7','#22c55e','#f59e0b','#ef4444','#14b8a6','#f97316','#ec4899','#6366f1','#84cc16'];
  const TRIGGER_COLORS = {
    user:      '#3b82f6',
    heartbeat: '#a855f7',
    cron:      '#f59e0b',
    memory:    '#14b8a6',
    subagent:  '#f97316',
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function fmt$(v)  { return '$' + (v||0).toFixed(4); }
  function fmtK(v)  { return v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(1)+'K' : String(v||0); }
  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
  }
  function fmtDur(ms) {
    if (!ms || ms < 0) return '—';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? m+'m '+s+'s' : s+'s';
  }
  function shortKey(k) {
    if (!k || k === 'unknown') return 'unknown';
    return k.length > 20 ? k.slice(0,8)+'…'+k.slice(-8) : k;
  }
  function deltaTag(now, prev, label='vs yesterday') {
    if (prev == null || prev === 0) return '<span class="delta neu">no prior data</span>';
    const pct = ((now - prev) / prev * 100).toFixed(0);
    const cls = now > prev ? 'up' : 'down';
    const sign = now > prev ? '+' : '';
    return \`<span class="delta \${cls}">\${sign}\${pct}% \${label}</span>\`;
  }

  // ── Range control ─────────────────────────────────────────────────────────
  window.setRange = function(r) {
    range = r;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.range === r));
    renderAll();
  };

  // ── Fetch all data ─────────────────────────────────────────────────────────
  window.fetchAll = async function() {
    try {
      const [summary, trend, trend30, hourly, yesterday, models, sessions, triggers, recs] = await Promise.all([
        fetch('/api/summary').then(r=>r.json()),
        fetch('/api/trend').then(r=>r.json()),
        fetch('/api/trend30').then(r=>r.json()),
        fetch('/api/hourly').then(r=>r.json()),
        fetch('/api/yesterday').then(r=>r.json()),
        fetch('/api/models').then(r=>r.json()),
        fetch('/api/sessions').then(r=>r.json()),
        fetch('/api/triggers').then(r=>r.json()),
        fetch('/api/recommendations').then(r=>r.json()),
      ]);
      latestData = { summary, trend, trend30, hourly, yesterday, models, sessions, triggers, recs };
      document.getElementById('status-dot').style.background = 'var(--green)';
      document.getElementById('last-update').textContent = 'Updated ' + new Date().toLocaleTimeString();
      renderAll();
    } catch(e) {
      document.getElementById('status-dot').style.background = 'var(--red)';
      document.getElementById('last-update').textContent = 'Error fetching data';
    }
  };

  // ── Master render ─────────────────────────────────────────────────────────
  function renderAll() {
    if (!latestData.summary) return;
    renderKPIs();
    renderTrend();
    renderDonut();
    renderModelTable();
    renderTriggers();
    renderSessions();
    renderRecs();
  }

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  function renderKPIs() {
    const s = latestData.summary || {};
    const y = latestData.yesterday || {};

    let spendLabel, spendVal, spendMeta;
    let tokensLabel, tokensVal, tokensMeta;

    if (range === 'today') {
      spendLabel = "Today's Spend";
      spendVal   = fmt$(s.todayUsd);
      const now = new Date();
      const hr = now.getHours() + now.getMinutes()/60;
      const projected = hr > 0 && s.todayUsd > 0 ? (s.todayUsd / hr * 24) : 0;
      const projStr   = projected > 0 ? \`<span class="kpi-sub">proj \${fmt$(projected)}/day</span>\` : '';
      spendMeta = deltaTag(s.todayUsd, y.totalUsd) + projStr;
      tokensLabel = "Today's Tokens";
      tokensVal   = fmtK(s.todayTokens);
      tokensMeta  = \`<span class="kpi-sub">yesterday: \${fmtK(y.totalTokens||0)}</span>\`;
    } else if (range === '7d') {
      const spend7d = (latestData.trend||[]).reduce((a,r)=>a+r.costUsd,0);
      spendLabel = '7-Day Spend';
      spendVal   = fmt$(spend7d);
      spendMeta  = '<span class="delta neu">last 7 days</span>';
      tokensLabel = '7-Day Tokens';
      tokensVal   = fmtK(s.monthTokens);
      tokensMeta  = '<span class="kpi-sub">approx</span>';
    } else {
      spendLabel = 'Month Spend';
      spendVal   = fmt$(s.monthUsd);
      spendMeta  = '<span class="delta neu">this month</span>';
      tokensLabel = 'Month Tokens';
      tokensVal   = fmtK(s.monthTokens);
      tokensMeta  = '<span class="kpi-sub">this month</span>';
    }

    document.getElementById('kpi-spend-label').textContent = spendLabel;
    document.getElementById('kpi-spend').textContent = spendVal;
    document.getElementById('kpi-spend-meta').innerHTML = spendMeta;
    document.getElementById('kpi-tokens-label').textContent = tokensLabel;
    document.getElementById('kpi-tokens').textContent = tokensVal;
    document.getElementById('kpi-tokens-meta').innerHTML = tokensMeta;

    const monthTokens = s.monthTokens || 0;
    const cpt = monthTokens > 0 ? (s.monthUsd / monthTokens * 1000) : 0;
    document.getElementById('kpi-cpt').textContent = '$' + cpt.toFixed(4);
    document.getElementById('kpi-models').textContent = s.modelCount || 0;
    document.getElementById('kpi-sessions').textContent = s.sessionCount || 0;
    document.getElementById('kpi-calls').textContent = s.totalEvents || 0;
  }

  // ── Trend Chart ───────────────────────────────────────────────────────────
  function renderTrend() {
    let labels, values, isHourly = false;
    const isToday = range === 'today';

    if (isToday) {
      isHourly = true;
      const hours = Array.from({length:24}, (_,i)=>String(i).padStart(2,'0'));
      const map = {};
      (latestData.hourly||[]).forEach(r => { map[r.hour] = r.costUsd; });
      labels = hours.map(h => h+':00');
      values = hours.map(h => map[h]||0);
      document.getElementById('trend-chart-title').textContent = 'Hourly Spend — Today';
    } else if (range === '7d') {
      const trend = latestData.trend || [];
      labels = trend.map(r => { const d=new Date(r.date); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); });
      values = trend.map(r => r.costUsd);
      document.getElementById('trend-chart-title').textContent = 'Daily Spend — Last 7 Days';
    } else {
      const trend = latestData.trend30 || [];
      labels = trend.map(r => { const d=new Date(r.date); return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); });
      values = trend.map(r => r.costUsd);
      document.getElementById('trend-chart-title').textContent = 'Daily Spend — Last 30 Days';
    }

    const ctx = document.getElementById('trend-chart').getContext('2d');
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: isHourly ? 'bar' : 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cost (USD)',
          data: values,
          backgroundColor: isHourly ? 'rgba(59,130,246,0.5)' : 'rgba(59,130,246,0.1)',
          borderColor: '#3b82f6',
          borderWidth: isHourly ? 0 : 2,
          pointRadius: isHourly ? 0 : 3,
          pointHoverRadius: isHourly ? 0 : 5,
          fill: !isHourly,
          tension: 0.4,
          borderRadius: isHourly ? 3 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#151b28',
            borderColor: '#1e2d45',
            borderWidth: 1,
            titleColor: '#7a8ba3',
            bodyColor: '#e8edf5',
            padding: 10,
            callbacks: { label: ctx => ' $' + ctx.parsed.y.toFixed(5) },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(30,45,69,0.5)' }, ticks: { color: '#3f5168', font:{size:10}, maxRotation:0, autoSkipPadding: 12 } },
          y: { grid: { color: 'rgba(30,45,69,0.5)' }, ticks: { color: '#3f5168', font:{size:10}, callback: v => '$'+v.toFixed(4) } },
        },
      },
    });
  }

  // ── Donut Chart ───────────────────────────────────────────────────────────
  function renderDonut() {
    const models = latestData.models || [];
    const ctx = document.getElementById('donut-chart').getContext('2d');
    if (donutChart) donutChart.destroy();
    if (!models.length) { donutChart = null; return; }
    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: models.map(m => m.model),
        datasets: [{
          data: models.map(m => m.costUsd),
          backgroundColor: models.map((_,i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderColor: '#0f1420',
          borderWidth: 2,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#7a8ba3', font:{size:11}, padding:12, boxWidth:10, usePointStyle:true },
          },
          tooltip: {
            backgroundColor: '#151b28',
            borderColor: '#1e2d45',
            borderWidth: 1,
            titleColor: '#7a8ba3',
            bodyColor: '#e8edf5',
            callbacks: { label: ctx => ' ' + fmt$(ctx.parsed) + ' (' + models[ctx.dataIndex].pct + '%)' },
          },
        },
      },
    });
  }

  // ── Model Table ───────────────────────────────────────────────────────────
  function renderModelTable() {
    const models = [...(latestData.models || [])].map(m => ({
      ...m,
      tokens:
        (m.inputTokens||0) +
        (m.outputTokens||0) +
        (m.cacheReadTokens||0) +
        (m.cacheWriteTokens||0),
    }));
    const ss = sortState.model;
    models.sort((a,b) => ss.dir * (a[ss.col] < b[ss.col] ? -1 : a[ss.col] > b[ss.col] ? 1 : 0));

    const tbody = document.getElementById('model-tbody');
    if (!models.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No model data yet</td></tr>'; return; }
    tbody.innerHTML = models.map(m => \`
      <tr>
        <td><span class="mono">\${m.model}</span></td>
        <td class="text-right" style="color:var(--green)">\${fmt$(m.costUsd)}</td>
        <td class="text-right text-dim">\${fmtK(m.tokens)}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-bg"><div class="bar-fill" style="width:\${m.pct}%"></div></div>
            <span class="bar-pct">\${m.pct}%</span>
          </div>
        </td>
      </tr>
    \`).join('');
  }

  // ── Trigger Breakdown ─────────────────────────────────────────────────────
  function renderTriggers() {
    const raw = latestData.triggers || [];
    // Merge subagents into their own bucket
    const merged = {};
    raw.forEach(r => {
      const key = r.isSubagent ? 'subagent' : (r.trigger || 'user');
      if (!merged[key]) merged[key] = { costUsd:0, tokens:0, eventCount:0 };
      merged[key].costUsd    += r.costUsd;
      merged[key].tokens     += r.tokens;
      merged[key].eventCount += r.eventCount;
    });
    const entries = Object.entries(merged).sort((a,b)=>b[1].costUsd-a[1].costUsd);
    const maxCost = entries.reduce((m,[,v])=>Math.max(m,v.costUsd),0);
    const el = document.getElementById('trigger-list');
    if (!entries.length) { el.innerHTML = '<div class="empty">No data yet</div>'; return; }
    el.innerHTML = entries.map(([key, v]) => {
      const color = TRIGGER_COLORS[key] || '#94a3b8';
      const pct = maxCost > 0 ? (v.costUsd / maxCost * 100) : 0;
      return \`<div class="trigger-row">
        <div class="trigger-dot" style="background:\${color}"></div>
        <div class="trigger-label">\${key}</div>
        <div class="trigger-bar-wrap"><div class="trigger-bar-fill" style="width:\${pct}%;background:\${color}"></div></div>
        <div class="trigger-cost">\${fmt$(v.costUsd)}</div>
        <div class="trigger-tokens">\${fmtK(v.tokens)} tok</div>
      </div>\`;
    }).join('');
  }

  // ── Sessions Table ─────────────────────────────────────────────────────────
  function renderSessions() {
    const sessions = [...(latestData.sessions || [])].map(s => ({
      ...s, duration: (s.endTs||0) - (s.startTs||0)
    }));
    const ss = sortState.sessions;
    sessions.sort((a,b) => ss.dir * (a[ss.col] < b[ss.col] ? -1 : a[ss.col] > b[ss.col] ? 1 : 0));

    const tbody = document.getElementById('sessions-tbody');
    if (!sessions.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No session data yet</td></tr>'; return; }
    tbody.innerHTML = sessions.map(s => \`
      <tr>
        <td><span class="mono">\${shortKey(s.sessionKey)}</span></td>
        <td class="text-right" style="color:var(--green)">\${fmt$(s.costUsd)}</td>
        <td class="text-right text-dim">\${s.eventCount}</td>
        <td class="text-right text-dim">\${fmtDate(s.startTs)}</td>
        <td class="text-right text-dim">\${fmtDur(s.duration)}</td>
      </tr>
    \`).join('');
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  function renderRecs() {
    const recs = latestData.recs || [];
    const el = document.getElementById('recs-grid');
    if (!recs.length) { el.innerHTML = '<div class="empty">No recommendations yet — keep using agents to generate insights.</div>'; return; }
    const stripeColors = ['#3b82f6','#22c55e','#f59e0b','#a855f7'];
    el.innerHTML = recs.map((r,i) => {
      const savings = r.estimatedSavingsUsd > 0 ? \`<div class="rec-savings">Est. savings: \${fmt$(r.estimatedSavingsUsd)}/mo</div>\` : '';
      return \`<div class="rec-card">
        <div class="rec-stripe" style="background:\${stripeColors[i%stripeColors.length]}"></div>
        <div class="rec-body">
          <div class="rec-title">\${r.title}</div>
          <div class="rec-desc">\${r.description}</div>
          \${savings}
        </div>
      </div>\`;
    }).join('');
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  window.sortTable = function(tableKey, col, th) {
    const ss = sortState[tableKey];
    if (ss.col === col) ss.dir *= -1;
    else { ss.col = col; ss.dir = -1; }
    // Update header classes
    th.closest('thead').querySelectorAll('th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
    th.classList.add(ss.dir === 1 ? 'sort-asc' : 'sort-desc');
    renderAll();
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  fetchAll();
  setInterval(fetchAll, 15000);
})();
<\/script>
</body>
</html>`;
