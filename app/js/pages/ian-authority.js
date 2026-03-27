/* =====================================================================
   AvSocialOS — Ian Authority Asset Dashboard
   Ian Lumpp's personal brand metrics and content systematization
   ===================================================================== */

const IanAuthorityPage = (() => {

  function render(container) {
    const ian = Store.get('social_ian') || {};

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Ian Lumpp \u2014 Authority Asset</div>
          <div class="section-subtitle">Media brand metrics and content systematization</div>
        </div>

        <!-- KPI Row -->
        <div class="row-grid row-grid-4">
          ${Components.kpiTile('LinkedIn Posts', ian.posts || 0)}
          ${Components.kpiTile('Engagement Rate', ian.eng || 0, { suffix: '%', change: ian.growth })}
          ${Components.kpiTile('Impressions', ian.imp || 0)}
          ${Components.kpiTile('Post Frequency', ian.freq || '\u2014')}
        </div>

        <!-- Engagement Detail -->
        <div class="row-grid row-grid-3">
          ${Components.kpiTile('Comments', ian.comments || 0, { icon: '\ud83d\udcac' })}
          ${Components.kpiTile('Shares', ian.shares || 0, { icon: '\ud83d\udd01' })}
          ${Components.kpiTile('Growth', ian.growth || 0, { suffix: '%', icon: '\ud83d\udcc8' })}
        </div>

        <!-- Top Post -->
        <div class="card" style="border-left:4px solid var(--ga-amber)">
          <div class="card-title">\ud83c\udfc6 Top Performing Post</div>
          <div style="font-size:14px;font-weight:600;color:var(--ga-navy)">${ian.top || 'No data'}</div>
        </div>

        <!-- Authority Playbook -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Authority Content Playbook</span>
          </div>
          <div class="row-grid row-grid-2">
            <div class="card">
              <div class="card-title">\ud83c\udf99\ufe0f Podcast</div>
              <div style="font-size:13px">NBAA Top 40 Under 40 host. Produce show notes, clip strategy, LinkedIn distribution cadence.</div>
            </div>
            <div class="card">
              <div class="card-title">\ud83d\udcdd LinkedIn Cadence</div>
              <div style="font-size:13px">2\u20133 posts/week. Market intelligence, broker relationship content, aviation authority positioning.</div>
            </div>
            <div class="card">
              <div class="card-title">\ud83c\udfaa Event Presence</div>
              <div style="font-size:13px">Pre-event social, during-event live content, post-event recap. NBAA SDC, AirVenture, NBAA BACE.</div>
            </div>
            <div class="card">
              <div class="card-title">\u26a0\ufe0f Content Rules</div>
              <div style="font-size:13px;color:var(--ga-red)">Ian does NOT appear in listing copy. He operates at the brand authority layer, not the transaction layer.</div>
            </div>
          </div>
        </div>

        <!-- Systematization Checklist -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Systematization Status</span>
          </div>
          ${Components.table(
            [
              { key: 'area', label: 'Area' },
              { key: 'status', label: 'Status', render: v => Components.statusBadge(v) },
              { key: 'owner', label: 'Owner' },
              { key: 'note', label: 'Notes' }
            ],
            [
              { area: 'LinkedIn posting cadence', status: 'in_progress', owner: 'Ian / Casey', note: 'Target: 2\u20133/week, authority topics' },
              { area: 'Podcast clip distribution', status: 'draft', owner: 'Keaton', note: 'Short clips for LI/IG/TikTok' },
              { area: 'Event content SOP', status: 'draft', owner: 'Casey', note: 'Pre/during/post event workflow' },
              { area: 'Broker network content', status: 'draft', owner: 'Ian', note: 'Relationship-based posts' },
              { area: 'NBAA relationship leverage', status: 'in_progress', owner: 'Ian', note: 'Top 40 network activation' }
            ]
          )}
        </div>
      </div>`;
  }

  return { render };
})();
