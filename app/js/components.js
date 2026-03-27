/* =====================================================================
   AvSocialOS v2 — Shared UI Components
   All reusable rendering functions for tables, cards, badges, modals,
   forms, compliance, publishing, pipeline, calendar, data display, etc.
   ===================================================================== */

const Components = (() => {

  // ====================================================================
  //  KPI & DATA DISPLAY
  // ====================================================================

  /* ---- KPI Tile ---- */
  function kpiTile(label, value, opts = {}) {
    const { delta, trend, confidence, topDriverLabel, topDriverRoute, subtitle, change, suffix = '', icon = '' } = opts;
    const trendArrow = trend === 'up' ? '&#9650;' : trend === 'down' ? '&#9660;' : '&#9654;';
    const trendClass = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-flat';
    const confBadge = confidence ? `<span class="confidence-tag confidence-${confidence.toLowerCase()}">${confidence}</span>` : '';
    const topDriver = topDriverLabel ? `<a class="top-driver-link" onclick="Router.navigate('${topDriverRoute || ''}')" title="View top driver">${topDriverLabel}</a>` : '';

    // Support both new (delta/trend) and legacy (change) signatures
    let deltaHtml = '';
    if (delta != null) {
      deltaHtml = `<span class="kpi-delta ${trendClass}">${trendArrow} ${delta}</span>`;
    } else if (change !== undefined && change !== null) {
      const cls = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-flat';
      const arrow = change > 0 ? '&#9650;' : change < 0 ? '&#9660;' : '&#8212;';
      deltaHtml = `<span class="kpi-delta ${cls}">${arrow} ${Math.abs(change)}%</span>`;
    }

    const displayValue = typeof value === 'number' ? value.toLocaleString() + suffix : value + suffix;

    return `
      <div class="kpi-tile" role="group" aria-label="${label}: ${displayValue}. ${confidence || ''} ${trend || ''}">
        <div class="kpi-label">${icon} ${label} ${confBadge}</div>
        <div class="kpi-value">${displayValue}</div>
        ${subtitle ? `<div class="kpi-subtitle">${subtitle}</div>` : ''}
        <div class="kpi-footer">${deltaHtml} ${topDriver}</div>
      </div>`;
  }

  /* ---- Status Card (Gate / Blocker) ---- */
  function statusCard(name, status, opts = {}) {
    const { owner, cod, ticket, lastUpdated, onClick } = opts;
    const statusLower = (status || '').toLowerCase().replace(/\s+/g, '_');
    const colorMap = {
      clean: 'green', confirmed: 'green', active: 'green', live: 'green', resolved: 'green', unblocked: 'green',
      unconfirmed: 'red', not_active: 'red', blocked: 'red', contaminated: 'red',
      in_progress: 'amber', being_replaced: 'amber', pending: 'amber'
    };
    const color = colorMap[statusLower] || 'red';
    const ticketHtml = ticket ? `<div class="status-ticket"><a href="#" title="${ticket}">${ticket}</a></div>` : '';
    return `
      <div class="status-card status-${color}" ${onClick ? `onclick="${onClick}"` : ''} role="button" tabindex="0"
           aria-label="${name}: ${status}. Owner: ${owner || 'Unassigned'}. Cost of delay: ${cod || 'N/A'}">
        <div class="status-header">
          <span class="status-dot status-dot-${color}"></span>
          <span class="status-name">${name}</span>
        </div>
        <div class="status-pill status-pill-${color}">${status}</div>
        <div class="status-meta">
          ${owner ? `<div class="status-owner">Owner: ${owner}</div>` : ''}
          ${cod ? `<div class="status-cod">COD: ${cod}</div>` : ''}
          ${ticketHtml}
          ${lastUpdated ? `<div class="status-updated">Updated: ${formatDate(lastUpdated)}</div>` : ''}
        </div>
      </div>`;
  }

  /* ---- Platform Card (SocialOS-specific) ---- */
  function platformCard(platformId, data) {
    const p = SeedData.getPlatforms()[platformId];
    if (!p) return '';
    return `
      <div class="platform-card" style="border-top-color:${p.color}">
        <div class="platform-header">
          <div class="platform-icon" style="background:${p.color}">${p.icon}</div>
          <div>
            <div class="platform-name">${p.name}</div>
            <div style="font-size:11px;color:var(--ga-muted)">${p.cat}</div>
          </div>
        </div>
        <div class="platform-meta">
          <div class="platform-stat">
            <div class="platform-stat-label">Followers</div>
            <div class="platform-stat-value">${data.followers.toLocaleString()}</div>
          </div>
          <div class="platform-stat">
            <div class="platform-stat-label">Engagement</div>
            <div class="platform-stat-value">${data.engagement}%</div>
          </div>
          <div class="platform-stat">
            <div class="platform-stat-label">Reach</div>
            <div class="platform-stat-value">${data.reach.toLocaleString()}</div>
          </div>
          <div class="platform-stat">
            <div class="platform-stat-label">CTR</div>
            <div class="platform-stat-value">${data.ctr}%</div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--ga-muted)">
          Top: <strong style="color:var(--ga-charcoal)">${data.top}</strong>
        </div>
      </div>`;
  }


  // ====================================================================
  //  BADGES
  // ====================================================================

  function badge(text, color = 'blue') {
    return `<span class="ga-badge ga-badge-${color}">${text}</span>`;
  }

  function domainBadge(domain) {
    const colors = { ppc: 'green', seo: 'blue', listings: 'amber', monetization: 'red' };
    return badge(domain.toUpperCase(), colors[domain] || 'blue');
  }

  function tierBadge(tier) {
    const t = tier.toLowerCase();
    return `<span class="tier-badge tier-${t}">${tier}</span>`;
  }

  function statusBadge(status) {
    const map = {
      draft: { label: 'Draft', color: 'muted' },
      in_review: { label: 'Review', color: 'amber' },
      approved: { label: 'Approved', color: 'blue' },
      scheduled: { label: 'Scheduled', color: 'blue' },
      published: { label: 'Published', color: 'green' },
      in_progress: { label: 'Active', color: 'amber' },
      live: { label: 'Live', color: 'green' },
      needs_build: { label: 'Needs Build', color: 'red' }
    };
    const s = map[status] || { label: status, color: 'muted' };
    return `<span class="badge badge-${s.color}">${s.label}</span>`;
  }

  /* ---- Severity Badge (Compliance) ---- */
  function severityBadge(severity) {
    const sev = (severity || '').toLowerCase();
    const colorMap = { critical: 'red', warning: 'amber', info: 'blue' };
    const color = colorMap[sev] || 'blue';
    return `<span class="ga-badge ga-badge-${color}">${severity}</span>`;
  }

  /* ---- Publish Status Badge ---- */
  function publishStatusBadge(status) {
    const map = {
      blocked:      { label: 'Blocked',      color: 'red' },
      needs_review: { label: 'Needs Review', color: 'amber' },
      approved:     { label: 'Approved',     color: 'blue' },
      scheduled:    { label: 'Scheduled',    color: 'blue' },
      published:    { label: 'Published',    color: 'green' },
      stale:        { label: 'Stale',        color: 'muted' }
    };
    const s = map[status] || { label: status, color: 'muted' };
    return `<span class="badge badge-${s.color}">${s.label}</span>`;
  }


  // ====================================================================
  //  PIPELINE & TASKS
  // ====================================================================

  /* ---- Pipeline Item (legacy, simple) ---- */
  function pipelineItem(task) {
    const team = SeedData.getTeam();
    const assignee = team.find(m => m.id === task.assignee);
    return `
      <div class="pipeline-item">
        <div class="pipeline-item-title">${task.title}</div>
        <div class="pipeline-item-meta">
          ${tierBadge(task.tier)}
          ${assignee ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${assignee.color};margin-left:0">${assignee.initials}</span>` : ''}
          <span>${task.due}</span>
        </div>
      </div>`;
  }

  /* ---- Pipeline Item V2 (enhanced) ---- */
  function pipelineItemV2(task, opts = {}) {
    const { showSla = true, showBlocker = true, showLinked = true } = opts;
    const team = (typeof SeedData !== 'undefined' && SeedData.getTeam) ? SeedData.getTeam() : [];
    const assignee = team.find(m => m.id === task.assignee);

    let slaHtml = '';
    if (showSla && task.sla_due) {
      const now = Date.now();
      const due = new Date(task.sla_due).getTime();
      const hoursLeft = Math.round((due - now) / (1000 * 60 * 60));
      const slaClass = hoursLeft < 0 ? 'sla-overdue' : hoursLeft < 4 ? 'sla-urgent' : 'sla-ok';
      const slaLabel = hoursLeft < 0 ? `${Math.abs(hoursLeft)}h overdue` : `${hoursLeft}h left`;
      slaHtml = `<span class="sla-timer ${slaClass}">${slaLabel}</span>`;
    }

    let blockerHtml = '';
    if (showBlocker && task.blocker) {
      blockerHtml = `<div class="pipeline-blocker"><span class="ga-badge ga-badge-red">Blocked</span> ${_esc(task.blocker)}</div>`;
    }

    let linkedHtml = '';
    if (showLinked && task.linked && task.linked.length > 0) {
      linkedHtml = `<div class="pipeline-linked">${task.linked.map(l => `<span class="linked-tag" title="${_esc(l.type)}: ${_esc(l.label)}">${_esc(l.label)}</span>`).join('')}</div>`;
    }

    return `
      <div class="pipeline-item pipeline-item-v2" data-task-id="${task.id || ''}">
        <div class="pipeline-item-header">
          <span class="pipeline-item-title">${_esc(task.title)}</span>
          ${slaHtml}
        </div>
        <div class="pipeline-item-meta">
          ${task.tier ? tierBadge(task.tier) : ''}
          ${task.status ? statusBadge(task.status) : ''}
          ${assignee ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${assignee.color};margin-left:0">${assignee.initials}</span>` : ''}
          ${task.due ? `<span class="pipeline-due">${task.due}</span>` : ''}
        </div>
        ${blockerHtml}
        ${linkedHtml}
      </div>`;
  }

  /* ---- Pipeline Board (kanban) ---- */
  function pipelineBoard(stages, tasks, opts = {}) {
    const { onTaskClick, useV2 = true } = opts;
    let html = '<div class="pipeline-board">';
    stages.forEach(stage => {
      const stageTasks = tasks.filter(t => t.stage === stage.id);
      html += `
        <div class="pipeline-column" data-stage="${stage.id}">
          <div class="pipeline-column-header">
            <span class="pipeline-column-title">${_esc(stage.label)}</span>
            <span class="pipeline-column-count">${stageTasks.length}</span>
          </div>
          <div class="pipeline-column-body">
            ${stageTasks.length === 0
              ? '<div class="pipeline-empty">No tasks</div>'
              : stageTasks.map(t => {
                  const card = useV2 ? pipelineItemV2(t, opts) : pipelineItem(t);
                  return onTaskClick
                    ? `<div onclick="${onTaskClick}('${t.id || ''}')">${card}</div>`
                    : card;
                }).join('')}
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }


  // ====================================================================
  //  TABLE
  // ====================================================================

  let sortState = {};

  function table(columns, rows, opts = {}) {
    const { id, sortable, onRowClick, checkboxes, emptyMessage } = opts;
    if (!rows || rows.length === 0) {
      return emptyState('&#128203;', emptyMessage || 'No data available.', '', null);
    }
    const tableId = id || 'table-' + Math.random().toString(36).slice(2, 8);
    let html = `<div class="table-wrapper"><table class="ga-table" id="${tableId}"><thead><tr>`;
    if (checkboxes) html += '<th class="th-checkbox"><input type="checkbox" class="select-all" aria-label="Select all"></th>';
    columns.forEach(col => {
      const sortAttr = sortable ? `class="sortable" data-col="${col.key}" onclick="Components.sortTable('${tableId}','${col.key}')"` : '';
      html += `<th ${sortAttr} scope="col">${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach((row, i) => {
      const rowClass = row._rowClass || '';
      const clickAttr = onRowClick ? `onclick="${onRowClick}(${i})" class="clickable ${rowClass}"` : `class="${rowClass}"`;
      html += `<tr ${clickAttr} data-idx="${i}">`;
      if (checkboxes) html += `<td><input type="checkbox" class="row-checkbox" value="${row.id || i}" aria-label="Select ${row[columns[0]?.key] || 'item'}"></td>`;
      columns.forEach(col => {
        const val = col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—');
        html += `<td>${val}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function sortTable(tableId, colKey) {
    const tbl = document.getElementById(tableId);
    if (!tbl) return;
    const dir = sortState[tableId + colKey] === 'asc' ? 'desc' : 'asc';
    sortState[tableId + colKey] = dir;
    const tbody = tbl.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const colIdx = Array.from(tbl.querySelectorAll('thead th')).findIndex(th => th.dataset.col === colKey);
    if (colIdx < 0) return;
    rows.sort((a, b) => {
      let va = a.cells[colIdx]?.textContent.trim() || '';
      let vb = b.cells[colIdx]?.textContent.trim() || '';
      const na = parseFloat(va.replace(/[^0-9.\-]/g, ''));
      const nb = parseFloat(vb.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(na) && !isNaN(nb)) return dir === 'asc' ? na - nb : nb - na;
      return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    rows.forEach(r => tbody.appendChild(r));
    tbl.querySelectorAll('thead th').forEach(th => th.removeAttribute('aria-sort'));
    const th = tbl.querySelector(`thead th[data-col="${colKey}"]`);
    if (th) th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
  }


  // ====================================================================
  //  GAUGES & VISUALIZATIONS
  // ====================================================================

  function heatmapCell(val) {
    const cls = val >= 5 ? 'heat-high' : val >= 2.5 ? 'heat-mid' : 'heat-low';
    return `<span class="heatmap-cell ${cls}">${val}%</span>`;
  }

  function progressBar(value, max, color = 'var(--ga-blue)') {
    const pct = Math.min((value / max) * 100, 100);
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>`;
  }

  /* ---- Gauge (Circular) ---- */
  function gauge(value, max, opts = {}) {
    const { label, unit, thresholds } = opts;
    const pct = Math.round((value / max) * 100) || 0;
    let color = 'var(--ga-green)';
    if (thresholds) {
      if (pct < thresholds.red) color = 'var(--ga-red)';
      else if (pct < thresholds.amber) color = 'var(--ga-amber)';
    }
    const circumference = 2 * Math.PI * 40;
    const dashoffset = circumference * (1 - pct / 100);
    return `
      <div class="gauge-container" aria-label="${label || ''}: ${pct}%">
        <svg viewBox="0 0 100 100" class="gauge-svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ga-border)" stroke-width="8"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
                  stroke-linecap="round" transform="rotate(-90 50 50)"/>
        </svg>
        <div class="gauge-text">
          <span class="gauge-value">${pct}${unit || '%'}</span>
          ${label ? `<span class="gauge-label">${label}</span>` : ''}
        </div>
      </div>`;
  }

  /* ---- Formula Gauge ---- */
  function formulaGauge(name, value, opts = {}) {
    const { target, unit = '%', color, thresholds } = opts;
    const max = target || 100;
    const pct = Math.round((value / max) * 100) || 0;
    let barColor = color || 'var(--ga-blue)';
    if (thresholds) {
      if (pct < thresholds.red) barColor = 'var(--ga-red)';
      else if (pct < thresholds.amber) barColor = 'var(--ga-amber)';
      else barColor = 'var(--ga-green)';
    }
    const targetLine = target ? `<div class="formula-gauge-target" style="left:100%" title="Target: ${target}${unit}"></div>` : '';
    return `
      <div class="formula-gauge" aria-label="${name}: ${value}${unit}">
        <div class="formula-gauge-label">${_esc(name)}</div>
        <div class="formula-gauge-bar-wrap">
          <div class="formula-gauge-bar" style="width:${Math.min(pct, 100)}%;background:${barColor}"></div>
          ${targetLine}
        </div>
        <div class="formula-gauge-value">${value}${unit}</div>
      </div>`;
  }

  /* ---- Lineage Chain ---- */
  function lineageChain(items) {
    if (!items || items.length === 0) return '';
    return `
      <div class="lineage-chain" role="list" aria-label="Content lineage">
        ${items.map((item, i) => `
          <span class="lineage-node ${item.active ? 'lineage-active' : ''}" role="listitem"${item.onClick ? ` onclick="${item.onClick}" tabindex="0" style="cursor:pointer"` : ''}>
            ${_esc(item.label)}
          </span>
          ${i < items.length - 1 ? '<span class="lineage-arrow">&#8594;</span>' : ''}
        `).join('')}
      </div>`;
  }

  /* ---- Trend Sparkline (inline mini chart) ---- */
  function trendSparkline(values, color = 'var(--ga-blue)') {
    if (!values || values.length < 2) return '';
    const w = 80, h = 24;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
    return `
      <svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }


  // ====================================================================
  //  MODALS & DIALOGS
  // ====================================================================

  function modal(title, bodyHtml, opts = {}) {
    const { actions, id, wide } = opts;
    const modalId = id || 'modal-' + Math.random().toString(36).slice(2, 8);
    let actionsHtml = '';
    if (actions) {
      actionsHtml = '<div class="modal-actions">' + actions.map(a =>
        `<button class="btn ${a.class || 'btn-primary'}" onclick="${a.onClick}">${a.label}</button>`
      ).join('') + '</div>';
    }
    return `
      <div class="modal-overlay" id="${modalId}" role="dialog" aria-modal="true" aria-labelledby="${modalId}-title" onclick="Components.closeModal('${modalId}')">
        <div class="modal-content ${wide ? 'modal-wide' : ''}" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2 id="${modalId}-title">${title}</h2>
            <button class="modal-close" onclick="Components.closeModal('${modalId}')" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${actionsHtml}
        </div>
      </div>`;
  }

  function showModal(html) {
    const container = document.getElementById('modal-container');
    if (container) {
      if (arguments.length >= 2) {
        const title = arguments[0];
        const bodyHtml = arguments[1];
        container.innerHTML = modal(title, bodyHtml);
      } else {
        container.innerHTML = html;
      }
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        const firstFocusable = overlay.querySelector('input, select, textarea, button:not(.modal-close)');
        if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50);
        overlay.addEventListener('keydown', trapFocus);
        overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const id = overlay.id; if (id) closeModal(id); } });
      }
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const modalEl = e.currentTarget.querySelector('.modal-content') || e.currentTarget.querySelector('.modal-box');
    if (!modalEl) return;
    const focusables = modalEl.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function closeModal(id) {
    if (id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    } else {
      document.getElementById('modal-container').innerHTML = '';
    }
  }

  /* ---- Confirm Dialog ---- */
  function confirmDialog(title, message, onConfirm) {
    const dlgId = 'confirm-' + Math.random().toString(36).slice(2, 8);
    const body = `
      <p style="margin:0 0 16px;color:var(--ga-charcoal)">${_esc(message)}</p>
    `;
    const html = modal(title, body, {
      id: dlgId,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: `Components.closeModal('${dlgId}')` },
        { label: 'Confirm', class: 'btn-primary', onClick: `Components.closeModal('${dlgId}'); (${onConfirm})()` }
      ]
    });
    showModal(html);
  }


  // ====================================================================
  //  DATE RANGE PICKER
  // ====================================================================

  function dateRangePicker(current = '30d') {
    const settings = Store.get('social_settings') || {};
    const compareMode = settings.compare_mode || 'wow';
    const ranges = ['7d', '14d', '30d', '90d'];
    return `
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="date-range-picker" role="group" aria-label="Date range">
          ${ranges.map(r => `<button class="dr-btn ${r === current ? 'dr-active' : ''}" data-range="${r}" onclick="Components.setDateRange('${r}')">${r.toUpperCase()}</button>`).join('')}
        </div>
        <div class="date-range-picker" role="group" aria-label="Compare mode">
          <button class="dr-btn ${compareMode === 'wow' ? 'dr-active' : ''}" onclick="Components.setCompareMode('wow')">WoW</button>
          <button class="dr-btn ${compareMode === 'mom' ? 'dr-active' : ''}" onclick="Components.setCompareMode('mom')">MoM</button>
        </div>
      </div>`;
  }

  function setDateRange(range) {
    const settings = Store.get('social_settings') || {};
    settings.date_range = range;
    Store.set('social_settings', settings);
    document.querySelectorAll('.dr-btn').forEach(b => b.classList.toggle('dr-active', b.dataset.range === range));
    Events.log('social_daterange_change', { range, compare_mode: settings.compare_mode });
  }

  function setCompareMode(mode) {
    const settings = Store.get('social_settings') || {};
    settings.compare_mode = mode;
    Store.set('social_settings', settings);
    document.getElementById('topbar-date-range').innerHTML = dateRangePicker(settings.date_range || '30d');
    Events.log('social_daterange_change', { range: settings.date_range, compare_mode: mode });
  }


  // ====================================================================
  //  EMPTY STATE & TOAST
  // ====================================================================

  function emptyState(icon, message, ctaText, ctaAction) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-message">${message}</div>
        ${ctaText ? `<button class="btn btn-primary" onclick="${ctaAction || ''}">${ctaText}</button>` : ''}
      </div>`;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 300); }, 3000);
  }


  // ====================================================================
  //  HEADERS & BANNERS
  // ====================================================================

  function sectionHeader(title, subtitle) {
    return `<div class="section-header"><h2 class="section-title">${title}</h2>${subtitle ? `<p class="section-subtitle">${subtitle}</p>` : ''}</div>`;
  }

  function partHeader(partLabel, title) {
    return `<div class="part-header"><span class="part-label">${partLabel}</span><h3 class="part-title">${title}</h3></div>`;
  }

  function alertBanner(message, type = 'error') {
    return `<div class="alert-banner alert-${type}" role="alert">${message}</div>`;
  }


  // ====================================================================
  //  WINDSOR DOT
  // ====================================================================

  function windsorDot(connectorKey) {
    const cache = Store.get('windsor_cache') || {};
    const connector = cache[connectorKey];
    if (!connector || !connector.timestamp) {
      return '<span class="windsor-dot windsor-dot-red" title="Windsor.ai not connected">&#9679; PENDING</span>';
    }
    const ageHrs = (Date.now() - new Date(connector.timestamp).getTime()) / (1000 * 60 * 60);
    if (ageHrs < 24) return `<span class="windsor-dot windsor-dot-green" title="Refreshed ${Math.round(ageHrs)}h ago">&#9679;</span>`;
    if (ageHrs < 48) return `<span class="windsor-dot windsor-dot-amber" title="Data may be stale — ${Math.round(ageHrs)}h ago">&#9679;</span>`;
    return `<span class="windsor-dot windsor-dot-red" title="STALE DATA — ${Math.round(ageHrs)}h ago">&#9679; STALE</span>`;
  }


  // ====================================================================
  //  FORM COMPONENTS
  // ====================================================================

  /* ---- Form Group (wrapper) ---- */
  function formGroup(label, inputHtml, opts = {}) {
    const { helpText, error, required, id } = opts;
    const labelId = id || 'fg-' + Math.random().toString(36).slice(2, 8);
    const reqMark = required ? '<span class="form-required">*</span>' : '';
    return `
      <div class="form-group ${error ? 'form-group-error' : ''}">
        <label class="form-label" for="${labelId}">${_esc(label)}${reqMark}</label>
        ${inputHtml}
        ${helpText ? `<div class="form-help">${_esc(helpText)}</div>` : ''}
        ${error ? `<div class="form-error" role="alert">${_esc(error)}</div>` : ''}
      </div>`;
  }

  /* ---- Form Input ---- */
  function formInput(name, value, opts = {}) {
    const { type = 'text', placeholder = '', required, disabled, min, max, step, id, className = '' } = opts;
    const inputId = id || 'fi-' + name;
    const attrs = [
      `type="${type}"`,
      `name="${_esc(name)}"`,
      `id="${inputId}"`,
      `value="${_esc(String(value ?? ''))}"`,
      placeholder ? `placeholder="${_esc(placeholder)}"` : '',
      required ? 'required' : '',
      disabled ? 'disabled' : '',
      min != null ? `min="${min}"` : '',
      max != null ? `max="${max}"` : '',
      step != null ? `step="${step}"` : '',
      `class="form-input ${className}"`
    ].filter(Boolean).join(' ');
    return `<input ${attrs}>`;
  }

  /* ---- Form Select ---- */
  function formSelect(name, options, selected, opts = {}) {
    const { placeholder, required, disabled, id, className = '' } = opts;
    const selectId = id || 'fs-' + name;
    let html = `<select name="${_esc(name)}" id="${selectId}" class="form-select ${className}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>`;
    if (placeholder) {
      html += `<option value="" disabled ${!selected ? 'selected' : ''}>${_esc(placeholder)}</option>`;
    }
    options.forEach(opt => {
      const val = typeof opt === 'object' ? opt.value : opt;
      const label = typeof opt === 'object' ? opt.label : opt;
      html += `<option value="${_esc(String(val))}" ${String(val) === String(selected) ? 'selected' : ''}>${_esc(label)}</option>`;
    });
    html += '</select>';
    return html;
  }

  /* ---- Form Textarea ---- */
  function formTextarea(name, value, opts = {}) {
    const { placeholder = '', rows = 4, maxLength, required, disabled, id, className = '' } = opts;
    const taId = id || 'ft-' + name;
    const currentLen = (value || '').length;
    const counterHtml = maxLength ? `<div class="form-char-count">${currentLen}/${maxLength}</div>` : '';
    return `
      <div class="form-textarea-wrap">
        <textarea name="${_esc(name)}" id="${taId}" class="form-textarea ${className}" rows="${rows}"
          ${placeholder ? `placeholder="${_esc(placeholder)}"` : ''}
          ${maxLength ? `maxlength="${maxLength}"` : ''}
          ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}
          ${maxLength ? `oninput="this.nextElementSibling.textContent=this.value.length+'/${maxLength}'"` : ''}
        >${_esc(value || '')}</textarea>
        ${counterHtml}
      </div>`;
  }

  /* ---- Form Checkbox ---- */
  function formCheckbox(name, label, checked) {
    const cbId = 'fc-' + name + '-' + Math.random().toString(36).slice(2, 6);
    return `
      <label class="form-checkbox-label" for="${cbId}">
        <input type="checkbox" name="${_esc(name)}" id="${cbId}" class="form-checkbox" ${checked ? 'checked' : ''}>
        <span>${_esc(label)}</span>
      </label>`;
  }

  /* ---- Form Row (horizontal layout) ---- */
  function formRow(...children) {
    return `<div class="form-row">${children.join('')}</div>`;
  }


  // ====================================================================
  //  COMPLIANCE COMPONENTS
  // ====================================================================

  /* ---- Compliance Chip ---- */
  function complianceChip(passed, label) {
    const icon = passed ? '&#9989;' : '&#10060;';
    const cls = passed ? 'compliance-pass' : 'compliance-fail';
    return `<span class="compliance-chip ${cls}">${icon} ${_esc(label)}</span>`;
  }

  /* ---- Readiness Checklist ---- */
  function readinessChecklist(checks) {
    if (!checks || checks.length === 0) return '';
    return `
      <ul class="readiness-checklist" role="list">
        ${checks.map(c => {
          const icon = c.passed ? '&#9989;' : '&#10060;';
          const cls = c.passed ? 'check-pass' : 'check-fail';
          return `<li class="readiness-item ${cls}" role="listitem">${icon} ${_esc(c.label)}</li>`;
        }).join('')}
      </ul>`;
  }

  /* ---- Violation Card ---- */
  function violationCard(violation) {
    const { rule_code, description, severity, post_ref, id } = violation;
    const vId = id || 'v-' + Math.random().toString(36).slice(2, 8);
    return `
      <div class="violation-card violation-${(severity || 'info').toLowerCase()}" data-violation-id="${vId}">
        <div class="violation-header">
          ${severityBadge(severity || 'Info')}
          <span class="violation-code">${_esc(rule_code || '')}</span>
        </div>
        <div class="violation-body">${_esc(description || '')}</div>
        ${post_ref ? `<div class="violation-ref">Post: ${_esc(post_ref)}</div>` : ''}
        <div class="violation-actions">
          <button class="btn btn-sm btn-secondary" onclick="Components.showToast('Override submitted','info')">Override</button>
        </div>
      </div>`;
  }

  /* ---- Pilot-First Chip ---- */
  function pilotFirstChip(isAuto) {
    const autoTag = isAuto ? ' <span class="pilot-auto-tag">auto-suggest</span>' : '';
    return `<span class="pilot-first-chip">&#9992; Pilot-First${autoTag}</span>`;
  }


  // ====================================================================
  //  PUBLISHING COMPONENTS
  // ====================================================================

  /* ---- Readiness Card ---- */
  function readinessCard(post, checks) {
    const allPassed = checks.every(c => c.passed);
    const statusCls = allPassed ? 'readiness-ready' : 'readiness-blocked';
    return `
      <div class="readiness-card ${statusCls}">
        <div class="readiness-card-header">
          <span class="readiness-card-title">${_esc(post.title || 'Untitled Post')}</span>
          ${publishStatusBadge(allPassed ? (post.status || 'approved') : 'needs_review')}
        </div>
        <div class="readiness-card-platform">${post.platform ? _esc(post.platform) : ''} ${post.scheduled_date ? '&middot; ' + formatDate(post.scheduled_date) : ''}</div>
        ${readinessChecklist(checks)}
      </div>`;
  }


  // ====================================================================
  //  CALENDAR COMPONENTS
  // ====================================================================

  /* ---- Calendar Grid (month view) ---- */
  function calendarGrid(year, month, events) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let html = `<div class="cal-grid" role="grid" aria-label="${monthNames[month]} ${year}">`;
    // Header
    html += '<div class="cal-grid-header">';
    dayNames.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });
    html += '</div>';
    // Body
    html += '<div class="cal-grid-body">';
    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="cal-cell cal-empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = (events || []).filter(ev => ev.date === dateStr);
      const today = new Date();
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      html += `
        <div class="cal-cell ${isToday ? 'cal-today' : ''}" data-date="${dateStr}">
          <span class="cal-date-num">${d}</span>
          <div class="cal-dots">
            ${dayEvents.slice(0, 4).map(ev => `<span class="cal-dot" style="background:${ev.color || 'var(--ga-blue)'}" title="${_esc(ev.label || '')}"></span>`).join('')}
            ${dayEvents.length > 4 ? `<span class="cal-dot-more">+${dayEvents.length - 4}</span>` : ''}
          </div>
        </div>`;
    }
    html += '</div></div>';
    return html;
  }

  /* ---- Calendar Day List (detail view) ---- */
  function calendarDayList(date, events) {
    if (!events || events.length === 0) {
      return emptyState('&#128197;', 'No posts scheduled for this day.', '', null);
    }
    let html = `<div class="cal-day-list">`;
    events.forEach(ev => {
      html += `
        <div class="cal-day-item" style="border-left:3px solid ${ev.color || 'var(--ga-blue)'}">
          <div class="cal-day-time">${ev.time || ''}</div>
          <div class="cal-day-content">
            <div class="cal-day-title">${_esc(ev.title || ev.label || '')}</div>
            ${ev.platform ? `<span class="cal-day-platform">${_esc(ev.platform)}</span>` : ''}
            ${ev.status ? statusBadge(ev.status) : ''}
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  /* ---- Gap Alert ---- */
  function gapAlert(platform, message) {
    return `
      <div class="gap-alert" role="alert">
        <span class="gap-alert-icon">&#9888;</span>
        <span class="gap-alert-text"><strong>${_esc(platform)}</strong>: ${_esc(message)}</span>
      </div>`;
  }

  /* ---- Cadence Meter ---- */
  function cadenceMeter(platform, actual, target) {
    const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
    const color = pct >= 80 ? 'var(--ga-green)' : pct >= 50 ? 'var(--ga-amber)' : 'var(--ga-red)';
    return `
      <div class="cadence-meter" aria-label="${platform}: ${actual}/${target} posts">
        <span class="cadence-label">${_esc(platform)}</span>
        <div class="cadence-bar-wrap">
          <div class="cadence-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="cadence-value">${actual}/${target}</span>
      </div>`;
  }


  // ====================================================================
  //  UTILITY COMPONENTS
  // ====================================================================

  /* ---- Search Bar ---- */
  function searchBar(placeholder, onSearch) {
    const sbId = 'sb-' + Math.random().toString(36).slice(2, 8);
    return `
      <div class="search-bar">
        <span class="search-icon">&#128269;</span>
        <input type="search" id="${sbId}" class="search-input" placeholder="${_esc(placeholder || 'Search...')}"
               oninput="${onSearch}(this.value)" aria-label="${_esc(placeholder || 'Search')}">
      </div>`;
  }

  /* ---- Filter Bar ---- */
  function filterBar(filters, selected, onChange) {
    return `
      <div class="filter-bar" role="group" aria-label="Filters">
        ${filters.map(f => {
          const val = typeof f === 'object' ? f.value : f;
          const label = typeof f === 'object' ? f.label : f;
          const isActive = Array.isArray(selected) ? selected.includes(val) : selected === val;
          return `<button class="filter-chip ${isActive ? 'filter-active' : ''}" data-filter="${_esc(val)}" onclick="${onChange}('${_esc(val)}')">${_esc(label)}</button>`;
        }).join('')}
      </div>`;
  }

  /* ---- Tab Bar ---- */
  function tabBar(tabs, activeTab, onChange) {
    return `
      <div class="tab-bar" role="tablist">
        ${tabs.map(t => {
          const val = typeof t === 'object' ? t.value : t;
          const label = typeof t === 'object' ? t.label : t;
          const isActive = activeTab === val;
          return `<button class="tab-btn ${isActive ? 'tab-active' : ''}" role="tab" aria-selected="${isActive}" data-tab="${_esc(val)}" onclick="${onChange}('${_esc(val)}')">${_esc(label)}</button>`;
        }).join('')}
      </div>`;
  }


  // ====================================================================
  //  HELPERS
  // ====================================================================

  /* ---- HTML escape ---- */
  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(val) {
    if (val == null || isNaN(val)) return '—';
    return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatPct(val) {
    if (val == null || isNaN(val)) return '—';
    return Number(val).toFixed(1) + '%';
  }

  function statusColor(status) {
    const s = (status || '').toLowerCase().replace(/\s+/g, '_');
    const map = { open: 'blue', in_progress: 'amber', blocked: 'red', shipped: 'green', verified: 'green', resolved: 'green' };
    return map[s] || 'blue';
  }


  // ====================================================================
  //  PUBLIC API
  // ====================================================================

  return {
    // KPI & data display
    kpiTile, statusCard, platformCard,
    // Badges
    badge, domainBadge, tierBadge, statusBadge, severityBadge, publishStatusBadge,
    // Pipeline & tasks
    pipelineItem, pipelineItemV2, pipelineBoard,
    // Table
    table, sortTable,
    // Gauges & visualizations
    heatmapCell, progressBar, gauge, formulaGauge, lineageChain, trendSparkline,
    // Modals & dialogs
    modal, showModal, closeModal, confirmDialog,
    // Date range
    dateRangePicker, setDateRange, setCompareMode,
    // Empty state & toast
    emptyState, showToast,
    // Headers & banners
    sectionHeader, partHeader, alertBanner,
    // Windsor
    windsorDot,
    // Form components
    formGroup, formInput, formSelect, formTextarea, formCheckbox, formRow,
    // Compliance
    complianceChip, readinessChecklist, violationCard, pilotFirstChip,
    // Publishing
    readinessCard, publishStatusBadge,
    // Calendar
    calendarGrid, calendarDayList, gapAlert, cadenceMeter,
    // Utility
    searchBar, filterBar, tabBar,
    // Helpers
    formatDate, formatCurrency, formatPct, statusColor
  };
})();
