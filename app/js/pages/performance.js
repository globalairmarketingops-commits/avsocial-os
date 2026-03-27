/* =====================================================================
   AvSocialOS — Performance Analytics
   Per-platform detail cards, posting cadence, reach trends
   ===================================================================== */

const PerformancePage = (() => {

  function render(container) {
    const metrics = Store.get('social_metrics') || {};
    const trends = Store.get('social_trends') || [];
    const platforms = SeedData.getPlatforms();

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Performance Analytics</div>
          <div class="section-subtitle">Platform-level metrics and posting cadence</div>
        </div>

        <!-- Part A: Platform Detail Cards -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Platform Detail</span>
          </div>
          <div class="row-grid row-grid-2">
            ${Object.entries(metrics).map(([id, data]) => {
              const p = platforms[id];
              if (!p) return '';
              return `
                <div class="card" style="border-left:4px solid ${p.color}">
                  <div class="card-title">
                    <span class="platform-icon" style="background:${p.color};width:28px;height:28px;font-size:12px">${p.icon}</span>
                    ${p.name}
                    <span style="margin-left:auto">${Components.badge(data.change > 3 ? 'Growing' : 'Stable', data.change > 3 ? 'green' : 'blue')}</span>
                  </div>
                  <div class="row-grid row-grid-4" style="margin-bottom:12px">
                    <div class="platform-stat">
                      <div class="platform-stat-label">Followers</div>
                      <div class="platform-stat-value">${data.followers.toLocaleString()}</div>
                    </div>
                    <div class="platform-stat">
                      <div class="platform-stat-label">Engagement</div>
                      <div class="platform-stat-value">${data.engagement}%</div>
                    </div>
                    <div class="platform-stat">
                      <div class="platform-stat-label">Impressions</div>
                      <div class="platform-stat-value">${data.impressions.toLocaleString()}</div>
                    </div>
                    <div class="platform-stat">
                      <div class="platform-stat-label">CTR</div>
                      <div class="platform-stat-value">${data.ctr}%</div>
                    </div>
                  </div>
                  <div style="font-size:12px;color:var(--ga-muted)">
                    ${data.posts} posts this month &middot; ${data.clicks.toLocaleString()} clicks &middot; ${data.reach.toLocaleString()} reach
                  </div>
                  <div style="margin-top:8px">
                    <div style="font-size:11px;color:var(--ga-muted);margin-bottom:4px">Posting cadence (${p.daily}/day target)</div>
                    ${Components.progressBar(data.posts / 30, p.daily, p.color)}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Part B: Trend Comparison -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">7-Week Reach Trend</span>
          </div>
          <div class="card">
            ${renderSparklines(trends, platforms)}
          </div>
        </div>
      </div>`;
  }

  function renderSparklines(trends, platforms) {
    if (!trends.length) return '<div class="empty-state"><div class="empty-state-title">No trend data</div></div>';

    const platKeys = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];
    const maxVal = Math.max(...trends.flatMap(r => platKeys.map(k => r[k] || 0)));

    return `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${platKeys.map(k => {
          const p = platforms[k];
          const vals = trends.map(r => r[k] || 0);
          const latest = vals[vals.length - 1];
          const prev = vals[vals.length - 2] || latest;
          const change = prev > 0 ? (((latest - prev) / prev) * 100).toFixed(1) : 0;
          return `
            <div style="padding:12px;border:1px solid var(--ga-border);border-radius:var(--ga-radius-lg)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span class="platform-icon" style="background:${p.color};width:22px;height:22px;font-size:10px">${p.icon}</span>
                <span style="font-weight:700;font-size:13px">${p.name}</span>
                <span class="kpi-delta ${change > 0 ? 'trend-up' : 'trend-down'}" style="margin-left:auto">
                  ${change > 0 ? '&#9650;' : '&#9660;'} ${Math.abs(change)}%
                </span>
              </div>
              <div style="display:flex;align-items:end;gap:3px;height:40px">
                ${vals.map(v => {
                  const h = Math.max((v / maxVal) * 36, 3);
                  return `<div style="flex:1;background:${p.color};opacity:0.7;height:${h}px;border-radius:2px"></div>`;
                }).join('')}
              </div>
              <div style="font-size:11px;color:var(--ga-muted);margin-top:4px">Latest: ${latest.toLocaleString()} reach</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  return { render };
})();
