/* =====================================================================
   AvSocialOS v2 — Canva & Assets
   Template registry, brand palette, performance scoring, fatigue tracking,
   and template-to-post lineage.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > canva-assets.js
   ===================================================================== */

const CanvaPage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _templates = [];
  let _posts = [];
  let _utmTracking = [];
  let _filter = { status: 'all', platform: 'all', content_type: 'all' };
  let _selectedTemplateId = null;

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _scoreColor(score) {
    if (score >= 70) return 'var(--ga-green)';
    if (score >= 40) return 'var(--ga-amber)';
    return 'var(--ga-red)';
  }

  function _platformIcon(platformId) {
    const platforms = SeedData.getPlatforms();
    const p = platforms[(platformId || '').toLowerCase()];
    if (!p) return '';
    return `<span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>`;
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [templates, posts, utmTracking] = await Promise.all([
        API.templates.list(),
        API.posts.list(),
        API.utm_tracking.list()
      ]);
      _templates = templates || [];
      _posts = posts || [];
      _utmTracking = utmTracking || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load Canva data: ' + err.message, 'error');
      return;
    }

    const isFullAccess = Auth.getRole() === 'full_access';
    const isOperator = Auth.getRole() === 'operator' || isFullAccess;

    let html = '';
    html += Components.sectionHeader('Canva & Assets', 'Template registry, brand compliance, and performance lineage');

    // A. KPI Row
    html += _renderKPIRow();

    // B. Brand Color Palette
    html += _renderBrandPalette();

    // H. Platform/Objective Filter
    html += _renderFilterBar();

    // C. Template Registry Table
    html += _renderTemplateTable(isOperator);

    // D. Top Performers
    html += _renderTopPerformers();

    // E. Template-to-Post Lineage
    html += _renderLineageSection();

    // F. Orphan Templates
    html += _renderOrphanTemplates();

    // G. Template Fatigue Watchlist
    html += _renderFatigueWatchlist();

    container.innerHTML = html;

    // Attach filter listeners
    _attachFilterListeners(container, isOperator);
  }

  // ── Section A: KPI Row ──────────────────────────────────────────────

  function _renderKPIRow() {
    const totalTemplates = _templates.length;
    const liveCount = _templates.filter(t => t.status === 'live').length;
    const needsBuild = _templates.filter(t => t.status === 'needs_build').length;

    const scores = _templates.filter(t => typeof t.performance_score === 'number');
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, t) => sum + t.performance_score, 0) / scores.length)
      : 0;

    const top = [..._templates].sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0))[0];
    const topName = top ? top.name : '\u2014';

    let html = '<div class="kpi-row">';
    html += Components.kpiTile('Total Templates', totalTemplates, { icon: '&#128444;' });
    html += Components.kpiTile('Live', liveCount, { icon: '&#9989;', subtitle: 'Active templates' });
    html += Components.kpiTile('Needs Build', needsBuild, { icon: '&#128295;', subtitle: 'Awaiting design' });
    html += Components.kpiTile('Avg Performance', avgScore, { icon: '&#127942;', suffix: '/100' });
    html += Components.kpiTile('Top Template', topName, { icon: '&#11088;' });
    html += '</div>';
    return html;
  }

  // ── Section B: Brand Color Palette ──────────────────────────────────

  function _renderBrandPalette() {
    const colors = [
      { name: 'Navy',      hex: '#102297' },
      { name: 'Green',     hex: '#97CB00' },
      { name: 'Blue',      hex: '#4782D3' },
      { name: 'Red',       hex: '#E8503A' },
      { name: 'Amber',     hex: '#F59E0B' },
      { name: 'Off-White', hex: '#F4F5F7' }
    ];

    let html = Components.partHeader('B', 'Brand Color Palette');
    html += '<div class="color-palette">';
    colors.forEach(c => {
      const textColor = ['#F4F5F7', '#97CB00', '#F59E0B'].includes(c.hex) ? '#1e293b' : '#fff';
      html += `
        <div class="color-swatch" style="background:${c.hex};color:${textColor}">
          <div class="swatch-name">${c.name}</div>
          <div class="swatch-hex">${c.hex}</div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section H: Filter Bar ───────────────────────────────────────────

  function _renderFilterBar() {
    const statuses = ['all', 'live', 'needs_build', 'draft', 'retired'];
    const platformOptions = ['all', ...Object.keys(SeedData.getPlatforms())];
    const contentTypes = ['all', ...SeedData.getContentTypes().map(ct => ct.id)];

    let html = '<div class="filter-bar" id="canva-filter-bar">';

    html += '<label class="filter-label">Status: ';
    html += `<select id="canva-filter-status" class="form-select form-select-sm">`;
    statuses.forEach(s => {
      html += `<option value="${s}" ${_filter.status === s ? 'selected' : ''}>${s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>`;
    });
    html += '</select></label>';

    html += '<label class="filter-label">Platform: ';
    html += `<select id="canva-filter-platform" class="form-select form-select-sm">`;
    platformOptions.forEach(p => {
      const label = p === 'all' ? 'All Platforms' : (SeedData.getPlatforms()[p] || {}).name || p;
      html += `<option value="${p}" ${_filter.platform === p ? 'selected' : ''}>${label}</option>`;
    });
    html += '</select></label>';

    html += '<label class="filter-label">Content Type: ';
    html += `<select id="canva-filter-content" class="form-select form-select-sm">`;
    contentTypes.forEach(ct => {
      const label = ct === 'all' ? 'All Types' : (SeedData.getContentTypes().find(c => c.id === ct) || {}).name || ct;
      html += `<option value="${ct}" ${_filter.content_type === ct ? 'selected' : ''}>${label}</option>`;
    });
    html += '</select></label>';

    html += '</div>';
    return html;
  }

  // ── Section C: Template Registry Table ──────────────────────────────

  function _renderTemplateTable(isOperator) {
    const filtered = _getFilteredTemplates();

    const columns = [
      { key: 'template_id', label: 'ID' },
      { key: 'name', label: 'Name', render: (v) => `<strong>${_esc(v)}</strong>` },
      { key: 'status', label: 'Status', render: (v) => Components.statusBadge(v) },
      { key: 'platforms', label: 'Platforms', render: (v) => {
        if (!v || !Array.isArray(v)) return '\u2014';
        return v.map(pid => _platformIcon(pid)).join(' ');
      }},
      { key: 'content_types', label: 'Types', render: (v) => {
        if (!v || !Array.isArray(v)) return '\u2014';
        return v.map(ct => {
          const info = SeedData.getContentTypes().find(c => c.id === ct);
          return info ? `<span class="tag-sm">${info.icon} ${info.name}</span>` : ct;
        }).join(' ');
      }},
      { key: 'use_count', label: 'Uses' },
      { key: 'performance_score', label: 'Score', render: (v) => {
        const score = v || 0;
        return `<span style="color:${_scoreColor(score)};font-weight:600">${score}</span>`;
      }},
      { key: 'fatigue_flag', label: 'Fatigue', render: (v) => {
        return v ? '<span class="ga-badge ga-badge-amber">&#9888; Fatigued</span>' : '';
      }},
      { key: 'compliance_fail_rate', label: 'Fail %', render: (v) => v != null ? v + '%' : '\u2014' },
      { key: 'last_used', label: 'Last Used', render: (v) => _formatDate(v) }
    ];

    if (isOperator) {
      columns.push({
        key: '_actions', label: 'Actions', render: (v, row) => {
          return `<button class="btn btn-sm btn-secondary" onclick="CanvaPage._openEditModal('${_esc(row.template_id || row.id)}')">Edit</button>`;
        }
      });
    }

    let html = Components.partHeader('C', 'Template Registry');
    html += Components.table(columns, filtered, { id: 'template-registry-table', sortable: true, emptyMessage: 'No templates match the current filters.' });
    return html;
  }

  function _getFilteredTemplates() {
    return _templates.filter(t => {
      if (_filter.status !== 'all' && t.status !== _filter.status) return false;
      if (_filter.platform !== 'all') {
        const tPlatforms = t.platforms || [];
        if (!tPlatforms.includes(_filter.platform)) return false;
      }
      if (_filter.content_type !== 'all') {
        const tTypes = t.content_types || [];
        if (!tTypes.includes(_filter.content_type)) return false;
      }
      return true;
    });
  }

  // ── Section D: Top Performers ───────────────────────────────────────

  function _renderTopPerformers() {
    let html = Components.partHeader('D', 'Top Performers');

    const top5 = [..._templates]
      .filter(t => typeof t.performance_score === 'number')
      .sort((a, b) => b.performance_score - a.performance_score)
      .slice(0, 5);

    if (top5.length === 0) {
      html += '<div class="empty-inline">No scored templates yet.</div>';
      return html;
    }

    html += '<div class="top-performers-grid">';
    top5.forEach((t, i) => {
      const bestPlatform = (t.platforms || [])[0] || '\u2014';
      const pInfo = SeedData.getPlatforms()[(bestPlatform || '').toLowerCase()];
      html += `
        <div class="top-performer-card">
          <div class="top-performer-rank">#${i + 1}</div>
          <div class="top-performer-info">
            <div class="top-performer-name">${_esc(t.name)}</div>
            <div class="top-performer-score" style="color:${_scoreColor(t.performance_score)}">Score: ${t.performance_score}</div>
            <div class="top-performer-meta">
              Uses: ${t.use_count || 0}
              ${pInfo ? ` | Best: ${_platformIcon(bestPlatform)} ${pInfo.name}` : ''}
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section E: Template-to-Post Lineage ─────────────────────────────

  function _renderLineageSection() {
    let html = Components.partHeader('E', 'Template-to-Post Lineage');

    const templatesWithPosts = _templates.filter(t => (t.use_count || 0) > 0);
    if (templatesWithPosts.length === 0) {
      html += '<div class="empty-inline">No templates have linked posts yet.</div>';
      return html;
    }

    html += `<div class="lineage-selector" style="margin-bottom:12px">
      <label class="filter-label">Select Template:
        <select id="lineage-template-select" class="form-select form-select-sm" onchange="CanvaPage._showLineage(this.value)">
          <option value="">-- Select --</option>
          ${templatesWithPosts.map(t => `<option value="${_esc(t.template_id || t.id)}">${_esc(t.name)}</option>`).join('')}
        </select>
      </label>
    </div>`;
    html += '<div id="lineage-display"></div>';
    return html;
  }

  function _showLineage(templateId) {
    const display = document.getElementById('lineage-display');
    if (!display || !templateId) {
      if (display) display.innerHTML = '';
      return;
    }
    _selectedTemplateId = templateId;

    const linkedPosts = _posts.filter(p => p.template_id === templateId);
    if (linkedPosts.length === 0) {
      display.innerHTML = '<div class="empty-inline">No posts use this template.</div>';
      return;
    }

    const template = _templates.find(t => (t.template_id || t.id) === templateId);
    const nodes = [
      { label: template ? template.name : templateId, active: true }
    ];
    linkedPosts.forEach(p => {
      nodes.push({ label: _esc(p.title || 'Untitled'), active: false });
    });

    let html = Components.lineageChain(nodes);

    // Performance table for linked posts
    const utmMap = {};
    _utmTracking.forEach(u => { utmMap[u.post_id] = u; });

    html += '<div style="margin-top:12px">';
    const columns = [
      { key: 'title', label: 'Post' },
      { key: 'platform', label: 'Platform', render: (v) => _platformIcon((v || '').toLowerCase()) },
      { key: 'status', label: 'Status', render: (v) => Components.statusBadge(v) },
      { key: 'clicks', label: 'Clicks' },
      { key: 'engagement', label: 'Engagement' }
    ];
    const rows = linkedPosts.map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      return { ...p, clicks: utm.clicks || p.clicks || 0, engagement: utm.engagement || p.engagement || 0 };
    });
    html += Components.table(columns, rows, { id: 'lineage-post-table', sortable: true });
    html += '</div>';

    display.innerHTML = html;
  }

  // ── Section F: Orphan Templates ─────────────────────────────────────

  function _renderOrphanTemplates() {
    let html = Components.partHeader('F', 'Orphan Templates');

    const orphans = _templates.filter(t => (t.use_count || 0) === 0 && t.status === 'live');

    if (orphans.length === 0) {
      html += '<div class="empty-inline" style="color:var(--ga-green)">&#9989; No orphan templates. All live templates are in use.</div>';
      return html;
    }

    html += `<div style="margin-bottom:8px;color:var(--ga-amber);font-weight:600">&#9888; ${orphans.length} live template${orphans.length !== 1 ? 's' : ''} with zero uses</div>`;
    html += '<div class="orphan-list">';
    orphans.forEach(t => {
      html += `
        <div class="orphan-item">
          <span class="orphan-name">${_esc(t.name)}</span>
          <span class="orphan-meta">ID: ${_esc(t.template_id || t.id)} | Created: ${_formatDate(t.created_at)}</span>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section G: Template Fatigue Watchlist ────────────────────────────

  function _renderFatigueWatchlist() {
    let html = Components.partHeader('G', 'Template Fatigue Watchlist');

    const fatigued = _templates.filter(t => t.fatigue_flag === true);

    if (fatigued.length === 0) {
      html += '<div class="empty-inline" style="color:var(--ga-green)">&#9989; No templates flagged for fatigue.</div>';
      return html;
    }

    const columns = [
      { key: 'name', label: 'Template', render: (v) => `<strong>${_esc(v)}</strong>` },
      { key: 'use_count', label: 'Uses' },
      { key: 'performance_score', label: 'Score', render: (v) => {
        const score = v || 0;
        return `<span style="color:${_scoreColor(score)};font-weight:600">${score}</span>`;
      }},
      { key: 'last_used', label: 'Last Used', render: (v) => _formatDate(v) }
    ];

    html += Components.table(columns, fatigued, { id: 'fatigue-table', sortable: true });
    return html;
  }

  // ── Edit Modal ──────────────────────────────────────────────────────

  function _openEditModal(templateId) {
    const template = _templates.find(t => (t.template_id || t.id) === templateId);
    if (!template) {
      Components.showToast('Template not found', 'error');
      return;
    }

    if (!Auth.can('update', 'templates', template)) {
      Components.showToast('Permission denied', 'error');
      return;
    }

    const statuses = ['draft', 'needs_build', 'live', 'retired'];

    const bodyHtml = `
      <form id="edit-template-form">
        ${Components.formGroup('Name', Components.formInput('name', template.name, { id: 'tpl-name' }), { required: true, id: 'tpl-name' })}
        ${Components.formGroup('Status', Components.formSelect('status', statuses.map(s => ({ value: s, label: s.replace(/_/g, ' ') })), template.status, { id: 'tpl-status' }), { id: 'tpl-status' })}
        ${Components.formGroup('Canva URL', Components.formInput('canva_url', template.canva_url || '', { id: 'tpl-canva-url', placeholder: 'https://www.canva.com/design/...' }), { id: 'tpl-canva-url' })}
        ${Components.formGroup('Notes', Components.formTextarea('notes', template.notes || '', { id: 'tpl-notes', rows: 3 }), { id: 'tpl-notes' })}
      </form>
    `;

    const modalHtml = Components.modal('Edit Template', bodyHtml, {
      id: 'edit-template-modal',
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: `Components.closeModal('edit-template-modal')` },
        { label: 'Save', class: 'btn-primary', onClick: `CanvaPage._saveTemplate('${_esc(templateId)}')` }
      ]
    });

    Components.showModal(modalHtml);
  }

  async function _saveTemplate(templateId) {
    const form = document.getElementById('edit-template-form');
    if (!form) return;

    const data = {
      name: form.querySelector('[name="name"]').value.trim(),
      status: form.querySelector('[name="status"]').value,
      canva_url: form.querySelector('[name="canva_url"]').value.trim(),
      notes: form.querySelector('[name="notes"]').value.trim()
    };

    try {
      await API.templates.update(templateId, data);
      Components.closeModal('edit-template-modal');
      Components.showToast('Template updated', 'success');
      Events.log(Events.EVENTS.POST_UPDATED, { entity: 'template', template_id: templateId });

      // Re-render
      const container = document.querySelector('[data-page="canva-assets"]') || document.getElementById('page-content');
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Save failed: ' + err.message, 'error');
    }
  }

  // ── Filter Listeners ────────────────────────────────────────────────

  function _attachFilterListeners(container, isOperator) {
    const statusEl = container.querySelector('#canva-filter-status');
    const platformEl = container.querySelector('#canva-filter-platform');
    const contentEl = container.querySelector('#canva-filter-content');

    const reRender = () => {
      _filter.status = statusEl ? statusEl.value : 'all';
      _filter.platform = platformEl ? platformEl.value : 'all';
      _filter.content_type = contentEl ? contentEl.value : 'all';

      // Re-render table section only
      const tableWrapper = container.querySelector('#template-registry-table');
      if (tableWrapper) {
        const tableParent = tableWrapper.closest('.table-wrapper')?.parentElement;
        if (tableParent) {
          // Find the part-header + table area and replace
          const partHeader = tableParent.querySelector('.part-header');
          if (partHeader) {
            const newHtml = _renderTemplateTable(isOperator);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newHtml;
            // Replace from part header through table
            partHeader.parentElement.innerHTML = newHtml;
          }
        }
      }
    };

    if (statusEl) statusEl.addEventListener('change', reRender);
    if (platformEl) platformEl.addEventListener('change', reRender);
    if (contentEl) contentEl.addEventListener('change', reRender);
  }

  // ── Public ──────────────────────────────────────────────────────────

  return {
    render,
    _openEditModal,
    _saveTemplate,
    _showLineage
  };
})();
