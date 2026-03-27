/* =====================================================================
   AvSocialOS v2 — Brief Intake & Request Router
   Front door for all social work requests. Anyone can submit a brief;
   only full_access users can triage.
   ===================================================================== */

const IntakePage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _briefs = [];
  let _series = [];
  let _statusFilter = 'all';

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _truncate(str, len = 60) {
    if (!str) return '\u2014';
    return str.length > len ? str.slice(0, len) + '\u2026' : str;
  }

  function _avgBriefToTaskTime(briefs) {
    const accepted = briefs.filter(b => b.status === 'accepted' && b.created_at && b.triaged_at);
    if (accepted.length === 0) return '\u2014';
    const totalMs = accepted.reduce((sum, b) => {
      return sum + (new Date(b.triaged_at).getTime() - new Date(b.created_at).getTime());
    }, 0);
    const avgHrs = Math.round((totalMs / accepted.length) / (1000 * 60 * 60) * 10) / 10;
    return avgHrs < 24 ? avgHrs + 'h' : Math.round(avgHrs / 24 * 10) / 10 + 'd';
  }

  function _completenessPercent(form) {
    const requiredFields = ['request_type', 'objective', 'content_type', 'landing_url', 'cta', 'due_date', 'measurement_hook'];
    // Check platform checkboxes
    const platformChecked = form.querySelectorAll('input[name="requested_platforms"]:checked').length > 0;
    let filled = platformChecked ? 1 : 0;
    const total = requiredFields.length + 1; // +1 for platforms

    requiredFields.forEach(name => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && el.value && el.value.trim()) filled++;
    });

    // Conditional: broker_name required for listing/broker_spotlight
    const requestType = form.querySelector('[name="request_type"]');
    if (requestType && (requestType.value === 'listing' || requestType.value === 'broker_spotlight')) {
      const broker = form.querySelector('[name="broker_name"]');
      if (broker && broker.value && broker.value.trim()) filled++;
      return Math.round((filled / (total + 1)) * 100);
    }

    return Math.round((filled / total) * 100);
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [briefs, series] = await Promise.all([
        API.briefs.list(),
        API.series.list()
      ]);
      _briefs = briefs || [];
      _series = series || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load intake data: ' + err.message, 'error');
      return;
    }

    const isFullAccess = Auth.getRole() === 'full_access';
    const platforms = SeedData.getPlatforms();
    const requestTypes = SeedData.getRequestTypes();
    const contentTypes = SeedData.getContentTypes();
    const categories = SeedData.getCategories();
    const ctaTypes = SeedData.getCtaTypes();

    // KPI values
    const totalBriefs = _briefs.length;
    const submitted = _briefs.filter(b => b.status === 'submitted').length;
    const accepted = _briefs.filter(b => b.status === 'accepted').length;
    const rejected = _briefs.filter(b => b.status === 'rejected').length;
    const avgTime = _avgBriefToTaskTime(_briefs);

    // Triage queue
    const triageQueue = _briefs.filter(b => b.status === 'submitted');

    container.innerHTML = `
      <div class="domain-page">

        <!-- Section Header -->
        <div class="section-header">
          <div class="section-title">Brief Intake & Request Router</div>
          <div class="section-subtitle">Submit, triage, and route social content requests \u2014 GlobalAir.com</div>
        </div>

        <!-- Part A: KPI Row -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Intake KPIs</span>
          </div>
          <div class="row-grid row-grid-5">
            ${Components.kpiTile('Total Briefs', totalBriefs)}
            ${Components.kpiTile('Submitted', submitted, { icon: '\ud83d\udce5' })}
            ${Components.kpiTile('Accepted', accepted, { icon: '\u2705' })}
            ${Components.kpiTile('Rejected', rejected, { icon: '\u274c' })}
            ${Components.kpiTile('Avg Brief\u2192Task', avgTime, { icon: '\u23f1\ufe0f' })}
          </div>
        </div>

        <!-- Part B: Submit New Brief -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Submit New Brief</span>
          </div>
          <div class="card">
            <div id="intake-completeness" class="intake-completeness" style="margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:600;color:var(--ga-navy)">Completeness</span>
                <span id="intake-pct" style="font-size:13px;font-weight:700;color:var(--ga-blue)">0%</span>
              </div>
              ${Components.progressBar(0, 100, 'var(--ga-blue)')}
            </div>
            <form id="intake-form" autocomplete="off">
              <div class="form-row">
                ${Components.formGroup('Request Type', Components.formSelect('request_type',
                  requestTypes.map(r => ({ value: r.id, label: r.name })),
                  '', { placeholder: 'Select request type\u2026', required: true, id: 'fi-request_type' }
                ), { required: true, id: 'fi-request_type' })}

                ${Components.formGroup('Content Type', Components.formSelect('content_type',
                  contentTypes.map(c => ({ value: c.id, label: c.icon + ' ' + c.name })),
                  '', { placeholder: 'Select content type\u2026', required: true, id: 'fi-content_type' }
                ), { required: true, id: 'fi-content_type' })}
              </div>

              ${Components.formGroup('Objective', Components.formTextarea('objective', '', {
                placeholder: 'What is the goal of this content?', rows: 3, required: true, id: 'fi-objective'
              }), { required: true, id: 'fi-objective' })}

              <div class="form-group">
                <label class="form-label">Platforms <span class="form-required">*</span></label>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${Object.entries(platforms).map(([id, p]) =>
                    Components.formCheckbox('requested_platforms', p.name, false)
                      .replace(`name="requested_platforms"`, `name="requested_platforms" value="${id}"`)
                  ).join('')}
                </div>
              </div>

              <div id="pilot-first-suggest" style="display:none;margin-bottom:12px;">
                ${Components.pilotFirstChip(true)}
                <span style="font-size:12px;color:var(--ga-muted);margin-left:8px;">Auto-suggested based on content type</span>
              </div>

              <div class="form-row">
                ${Components.formGroup('Category', Components.formSelect('category',
                  categories.map(c => ({ value: c.id, label: c.name })),
                  '', { placeholder: 'Select category\u2026', id: 'fi-category' }
                ), { id: 'fi-category' })}

                ${Components.formGroup('Broker Name', Components.formInput('broker_name', '', {
                  placeholder: 'Required for listing/spotlight', id: 'fi-broker_name'
                }), { id: 'fi-broker_name', helpText: 'Required for listing and broker spotlight types' })}
              </div>

              <div class="form-row">
                ${Components.formGroup('Aircraft Make', Components.formInput('aircraft_make', '', {
                  placeholder: 'e.g. Cessna', id: 'fi-aircraft_make'
                }), { id: 'fi-aircraft_make' })}

                ${Components.formGroup('Aircraft Model', Components.formInput('aircraft_model', '', {
                  placeholder: 'e.g. Citation XLS+', id: 'fi-aircraft_model'
                }), { id: 'fi-aircraft_model' })}
              </div>

              ${Components.formGroup('Landing URL', Components.formInput('landing_url', '', {
                placeholder: 'https://www.globalair.com/...', required: true, id: 'fi-landing_url'
              }), { required: true, id: 'fi-landing_url', helpText: 'Must start with https://www.globalair.com' })}

              <div class="form-row">
                ${Components.formGroup('CTA', Components.formSelect('cta',
                  ctaTypes.map(c => ({ value: c.id, label: c.name })),
                  '', { placeholder: 'Select CTA\u2026', required: true, id: 'fi-cta' }
                ), { required: true, id: 'fi-cta' })}

                ${Components.formGroup('Due Date', Components.formInput('due_date', '', {
                  type: 'date', required: true, id: 'fi-due_date'
                }), { required: true, id: 'fi-due_date' })}
              </div>

              ${Components.formGroup('Measurement Hook', Components.formInput('measurement_hook', '', {
                placeholder: 'How will we measure success?', required: true, id: 'fi-measurement_hook'
              }), { required: true, id: 'fi-measurement_hook' })}

              <div class="form-row">
                ${Components.formGroup('Campaign ID', Components.formInput('campaign_id', '', {
                  placeholder: 'Optional campaign ID', id: 'fi-campaign_id'
                }), { id: 'fi-campaign_id' })}

                ${Components.formGroup('Series', Components.formSelect('series_id',
                  (_series || []).map(s => ({ value: s.id, label: s.name || s.series_name || s.id })),
                  '', { placeholder: 'Link to series (optional)', id: 'fi-series_id' }
                ), { id: 'fi-series_id' })}
              </div>

              <div style="margin-top:16px;display:flex;gap:12px;align-items:center;">
                <button type="submit" class="btn btn-primary" id="intake-submit-btn">Submit Brief</button>
                <span id="intake-submit-status" style="font-size:13px;color:var(--ga-muted);"></span>
              </div>
            </form>
          </div>
        </div>

        <!-- Part C: Triage Queue -->
        ${isFullAccess ? `
        <div>
          <div class="part-header">
            <span class="part-label">C</span>
            <span class="part-title">Triage Queue</span>
            <span style="font-size:12px;color:var(--ga-muted);margin-left:12px;">${triageQueue.length} pending</span>
          </div>
          ${triageQueue.length > 0 ? Components.table(
            [
              { key: 'created_at', label: 'Date', render: v => _formatDate(v) },
              { key: 'request_type', label: 'Type', render: v => Components.badge(v || '\u2014', 'blue') },
              { key: 'objective', label: 'Objective', render: v => _truncate(v, 50) },
              { key: 'requested_platforms', label: 'Platforms', render: v => (Array.isArray(v) ? v : []).map(p => Components.badge(p, 'muted')).join(' ') },
              { key: 'category', label: 'Category', render: v => v || '\u2014' },
              { key: 'due_date', label: 'Due', render: v => _formatDate(v) },
              { key: 'requestor', label: 'Requestor', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${m.color}">${m.initials}</span> ${m.name.split(' ')[0]}` : (v || '\u2014');
              }},
              { key: 'id', label: 'Actions', render: (v, row) => `
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-sm btn-primary" onclick="IntakePage.acceptBrief('${_esc(v)}')">Accept</button>
                  <button class="btn btn-sm btn-secondary" onclick="IntakePage.rejectBrief('${_esc(v)}')">Reject</button>
                </div>
              `}
            ],
            triageQueue,
            { sortable: true }
          ) : Components.emptyState('\ud83d\udce5', 'No briefs pending triage.', '', null)}
        </div>` : ''}

        <!-- Part D: All Briefs -->
        <div>
          <div class="part-header">
            <span class="part-label">D</span>
            <span class="part-title">All Briefs</span>
          </div>
          <div style="margin-bottom:12px;">
            ${Components.filterBar(
              [
                { value: 'all', label: 'All' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' }
              ],
              _statusFilter,
              'IntakePage.filterBriefs'
            )}
          </div>
          <div id="intake-all-briefs-table">
            ${_renderAllBriefsTable(_briefs, _statusFilter)}
          </div>
        </div>

        <!-- Part E: Brief-to-Task Tracking -->
        <div>
          <div class="part-header">
            <span class="part-label">E</span>
            <span class="part-title">Brief-to-Task Tracking</span>
          </div>
          <div id="intake-lineage">
            ${_renderLineageSection(_briefs)}
          </div>
        </div>

      </div>`;

    // ── Wire events ─────────────────────────────────────────────────
    _wireFormEvents(container);
  }

  // ── Sub-renderers ─────────────────────────────────────────────────

  function _renderAllBriefsTable(briefs, filter) {
    const filtered = filter === 'all' ? briefs : briefs.filter(b => b.status === filter);
    if (filtered.length === 0) {
      return Components.emptyState('\ud83d\udccb', 'No briefs found.', '', null);
    }
    return Components.table(
      [
        { key: 'id', label: 'ID', render: v => `<code style="font-size:11px">${_esc(String(v).slice(0, 8))}</code>` },
        { key: 'request_type', label: 'Type', render: v => Components.badge(v || '\u2014', 'blue') },
        { key: 'objective', label: 'Objective', render: v => _truncate(v, 40) },
        { key: 'requested_platforms', label: 'Platforms', render: v => (Array.isArray(v) ? v : []).map(p => Components.badge(p, 'muted')).join(' ') },
        { key: 'category', label: 'Category', render: v => v || '\u2014' },
        { key: 'broker_name', label: 'Broker', render: v => v || '\u2014' },
        { key: 'due_date', label: 'Due', render: v => _formatDate(v) },
        { key: 'status', label: 'Status', render: v => Components.statusBadge(v) },
        { key: 'requestor', label: 'Requestor', render: v => {
          const m = SeedData.getTeam().find(t => t.id === v);
          return m ? m.name.split(' ')[0] : (v || '\u2014');
        }},
        { key: 'created_at', label: 'Created', render: v => _formatDate(v) }
      ],
      filtered,
      { sortable: true }
    );
  }

  function _renderLineageSection(briefs) {
    const acceptedBriefs = briefs.filter(b => b.status === 'accepted');
    if (acceptedBriefs.length === 0) {
      return Components.emptyState('\ud83d\udd17', 'No accepted briefs with linked tasks yet.', '', null);
    }
    return acceptedBriefs.map(b => {
      const items = [
        { label: 'Brief: ' + _truncate(b.objective, 30), active: true },
        { label: 'Triaged by ' + (b.triaged_by || '\u2014'), active: !!b.triaged_by },
        { label: 'Task Created', active: !!b.task_id }
      ];
      return `<div class="card" style="margin-bottom:8px;padding:12px;">
        <div style="font-size:12px;color:var(--ga-muted);margin-bottom:6px;">${_esc(b.request_type)} \u00b7 ${_formatDate(b.created_at)}</div>
        ${Components.lineageChain(items)}
      </div>`;
    }).join('');
  }

  // ── Form Wiring ───────────────────────────────────────────────────

  function _wireFormEvents(container) {
    const form = container.querySelector('#intake-form');
    if (!form) return;

    // Completeness gauge live update
    const updateGauge = () => {
      const pct = _completenessPercent(form);
      const pctEl = container.querySelector('#intake-pct');
      const barFill = container.querySelector('.progress-fill');
      if (pctEl) pctEl.textContent = pct + '%';
      if (barFill) {
        barFill.style.width = pct + '%';
        barFill.style.background = pct >= 80 ? 'var(--ga-green)' : pct >= 50 ? 'var(--ga-amber)' : 'var(--ga-blue)';
      }
    };

    form.addEventListener('input', updateGauge);
    form.addEventListener('change', () => {
      updateGauge();
      // Pilot-first auto-suggest
      const contentTypeEl = form.querySelector('[name="content_type"]');
      const pilotDiv = container.querySelector('#pilot-first-suggest');
      if (contentTypeEl && pilotDiv) {
        const isPilot = SeedData.isPilotFirstType(contentTypeEl.value);
        pilotDiv.style.display = isPilot ? 'block' : 'none';
      }
    });

    // Submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = container.querySelector('#intake-submit-status');

      // Gather form data
      const fd = new FormData(form);
      const data = {};
      data.request_type = fd.get('request_type');
      data.objective = fd.get('objective');
      data.content_type = fd.get('content_type');
      data.requested_platforms = fd.getAll('requested_platforms');
      data.category = fd.get('category') || null;
      data.broker_name = fd.get('broker_name') || null;
      data.aircraft_make = fd.get('aircraft_make') || null;
      data.aircraft_model = fd.get('aircraft_model') || null;
      data.landing_url = fd.get('landing_url');
      data.cta = fd.get('cta');
      data.due_date = fd.get('due_date');
      data.measurement_hook = fd.get('measurement_hook');
      data.campaign_id = fd.get('campaign_id') || null;
      data.series_id = fd.get('series_id') || null;
      data.pilot_first_flag = SeedData.isPilotFirstType(data.content_type);

      // Validate required fields
      const errors = [];
      if (!data.request_type) errors.push('Request type is required');
      if (!data.objective || !data.objective.trim()) errors.push('Objective is required');
      if (!data.content_type) errors.push('Content type is required');
      if (!data.requested_platforms || data.requested_platforms.length === 0) errors.push('At least one platform is required');
      if (!data.landing_url || !data.landing_url.trim()) errors.push('Landing URL is required');
      if (data.landing_url && !data.landing_url.startsWith('https://www.globalair.com')) errors.push('Landing URL must start with https://www.globalair.com');
      if (!data.cta) errors.push('CTA is required');
      if (!data.due_date) errors.push('Due date is required');
      if (!data.measurement_hook || !data.measurement_hook.trim()) errors.push('Measurement hook is required');
      if ((data.request_type === 'listing' || data.request_type === 'broker_spotlight') && (!data.broker_name || !data.broker_name.trim())) {
        errors.push('Broker name is required for listing and broker spotlight types');
      }

      if (errors.length > 0) {
        if (statusEl) statusEl.textContent = errors[0];
        Components.showToast(errors[0], 'error');
        return;
      }

      // Submit
      data.status = 'submitted';
      data.requestor = Auth.getUser();
      data.created_by = Auth.getUser();
      data.created_at = new Date().toISOString();

      try {
        await API.briefs.create(data);
        Events.log(Events.EVENTS.BRIEF_SUBMITTED, { request_type: data.request_type, requestor: data.requestor });
        Components.showToast('Brief submitted', 'success');
        await render(container);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Submit failed: ' + err.message;
        Components.showToast('Failed to submit brief: ' + err.message, 'error');
      }
    });
  }

  // ── Actions ───────────────────────────────────────────────────────

  async function acceptBrief(briefId) {
    if (Auth.getRole() !== 'full_access') {
      Components.showToast('Only full_access users can triage briefs', 'error');
      return;
    }

    const brief = _briefs.find(b => String(b.id) === String(briefId));
    if (!brief) {
      Components.showToast('Brief not found', 'error');
      return;
    }

    try {
      const now = new Date().toISOString();
      await API.briefs.update(briefId, {
        status: 'accepted',
        triaged_by: Auth.getUser(),
        triaged_at: now
      });

      // Auto-create task
      const taskData = {
        title: brief.objective,
        assignee: 'keaton',
        tier: 'T2',
        status: 'draft',
        brief_id: briefId,
        content_type: brief.content_type,
        platform: Array.isArray(brief.requested_platforms) ? brief.requested_platforms[0] : null,
        requested_platforms: brief.requested_platforms,
        category: brief.category,
        broker_name: brief.broker_name,
        landing_url: brief.landing_url,
        cta: brief.cta,
        due: brief.due_date,
        campaign_id: brief.campaign_id,
        series_id: brief.series_id,
        pilot_first_flag: brief.pilot_first_flag || SeedData.isPilotFirstType(brief.content_type),
        created_by: Auth.getUser(),
        created_at: now
      };

      const task = await API.tasks.create(taskData);
      Events.log(Events.EVENTS.BRIEF_ACCEPTED, { brief_id: briefId, triaged_by: Auth.getUser() });
      Events.log(Events.EVENTS.BRIEF_TO_TASK, { brief_id: briefId, task_id: task ? task.id : null });
      Components.showToast('Brief accepted and task created', 'success');

      // Re-render
      const container = document.querySelector('.domain-page').parentElement;
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Failed to accept brief: ' + err.message, 'error');
    }
  }

  async function rejectBrief(briefId) {
    if (Auth.getRole() !== 'full_access') {
      Components.showToast('Only full_access users can triage briefs', 'error');
      return;
    }

    const reason = prompt('Rejection reason:');
    if (!reason || !reason.trim()) {
      Components.showToast('Rejection reason is required', 'error');
      return;
    }

    try {
      await API.briefs.update(briefId, {
        status: 'rejected',
        rejection_reason: reason.trim(),
        triaged_by: Auth.getUser(),
        triaged_at: new Date().toISOString()
      });

      Events.log(Events.EVENTS.BRIEF_REJECTED, { brief_id: briefId, reason: reason.trim(), triaged_by: Auth.getUser() });
      Components.showToast('Brief rejected', 'info');

      const container = document.querySelector('.domain-page').parentElement;
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Failed to reject brief: ' + err.message, 'error');
    }
  }

  function filterBriefs(status) {
    _statusFilter = status;
    const tableContainer = document.getElementById('intake-all-briefs-table');
    if (tableContainer) {
      tableContainer.innerHTML = _renderAllBriefsTable(_briefs, _statusFilter);
    }
    // Update active filter chip
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('filter-active', chip.dataset.filter === status);
    });
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render,
    acceptBrief,
    rejectBrief,
    filterBriefs
  };

})();
