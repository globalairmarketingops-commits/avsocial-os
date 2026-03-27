/* =====================================================================
   AvSocialOS — Content Calendar
   Monthly grid view + daily post timeline
   ===================================================================== */

const CalendarPage = (() => {

  function render(container) {
    const items = Store.get('social_calendar') || [];
    const platforms = SeedData.getPlatforms();

    // Group by date
    const byDate = {};
    items.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = [];
      byDate[item.date].push(item);
    });

    const dates = Object.keys(byDate).sort();

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Content Calendar</div>
          <div class="section-subtitle">Scheduled and published posts across all platforms</div>
        </div>

        <!-- Daily Timeline -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Post Timeline</span>
          </div>
          ${dates.map(date => renderDayTimeline(date, byDate[date], platforms)).join('')}
        </div>

        <!-- Posting Rules -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Platform Posting Rules</span>
          </div>
          <div class="row-grid row-grid-3">
            ${Object.entries(platforms).map(([id, p]) => `
              <div class="card">
                <div class="card-title">
                  <span class="platform-icon" style="background:${p.color};width:24px;height:24px;font-size:11px">${p.icon}</span>
                  ${p.name}
                </div>
                <div style="font-size:12px;color:var(--ga-muted)">${p.rules}</div>
                <div style="margin-top:8px;font-size:12px">
                  <strong>Daily target:</strong> ${p.daily}/day &middot; <strong>Category:</strong> ${p.cat}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Content Type Legend -->
        <div>
          <div class="part-header">
            <span class="part-label">C</span>
            <span class="part-title">Content Types</span>
          </div>
          <div class="card" style="display:flex;flex-wrap:wrap;gap:12px">
            ${SeedData.getContentTypes().map(ct => `
              <span style="font-size:12px">${ct.icon} ${ct.name}</span>
            `).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderDayTimeline(date, items, platforms) {
    const d = new Date(date + 'T12:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return `
      <div class="card mb-2">
        <div class="card-title">${dayName}</div>
        <table class="data-table">
          <thead>
            <tr><th>Time</th><th>Platform</th><th>Type</th><th>Title</th><th>Assignee</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${items.sort((a, b) => a.time.localeCompare(b.time)).map(item => {
              const p = platforms[item.platform] || {};
              const team = SeedData.getTeam();
              const assignee = team.find(m => m.id === item.assignee);
              const ct = SeedData.getContentTypes().find(c => c.id === item.type);
              return `<tr>
                <td style="font-family:var(--ga-font-mono);font-size:12px">${item.time}</td>
                <td><span class="platform-icon" style="background:${p.color};width:22px;height:22px;font-size:10px;display:inline-flex">${p.icon}</span> ${p.name || ''}</td>
                <td>${ct ? ct.icon + ' ' + ct.name : item.type}</td>
                <td style="font-weight:600">${item.title}${item.broker ? `<br><span style="font-size:11px;color:var(--ga-muted)">Presented by: ${item.broker}</span>` : ''}</td>
                <td>${assignee ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${assignee.color}">${assignee.initials}</span> ${assignee.name.split(' ')[0]}` : ''}</td>
                <td>${Components.statusBadge(item.status)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { render };
})();
