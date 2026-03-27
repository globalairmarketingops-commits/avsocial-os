/* =====================================================================
   AvSocialOS v2 — Performance Analytics
   Platform scorecards, content-type yield grids, pilot-first split,
   cadence efficiency, CTA patterns, and format rankings.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > performance.js
   ===================================================================== */

const PerformancePage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _metricsPlatform = [];
  let _metricsContent = [];
  let _utmTracking = [];
  let _posts = [];

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatNum(n) {
    if (n == null) return '\u2014';
    return Number(n).toLocaleString();
  }

  function _pct(n) {
    if (n == null) return '\u2014';
    return Number(n).toFixed(1) + '%';
  }

  function _platformIcon(platformId) {
    const platforms = SeedData.getPlatforms();
    const p = platforms[(platformId || '').toLowerCase()];
    if (!p) return '';
    return `<span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>`;
  }

  function _growthBadge(change) {
    if (change == null || change === 0) return '<span class="ga-badge ga-badge-muted">&#8212; Flat</span>';
    if (change > 0) return `<span class="ga-badge ga-badge-green">&#9650; ${change}%</span>`;
    return `<span class="ga-badge ga-badge-red">&#9660; ${Math.abs(change)}%</span>`;
  }

  function _heatColor(val, max) {
    if (!max || max === 0) return 'var(--ga-muted)';
    const ratio = val / max;
    if (ratio >= 0.7) return 'var(--ga-green)';
    if (ratio >= 0.4) return 'var(--ga-amber)';
    return 'var(--ga-red)';
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [metricsPlatform, metricsContent, utmTracking, posts] = await Promise.all([
        API.metrics_platform.list(),
        API.metrics_content.list(),
        API.utm_tracking.list(),
        API.posts.list()
      ]);
      _metricsPlatform = metricsPlatform || [];
      _metricsContent = metricsContent || [];
      _utmTracking = utmTracking || [];
      _posts = posts || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load performance data: ' + err.message, 'error');
      return;
    }

    let html = '';
    html += Components.sectionHeader('Performance Analytics', 'Platform-level and content-level performance analysis');

    // A. Platform Scorecards
    html += _renderPlatformScorecards();

    // B. Content Type x Platform Yield Grid
    html += _renderYieldGrid();

    // C. Pilot-First vs Commercial Split
    html += _renderPilotFirstSplit();

    // D. Cadence Efficiency
    html += _renderCadenceEfficiency();

    // E. Top Performing CTA Patterns
    html += _renderCTAPatterns();

    // F. Post Format Efficiency
    html += _renderFormatEfficiency();

    // G. Top Post Table
    html += _renderTopPosts();

    // H. Windsor.ai Connection Banner
    html += _renderWindsorBanner();

    // I. Sparkline trends per platform
    html += _renderPlatformSparklines();

    container.innerHTML = html;
  }

  // ── Section A: Platform Scorecards ──────────────────────────────────

  function _renderPlatformScorecards() {
    let html = Components.partHeader('A', 'Platform Scorecards');

    const platforms = SeedData.getPlatforms();
    const metricsMap = {};
    _metricsPlatform.forEach(m => {
      const key = (m.platform || '').toLowerCase();
      if (key) metricsMap[key] = m;
    });

    const postsByPlatform = {};
    _posts.forEach(p => {
      const key = (p.platform || '').toLowerCase();
      if (!postsByPlatform[key]) postsByPlatform[key] = 0;
      postsByPlatform[key]++;
    });

    html += '<div class="platform-scorecards">';
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const m = metricsMap[pid] || {};
      const postCount = postsByPlatform[pid] || 0;
      const followerChange = m.follower_change || m.follower_change_pct || 0;

      html += `
        <div class="platform-scorecard" style="border-top:3px solid ${p.color}">
          <div class="scorecard-header">
            <span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>
            <span class="scorecard-name">${p.name}</span>
            ${_growthBadge(followerChange)}
          </div>
          <div class="scorecard-stats">
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">Followers</div>
              <div class="scorecard-stat-value">${_formatNum(m.followers)}</div>
            </div>
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">Engagement</div>
              <div class="scorecard-stat-value">${_pct(m.engagement_rate)}</div>
            </div>
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">Impressions</div>
              <div class="scorecard-stat-value">${_formatNum(m.impressions)}</div>
            </div>
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">Posts</div>
              <div class="scorecard-stat-value">${postCount}</div>
            </div>
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">Clicks</div>
              <div class="scorecard-stat-value">${_formatNum(m.clicks)}</div>
            </div>
            <div class="scorecard-stat">
              <div class="scorecard-stat-label">CTR</div>
              <div class="scorecard-stat-value">${_pct(m.ctr)}</div>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section B: Content Type x Platform Yield Grid ───────────────────

  function _renderYieldGrid() {
    let html = Components.partHeader('B', 'Content Type \u00d7 Platform Yield Grid');

    const platforms = SeedData.getPlatforms();
    const contentTypes = SeedData.getContentTypes();
    const platformKeys = Object.keys(platforms);

    // Build engagement data: [contentType][platform] = avg engagement rate
    const grid = {};
    let maxEngagement = 0;

    const publishedPosts = _posts.filter(p => p.status === 'published');

    contentTypes.forEach(ct => {
      grid[ct.id] = {};
      platformKeys.forEach(pid => {
        const matched = publishedPosts.filter(
          p => p.content_type === ct.id && (p.platform || '').toLowerCase() === pid
        );
        if (matched.length > 0) {
          const avgEng = matched.reduce((sum, p) => sum + (p.engagement_rate || p.engagement || 0), 0) / matched.length;
          const rounded = Math.round(avgEng * 10) / 10;
          grid[ct.id][pid] = rounded;
          if (rounded > maxEngagement) maxEngagement = rounded;
        } else {
          grid[ct.id][pid] = null;
        }
      });
    });

    html += '<div class="table-wrapper"><table class="ga-table yield-grid"><thead><tr>';
    html += '<th>Content Type</th>';
    platformKeys.forEach(pid => {
      html += `<th>${_platformIcon(pid)} ${platforms[pid].name}</th>`;
    });
    html += '</tr></thead><tbody>';

    contentTypes.forEach(ct => {
      html += `<tr><td>${ct.icon} ${_esc(ct.name)}</td>`;
      platformKeys.forEach(pid => {
        const val = grid[ct.id][pid];
        if (val == null) {
          html += '<td class="yield-cell yield-empty">\u2014</td>';
        } else {
          html += `<td class="yield-cell" style="background:${_heatColor(val, maxEngagement)}20;color:${_heatColor(val, maxEngagement)};font-weight:600">${val}%</td>`;
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  // ── Section C: Pilot-First vs Commercial Split ──────────────────────

  function _renderPilotFirstSplit() {
    let html = Components.partHeader('C', 'Pilot-First vs Commercial Split');

    const published = _posts.filter(p => p.status === 'published');
    const pilotFirst = published.filter(p => p.pilot_first_flag === true);
    const commercial = published.filter(p => !p.pilot_first_flag);

    const utmMap = {};
    _utmTracking.forEach(u => { utmMap[u.post_id] = u; });

    function _avgMetric(postList, field) {
      if (postList.length === 0) return 0;
      const total = postList.reduce((sum, p) => {
        const utm = utmMap[p.id || p.post_id] || {};
        return sum + (utm[field] || p[field] || 0);
      }, 0);
      return Math.round((total / postList.length) * 10) / 10;
    }

    const metrics = [
      { label: 'Count', pilot: pilotFirst.length, commercial: commercial.length },
      { label: 'Avg Engagement', pilot: _avgMetric(pilotFirst, 'engagement'), commercial: _avgMetric(commercial, 'engagement') },
      { label: 'Avg Clicks', pilot: _avgMetric(pilotFirst, 'clicks'), commercial: _avgMetric(commercial, 'clicks') },
      { label: 'Avg Sessions', pilot: _avgMetric(pilotFirst, 'sessions'), commercial: _avgMetric(commercial, 'sessions') },
      { label: 'QI', pilot: _avgMetric(pilotFirst, 'qi'), commercial: _avgMetric(commercial, 'qi') }
    ];

    html += '<div class="split-comparison">';
    html += '<div class="split-col split-pilot">';
    html += '<h4 class="split-title" style="color:var(--ga-green)">&#9992; Pilot-First</h4>';
    metrics.forEach(m => {
      html += `<div class="split-row"><span class="split-label">${m.label}</span><span class="split-value">${_formatNum(m.pilot)}</span></div>`;
    });
    html += '</div>';

    html += '<div class="split-col split-commercial">';
    html += '<h4 class="split-title" style="color:var(--ga-blue)">&#128176; Commercial</h4>';
    metrics.forEach(m => {
      html += `<div class="split-row"><span class="split-label">${m.label}</span><span class="split-value">${_formatNum(m.commercial)}</span></div>`;
    });
    html += '</div>';
    html += '</div>';

    // Difference highlights
    html += '<div class="split-diff">';
    metrics.slice(1).forEach(m => {
      const diff = m.pilot - m.commercial;
      const cls = diff > 0 ? 'text-green' : diff < 0 ? 'text-red' : '';
      const arrow = diff > 0 ? '&#9650;' : diff < 0 ? '&#9660;' : '&#8212;';
      html += `<span class="split-diff-item ${cls}">${m.label}: ${arrow} ${Math.abs(diff).toFixed(1)} ${diff > 0 ? 'pilot-first advantage' : diff < 0 ? 'commercial advantage' : 'equal'}</span>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section D: Cadence Efficiency ───────────────────────────────────

  function _renderCadenceEfficiency() {
    let html = Components.partHeader('D', 'Cadence Efficiency');

    const platforms = SeedData.getPlatforms();
    const published = _posts.filter(p => p.status === 'published');

    html += '<div class="table-wrapper"><table class="ga-table"><thead><tr>';
    html += '<th>Platform</th><th>Posts/Week</th><th>Avg Engagement</th><th>Signal</th>';
    html += '</tr></thead><tbody>';

    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const platPosts = published.filter(pp => (pp.platform || '').toLowerCase() === pid);
      const count = platPosts.length;

      // Rough weekly rate (assume 30-day window)
      const postsPerWeek = Math.round((count / 4.3) * 10) / 10;
      const avgEng = count > 0
        ? Math.round(platPosts.reduce((s, pp) => s + (pp.engagement_rate || pp.engagement || 0), 0) / count * 10) / 10
        : 0;

      // Simple diminishing returns flag
      const target = p.daily * 7;
      const overPosting = postsPerWeek > target * 1.5;
      const signal = overPosting
        ? '<span class="ga-badge ga-badge-amber">&#9888; Diminishing Returns</span>'
        : postsPerWeek < target * 0.5
          ? '<span class="ga-badge ga-badge-red">&#9660; Under-cadence</span>'
          : '<span class="ga-badge ga-badge-green">&#9989; Healthy</span>';

      html += `<tr>
        <td>${_platformIcon(pid)} ${p.name}</td>
        <td>${postsPerWeek}</td>
        <td>${avgEng}%</td>
        <td>${signal}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
    return html;
  }

  // ── Section E: Top Performing CTA Patterns ──────────────────────────

  function _renderCTAPatterns() {
    let html = Components.partHeader('E', 'Top Performing CTA Patterns');

    const utmMap = {};
    _utmTracking.forEach(u => { utmMap[u.post_id] = u; });

    const published = _posts.filter(p => p.status === 'published' && p.cta_type);
    const ctaGroups = {};

    published.forEach(p => {
      const cta = p.cta_type;
      if (!ctaGroups[cta]) ctaGroups[cta] = { clicks: 0, sessions: 0, qi: 0, count: 0 };
      const utm = utmMap[p.id || p.post_id] || {};
      ctaGroups[cta].clicks += utm.clicks || p.clicks || 0;
      ctaGroups[cta].sessions += utm.sessions || p.sessions || 0;
      ctaGroups[cta].qi += utm.qi || p.qi || 0;
      ctaGroups[cta].count++;
    });

    const rows = Object.entries(ctaGroups).map(([cta, data]) => ({
      cta_type: cta,
      cta_label: (SeedData.getCtaTypes().find(c => c.id === cta) || {}).name || cta,
      avg_clicks: Math.round(data.clicks / data.count * 10) / 10,
      avg_sessions: Math.round(data.sessions / data.count * 10) / 10,
      avg_qi: Math.round(data.qi / data.count * 10) / 10,
      count: data.count
    })).sort((a, b) => b.avg_clicks - a.avg_clicks);

    if (rows.length === 0) {
      html += '<div class="empty-inline">No CTA data available.</div>';
      return html;
    }

    const columns = [
      { key: 'cta_label', label: 'CTA Type', render: (v, row) => `<strong>${_esc(v)}</strong> <span class="text-muted">(${row.count} posts)</span>` },
      { key: 'avg_clicks', label: 'Avg Clicks' },
      { key: 'avg_sessions', label: 'Avg Sessions' },
      { key: 'avg_qi', label: 'Avg QI' }
    ];

    html += Components.table(columns, rows, { id: 'cta-patterns-table', sortable: true });
    return html;
  }

  // ── Section F: Post Format Efficiency ───────────────────────────────

  function _renderFormatEfficiency() {
    let html = Components.partHeader('F', 'Post Format Efficiency');

    const published = _posts.filter(p => p.status === 'published' && p.content_type);
    const formatGroups = {};

    published.forEach(p => {
      const ct = p.content_type;
      if (!formatGroups[ct]) formatGroups[ct] = { engagement: 0, reach: 0, ctr: 0, count: 0 };
      formatGroups[ct].engagement += p.engagement_rate || p.engagement || 0;
      formatGroups[ct].reach += p.reach || 0;
      formatGroups[ct].ctr += p.ctr || 0;
      formatGroups[ct].count++;
    });

    const rows = Object.entries(formatGroups).map(([ct, data]) => {
      const info = SeedData.getContentTypes().find(c => c.id === ct);
      return {
        content_type: ct,
        label: info ? `${info.icon} ${info.name}` : ct,
        avg_engagement: Math.round(data.engagement / data.count * 10) / 10,
        avg_reach: Math.round(data.reach / data.count),
        avg_ctr: Math.round(data.ctr / data.count * 100) / 100,
        count: data.count
      };
    }).sort((a, b) => b.avg_engagement - a.avg_engagement);

    if (rows.length === 0) {
      html += '<div class="empty-inline">No format data available.</div>';
      return html;
    }

    // Highlight best and worst
    if (rows.length >= 2) {
      rows[0]._rowClass = 'row-highlight-green';
      rows[rows.length - 1]._rowClass = 'row-highlight-red';
    }

    const columns = [
      { key: 'label', label: 'Format' },
      { key: 'avg_engagement', label: 'Avg Engagement', render: (v) => _pct(v) },
      { key: 'avg_reach', label: 'Avg Reach', render: (v) => _formatNum(v) },
      { key: 'avg_ctr', label: 'Avg CTR', render: (v) => _pct(v) },
      { key: 'count', label: 'Posts' }
    ];

    html += Components.table(columns, rows, { id: 'format-efficiency-table', sortable: true });
    return html;
  }

  // ── Section G: Top Post Table ───────────────────────────────────────

  function _renderTopPosts() {
    let html = Components.partHeader('G', 'Top 10 Posts');

    const utmMap = {};
    _utmTracking.forEach(u => { utmMap[u.post_id] = u; });

    const published = _posts.filter(p => p.status === 'published');
    const scored = published.map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      return {
        ...p,
        clicks: utm.clicks || p.clicks || 0,
        sessions: utm.sessions || p.sessions || 0,
        qi: utm.qi || p.qi || 0,
        ctr: p.ctr || 0
      };
    }).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    if (scored.length === 0) {
      html += '<div class="empty-inline">No published posts with data.</div>';
      return html;
    }

    const columns = [
      { key: 'title', label: 'Title', render: (v) => `<strong>${_esc(v || 'Untitled')}</strong>` },
      { key: 'platform', label: 'Platform', render: (v) => _platformIcon((v || '').toLowerCase()) },
      { key: 'content_type', label: 'Type', render: (v) => {
        const info = SeedData.getContentTypes().find(c => c.id === v);
        return info ? `${info.icon} ${info.name}` : _esc(v || '\u2014');
      }},
      { key: 'clicks', label: 'Clicks' },
      { key: 'sessions', label: 'Sessions' },
      { key: 'qi', label: 'QI' },
      { key: 'ctr', label: 'CTR', render: (v) => _pct(v) }
    ];

    html += Components.table(columns, scored, { id: 'top-posts-table', sortable: true });
    return html;
  }

  // ── Section H: Windsor.ai Banner ────────────────────────────────────

  function _renderWindsorBanner() {
    return `
      <div class="windsor-banner" style="margin:24px 0;padding:16px;background:var(--ga-bg-alt, #f8fafc);border-left:4px solid var(--ga-amber);border-radius:4px">
        <div style="display:flex;align-items:center;gap:8px">
          ${Components.windsorDot('social')}
          <strong>Windsor.ai Integration</strong>
        </div>
        <p style="margin:8px 0 0;font-size:13px;color:var(--ga-muted)">
          Live platform data pending. Windsor.ai integration points flagged. Current data from seed/manual entry.
        </p>
      </div>`;
  }

  // ── Section I: Platform Sparklines ──────────────────────────────────

  function _renderPlatformSparklines() {
    let html = Components.partHeader('I', 'Platform Engagement Trends');

    const platforms = SeedData.getPlatforms();

    // Group metrics by platform, sorted by date
    const metricsMap = {};
    _metricsPlatform.forEach(m => {
      const key = (m.platform || '').toLowerCase();
      if (!metricsMap[key]) metricsMap[key] = [];
      metricsMap[key].push(m);
    });

    html += '<div class="sparkline-grid">';
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const data = (metricsMap[pid] || [])
        .sort((a, b) => new Date(a.date || a.period || 0) - new Date(b.date || b.period || 0))
        .slice(-7);
      const values = data.map(d => d.engagement_rate || 0);

      html += `
        <div class="sparkline-item">
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
