/* =====================================================================
   AvSocialOS — UTM Tracker
   Click-through tracking from social posts to site sessions and QI
   ===================================================================== */

const UTMPage = (() => {

  function render(container) {
    const utmData = Store.get('social_utm') || [];

    // Aggregates
    const totalClicks = utmData.reduce((a, r) => a + r.clicks, 0);
    const totalSessions = utmData.reduce((a, r) => a + r.sessions, 0);
    const totalQI = utmData.reduce((a, r) => a + r.qi, 0);
    const avgConv = totalSessions > 0 ? ((totalQI / totalSessions) * 100).toFixed(1) : '0.0';

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">UTM Tracker</div>
          <div class="section-subtitle">Social post click-through to qualified inquiry attribution</div>
        </div>

        <!-- KPI Row -->
        <div class="row-grid row-grid-4">
          ${Components.kpiTile('Total Clicks', totalClicks)}
          ${Components.kpiTile('Sessions', totalSessions)}
          ${Components.kpiTile('Qualified Inquiries', totalQI, { icon: '\ud83c\udfaf' })}
          ${Components.kpiTile('Conv. Rate', avgConv, { suffix: '%' })}
        </div>

        <!-- UTM Table -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Post-Level Attribution</span>
          </div>
          ${Components.table(
            [
              { key: 'date', label: 'Date' },
              { key: 'post', label: 'Post', render: v => `<strong>${v}</strong>` },
              { key: 'platform', label: 'Platform', render: v => {
                const platforms = SeedData.getPlatforms();
                const pid = Object.keys(platforms).find(k => platforms[k].name === v || platforms[k].name.includes(v));
                const p = pid ? platforms[pid] : null;
                return p ? `<span class="platform-icon" style="background:${p.color};width:20px;height:20px;font-size:9px;display:inline-flex">${p.icon}</span> ${v}` : v;
              }},
              { key: 'clicks', label: 'Clicks', render: v => `<strong>${v}</strong>` },
              { key: 'sessions', label: 'Sessions' },
              { key: 'qi', label: 'QI', render: v => v > 0 ? `<strong style="color:var(--ga-green-dark)">${v}</strong>` : `<span style="color:var(--ga-muted)">${v}</span>` },
              { key: 'conv', label: 'Conv %', render: (_, row) => {
                const rate = row.sessions > 0 ? ((row.qi / row.sessions) * 100).toFixed(1) : '0.0';
                return `${rate}%`;
              }}
            ],
            utmData
          )}
        </div>

        <!-- UTM Structure Reference -->
        <div class="card" style="border-left:4px solid var(--ga-blue)">
          <div class="card-title">&#128279; UTM Structure</div>
          <div style="font-size:12px;font-family:var(--ga-font-mono);color:var(--ga-charcoal);background:var(--ga-off-white);padding:12px;border-radius:var(--ga-radius)">
            utm_source=social&amp;utm_medium=[platform]&amp;utm_campaign=[campaign]&amp;utm_content=[post_id]
          </div>
          <div style="font-size:11px;color:var(--ga-muted);margin-top:8px">
            All UTM links must be shortened via TinyURL before scheduling in Sendible.
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
