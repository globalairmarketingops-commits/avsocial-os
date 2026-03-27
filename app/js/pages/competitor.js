/* =====================================================================
   AvSocialOS — Competitor Pulse (Controller.com Gap Analysis)
   ===================================================================== */

const CompetitorPage = (() => {

  function render(container) {
    const comp = Store.get('social_competitor') || {};
    const metrics = Store.get('social_metrics') || {};
    const platforms = SeedData.getPlatforms();
    const platKeys = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Competitor Pulse</div>
          <div class="section-subtitle">GlobalAir.com vs Controller.com social presence analysis</div>
        </div>

        <!-- Comparison Table -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Head-to-Head Comparison</span>
          </div>
          <div class="card">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>GA Followers</th>
                  <th>Controller Followers</th>
                  <th>GA Engagement</th>
                  <th>Controller Eng.</th>
                  <th>Gap Status</th>
                  <th>Controller Notes</th>
                </tr>
              </thead>
              <tbody>
                ${platKeys.map(k => {
                  const p = platforms[k];
                  const ga = metrics[k] || {};
                  const c = comp[k] || {};
                  const gaFollowers = ga.followers || 0;
                  const cFollowers = c.followers || 0;
                  let gapStatus, gapBadge;
                  if (cFollowers === 0) { gapStatus = 'Uncontested'; gapBadge = 'green'; }
                  else if (ga.engagement > c.eng * 2) { gapStatus = 'Dominant'; gapBadge = 'green'; }
                  else if (ga.engagement > c.eng) { gapStatus = 'Quality Lead'; gapBadge = 'blue'; }
                  else { gapStatus = 'Competitive'; gapBadge = 'amber'; }
                  return `<tr>
                    <td>
                      <span class="platform-icon" style="background:${p.color};width:22px;height:22px;font-size:10px;display:inline-flex">${p.icon}</span>
                      <strong>${p.name}</strong>
                    </td>
                    <td>${gaFollowers.toLocaleString()}</td>
                    <td>${cFollowers.toLocaleString()}</td>
                    <td style="font-weight:700;color:var(--ga-green-dark)">${ga.engagement || 0}%</td>
                    <td style="color:var(--ga-muted)">${c.eng || 0}%</td>
                    <td>${Components.badge(gapStatus, gapBadge)}</td>
                    <td style="font-size:12px;color:var(--ga-muted)">${c.note || ''}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Platform Gap Cards -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Platform Status Cards</span>
          </div>
          <div class="row-grid row-grid-3">
            ${platKeys.map(k => {
              const p = platforms[k];
              const ga = metrics[k] || {};
              const c = comp[k] || {};
              const engGap = ((ga.engagement || 0) - (c.eng || 0)).toFixed(1);
              const follGap = (ga.followers || 0) - (c.followers || 0);
              return `
                <div class="platform-card" style="border-top-color:${p.color}">
                  <div class="platform-header">
                    <div class="platform-icon" style="background:${p.color}">${p.icon}</div>
                    <div class="platform-name">${p.name}</div>
                  </div>
                  <div style="font-size:12px;display:flex;flex-direction:column;gap:6px">
                    <div>Follower gap: <strong class="${follGap >= 0 ? 'text-green' : 'text-red'}">${follGap >= 0 ? '+' : ''}${follGap.toLocaleString()}</strong></div>
                    <div>Engagement gap: <strong class="${engGap >= 0 ? 'text-green' : 'text-red'}">${engGap >= 0 ? '+' : ''}${engGap}%</strong></div>
                    <div>Controller posts/wk: <strong>${c.postsWk || 0}</strong></div>
                    <div style="color:var(--ga-muted);font-size:11px;margin-top:4px">${c.note || ''}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Strategic Note -->
        <div class="card" style="border-left:4px solid var(--ga-green)">
          <div class="card-title">&#128161; Competitive Positioning</div>
          <div style="font-size:13px;color:var(--ga-charcoal)">
            Controller.com relies on auto-posted listing reposts with zero creative strategy. GlobalAir.com wins on engagement quality, content variety, and authority positioning. YouTube and TikTok are uncontested \u2014 first-mover advantage is available now.
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
