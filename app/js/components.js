/* =====================================================================
   AvSocialOS — Shared UI Components
   All reusable rendering functions for tables, cards, badges, modals, etc.
   ===================================================================== */

const Components = (() => {

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

  /* ---- Badge ---- */
  function badge(text, color = 'blue') {
    return `<span class="ga-badge ga-badge-${color}">${text}</span>`;
  }

  function domainBadge(domain) {
    const colors = { ppc: 'green', seo: 'blue', listings: 'amber', monetization: 'red' };
    return badge(domain.toUpperCase(), colors[domain] || 'blue');
  }

  /* ---- Tier Badge (SocialOS-specific) ---- */
  function tierBadge(tier) {
    const t = tier.toLowerCase();
    return `<span class="tier-badge tier-${t}">${tier}</span>`;
  }

  /* ---- Status Badge (SocialOS-specific) ---- */
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

  /* ---- Pipeline Item (SocialOS-specific) ---- */
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

  /* ---- Sortable Table ---- */
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

  let sortState = {};
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

  /* ---- Heatmap Cell (SocialOS-specific) ---- */
  function heatmapCell(val) {
    const cls = val >= 5 ? 'heat-high' : val >= 2.5 ? 'heat-mid' : 'heat-low';
    return `<span class="heatmap-cell ${cls}">${val}%</span>`;
  }

  /* ---- Progress Bar ---- */
  function progressBar(value, max, color = 'var(--ga-blue)') {
    const pct = Math.min((value / max) * 100, 100);
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>`;
  }

  /* ---- Modal ---- */
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
      // Support both new (html string) and legacy (title, bodyHtml) signatures
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
      // Legacy: clear entire modal container
      document.getElementById('modal-container').innerHTML = '';
    }
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

  /* ---- Date Range Picker ---- */
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

  /* ---- Empty State ---- */
  function emptyState(icon, message, ctaText, ctaAction) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-message">${message}</div>
        ${ctaText ? `<button class="btn btn-primary" onclick="${ctaAction || ''}">${ctaText}</button>` : ''}
      </div>`;
  }

  /* ---- Toast ---- */
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  /* ---- Section Headers ---- */
  function sectionHeader(title, subtitle) {
    return `<div class="section-header"><h2 class="section-title">${title}</h2>${subtitle ? `<p class="section-subtitle">${subtitle}</p>` : ''}</div>`;
  }

  function partHeader(partLabel, title) {
    return `<div class="part-header"><span class="part-label">${partLabel}</span><h3 class="part-title">${title}</h3></div>`;
  }

  /* ---- Alert Banner ---- */
  function alertBanner(message, type = 'error') {
    return `<div class="alert-banner alert-${type}" role="alert">${message}</div>`;
  }

  /* ---- Windsor Staleness Dot ---- */
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

  /* ---- Helpers ---- */
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

  return {
    kpiTile, statusCard, platformCard, badge, domainBadge,
    tierBadge, statusBadge, pipelineItem,
    table, sortTable, heatmapCell, progressBar,
    modal, showModal, closeModal, gauge,
    dateRangePicker, setDateRange, setCompareMode,
    emptyState, showToast, sectionHeader, partHeader, alertBanner,
    windsorDot,
    formatDate, formatCurrency, formatPct, statusColor
  };
})();
