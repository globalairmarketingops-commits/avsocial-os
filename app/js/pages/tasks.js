/* =====================================================================
   AvSocialOS — Tasks & Pipeline
   5-stage pipeline kanban with tier filtering
   ===================================================================== */

const TasksPage = (() => {

  function render(container) {
    const tasks = Store.get('social_tasks') || [];
    const stages = [
      { id: 'draft', label: 'Draft', color: 'var(--ga-muted)' },
      { id: 'in_review', label: 'Casey Review', color: 'var(--ga-amber)' },
      { id: 'approved', label: 'Approved', color: 'var(--ga-blue)' },
      { id: 'in_progress', label: 'In Progress', color: 'var(--ga-green)' },
      { id: 'published', label: 'Published', color: 'var(--ga-green-dark)' }
    ];

    // Summary stats
    const t1Count = tasks.filter(t => t.tier === 'T1').length;
    const t2Count = tasks.filter(t => t.tier === 'T2').length;
    const t3Count = tasks.filter(t => t.tier === 'T3').length;
    const activeCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'in_review').length;

    container.innerHTML = `
      <div class="domain-page">
        <div class="section-header">
          <div class="section-title">Tasks & Pipeline</div>
          <div class="section-subtitle">Content production pipeline \u2014 draft to published</div>
        </div>

        <!-- KPI Row -->
        <div class="row-grid row-grid-4">
          ${Components.kpiTile('Total Tasks', tasks.length)}
          ${Components.kpiTile('T1 \u2014 Immediate', t1Count, { icon: '\ud83d\udd34' })}
          ${Components.kpiTile('T2 \u2014 This Sprint', t2Count, { icon: '\ud83d\udfe1' })}
          ${Components.kpiTile('Active', activeCount, { icon: '\u26a1' })}
        </div>

        <!-- Pipeline -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Pipeline Board</span>
          </div>
          <div class="row-grid row-grid-5">
            ${stages.map(stage => {
              const stageTasks = tasks.filter(t => t.status === stage.id);
              return `
                <div class="pipeline-stage">
                  <div class="pipeline-title">
                    <span class="status-dot" style="background:${stage.color}"></span>
                    ${stage.label}
                    <span class="pipeline-count">${stageTasks.length}</span>
                  </div>
                  ${stageTasks.length > 0
                    ? stageTasks.map(t => Components.pipelineItem(t)).join('')
                    : '<div style="font-size:12px;color:var(--ga-muted);text-align:center;padding:20px">No items</div>'
                  }
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Task List -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">All Tasks</span>
          </div>
          ${Components.table(
            [
              { key: 'tier', label: 'Tier', render: v => Components.tierBadge(v) },
              { key: 'title', label: 'Task', render: v => `<strong>${v}</strong>` },
              { key: 'assignee', label: 'Owner', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${m.color}">${m.initials}</span> ${m.name.split(' ')[0]}` : v;
              }},
              { key: 'status', label: 'Status', render: v => Components.statusBadge(v) },
              { key: 'due', label: 'Due' },
              { key: 'tags', label: 'Tags', render: v => (v || []).map(t => Components.badge(t, 'muted')).join(' ') }
            ],
            tasks
          )}
        </div>

        <!-- Quick Links -->
        <div class="card" style="display:flex;gap:12px;align-items:center">
          <span style="font-size:13px;font-weight:600;color:var(--ga-navy)">Quick Links:</span>
          <a href="https://app.sendible.com" target="_blank" class="btn">&#128228; Sendible</a>
          <a href="https://www.canva.com" target="_blank" class="btn">&#127912; Canva</a>
        </div>
      </div>`;
  }

  return { render };
})();
