/* =====================================================================
   AvSocialOS v2 — Post Library & Learnings Engine
   Published post archive, outcome tracking, pattern extraction,
   and best-format/CTA intelligence. NEW module for Phase 2.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > library.js
   ===================================================================== */

const LibraryPage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _posts = [];
  let _learnings = [];
  let _templates = [];
  let _utmTracking = [];
  let _series = [];
  let _filter = {
    search: '', platform: 'all', content_type: 'all', cta_type: 'all',
    category: 'all', template: 'all', series: 'all', assignee: 'all',
    pilot_first: 'all', outcome_class: 'all'
  };

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _formatNum(n) {
    if (n == null) return '\u2014';
    return Number(n).toLocaleString();
  }

  function _platformIcon(platformId) {
    const platforms = SeedData.getPlatforms();
    const p = platforms[(platformId || '').toLowerCase()];
    if (!p) return '';
    return `<span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>`;
  }

  function _outcomeBadge(outcomeClass) {
    const map = {
      winner:          { label: 'Winner', color: 'green' },
      average:         { label: 'Average', color: 'blue' },
      underperformer:  { label: 'Under', color: 'red' }
    };
    const o = map[outcomeClass] || { label: outcomeClass || '\u2014', color: 'muted' };
    return `<span class="ga-badge ga-badge-${o.color}">${o.label}</span>`;
  }

  function _getUtmMap() {
    const map = {};
    _utmTracking.forEach(u => { map[u.post_id] = u; });
    return map;
  }

  function _getLearningMap() {
    const map = {};
    _learnings.forEach(l => { map[l.post_id] = l; });
    return map;
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [posts, learnings, templates, utmTracking, series] = await Promise.all([
        API.posts.list(),
        API.post_learnings.list(),
        API.templates.list(),
        API.utm_tracking.list(),
        API.series.list()
      ]);
      _posts = (posts || []).filter(p => p.status === 'published');
      _learnings = learnings || [];
      _templates = templates || [];
      _utmTracking = utmTracking || [];
      _series = series || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load library data: ' + err.message, 'error');
      return;
    }

    let html = '';
    html += Components.sectionHeader('Post Library & Learnings', 'Published post archive — extract patterns, track outcomes, build intelligence');

    // A. KPI Row
    html += _renderKPIRow();

    // B. Search & Filter Bar
    html += _renderFilterBar();

    // C. Post Archive Table
    html += '<div id="library-table-container">';
    html += _renderPostArchiveTable();
    html += '</div>';

    // D. Best Format by Objective
    html += _renderBestFormat();

    // E. Best CTA by Platform
    html += _renderBestCTAByPlatform();

    // F. Top Winners
    html += _renderTopWinners();

    // G. Template Lineage View
    html += _renderTemplateLineage();

    // H. Reusable Patterns
    html += _renderReusablePatterns();

    // I. Learning Notes (add/edit)
    html += _renderLearningNotes();

    container.innerHTML = html;
    _attachListeners(container);
  }

  // ── Section A: KPI Row ──────────────────────────────────────────────

  function _renderKPIRow() {
    const learningCov = Formulas.learningCoverage(_posts, _learnings);
    const learningMap = _getLearningMap();
    const winners = _posts.filter(p => {
      const l = learningMap[p.id || p.post_id];
      return l && l.outcome_class === 'winner';
    });

    const utmMap = _getUtmMap();
    let totalSessions = 0, totalQI = 0;
    _posts.forEach(p => {
      const u = utmMap[p.id || p.post_id] || {};
      totalSessions += u.sessions || p.sessions || 0;
      totalQI += u.qi || p.qi || 0;
    });
    const avgSessionRate = _posts.length > 0 ? Math.round((totalSessions / _posts.length) * 100) / 100 : 0;
    const avgQIYield = _posts.length > 0 ? Math.round((totalQI / _posts.length) * 100) / 100 : 0;

    let html = '<div class="kpi-row">';
    html += Components.kpiTile('Published Posts', _posts.length, { icon: '&#128214;' });
    html += Components.kpiTile('Learning Coverage', learningCov.percentage, { icon: '&#128218;', suffix: '%', subtitle: `${learningCov.covered} of ${learningCov.total}` });
    html += Components.kpiTile('Winners', winners.length, { icon: '&#127942;' });
    html += Components.kpiTile('Avg Session Rate', avgSessionRate, { icon: '&#128200;', subtitle: 'sessions per post' });
    html += Components.kpiTile('Avg QI Yield', avgQIYield, { icon: '&#127919;', subtitle: 'QI per post' });
    html += '</div>';
    return html;
  }

  // ── Section B: Search & Filter Bar ──────────────────────────────────

  function _renderFilterBar() {
    const platforms = SeedData.getPlatforms();
    const contentTypes = SeedData.getContentTypes();
    const ctaTypes = SeedData.getCtaTypes();
    const categories = SeedData.getCategories();
    const team = SeedData.getTeam();

    let html = '<div class="filter-bar library-filter-bar" id="library-filter-bar">';

    // Search
    html += `<input type="text" id="library-search" class="form-input form-input-sm" placeholder="Search by title..." value="${_esc(_filter.search)}">`;

    // Platform
    html += _selectFilter('library-filter-platform', 'Platform', 'all',
      [{ value: 'all', label: 'All Platforms' }, ...Object.keys(platforms).map(k => ({ value: k, label: platforms[k].name }))],
      _filter.platform);

    // Content Type
    html += _selectFilter('library-filter-content', 'Type', 'all',
      [{ value: 'all', label: 'All Types' }, ...contentTypes.map(c => ({ value: c.id, label: c.name }))],
      _filter.content_type);

    // CTA
    html += _selectFilter('library-filter-cta', 'CTA', 'all',
      [{ value: 'all', label: 'All CTAs' }, ...ctaTypes.map(c => ({ value: c.id, label: c.name }))],
      _filter.cta_type);

    // Category
    html += _selectFilter('library-filter-category', 'Category', 'all',
      [{ value: 'all', label: 'All Categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))],
      _filter.category);

    // Assignee
    html += _selectFilter('library-filter-assignee', 'Assignee', 'all',
      [{ value: 'all', label: 'All Assignees' }, ...team.map(m => ({ value: m.id, label: m.name }))],
      _filter.assignee);

    // Pilot-First
    html += _selectFilter('library-filter-pilot', 'Pilot-First', 'all',
      [{ value: 'all', label: 'All' }, { value: 'yes', label: 'Pilot-First' }, { value: 'no', label: 'Commercial' }],
      _filter.pilot_first);

    // Outcome
    html += _selectFilter('library-filter-outcome', 'Outcome', 'all',
      [{ value: 'all', label: 'All Outcomes' }, { value: 'winner', label: 'Winner' }, { value: 'average', label: 'Average' }, { value: 'underperformer', label: 'Underperformer' }],
      _filter.outcome_class);

    html += '</div>';
    return html;
  }

  function _selectFilter(id, label, defaultVal, options, currentVal) {
    let html = `<select id="${id}" class="form-select form-select-sm" aria-label="${label}">`;
    options.forEach(o => {
      html += `<option value="${o.value}" ${o.value === currentVal ? 'selected' : ''}>${_esc(o.label)}</option>`;
    });
    html += '</select>';
    return html;
  }

  // ── Section C: Post Archive Table ───────────────────────────────────

  function _renderPostArchiveTable() {
    const filtered = _getFilteredPosts();
    const utmMap = _getUtmMap();
    const learningMap = _getLearningMap();
    const team = SeedData.getTeam();

    const rows = filtered.map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      const learning = learningMap[p.id || p.post_id] || {};
      const tmpl = _templates.find(t => (t.template_id || t.id) === p.template_id);
      const ser = _series.find(s => (s.series_id || s.id) === p.series_id);
      return {
        ...p,
        template_name: tmpl ? tmpl.name : '\u2014',
        series_name: ser ? ser.name : '\u2014',
        clicks: utm.clicks || p.clicks || 0,
        sessions: utm.sessions || p.sessions || 0,
        qi: utm.qi || p.qi || 0,
        engagement: utm.engagement || p.engagement || 0,
        outcome_class: learning.outcome_class || ''
      };
    });

    const columns = [
      { key: 'scheduled_at', label: 'Date', render: (v) => _formatDate(v) },
      { key: 'title', label: 'Title', render: (v) => `<strong>${_esc(v || 'Untitled')}</strong>` },
      { key: 'platform', label: 'Platform', render: (v) => _platformIcon((v || '').toLowerCase()) },
      { key: 'content_type', label: 'Type', render: (v) => {
        const info = SeedData.getContentTypes().find(c => c.id === v);
        return info ? info.icon + ' ' + info.name : _esc(v || '\u2014');
      }},
      { key: 'template_name', label: 'Template' },
      { key: 'cta_type', label: 'CTA', render: (v) => {
        const info = SeedData.getCtaTypes().find(c => c.id === v);
        return info ? info.name : _esc(v || '\u2014');
      }},
      { key: 'series_name', label: 'Series' },
      { key: 'assignee', label: 'Assignee', render: (v) => {
        const m = team.find(t => t.id === v);
        return m ? `<span class="avatar-inline" style="background:${m.color}">${m.initials}</span>` : _esc(v || '\u2014');
      }},
      { key: 'pilot_first_flag', label: 'Pilot', render: (v) => {
        return v ? '<span class="ga-badge ga-badge-green">PF</span>' : '';
      }},
      { key: 'clicks', label: 'Clicks' },
      { key: 'sessions', label: 'Sessions' },
      { key: 'qi', label: 'QI' },
      { key: 'engagement', label: 'Eng' },
      { key: 'outcome_class', label: 'Outcome', render: (v) => v ? _outcomeBadge(v) : '\u2014' }
    ];

    return Components.table(columns, rows, {
      id: 'library-archive-table',
      sortable: true,
      emptyMessage: 'No published posts match the current filters.'
    });
  }

  function _getFilteredPosts() {
    const learningMap = _getLearningMap();
    return _posts.filter(p => {
      if (_filter.search && !(p.title || '').toLowerCase().includes(_filter.search.toLowerCase())) return false;
      if (_filter.platform !== 'all' && (p.platform || '').toLowerCase() !== _filter.platform) return false;
      if (_filter.content_type !== 'all' && p.content_type !== _filter.content_type) return false;
      if (_filter.cta_type !== 'all' && p.cta_type !== _filter.cta_type) return false;
      if (_filter.category !== 'all' && p.category !== _filter.category) return false;
      if (_filter.assignee !== 'all' && p.assignee !== _filter.assignee) return false;
      if (_filter.pilot_first === 'yes' && !p.pilot_first_flag) return false;
      if (_filter.pilot_first === 'no' && p.pilot_first_flag) return false;
      if (_filter.template !== 'all' && p.template_id !== _filter.template) return false;
      if (_filter.series !== 'all' && p.series_id !== _filter.series) return false;
      if (_filter.outcome_class !== 'all') {
        const l = learningMap[p.id || p.post_id];
        if (!l || l.outcome_class !== _filter.outcome_class) return false;
      }
      return true;
    });
  }

  // ── Section D: Best Format by Objective ─────────────────────────────

  function _renderBestFormat() {
    let html = Components.partHeader('D', 'Best Format by Objective');

    const utmMap = _getUtmMap();
    const formatGroups = {};

    _posts.forEach(p => {
      const ct = p.content_type;
      if (!ct) return;
      if (!formatGroups[ct]) formatGroups[ct] = { clicks: 0, sessions: 0, qi: 0, count: 0 };
      const utm = utmMap[p.id || p.post_id] || {};
      formatGroups[ct].clicks += utm.clicks || p.clicks || 0;
      formatGroups[ct].sessions += utm.sessions || p.sessions || 0;
      formatGroups[ct].qi += utm.qi || p.qi || 0;
      formatGroups[ct].count++;
    });

    const rows = Object.entries(formatGroups).map(([ct, data]) => {
      const info = SeedData.getContentTypes().find(c => c.id === ct);
      return {
        content_type: info ? `${info.icon} ${info.name}` : ct,
        avg_clicks: Math.round(data.clicks / data.count * 10) / 10,
        avg_sessions: Math.round(data.sessions / data.count * 10) / 10,
        avg_qi: Math.round(data.qi / data.count * 10) / 10,
        count: data.count
      };
    }).sort((a, b) => b.avg_clicks - a.avg_clicks);

    if (rows.length === 0) {
      html += '<div class="empty-inline">No format data yet.</div>';
      return html;
    }

    // Highlight top 3
    rows.slice(0, 3).forEach(r => { r._rowClass = 'row-highlight-green'; });

    const columns = [
      { key: 'content_type', label: 'Format' },
      { key: 'avg_clicks', label: 'Avg Clicks' },
      { key: 'avg_sessions', label: 'Avg Sessions' },
      { key: 'avg_qi', label: 'Avg QI' },
      { key: 'count', label: 'Posts' }
    ];

    html += Components.table(columns, rows, { id: 'best-format-table', sortable: true });
    return html;
  }

  // ── Section E: Best CTA by Platform ─────────────────────────────────

  function _renderBestCTAByPlatform() {
    let html = Components.partHeader('E', 'Best CTA by Platform');

    const platforms = SeedData.getPlatforms();
    const utmMap = _getUtmMap();

    html += '<div class="best-cta-grid">';
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const platPosts = _posts.filter(pp => (pp.platform || '').toLowerCase() === pid && pp.cta_type);
      const ctaGroups = {};

      platPosts.forEach(pp => {
        const cta = pp.cta_type;
        if (!ctaGroups[cta]) ctaGroups[cta] = { clicks: 0, sessions: 0, qi: 0, count: 0 };
        const utm = utmMap[pp.id || pp.post_id] || {};
        ctaGroups[cta].clicks += utm.clicks || pp.clicks || 0;
        ctaGroups[cta].sessions += utm.sessions || pp.sessions || 0;
        ctaGroups[cta].qi += utm.qi || pp.qi || 0;
        ctaGroups[cta].count++;
      });

      const bestCta = Object.entries(ctaGroups)
        .map(([cta, data]) => ({
          cta,
          label: (SeedData.getCtaTypes().find(c => c.id === cta) || {}).name || cta,
          avgClicks: data.count > 0 ? Math.round(data.clicks / data.count) : 0
        }))
        .sort((a, b) => b.avgClicks - a.avgClicks)[0];

      html += `
        <div class="best-cta-card" style="border-top:3px solid ${p.color}">
          <div class="best-cta-platform">${_platformIcon(pid)} ${p.name}</div>
          ${bestCta
            ? `<div class="best-cta-winner"><strong>${_esc(bestCta.label)}</strong><br><span class="text-muted">${bestCta.avgClicks} avg clicks</span></div>`
            : '<div class="text-muted">No CTA data</div>'}
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section F: Top Winners ──────────────────────────────────────────

  function _renderTopWinners() {
    let html = Components.partHeader('F', 'Top Winners');

    const learningMap = _getLearningMap();
    const utmMap = _getUtmMap();

    const winners = _posts.filter(p => {
      const l = learningMap[p.id || p.post_id];
      return l && l.outcome_class === 'winner';
    }).map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      return {
        ...p,
        clicks: utm.clicks || p.clicks || 0,
        sessions: utm.sessions || p.sessions || 0,
        qi: utm.qi || p.qi || 0,
        engagement: utm.engagement || p.engagement || 0
      };
    });

    if (winners.length === 0) {
      html += '<div class="empty-inline">No posts classified as winners yet. Add outcome classifications in Learning Notes.</div>';
      return html;
    }

    html += '<div class="winners-grid">';
    winners.forEach(p => {
      html += `
        <div class="winner-card">
          <div class="winner-title">${_esc(p.title || 'Untitled')}</div>
          <div class="winner-meta">
            ${_platformIcon((p.platform || '').toLowerCase())}
            <span>${p.clicks} clicks</span>
            <span>${p.sessions} sessions</span>
            <span>${p.qi} QI</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="LibraryPage._recreatePattern('${_esc(p.id || p.post_id)}')">
            Recreate Pattern
          </button>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function _recreatePattern(postId) {
    const post = _posts.find(p => (p.id || p.post_id) === postId);
    if (!post) {
      Components.showToast('Post not found', 'error');
      return;
    }

    // Pre-fill a brief from the winning post metadata
    const briefData = {
      content_type: post.content_type || '',
      platform: post.platform || '',
      category: post.category || '',
      cta_type: post.cta_type || '',
      pilot_first_flag: post.pilot_first_flag || false,
      template_id: post.template_id || '',
      series_id: post.series_id || '',
      notes: `Pattern recreated from winning post: ${post.title || postId}`
    };

    // Store for intake page to pick up
    if (typeof Store !== 'undefined') {
      Store.set('library_pattern_brief', briefData);
    }

    Components.showToast('Pattern saved. Navigate to Intake to create a new brief from this pattern.', 'success');
    Events.log('social_pattern_recreated', { source_post_id: postId });
  }

  // ── Section G: Template Lineage View ────────────────────────────────

  function _renderTemplateLineage() {
    let html = Components.partHeader('G', 'Template Lineage View');

    const usedTemplates = _templates.filter(t => _posts.some(p => p.template_id === (t.template_id || t.id)));
    if (usedTemplates.length === 0) {
      html += '<div class="empty-inline">No templates linked to published posts.</div>';
      return html;
    }

    html += `<div class="lineage-selector" style="margin-bottom:12px">
      <label class="filter-label">Select Template:
        <select id="library-lineage-select" class="form-select form-select-sm" onchange="LibraryPage._showTemplateLineage(this.value)">
          <option value="">-- Select --</option>
          ${usedTemplates.map(t => `<option value="${_esc(t.template_id || t.id)}">${_esc(t.name)}</option>`).join('')}
        </select>
      </label>
    </div>`;
    html += '<div id="library-lineage-display"></div>';
    return html;
  }

  function _showTemplateLineage(templateId) {
    const display = document.getElementById('library-lineage-display');
    if (!display || !templateId) { if (display) display.innerHTML = ''; return; }

    const learningMap = _getLearningMap();
    const utmMap = _getUtmMap();
    const linked = _posts.filter(p => p.template_id === templateId);

    if (linked.length === 0) {
      display.innerHTML = '<div class="empty-inline">No published posts use this template.</div>';
      return;
    }

    const template = _templates.find(t => (t.template_id || t.id) === templateId);
    const winnerCount = linked.filter(p => {
      const l = learningMap[p.id || p.post_id];
      return l && l.outcome_class === 'winner';
    }).length;

    let html = `<div style="margin-bottom:8px;font-size:13px"><strong>${_esc(template ? template.name : templateId)}</strong> produced <strong>${winnerCount}</strong> winner${winnerCount !== 1 ? 's' : ''} out of <strong>${linked.length}</strong> posts.</div>`;

    const columns = [
      { key: 'title', label: 'Post', render: (v) => `<strong>${_esc(v || 'Untitled')}</strong>` },
      { key: 'platform', label: 'Platform', render: (v) => _platformIcon((v || '').toLowerCase()) },
      { key: 'clicks', label: 'Clicks' },
      { key: 'outcome', label: 'Outcome', render: (v) => v ? _outcomeBadge(v) : '\u2014' }
    ];

    const rows = linked.map(p => {
      const utm = utmMap[p.id || p.post_id] || {};
      const l = learningMap[p.id || p.post_id] || {};
      return { ...p, clicks: utm.clicks || p.clicks || 0, outcome: l.outcome_class || '' };
    });

    html += Components.table(columns, rows, { id: 'library-lineage-table', sortable: true });
    display.innerHTML = html;
  }

  // ── Section H: Reusable Patterns ────────────────────────────────────

  function _renderReusablePatterns() {
    let html = Components.partHeader('H', 'Reusable Patterns');

    const reusable = _learnings.filter(l => l.reusable_pattern_flag === true);

    if (reusable.length === 0) {
      html += '<div class="empty-inline">No reusable patterns flagged yet. Mark patterns in Learning Notes below.</div>';
      return html;
    }

    html += '<div class="reusable-patterns-list">';
    reusable.forEach(l => {
      const post = _posts.find(p => (p.id || p.post_id) === l.post_id);
      html += `
        <div class="pattern-card">
          <div class="pattern-title">${_esc(post ? post.title : l.post_id)}</div>
          <div class="pattern-notes">${_esc(l.pattern_notes || 'No notes')}</div>
          <div class="pattern-meta">
            ${post ? _platformIcon((post.platform || '').toLowerCase()) : ''}
            ${l.outcome_class ? _outcomeBadge(l.outcome_class) : ''}
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  // ── Section I: Learning Notes ───────────────────────────────────────

  function _renderLearningNotes() {
    let html = Components.partHeader('I', 'Learning Notes');
    html += '<p style="font-size:13px;color:var(--ga-muted);margin-bottom:12px">Select a published post to add or edit its outcome classification and learning notes.</p>';

    html += `<div style="margin-bottom:12px">
      <select id="learning-post-select" class="form-select" onchange="LibraryPage._loadLearningForm(this.value)">
        <option value="">-- Select a post --</option>
        ${_posts.map(p => `<option value="${_esc(p.id || p.post_id)}">${_esc(p.title || 'Untitled')} (${_esc(p.platform || '')})</option>`).join('')}
      </select>
    </div>`;
    html += '<div id="learning-form-container"></div>';
    return html;
  }

  function _loadLearningForm(postId) {
    const container = document.getElementById('learning-form-container');
    if (!container || !postId) { if (container) container.innerHTML = ''; return; }

    const learningMap = _getLearningMap();
    const existing = learningMap[postId] || {};

    const outcomeOptions = [
      { value: '', label: 'Not Classified' },
      { value: 'winner', label: 'Winner' },
      { value: 'average', label: 'Average' },
      { value: 'underperformer', label: 'Underperformer' }
    ];

    let html = `
      <form id="learning-form" class="learning-form" style="max-width:500px">
        ${Components.formGroup('Outcome Class',
          Components.formSelect('outcome_class', outcomeOptions, existing.outcome_class || '', { id: 'ln-outcome' }),
          { id: 'ln-outcome' })}
        ${Components.formGroup('Pattern Notes',
          Components.formTextarea('pattern_notes', existing.pattern_notes || '', { id: 'ln-notes', rows: 3, placeholder: 'What made this post succeed or fail?' }),
          { id: 'ln-notes' })}
        ${Components.formCheckbox('reusable_pattern_flag', 'Mark as reusable pattern', existing.reusable_pattern_flag === true)}
        <div style="margin-top:12px">
          <button type="button" class="btn btn-primary" onclick="LibraryPage._saveLearning('${_esc(postId)}', ${existing.id ? `'${_esc(existing.id)}'` : 'null'})">
            ${existing.id ? 'Update' : 'Save'} Learning
          </button>
        </div>
      </form>`;

    container.innerHTML = html;
  }

  async function _saveLearning(postId, learningId) {
    const form = document.getElementById('learning-form');
    if (!form) return;

    const data = {
      post_id: postId,
      outcome_class: form.querySelector('[name="outcome_class"]').value,
      pattern_notes: form.querySelector('[name="pattern_notes"]').value.trim(),
      reusable_pattern_flag: form.querySelector('[name="reusable_pattern_flag"]').checked
    };

    try {
      if (learningId) {
        await API.post_learnings.update(learningId, data);
      } else {
        await API.post_learnings.create(data);
      }
      Components.showToast('Learning saved', 'success');
      Events.log('social_learning_saved', { post_id: postId });

      // Re-render
      const container = document.querySelector('[data-page="library"]') || document.getElementById('page-content');
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Save failed: ' + err.message, 'error');
    }
  }

  // ── Filter Listeners ────────────────────────────────────────────────

  function _attachListeners(container) {
    const ids = {
      search: 'library-search',
      platform: 'library-filter-platform',
      content_type: 'library-filter-content',
      cta_type: 'library-filter-cta',
      category: 'library-filter-category',
      assignee: 'library-filter-assignee',
      pilot_first: 'library-filter-pilot',
      outcome_class: 'library-filter-outcome'
    };

    const reRender = () => {
      Object.entries(ids).forEach(([key, id]) => {
        const el = container.querySelector('#' + id);
        if (el) _filter[key] = el.value;
      });
      const tableContainer = container.querySelector('#library-table-container');
      if (tableContainer) {
        tableContainer.innerHTML = _renderPostArchiveTable();
      }
    };

    Object.values(ids).forEach(id => {
      const el = container.querySelector('#' + id);
      if (el) {
        el.addEventListener(el.type === 'text' ? 'input' : 'change', reRender);
      }
    });
  }

  // ── Public ──────────────────────────────────────────────────────────

  return {
    render,
    _recreatePattern,
    _showTemplateLineage,
    _loadLearningForm,
    _saveLearning
  };
})();
