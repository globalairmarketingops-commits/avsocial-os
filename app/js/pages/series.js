/* =====================================================================
   AvSocialOS v2 — Campaign / Series Orchestration
   Series lifecycle management, asset tracking, outcome attribution,
   and cross-platform coverage analysis.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > series.js
   ===================================================================== */

const SeriesPage = (() => {
  'use strict';

  let _container = null;
  let _series = [];
  let _posts = [];
  let _utmData = [];
  let _detailSeriesId = null;

  const PLATFORMS = SeedData.getPlatforms();
  const TEAM = SeedData.getTeam();
  const SERIES_TYPES = SeedData.getSeriesTypes();

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading series data...', '', null);

    try {
      const results = await Promise.all([
        API.series.list(),
        API.posts.list(),
        API.utm_tracking.list()
      ]);
      _series = results[0] || [];
      _posts = results[1] || [];
      _utmData = results[2] || [];
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load series data: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[SeriesPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    const activeSeries = _series.filter(function (s) { return s.status !== 'completed'; });
    const completedSeries = _series.filter(function (s) { return s.status === 'completed'; });

    // KPI computations
    const totalPlanned = _series.reduce(function (sum, s) { return sum + (s.planned_assets || s.planned || 0); }, 0);
    const completionResult = Formulas.seriesCompletion(_series);
    const completionRate = completionResult.overall || 0;

    // Avg series yield: total QI across series-linked posts / series count
    const seriesPostOutcomes = _computeAllSeriesOutcomes();
    const totalQI = Object.values(seriesPostOutcomes).reduce(function (sum, o) { return sum + o.qi; }, 0);
    const avgYield = _series.length > 0 ? Math.round((totalQI / _series.length) * 10) / 10 : 0;

    _container.innerHTML =
      '<div class="domain-page">' +

      // Section Header
      Components.sectionHeader(
        'Campaign / Series Orchestration',
        'Multi-post campaign management, asset tracking, and outcome attribution'
      ) +

      // Part A: KPI Row
      '<div>' +
        Components.partHeader('A', 'Series KPIs') +
        '<div class="row-grid row-grid-4">' +
          Components.kpiTile('Active Series', activeSeries.length) +
          Components.kpiTile('Total Planned Assets', totalPlanned) +
          Components.kpiTile('Completion Rate', completionRate, { suffix: '%' }) +
          Components.kpiTile('Avg Series QI Yield', avgYield) +
        '</div>' +
      '</div>' +

      // Part B: Active Series Board
      '<div>' +
        Components.partHeader('B', 'Active Series Board') +
        (Auth.can('create', 'series')
          ? '<div style="margin-bottom:12px"><button class="btn btn-primary" onclick="SeriesPage.openCreateModal()">+ New Series</button></div>'
          : '') +
        (activeSeries.length === 0
          ? Components.emptyState('&#128203;', 'No active series. Create one to start orchestrating campaigns.', '', null)
          : '<div class="row-grid row-grid-3">' + activeSeries.map(function (s) { return _renderSeriesCard(s); }).join('') + '</div>') +
      '</div>' +

      // Part D: Series Detail View (injected on card click)
      '<div id="series-detail-container"></div>' +

      // Part E: Completed Series
      '<div>' +
        Components.partHeader('E', 'Completed Series') +
        _renderCompletedTable(completedSeries) +
      '</div>' +

      // Part F: Series Types Reference
      '<div>' +
        Components.partHeader('F', 'Series Types Reference') +
        '<div class="row-grid row-grid-3">' +
          SERIES_TYPES.map(function (st) {
            return '<div class="card">' +
              '<div class="card-title" style="font-size:14px;font-weight:600">' + _esc(st.name) + '</div>' +
              '<div style="font-size:12px;color:var(--ga-muted)">' + _esc(st.id.replace(/_/g, ' ')) + ' campaign type</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Modal container
      '<div id="modal-container"></div>' +

      '</div>';

    // Re-open detail if one was selected
    if (_detailSeriesId) {
      _showSeriesDetail(_detailSeriesId);
    }
  }

  // ── Series Card ───────────────────────────────────────────────────

  function _renderSeriesCard(s) {
    const planned = s.planned_assets || s.planned || 0;
    const completed = s.completed_assets || s.completed || 0;
    const active = s.active_assets || 0;
    const missing = Math.max(0, planned - active - completed);
    const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    const outcomes = _getSeriesOutcomes(s.series_id || s.id);
    const typeMeta = SERIES_TYPES.find(function (t) { return t.id === s.series_type; });
    const owner = TEAM.find(function (m) { return m.id === s.owner; });

    const statusMap = {
      planning: 'amber', active: 'green', completed: 'green', paused: 'muted'
    };
    const statusColor = statusMap[s.status] || 'blue';

    const platformBadges = (s.platforms || []).map(function (pid) {
      var p = PLATFORMS[pid];
      if (!p) return '';
      return '<span class="platform-icon" style="background:' + p.color + ';width:20px;height:20px;font-size:9px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;margin-right:2px">' + p.icon + '</span>';
    }).join('');

    return '<div class="card" style="cursor:pointer;border-left:4px solid var(--ga-blue)" onclick="SeriesPage.showDetail(\'' + _esc(s.series_id || s.id) + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
        '<div>' +
          '<div style="font-weight:700;font-size:14px;color:var(--ga-navy)">' + _esc(s.name) + '</div>' +
          '<div style="display:flex;gap:4px;margin-top:4px">' +
            (typeMeta ? Components.badge(typeMeta.name, 'blue') : '') +
            Components.badge(s.status || 'draft', statusColor) +
          '</div>' +
        '</div>' +
        (owner
          ? '<span class="avatar" style="width:28px;height:28px;font-size:10px;background:' + owner.color + '">' + owner.initials + '</span>'
          : '') +
      '</div>' +

      // Progress bar
      '<div style="margin-bottom:8px">' +
        '<div style="font-size:11px;color:var(--ga-muted);margin-bottom:4px">' + completed + ' / ' + planned + ' assets (' + pct + '%)</div>' +
        Components.progressBar(completed, planned || 1, 'var(--ga-green)') +
      '</div>' +

      // Platform badges
      '<div style="margin-bottom:6px">' + platformBadges + '</div>' +

      // UTM campaign
      (s.linked_utm_campaign
        ? '<div style="font-size:11px;color:var(--ga-muted)">UTM: <strong>' + _esc(s.linked_utm_campaign) + '</strong></div>'
        : '') +

      // Dates
      '<div style="font-size:11px;color:var(--ga-muted);margin-top:4px">' +
        (s.start_date ? Components.formatDate(s.start_date) : '?') +
        ' &rarr; ' +
        (s.end_date ? Components.formatDate(s.end_date) : '?') +
      '</div>' +

      // Missing assets
      (missing > 0
        ? '<div style="font-size:11px;color:var(--ga-red);margin-top:4px;font-weight:600">' + missing + ' missing asset' + (missing !== 1 ? 's' : '') + '</div>'
        : '') +

      // Outcome summary
      '<div style="font-size:11px;color:var(--ga-charcoal);margin-top:6px;border-top:1px solid var(--ga-border);padding-top:6px">' +
        '<strong>' + outcomes.clicks + '</strong> clicks &middot; ' +
        '<strong>' + outcomes.sessions + '</strong> sessions &middot; ' +
        '<strong>' + outcomes.qi + '</strong> QI' +
      '</div>' +

    '</div>';
  }

  // ── Series Detail View ────────────────────────────────────────────

  function _showSeriesDetail(seriesId) {
    _detailSeriesId = seriesId;
    var s = _series.find(function (x) { return (x.series_id || x.id) === seriesId; });
    if (!s) return;

    var container = document.getElementById('series-detail-container');
    if (!container) return;

    var linkedPosts = _posts.filter(function (p) { return p.series_id === seriesId; });
    var outcomes = _getSeriesOutcomes(seriesId);
    var planned = s.planned_assets || s.planned || 0;
    var livePosts = linkedPosts.filter(function (p) { return p.status === 'published' || p.stage === 'published'; }).length;
    var completedPosts = linkedPosts.filter(function (p) { return p.status === 'completed'; }).length;

    // Channel distribution coverage
    var seriesPlatforms = s.platforms || [];
    var coveredPlatforms = {};
    linkedPosts.forEach(function (p) {
      var plat = (p.platform || '').toLowerCase();
      if (plat) coveredPlatforms[plat] = true;
    });
    var missingPlatforms = seriesPlatforms.filter(function (pid) { return !coveredPlatforms[pid]; });

    // Lineage chain
    var lineageItems = [
      { label: 'Series: ' + (s.name || ''), active: true },
      { label: linkedPosts.length + ' Posts' },
      { label: 'UTM: ' + (s.linked_utm_campaign || 'None') },
      { label: outcomes.clicks + ' clicks / ' + outcomes.sessions + ' sessions / ' + outcomes.qi + ' QI' }
    ];

    container.innerHTML =
      '<div style="margin-top:16px">' +
        Components.partHeader('D', 'Series Detail: ' + _esc(s.name)) +
        '<div class="card" style="border-left:4px solid var(--ga-navy)">' +

          // Linked Posts
          '<div style="font-weight:600;margin-bottom:8px">Linked Posts (' + linkedPosts.length + ')</div>' +
          (linkedPosts.length === 0
            ? '<div style="font-size:12px;color:var(--ga-muted)">No posts linked to this series yet.</div>'
            : Components.table(
                [
                  { key: 'title', label: 'Title' },
                  { key: 'platform', label: 'Platform', render: function (v) { var p = PLATFORMS[(v || '').toLowerCase()]; return p ? p.name : v; } },
                  { key: 'status', label: 'Status', render: function (v) { return Components.statusBadge(v); } },
                  { key: 'scheduled_at', label: 'Scheduled', render: function (v) { return v ? Components.formatDate(v) : '&#8212;'; } }
                ],
                linkedPosts
              )) +

          // Asset status
          '<div style="margin-top:16px;font-weight:600;margin-bottom:8px">Asset Status</div>' +
          '<div class="row-grid row-grid-3">' +
            Components.kpiTile('Planned', planned) +
            Components.kpiTile('Live', livePosts) +
            Components.kpiTile('Completed', completedPosts) +
          '</div>' +

          // Channel distribution
          '<div style="margin-top:16px;font-weight:600;margin-bottom:8px">Channel Coverage</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            seriesPlatforms.map(function (pid) {
              var p = PLATFORMS[pid];
              if (!p) return '';
              var covered = !!coveredPlatforms[pid];
              var bgColor = covered ? p.color : 'var(--ga-border)';
              var textColor = covered ? '#fff' : 'var(--ga-muted)';
              return '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:11px;background:' + bgColor + ';color:' + textColor + '">' +
                p.icon + ' ' + p.name +
                (covered ? ' &#10003;' : ' &#10007;') +
              '</span>';
            }).join('') +
          '</div>' +

          // Missing asset detector
          (missingPlatforms.length > 0
            ? '<div style="margin-top:12px;font-size:12px;color:var(--ga-red);font-weight:600">' +
                '&#9888; Missing posts for: ' + missingPlatforms.map(function (pid) { var p = PLATFORMS[pid]; return p ? p.name : pid; }).join(', ') +
              '</div>'
            : '<div style="margin-top:12px;font-size:12px;color:var(--ga-green)">&#10003; All platforms covered</div>') +

          // Outcome summary
          '<div style="margin-top:16px;font-weight:600;margin-bottom:8px">Outcome Summary</div>' +
          '<div class="row-grid row-grid-3">' +
            Components.kpiTile('Clicks', outcomes.clicks) +
            Components.kpiTile('Sessions', outcomes.sessions) +
            Components.kpiTile('QI', outcomes.qi) +
          '</div>' +

          // Lineage chain
          '<div style="margin-top:16px">' +
            Components.lineageChain(lineageItems) +
          '</div>' +

          // Action buttons
          '<div style="margin-top:16px;display:flex;gap:8px">' +
            (Auth.can('update', 'series')
              ? '<button class="btn btn-secondary" onclick="SeriesPage.openEditModal(\'' + _esc(seriesId) + '\')">Edit Series</button>'
              : '') +
            (Auth.can('update', 'series')
              ? '<button class="btn btn-secondary" onclick="SeriesPage.archiveSeries(\'' + _esc(seriesId) + '\')">Archive (Complete)</button>'
              : '') +
            '<button class="btn btn-secondary" onclick="SeriesPage.closeDetail()">Close</button>' +
          '</div>' +

        '</div>' +
      '</div>';
  }

  // ── Completed Series Table ────────────────────────────────────────

  function _renderCompletedTable(completedSeries) {
    if (completedSeries.length === 0) {
      return Components.emptyState('&#128203;', 'No completed series yet.', '', null);
    }

    var rows = completedSeries.map(function (s) {
      var outcomes = _getSeriesOutcomes(s.series_id || s.id);
      var planned = s.planned_assets || s.planned || 0;
      var completed = s.completed_assets || s.completed || 0;
      var typeMeta = SERIES_TYPES.find(function (t) { return t.id === s.series_type; });
      var yieldVal = completed > 0 ? Math.round((outcomes.qi / completed) * 10) / 10 : 0;

      return {
        name: s.name,
        type: typeMeta ? typeMeta.name : s.series_type || '&#8212;',
        assets: completed + '/' + planned,
        platforms: (s.platforms || []).map(function (pid) { var p = PLATFORMS[pid]; return p ? p.name : pid; }).join(', '),
        campaign: s.linked_utm_campaign || '&#8212;',
        clicks: outcomes.clicks,
        sessions: outcomes.sessions,
        qi: outcomes.qi,
        yield: yieldVal
      };
    });

    return Components.table(
      [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'assets', label: 'Assets' },
        { key: 'platforms', label: 'Platforms' },
        { key: 'campaign', label: 'Campaign' },
        { key: 'clicks', label: 'Clicks' },
        { key: 'sessions', label: 'Sessions' },
        { key: 'qi', label: 'QI' },
        { key: 'yield', label: 'Yield' }
      ],
      rows,
      { sortable: true }
    );
  }

  // ── Create Series Modal ───────────────────────────────────────────

  function openCreateModal() {
    if (!Auth.can('create', 'series')) {
      Components.showToast('Permission denied', 'error');
      return;
    }

    var typeOptions = SERIES_TYPES.map(function (t) { return { value: t.id, label: t.name }; });
    var teamOptions = TEAM.map(function (m) { return { value: m.id, label: m.name }; });
    var platformCheckboxes = Object.entries(PLATFORMS).map(function (entry) {
      return Components.formCheckbox('series_platform_' + entry[0], entry[1].name, false);
    }).join('');

    var body =
      Components.formGroup('Series Name', Components.formInput('series_name', '', { placeholder: 'e.g. AERO 2026 Countdown', required: true }), { required: true }) +
      Components.formGroup('Objective', Components.formTextarea('series_objective', '', { placeholder: 'What is this series trying to achieve?', rows: 2 })) +
      Components.formRow(
        Components.formGroup('Series Type', Components.formSelect('series_type', typeOptions, '', { placeholder: 'Select type', required: true }), { required: true }),
        Components.formGroup('Owner', Components.formSelect('series_owner', teamOptions, '', { placeholder: 'Select owner', required: true }), { required: true })
      ) +
      Components.formGroup('Planned Assets', Components.formInput('series_planned', '', { type: 'number', min: 1, placeholder: '# of content pieces', required: true }), { required: true }) +
      Components.formGroup('Platforms', '<div style="display:flex;flex-wrap:wrap;gap:8px">' + platformCheckboxes + '</div>') +
      Components.formRow(
        Components.formGroup('Linked UTM Campaign', Components.formInput('series_utm', '', { placeholder: 'utm_campaign value' })),
        Components.formGroup('Landing URL', Components.formInput('series_url', '', { placeholder: 'https://...' }))
      ) +
      Components.formRow(
        Components.formGroup('Start Date', Components.formInput('series_start', '', { type: 'date', required: true }), { required: true }),
        Components.formGroup('End Date', Components.formInput('series_end', '', { type: 'date', required: true }), { required: true })
      );

    Components.showModal(
      Components.modal('Create New Series', body, {
        id: 'create-series-modal',
        actions: [
          { label: 'Cancel', class: 'btn-secondary', onClick: "Components.closeModal('create-series-modal')" },
          { label: 'Create Series', class: 'btn-primary', onClick: 'SeriesPage.submitCreate()' }
        ]
      })
    );
  }

  async function submitCreate() {
    var form = {
      name: (document.querySelector('[name="series_name"]') || {}).value || '',
      objective: (document.querySelector('[name="series_objective"]') || {}).value || '',
      series_type: (document.querySelector('[name="series_type"]') || {}).value || '',
      owner: (document.querySelector('[name="series_owner"]') || {}).value || '',
      planned_assets: parseInt((document.querySelector('[name="series_planned"]') || {}).value) || 0,
      linked_utm_campaign: (document.querySelector('[name="series_utm"]') || {}).value || '',
      linked_landing_url: (document.querySelector('[name="series_url"]') || {}).value || '',
      start_date: (document.querySelector('[name="series_start"]') || {}).value || '',
      end_date: (document.querySelector('[name="series_end"]') || {}).value || '',
      status: 'planning',
      platforms: []
    };

    // Collect checked platforms
    Object.keys(PLATFORMS).forEach(function (pid) {
      var cb = document.querySelector('[name="series_platform_' + pid + '"]');
      if (cb && cb.checked) form.platforms.push(pid);
    });

    // Validation
    if (!form.name || !form.series_type || !form.owner || !form.planned_assets || !form.start_date || !form.end_date) {
      Components.showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      await API.series.create(form);
      Events.log(Events.EVENTS.SERIES_CREATED, { name: form.name, type: form.series_type });
      Components.closeModal('create-series-modal');
      Components.showToast('Series created: ' + form.name, 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to create series: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Edit Series Modal ─────────────────────────────────────────────

  function openEditModal(seriesId) {
    if (!Auth.can('update', 'series')) {
      Components.showToast('Permission denied', 'error');
      return;
    }

    var s = _series.find(function (x) { return (x.series_id || x.id) === seriesId; });
    if (!s) return;

    var typeOptions = SERIES_TYPES.map(function (t) { return { value: t.id, label: t.name }; });
    var teamOptions = TEAM.map(function (m) { return { value: m.id, label: m.name }; });
    var platformCheckboxes = Object.entries(PLATFORMS).map(function (entry) {
      var checked = (s.platforms || []).indexOf(entry[0]) !== -1;
      return Components.formCheckbox('edit_platform_' + entry[0], entry[1].name, checked);
    }).join('');

    var statusOptions = [
      { value: 'planning', label: 'Planning' },
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' },
      { value: 'completed', label: 'Completed' }
    ];

    var body =
      Components.formGroup('Series Name', Components.formInput('edit_name', s.name || '', { required: true }), { required: true }) +
      Components.formGroup('Objective', Components.formTextarea('edit_objective', s.objective || '', { rows: 2 })) +
      Components.formRow(
        Components.formGroup('Series Type', Components.formSelect('edit_type', typeOptions, s.series_type || '', { required: true }), { required: true }),
        Components.formGroup('Owner', Components.formSelect('edit_owner', teamOptions, s.owner || '', { required: true }), { required: true })
      ) +
      Components.formRow(
        Components.formGroup('Planned Assets', Components.formInput('edit_planned', s.planned_assets || s.planned || '', { type: 'number', min: 1 })),
        Components.formGroup('Status', Components.formSelect('edit_status', statusOptions, s.status || 'planning'))
      ) +
      Components.formGroup('Platforms', '<div style="display:flex;flex-wrap:wrap;gap:8px">' + platformCheckboxes + '</div>') +
      Components.formRow(
        Components.formGroup('Linked UTM Campaign', Components.formInput('edit_utm', s.linked_utm_campaign || '')),
        Components.formGroup('Landing URL', Components.formInput('edit_url', s.linked_landing_url || ''))
      ) +
      Components.formRow(
        Components.formGroup('Start Date', Components.formInput('edit_start', s.start_date || '', { type: 'date' })),
        Components.formGroup('End Date', Components.formInput('edit_end', s.end_date || '', { type: 'date' }))
      );

    Components.showModal(
      Components.modal('Edit Series: ' + _esc(s.name), body, {
        id: 'edit-series-modal',
        actions: [
          { label: 'Cancel', class: 'btn-secondary', onClick: "Components.closeModal('edit-series-modal')" },
          { label: 'Save Changes', class: 'btn-primary', onClick: "SeriesPage.submitEdit('" + _esc(seriesId) + "')" }
        ]
      })
    );
  }

  async function submitEdit(seriesId) {
    var updates = {
      name: (document.querySelector('[name="edit_name"]') || {}).value || '',
      objective: (document.querySelector('[name="edit_objective"]') || {}).value || '',
      series_type: (document.querySelector('[name="edit_type"]') || {}).value || '',
      owner: (document.querySelector('[name="edit_owner"]') || {}).value || '',
      planned_assets: parseInt((document.querySelector('[name="edit_planned"]') || {}).value) || 0,
      status: (document.querySelector('[name="edit_status"]') || {}).value || 'planning',
      linked_utm_campaign: (document.querySelector('[name="edit_utm"]') || {}).value || '',
      linked_landing_url: (document.querySelector('[name="edit_url"]') || {}).value || '',
      start_date: (document.querySelector('[name="edit_start"]') || {}).value || '',
      end_date: (document.querySelector('[name="edit_end"]') || {}).value || '',
      platforms: []
    };

    Object.keys(PLATFORMS).forEach(function (pid) {
      var cb = document.querySelector('[name="edit_platform_' + pid + '"]');
      if (cb && cb.checked) updates.platforms.push(pid);
    });

    try {
      await API.series.update(seriesId, updates);
      Events.log(Events.EVENTS.SERIES_UPDATED, { series_id: seriesId, name: updates.name });
      Components.closeModal('edit-series-modal');
      Components.showToast('Series updated', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to update series: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Archive (Complete) Series ─────────────────────────────────────

  function archiveSeries(seriesId) {
    if (!Auth.can('update', 'series')) {
      Components.showToast('Permission denied', 'error');
      return;
    }

    Components.confirmDialog(
      'Archive Series',
      'This will mark the series as completed. Are you sure?',
      async function () {
        try {
          await API.series.update(seriesId, { status: 'completed' });
          Events.log(Events.EVENTS.SERIES_UPDATED, { series_id: seriesId, action: 'archived' });
          _detailSeriesId = null;
          Components.showToast('Series archived', 'success');
          await render(_container);
        } catch (err) {
          Components.showToast('Failed to archive series: ' + (err.message || 'Unknown error'), 'error');
        }
      }
    );
  }

  // ── Detail View Controls ──────────────────────────────────────────

  function showDetail(seriesId) {
    _showSeriesDetail(seriesId);
  }

  function closeDetail() {
    _detailSeriesId = null;
    var container = document.getElementById('series-detail-container');
    if (container) container.innerHTML = '';
  }

  // ── Outcome Helpers ───────────────────────────────────────────────

  function _getSeriesOutcomes(seriesId) {
    var linkedPosts = _posts.filter(function (p) { return p.series_id === seriesId; });
    var postIds = new Set(linkedPosts.map(function (p) { return p.id || p.post_id; }));

    var clicks = 0, sessions = 0, qi = 0;
    _utmData.forEach(function (u) {
      if (postIds.has(u.post_id)) {
        clicks += u.clicks || 0;
        sessions += u.sessions || 0;
        qi += u.qi || 0;
      }
    });

    // Also sum from post-level fields if present
    linkedPosts.forEach(function (p) {
      if (!postIds.has(p.id || p.post_id)) return;
      clicks += p.clicks || 0;
      sessions += p.sessions || 0;
      qi += p.qi || 0;
    });

    return { clicks: clicks, sessions: sessions, qi: qi };
  }

  function _computeAllSeriesOutcomes() {
    var outcomes = {};
    _series.forEach(function (s) {
      outcomes[s.series_id || s.id] = _getSeriesOutcomes(s.series_id || s.id);
    });
    return outcomes;
  }

  // ── Escape Helper ─────────────────────────────────────────────────

  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render: render,
    openCreateModal: openCreateModal,
    submitCreate: submitCreate,
    openEditModal: openEditModal,
    submitEdit: submitEdit,
    archiveSeries: archiveSeries,
    showDetail: showDetail,
    closeDetail: closeDetail
  };
})();
