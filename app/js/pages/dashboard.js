/* =====================================================================
   AvSocialOS — Dashboard (Command Center)
   KPI overview, platform cards, engagement heatmap, trend summary
   ===================================================================== */

const SocialDashboard = (() => {

  function render(container) {
    const metrics = Store.get('social_metrics') || {};
    const heatmap = Store.get('social_heatmap') || [];
    const trends = Store.get('social_trends') || [];
    const platforms = SeedData.getPlatforms();

    // Aggregate KPIs
    const vals = Object.values(metrics);
    const totals = {
      followers: vals.reduce((a, b) => a + b.followers, 0),
      followChange: +(vals.reduce((a, b) => a + b.change, 0) / vals.length).toFixed(1),
      avgEng: +(vals.reduce((a, b) => a + b.engagement, 0) / vals.length).toFixed(1),
      reach: vals.reduce((a, b) => a + b.reach, 0),
      posts: vals.reduce((a, b) => a + b.posts, 0),
      clicks: vals.reduce((a, b) => a + b.clicks, 0)
    };

    container.innerHTML = `
      <div class="domain-page">

        <!-- Section Header -->
        <div class="section-header">
          <div class="section-title">Social Operations Dashboard</div>
          <div class="section-subtitle">Cross-platform performance overview \u2014 GlobalAir.com</div>
        </div>

        <!-- Part A: KPI Overview -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">KPI Overview</span>
          </div>
          <div class="row-grid row-grid-6">
            ${Components.kpiTile('Total Followers', totals.followers, { change: totals.followChange })}
            ${Components.kpiTile('Avg Engagement', totals.avgEng, { suffix: '%', change: 0.4 })}
            ${Components.kpiTile('Total Reach', totals.reach, { change: 8.2 })}
            ${Components.kpiTile('Posts This Month', totals.posts, { change: 12.1 })}
            ${Components.kpiTile('Total Clicks', totals.clicks, { change: 6.8 })}
            ${Components.kpiTile('Avg CTR', '2.24', { suffix: '%', change: 0.3 })}
          </div>
        </div>

        <!-- Part B: Platform Cards -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Platform Performance</span>
          </div>
          <div class="row-grid row-grid-3">
            ${Object.keys(platforms).map(id => Components.platformCard(id, metrics[id] || {})).join('')}
          </div>
        </div>

        <!-- Part C: Engagement Heatmap -->
        <div>
          <div class="part-header">
            <span class="part-label">C</span>
            <span class="part-title">Content Type \u00d7 Platform Engagement</span>
          </div>
          <div class="card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Content Type</th>
                  <th>LinkedIn</th>
                  <th>Facebook</th>
                  <th>Instagram</th>
                  <th>X / Twitter</th>
                </tr>
              </thead>
              <tbody>
                ${heatmap.map(row => `
                  <tr>
                    <td style="font-weight:600">${row.type}</td>
                    <td>${Components.heatmapCell(row.linkedin)}</td>
                    <td>${Components.heatmapCell(row.facebook)}</td>
                    <td>${Components.heatmapCell(row.instagram)}</td>
                    <td>${Components.heatmapCell(row.twitter)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Part D: Reach Trend -->
        <div>
          <div class="part-header">
            <span class="part-label">D</span>
            <span class="part-title">7-Week Reach Trend</span>
          </div>
          <div class="card">
            ${renderTrendTable(trends)}
          </div>
        </div>

      </div>`;
  }

  function renderTrendTable(trends) {
    const platKeys = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];
    const platforms = SeedData.getPlatforms();
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Week</th>
            ${platKeys.map(k => `<th style="color:${platforms[k].color}">${platforms[k].name}</th>`).join('')}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${trends.map(row => {
            const total = platKeys.reduce((a, k) => a + (row[k] || 0), 0);
            return `<tr>
              <td style="font-weight:600">${row.w}</td>
              ${platKeys.map(k => `<td>${(row[k] || 0).toLocaleString()}</td>`).join('')}
              <td style="font-weight:700;color:var(--ga-navy)">${total.toLocaleString()}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  return { render };
})();
