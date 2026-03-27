/* =====================================================================
   AvSocialOS v2 — Production Command Dashboard
   The 10-second operator view of production health.
   NOT a vanity metrics page — this is operational truth.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > dashboard.js
   ===================================================================== */

const SocialDashboard = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _posts = [];
  let _tasks = [];
  let _violations = [];
  let _publishStatuses = [];
  let _strategy = [];
  let _utmTracking = [];
  let _metricsPlatform = [];

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _formatDateTime(iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function _strategyAsMap(strategyArray) {
    const map = {};
    (strategyArray || []).forEach(s => {
      const key = (s.platform || s.id || '').toLowerCase();
      if (key) map[key] = s;
    });
    return map;
  }

  function _platformIcon(platformId) {
    const platforms = SeedData.getPlatforms();
    const p = platforms[platformId];
    if (!p) return '';
    return `<span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>`;
  }

  function _daysDiff(dateStr) {
    if (!dateStr) return Infinity;
    const now = new Date();
    const d = new Date(dateStr);
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [posts, tasks, violations, publishStatuses, strategy, utmTracking, metricsPlatform] = await Promise.all([
        API.posts.list(),
        API.tasks.list(),
        API.rule_violations.list(),
        API.publish_status.list(),
        API.channel_strategy.list(),
        API.utm_tracking.list(),
        API.metrics_platform.list()
      ]);
      _posts = posts || [];
      _tasks = tasks || [];
      _violations = violations || [];
      _publishStatuses = publishStatuses || [];
      _strategy = strategy || [];
      _utmTracking = utmTracking || [];
      _metricsPlatform = metricsPlatform || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load dashboard data: ' + err.message, 'error');
      return;
    }

    const strategyMap = _strategyAsMap(_strategy);
    const isFullAccess = Auth.getRole() === 'full_access';

    // ── Compute Formulas ────────────────────────────────────────────
    const publishReady = Formulas.publishReadyRate(_posts);
    const blockedData = Formulas.blockedRate(_posts, _violations);
    const pilotMix = Formulas.pilotFirstMix(_posts);
    const onTime = Formulas.onTimePublishRate(_posts, _publishStatuses);
    const cadence = Formulas.cadenceCompliance(_posts, strategyMap);

    const reviewTasks = _tasks.filter(t => t.stage === 'in_review' || t.status === 'in_review');
    const overdueTasks = _tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date() && t.status !== 'published' && t.status !== 'completed';
    });

    // ── Build HTML ──────────────────────────────────────────────────

    let html = '';

    // Header
    html += Components.sectionHeader('Production Command', 'Operational health at a glance — not vanity metrics');

    // A. Production Health Row — 6 KPI tiles
    html += '<div class="kpi-row">';
    html += Components.kpiTile('Publish Ready', publishReady.ready, {
      subtitle: `of ${publishReady.total} due`,
      suffix: '',
      icon: '&#9989;'
    });
    html += Components.kpiTile('Blocked', blockedData.blocked, {
      subtitle: `${blockedData.percentage}% of active`,
      suffix: '',
      icon: '&#128721;'
    });
    html += Components.kpiTile('Casey Review', reviewTasks.length, {
      subtitle: 'tasks awaiting review',
      suffix: '',
      icon: '&#128203;'
    });
    html += Components.kpiTile('Overdue Tasks', overdueTasks.length, {
      subtitle: 'past due date',
      suffix: '',
      icon: '&#9888;'
    });
    html += Components.kpiTile('Pilot-First Mix', pilotMix.percentage, {
      subtitle: pilotMix.belowTarget ? 'Below 50% target' : 'On target',
      suffix: '%',
      icon: '&#9992;'
    });
    html += Components.kpiTile('On-Time Publish', onTime.percentage, {
      subtitle: `${onTime.onTime} of ${onTime.total} scheduled`,
      suffix: '%',
      icon: '&#128337;'
    });
    html += '</div>';

    // B. Next 48 Hours Queue
    html += _renderNext48Hours();

    // C. Casey Review Queue
    html += _renderCaseyReviewQueue(reviewTasks, isFullAccess);

    // Two-column layout for D + E
    html += '<div class="dashboard-two-col">';
    html += '<div class="dashboard-col">';
    html += _renderViolationFeed();
    html += '</div>';
    html += '<div class="dashboard-col">';
    html += _renderPilotFirstGauge(pilotMix);
    html += '</div>';
    html += '</div>';

    // F. Publish Mismatch Panel
    html += _renderPublishMismatch();

    // G. Platform Cadence
    html += _renderPlatformCadence(cadence, strategyMap);

    // H. Top Movers Strip
    html += _renderTopMovers();

    // I. Platform Performance Cards (secondary)
    html += _renderPlatformPerformance();

    // J. 7-Week Reach Trend
    html += _renderReachTrend();

    container.innerHTML = html;
  }

  // ── Section B: Next 48 Hours ────────────────────────────────────────

  function _renderNext48Hours() {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcoming = _posts.filter(p => {
      if (!p.scheduled_at) return false;
      const d = new Date(p.scheduled_at);
      return d >= now && d <= cutoff;
    }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

    let html = Components.partHeader('B', 'Next 48 Hours Queue');

    if (upcoming.length === 0) {
      html += Components.emptyState('&#128197;', 'No posts scheduled in the next 48 hours.', '', null);
      return html;
    }

    html += '<div class="next48-queue">';
    upcoming.forEach(post => {
      const readiness = _computeReadinessScore(post);
      const readyClass = readiness.ready ? '' : 'next48-not-ready';
      const platform = (post.platform || '').toLowerCase();
      html += `
        <div class="next48-item ${readyClass}">
          <div class="next48-time">${_formatDateTime(post.scheduled_at)}</div>
          <div class="next48-platform">${_platformIcon(platform)}</div>
          <div class="next48-title">${_esc(post.title || 'Untitled')}</div>
          <div class="next48-readiness">
            ${Components.progressBar(readiness.score, 100, readiness.ready ? 'var(--ga-green)' : 'var(--ga-amber)')}
            <span class="next48-score" style="color:${readiness.ready ? 'var(--ga-green)' : 'var(--ga-amber)'}">${readiness.score}%</span>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function _computeReadinessScore(post) {
    const checks = Validators.validatePost(post);
    const total = checks.length;
    if (total === 0) return { score: 100, ready: true };
    const passed = checks.filter(c => c.passed).length;
    const blockingFails = checks.filter(c => c.blocking && !c.passed).length;
    return {
      score: Math.round((passed / total) * 100),
      ready: blockingFails === 0
    };
  }

  // ── Section C: Casey Review Queue ───────────────────────────────────

  function _renderCaseyReviewQueue(reviewTasks, isFullAccess) {
    let html = Components.partHeader('C', 'Casey Review Queue');

    if (reviewTasks.length === 0) {
      html += Components.emptyState('&#9989;', 'No tasks awaiting Casey review.', '', null);
      return html;
    }

    const team = SeedData.getTeam();
    const columns = [
      { key: 'title', label: 'Task' },
      { key: 'assignee', label: 'Assignee', render: (v) => {
        const member = team.find(m => m.id === v);
        return member
          ? `<span class="avatar-inline" style="background:${member.color}">${member.initials}</span> ${_esc(member.name)}`
          : _esc(v || '\u2014');
      }},
      { key: 'due_date', label: 'Due', render: (v) => _formatDate(v) },
      { key: '_days_waiting', label: 'Days Waiting', render: (v, row) => {
        const days = _daysDiff(row.updated_at || row.created_at);
        const cls = days > 3 ? 'text-red' : days > 1 ? 'text-amber' : '';
        return `<span class="${cls}">${isFinite(days) ? days + 'd' : '\u2014'}</span>`;
      }}
    ];

    html += Components.table(columns, reviewTasks, { id: 'casey-review-table', sortable: true });
    return html;
  }

  // ── Section D: Violation Feed ───────────────────────────────────────

  function _renderViolationFeed() {
    let html = Components.partHeader('D', 'Platform Rule Alert Feed');

    const sorted = [..._violations].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    ).slice(0, 5);

    if (sorted.length === 0) {
      html += '<div class="empty-inline">No recent violations.</div>';
      return html;
    }

    html += '<div class="violation-feed">';
    sorted.forEach(v => {
      const post = _posts.find(p => (p.id || p.post_id) === v.post_id);
      html += `
        <div class="violation-feed-item">
          <div class="violation-feed-header">
            <code class="violation-code">${_esc(v.rule_code)}</code>
            ${Components.severityBadge(v.severity || (v.blocking ? 'critical' : 'warning'))}
          </div>
          <div class="violation-feed-body">
            <span class="violation-post-title">${_esc(post ? post.title : v.post_id)}</span>
            ${v.platform ? `<span class="violation-platform">${_platformIcon((v.platform || '').toLowerCase())}</span>` : ''}
          </div>
        </div>`;
    });
    html += '</div>';
    html += `<div style="margin-top:8px"><a class="link-small" onclick="Router.navigate('qa')">View all violations &#8594;</a></div>`;
    return html;
  }

  // ── Section E: Pilot-First Gauge ────────────────────────────────────

  function _renderPilotFirstGauge(pilotMix) {
    let html = Components.partHeader('E', 'Pilot-First Mix');
    html += Components.formulaGauge('Pilot-First %', pilotMix.percentage, {
      target: 50,
      unit: '%',
      thresholds: { red: 30, amber: 50 }
    });
    const trend = pilotMix.belowTarget ? '&#9660; Below Target' : '&#9650; On Target';
    const trendClass = pilotMix.belowTarget ? 'text-red' : 'text-green';
    html += `<div class="pilot-trend ${trendClass}" style="margin-top:8px;font-size:13px;font-weight:600">${trend}</div>`;
    html += `<div style="font-size:12px;color:var(--ga-muted);margin-top:4px">${pilotMix.pilotFirst} pilot-first of ${pilotMix.total} total posts</div>`;
    return html;
  }

  // ── Section F: Publish Mismatch ─────────────────────────────────────

  function _renderPublishMismatch() {
    let html = Components.partHeader('F', 'Publish Mismatch Panel');

    const statusMap = {};
    _publishStatuses.forEach(s => { statusMap[s.post_id] = s; });

    const mismatches = _posts.filter(post => {
      const status = statusMap[post.id || post.post_id];
      if (!status) return false;
      if (post.status === 'published' && !status.published_at) return true;
      if (post.status !== 'published' && status.published_at) return true;
      if (status.verified === false) return true;
      return false;
    });

    if (mismatches.length === 0) {
      html += '<div class="empty-inline" style="color:var(--ga-green)">&#9989; No publish mismatches detected.</div>';
      return html;
    }

    html += `<div class="mismatch-count" style="margin-bottom:8px;font-weight:600;color:var(--ga-red)">&#9888; ${mismatches.length} mismatch${mismatches.length !== 1 ? 'es' : ''} found</div>`;
    html += '<div class="mismatch-list">';
    mismatches.slice(0, 10).forEach(post => {
      const status = statusMap[post.id || post.post_id];
      const pubLabel = status && status.published_at ? 'published' : 'needs_review';
      html += `
        <div class="mismatch-item">
          <span class="mismatch-title">${_esc(post.title || 'Untitled')}</span>
          <span class="mismatch-detail">Post: ${Components.statusBadge(post.status)} | Publish: ${Components.publishStatusBadge(pubLabel)}</span>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section G: Platform Cadence ─────────────────────────────────────

  function _renderPlatformCadence(cadence, strategyMap) {
    let html = Components.partHeader('G', 'Platform Cadence');
    html += '<div class="cadence-meters">';

    const platforms = SeedData.getPlatforms();
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const data = cadence.byPlatform[pid] || { actual: 0, target: 0, rate: 0 };
      const pct = Math.min(data.rate, 100);
      const barColor = pct >= 80 ? 'var(--ga-green)' : pct >= 50 ? 'var(--ga-amber)' : 'var(--ga-red)';

      html += `
        <div class="cadence-meter">
          <div class="cadence-meter-label">
            <span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>
            <span>${p.name}</span>
          </div>
          <div class="cadence-meter-bar-wrap">
            <div class="cadence-meter-bar" style="width:${pct}%;background:${barColor}"></div>
          </div>
          <div class="cadence-meter-value">${data.actual}/${data.target} (${data.rate}%)</div>
        </div>`;
    });

    html += '</div>';
    return html;
  }

  // ── Section H: Top Movers ───────────────────────────────────────────

  function _renderTopMovers() {
    let html = Components.partHeader('H', 'Top Movers');

    const utmMap = {};
    _utmTracking.forEach(u => { utmMap[u.post_id] = u; });

    const publishedPosts = _posts.filter(p => p.status === 'published');
    const scored = publishedPosts.map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      return {
        ...p,
        clicks: utm.clicks || p.clicks || 0,
        engagement: utm.engagement || p.engagement || 0
      };
    }).sort((a, b) => (b.clicks + b.engagement) - (a.clicks + a.engagement)).slice(0, 5);

    if (scored.length === 0) {
      html += '<div class="empty-inline">No published post data yet.</div>';
      return html;
    }

    html += '<div class="top-movers-strip">';
    scored.forEach((post, i) => {
      html += `
        <div class="top-mover-card">
          <div class="top-mover-rank">#${i + 1}</div>
          <div class="top-mover-info">
            <div class="top-mover-title">${_esc(post.title || 'Untitled')}</div>
            <div class="top-mover-meta">
              ${_platformIcon((post.platform || '').toLowerCase())}
              <span>${post.clicks} clicks</span>
              <span>${post.engagement} eng</span>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section I: Platform Performance Cards ───────────────────────────

  function _renderPlatformPerformance() {
    let html = Components.partHeader('I', 'Platform Performance');

    const platforms = SeedData.getPlatforms();
    const metricsMap = {};
    _metricsPlatform.forEach(m => {
      const key = (m.platform || '').toLowerCase();
      if (key) metricsMap[key] = m;
    });

    html += '<div class="platform-cards-grid">';
    Object.keys(platforms).forEach(pid => {
      const m = metricsMap[pid] || {};
      html += Components.platformCard(pid, {
        followers: m.followers || 0,
        engagement: m.engagement_rate || 0,
        reach: m.reach || 0,
        ctr: m.ctr || 0,
        top: m.top_post || '\u2014'
      });
    });
    html += '</div>';
    return html;
  }

  // ── Section J: 7-Week Reach Trend ───────────────────────────────────

  function _renderReachTrend() {
    let html = Components.partHeader('J', '7-Week Reach Trend');

    const platforms = SeedData.getPlatforms();

    // Group metrics by platform
    const metricsMap = {};
    _metricsPlatform.forEach(m => {
      const key = (m.platform || '').toLowerCase();
      if (!metricsMap[key]) metricsMap[key] = [];
      metricsMap[key].push(m);
    });

    html += '<div class="reach-trend-grid">';
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const data = (metricsMap[pid] || []).slice(-7);
      const values = data.map(d => d.reach || 0);

      html += `
        <div class="reach-trend-item">
          <span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>
          <span style="font-size:12px;min-width:70px">${p.name}</span>
          ${values.length >= 2
            ? Components.trendSparkline(values, p.color)
            : '<span class="text-muted" style="font-size:11px">Insufficient data</span>'}
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Public ──────────────────────────────────────────────────────────

  return { render };
})();
