/* =====================================================================
   AvSocialOS — Canva & Assets
   Template library, brand color swatches, production status
   ===================================================================== */

const CanvaPage = (() => {

  function render(container) {
    const templates = Store.get('social_templates') || [];
    const liveCount = templates.filter(t => t.status === 'live').length;
    const buildCount = templates.filter(t => t.status === 'needs_build').length;

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Canva & Assets</div>
          <div class="section-subtitle">Template library and brand asset management</div>
        </div>

        <!-- KPI Row -->
        <div class="row-grid row-grid-3">
          ${Components.kpiTile('Total Templates', templates.length)}
          ${Components.kpiTile('Live', liveCount, { icon: '\ud83d\udfe2' })}
          ${Components.kpiTile('Needs Build', buildCount, { icon: '\ud83d\udd34' })}
        </div>

        <!-- Brand Colors -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Brand Color Palette</span>
          </div>
          <div class="card" style="display:flex;gap:16px;flex-wrap:wrap">
            ${[
              { name: 'Navy Primary', hex: '#102297' },
              { name: 'Green', hex: '#97CB00' },
              { name: 'Blue', hex: '#4782D3' },
              { name: 'Red', hex: '#E8503A' },
              { name: 'Amber', hex: '#F59E0B' },
              { name: 'Off-White', hex: '#F4F5F7' }
            ].map(c => `
              <div style="text-align:center">
                <div style="width:48px;height:48px;border-radius:var(--ga-radius);background:${c.hex};border:1px solid var(--ga-border)"></div>
                <div style="font-size:10px;font-weight:600;margin-top:4px">${c.name}</div>
                <div style="font-size:10px;color:var(--ga-muted);font-family:var(--ga-font-mono)">${c.hex}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Template Grid -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Template Library</span>
          </div>
          <div class="row-grid row-grid-4">
            ${templates.map(t => `
              <div class="template-card">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                  <div class="template-name">${t.name}</div>
                  ${Components.statusBadge(t.status)}
                </div>
                <div class="template-desc">${t.desc}</div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div class="template-size">${t.use}</div>
                  <span style="font-size:11px;color:var(--ga-muted)">#${t.id}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Canva Link -->
        <div class="card" style="display:flex;gap:12px;align-items:center">
          <a href="https://www.canva.com" target="_blank" class="btn btn-green">&#127912; Open Canva Workspace</a>
          <span style="font-size:12px;color:var(--ga-muted)">Template ownership: Keaton Fenwick (primary), Sydney Eldridge (support)</span>
        </div>
      </div>`;
  }

  return { render };
})();
