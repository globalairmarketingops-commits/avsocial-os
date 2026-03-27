/* =====================================================================
   AvSocialOS v2 — Channel Strategy Playbook
   Platform governance, rule enforcement tracking, compliance metrics,
   policy change log, and strategy editing.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > channel-strategy.js
   ===================================================================== */

const ChannelPage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _strategy = [];
  let _posts = [];
  let _violations = [];
  let _violationFilter = 'all';

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _platformIcon(platformId) {
    const platforms = SeedData.getPlatforms();
    const p = platforms[(platformId || '').toLowerCase()];
    if (!p) return '';
    return `<span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>`;
  }

  function _strategyAsMap(strategyArray) {
    const map = {};
    (strategyArray || []).forEach(s => {
      const key = (s.platform || s.id || '').toLowerCase();
      if (key) map[key] = s;
    });
    return map;
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [strategy, posts, violations] = await Promise.all([
        API.channel_strategy.list(),
        API.posts.list(),
        API.rule_violations.list()
      ]);
      _strategy = strategy || [];
      _posts = posts || [];
      _violations = violations || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load channel strategy data: ' + err.message, 'error');
      return;
    }

    const isFullAccess = Auth.getRole() === 'full_access';

    let html = '';
    html += Components.sectionHeader('Channel Strategy Playbook', 'Platform governance, rules, compliance tracking, and policy management');

    // A. Governance Overview
    html += _renderGovernanceOverview();

    // B. Platform Strategy Cards
    html += _renderPlatformStrategyCards(isFullAccess);

    // C. Live Rule Violation Feed
    html += _renderViolationFeed();

    // D. Governance Coverage Meter
    html += _renderGovernanceCoverage();

    // E. Policy Change Log
    html += _renderChangeLog();

    // F. Platform-Goal Mapping
    html += _renderGoalMapping();

    // G. Strategy Version History
    html += _renderVersionHistory();

    container.innerHTML = html;
  }

  // ── Section A: Governance Overview ──────────────────────────────────

  function _renderGovernanceOverview() {
    const ruleCompliance = Formulas.ruleCompliance(_posts, _violations);
    const allRules = Validators.getRules();
    const enforcedCodes = new Set(allRules.map(r => r.code));

    // Count documented rules across all strategy entries
    let totalDocumentedRules = 0;
    let enforcedInSystem = 0;
    _strategy.forEach(s => {
      const rules = s.rules || [];
      totalDocumentedRules += rules.length;
      rules.forEach(r => {
        if (r.rule_code && enforcedCodes.has(r.rule_code)) enforcedInSystem++;
      });
    });
    // Also count validator rules not linked to strategy
    const systemRuleCount = allRules.length;
    const totalRules = Math.max(totalDocumentedRules, systemRuleCount);
    const governanceCoverage = totalRules > 0 ? Math.round((enforcedInSystem / totalRules) * 100) : 0;

    let html = '<div class="kpi-row">';
    html += Components.kpiTile('Rule Compliance', ruleCompliance.overall, { icon: '&#9989;', suffix: '%' });
    html += Components.kpiTile('Governance Coverage', governanceCoverage, { icon: '&#128737;', suffix: '%', subtitle: `${enforcedInSystem} of ${totalRules} enforced` });
    html += Components.kpiTile('Total Rules', systemRuleCount, { icon: '&#128220;' });
    html += Components.kpiTile('Total Violations', _violations.length, { icon: '&#9888;' });
    html += '</div>';
    return html;
  }

  // ── Section B: Platform Strategy Cards ──────────────────────────────

  function _renderPlatformStrategyCards(isFullAccess) {
    let html = Components.partHeader('B', 'Platform Strategy Cards');

    const platforms = SeedData.getPlatforms();
    const strategyMap = _strategyAsMap(_strategy);
    const enforcedCodes = new Set(Validators.getRules().map(r => r.code));

    // Count violations per platform
    const violationsByPlatform = {};
    _violations.forEach(v => {
      const key = (v.platform || '').toLowerCase();
      if (!violationsByPlatform[key]) violationsByPlatform[key] = 0;
      violationsByPlatform[key]++;
    });

    html += '<div class="strategy-cards-grid">';
    Object.keys(platforms).forEach(pid => {
      const p = platforms[pid];
      const s = strategyMap[pid] || {};
      const vCount = violationsByPlatform[pid] || 0;

      html += `
        <div class="strategy-card" style="border-top:3px solid ${p.color}">
          <div class="strategy-card-header">
            <span class="platform-icon-sm" style="background:${p.color}">${p.icon}</span>
            <span class="strategy-card-name">${p.name}</span>
            ${isFullAccess ? `<button class="btn btn-sm btn-secondary" onclick="ChannelPage._openEditModal('${pid}')">Edit</button>` : ''}
          </div>
          <div class="strategy-card-body">
            <div class="strategy-field"><span class="strategy-label">Audience:</span> ${_esc(s.audience || p.cat || '\u2014')}</div>
            <div class="strategy-field"><span class="strategy-label">Frequency:</span> ${_esc(s.frequency || (p.daily + '/day') || '\u2014')}</div>
            <div class="strategy-field"><span class="strategy-label">Formats:</span> ${_esc(Array.isArray(s.formats) ? s.formats.join(', ') : (s.formats || '\u2014'))}</div>
            <div class="strategy-field"><span class="strategy-label">Tone:</span> ${_esc(s.tone || '\u2014')}</div>
            <div class="strategy-field"><span class="strategy-label">Goal:</span> ${_esc(s.goal || '\u2014')}</div>
            <div class="strategy-field"><span class="strategy-label">KPIs:</span> ${_esc(Array.isArray(s.kpis) ? s.kpis.join(', ') : (s.kpis || '\u2014'))}</div>
          </div>
          <div class="strategy-rules">
            <div class="strategy-rules-header">
              <strong>Rules</strong>
              <span class="text-muted">(${vCount} violation${vCount !== 1 ? 's' : ''})</span>
            </div>
            ${_renderRulesForPlatform(pid, s, enforcedCodes)}
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function _renderRulesForPlatform(platformId, strategy, enforcedCodes) {
    const rules = strategy.rules || [];
    // Also include validator rules for this platform
    const validatorRules = Validators.getRules().filter(
      r => r.platform === 'all' || r.platform === platformId
    );

    // Merge: show strategy-documented rules + any validator rules not already listed
    const shown = new Set();
    let html = '<div class="rules-list">';

    // Strategy-defined rules first
    rules.forEach(r => {
      const code = r.rule_code || '';
      shown.add(code);
      const enforced = code && enforcedCodes.has(code);
      html += `
        <div class="rule-row">
          <span class="rule-text">${_esc(r.text || r.description || code)}</span>
          ${r.severity ? Components.severityBadge(r.severity) : ''}
          ${enforced
            ? '<span class="ga-badge ga-badge-green">Enforced</span>'
            : '<span class="ga-badge ga-badge-amber">Manual</span>'}
        </div>`;
    });

    // Add validator rules not already in strategy
    validatorRules.forEach(vr => {
      if (shown.has(vr.code)) return;
      html += `
        <div class="rule-row">
          <span class="rule-text">${_esc(vr.description)}</span>
          ${Components.severityBadge(vr.severity || (vr.blocking ? 'error' : 'warning'))}
          <span class="ga-badge ga-badge-green">Enforced</span>
        </div>`;
    });

    if (rules.length === 0 && validatorRules.length === 0) {
      html += '<div class="text-muted" style="font-size:12px;padding:4px 0">No rules documented</div>';
    }

    html += '</div>';
    return html;
  }

  // ── Section C: Live Rule Violation Feed ─────────────────────────────

  function _renderViolationFeed() {
    let html = Components.partHeader('C', 'Live Rule Violation Feed');

    const platforms = SeedData.getPlatforms();
    const platformOptions = ['all', ...Object.keys(platforms)];

    html += `<div class="filter-bar" style="margin-bottom:12px">
      <label class="filter-label">Platform:
        <select id="violation-platform-filter" class="form-select form-select-sm" onchange="ChannelPage._filterViolations(this.value)">
          ${platformOptions.map(p => {
            const label = p === 'all' ? 'All Platforms' : platforms[p].name;
            return `<option value="${p}" ${_violationFilter === p ? 'selected' : ''}>${label}</option>`;
          }).join('')}
        </select>
      </label>
    </div>`;

    const filtered = _violationFilter === 'all'
      ? _violations
      : _violations.filter(v => (v.platform || '').toLowerCase() === _violationFilter);

    const sorted = [...filtered]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);

    if (sorted.length === 0) {
      html += '<div class="empty-inline">No violations for this filter.</div>';
      return html;
    }

    html += '<div id="violation-feed-list">';
    html += _renderViolationCards(sorted);
    html += '</div>';
    return html;
  }

  function _renderViolationCards(violations) {
    let html = '';
    violations.forEach(v => {
      const post = _posts.find(p => (p.id || p.post_id) === v.post_id);
      html += `
        <div class="violation-card">
          <div class="violation-card-header">
            <code class="violation-code">${_esc(v.rule_code)}</code>
            ${Components.severityBadge(v.severity || (v.blocking ? 'critical' : 'warning'))}
            ${v.platform ? _platformIcon((v.platform || '').toLowerCase()) : ''}
          </div>
          <div class="violation-card-body">
            <span class="violation-post-title">${_esc(post ? post.title : v.post_id)}</span>
            <span class="violation-date">${_formatDate(v.created_at)}</span>
          </div>
          ${v.resolved ? '<div class="violation-resolved"><span class="ga-badge ga-badge-green">Resolved</span></div>' : ''}
        </div>`;
    });
    return html;
  }

  function _filterViolations(platformId) {
    _violationFilter = platformId;
    const list = document.getElementById('violation-feed-list');
    if (!list) return;

    const filtered = _violationFilter === 'all'
      ? _violations
      : _violations.filter(v => (v.platform || '').toLowerCase() === _violationFilter);

    const sorted = [...filtered]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);

    list.innerHTML = sorted.length > 0
      ? _renderViolationCards(sorted)
      : '<div class="empty-inline">No violations for this filter.</div>';
  }

  // ── Section D: Governance Coverage Meter ─────────────────────────────

  function _renderGovernanceCoverage() {
    let html = Components.partHeader('D', 'Governance Coverage');

    const allRules = Validators.getRules();
    const enforcedCodes = new Set(allRules.map(r => r.code));

    let totalDocumented = 0;
    let enforcedCount = 0;
    _strategy.forEach(s => {
      const rules = s.rules || [];
      totalDocumented += rules.length;
      rules.forEach(r => {
        if (r.rule_code && enforcedCodes.has(r.rule_code)) enforcedCount++;
      });
    });

    const totalRuleBase = Math.max(totalDocumented, allRules.length);
    const systemEnforced = allRules.length;
    const pct = totalRuleBase > 0 ? Math.round((systemEnforced / totalRuleBase) * 100) : 0;

    html += Components.formulaGauge('Governance Coverage', pct, {
      target: 100,
      unit: '%',
      thresholds: { red: 40, amber: 70 }
    });
    html += `<div style="font-size:12px;color:var(--ga-muted);margin-top:8px">${systemEnforced} rules hard-enforced in validators out of ${totalRuleBase} total documented rules.</div>`;
    return html;
  }

  // ── Section E: Policy Change Log ────────────────────────────────────

  function _renderChangeLog() {
    let html = Components.partHeader('E', 'Policy Change Log');

    const allChanges = [];
    _strategy.forEach(s => {
      const log = s.change_log || [];
      const platform = s.platform || s.id || '';
      log.forEach(entry => {
        allChanges.push({ ...entry, platform });
      });
    });

    allChanges.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (allChanges.length === 0) {
      html += '<div class="empty-inline">No policy changes recorded.</div>';
      return html;
    }

    const columns = [
      { key: 'date', label: 'Date', render: (v) => _formatDate(v) },
      { key: 'platform', label: 'Platform', render: (v) => _platformIcon((v || '').toLowerCase()) + ' ' + _esc(v) },
      { key: 'changed_by', label: 'Changed By', render: (v) => {
        const team = SeedData.getTeam();
        const m = team.find(t => t.id === v);
        return m ? `<span class="avatar-inline" style="background:${m.color}">${m.initials}</span> ${_esc(m.name)}` : _esc(v || '\u2014');
      }},
      { key: 'description', label: 'Change', render: (v) => _esc(v || '\u2014') }
    ];

    html += Components.table(columns, allChanges, { id: 'change-log-table', sortable: true });
    return html;
  }

  // ── Section F: Platform-Goal Mapping ────────────────────────────────

  function _renderGoalMapping() {
    let html = Components.partHeader('F', 'Platform-Goal Mapping');

    const platforms = SeedData.getPlatforms();
    const contentTypes = SeedData.getContentTypes();
    const strategyMap = _strategyAsMap(_strategy);
    const platformKeys = Object.keys(platforms);

    html += '<div class="table-wrapper"><table class="ga-table"><thead><tr>';
    html += '<th>Content Type</th>';
    platformKeys.forEach(pid => {
      html += `<th>${_platformIcon(pid)} ${platforms[pid].name}</th>`;
    });
    html += '</tr></thead><tbody>';

    contentTypes.forEach(ct => {
      html += `<tr><td>${ct.icon} ${_esc(ct.name)}</td>`;
      platformKeys.forEach(pid => {
        const s = strategyMap[pid] || {};
        const formats = Array.isArray(s.formats) ? s.formats : [];
        const serves = formats.includes(ct.id) || formats.includes(ct.name);
        // Also check if posts of this type exist on this platform
        const hasPost = _posts.some(p => p.content_type === ct.id && (p.platform || '').toLowerCase() === pid);
        if (serves || hasPost) {
          html += '<td style="text-align:center"><span class="ga-badge ga-badge-green">&#9989;</span></td>';
        } else {
          html += '<td style="text-align:center;color:var(--ga-muted)">\u2014</td>';
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  // ── Section G: Strategy Version History ─────────────────────────────

  function _renderVersionHistory() {
    let html = Components.partHeader('G', 'Strategy Version History');

    const versions = _strategy.filter(s => s.version != null);
    if (versions.length === 0) {
      html += '<div class="empty-inline">No version information available. Versions will be tracked upon strategy edits.</div>';
      return html;
    }

    html += '<div class="version-list">';
    versions.forEach(s => {
      const p = SeedData.getPlatforms()[(s.platform || s.id || '').toLowerCase()];
      html += `
        <div class="version-item">
          <span class="version-platform">${p ? _platformIcon((s.platform || s.id || '').toLowerCase()) + ' ' + p.name : _esc(s.platform || s.id)}</span>
          <span class="version-number">v${s.version}</span>
          <span class="version-updated">${_formatDate(s.updated_at)}</span>
        </div>`;
    });
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--ga-muted);margin-top:8px">Change details available in Policy Change Log above.</div>';
    return html;
  }

  // ── Edit Strategy Modal (full_access only) ──────────────────────────

  function _openEditModal(platformId) {
    if (!Auth.can('edit_strategy', 'channel_strategy')) {
      Components.showToast('Permission denied: full_access required', 'error');
      return;
    }

    const strategyMap = _strategyAsMap(_strategy);
    const s = strategyMap[platformId] || {};
    const p = SeedData.getPlatforms()[platformId] || {};

    const bodyHtml = `
      <form id="edit-strategy-form">
        <input type="hidden" name="platform" value="${_esc(platformId)}">
        ${Components.formGroup('Audience',
          Components.formInput('audience', s.audience || '', { id: 'cs-audience', placeholder: 'Target audience' }),
          { id: 'cs-audience' })}
        ${Components.formGroup('Frequency',
          Components.formInput('frequency', s.frequency || '', { id: 'cs-frequency', placeholder: 'e.g., 3/day' }),
          { id: 'cs-frequency' })}
        ${Components.formGroup('Formats (comma-separated)',
          Components.formInput('formats', Array.isArray(s.formats) ? s.formats.join(', ') : (s.formats || ''), { id: 'cs-formats', placeholder: 'listing, carousel, avgeek' }),
          { id: 'cs-formats' })}
        ${Components.formGroup('Tone',
          Components.formInput('tone', s.tone || '', { id: 'cs-tone', placeholder: 'Professional, engaging...' }),
          { id: 'cs-tone' })}
        ${Components.formGroup('Goal',
          Components.formTextarea('goal', s.goal || '', { id: 'cs-goal', rows: 2 }),
          { id: 'cs-goal' })}
        ${Components.formGroup('KPIs (comma-separated)',
          Components.formInput('kpis', Array.isArray(s.kpis) ? s.kpis.join(', ') : (s.kpis || ''), { id: 'cs-kpis', placeholder: 'engagement_rate, clicks, CTR' }),
          { id: 'cs-kpis' })}
        ${Components.formGroup('Rules (one per line, format: CODE | severity | description)',
          Components.formTextarea('rules_raw', _serializeRules(s.rules || []), { id: 'cs-rules', rows: 5, placeholder: 'UTM_REQUIRED | error | Must include UTM params' }),
          { id: 'cs-rules', helpText: 'One rule per line. Format: rule_code | severity | description' })}
      </form>
    `;

    const modalHtml = Components.modal(`Edit ${p.name || platformId} Strategy`, bodyHtml, {
      id: 'edit-strategy-modal',
      wide: true,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: `Components.closeModal('edit-strategy-modal')` },
        { label: 'Save', class: 'btn-primary', onClick: `ChannelPage._saveStrategy('${_esc(platformId)}')` }
      ]
    });

    Components.showModal(modalHtml);
  }

  function _serializeRules(rules) {
    return rules.map(r => {
      const code = r.rule_code || '';
      const severity = r.severity || 'warning';
      const desc = r.text || r.description || '';
      return `${code} | ${severity} | ${desc}`;
    }).join('\n');
  }

  function _parseRules(raw) {
    return raw.split('\n').filter(line => line.trim()).map(line => {
      const parts = line.split('|').map(s => s.trim());
      return {
        rule_code: parts[0] || '',
        severity: parts[1] || 'warning',
        text: parts[2] || '',
        description: parts[2] || ''
      };
    });
  }

  async function _saveStrategy(platformId) {
    const form = document.getElementById('edit-strategy-form');
    if (!form) return;

    const strategyMap = _strategyAsMap(_strategy);
    const existing = strategyMap[platformId] || {};
    const entityId = existing.id || existing.strategy_id || platformId;

    const formatsRaw = form.querySelector('[name="formats"]').value;
    const kpisRaw = form.querySelector('[name="kpis"]').value;
    const rulesRaw = form.querySelector('[name="rules_raw"]').value;

    const data = {
      platform: platformId,
      audience: form.querySelector('[name="audience"]').value.trim(),
      frequency: form.querySelector('[name="frequency"]').value.trim(),
      formats: formatsRaw.split(',').map(s => s.trim()).filter(Boolean),
      tone: form.querySelector('[name="tone"]').value.trim(),
      goal: form.querySelector('[name="goal"]').value.trim(),
      kpis: kpisRaw.split(',').map(s => s.trim()).filter(Boolean),
      rules: _parseRules(rulesRaw),
      version: (existing.version || 0) + 1,
      updated_at: new Date().toISOString()
    };

    // Append to change log
    const changeLog = existing.change_log || [];
    changeLog.push({
      date: new Date().toISOString(),
      changed_by: Auth.getUser(),
      description: `Strategy updated to v${data.version}`
    });
    data.change_log = changeLog;

    try {
      await API.channel_strategy.update(entityId, data);
      Components.closeModal('edit-strategy-modal');
      Components.showToast('Strategy updated', 'success');
      Events.log('social_strategy_updated', { platform: platformId, version: data.version });

      // Re-render
      const container = document.querySelector('[data-page="channel-strategy"]') || document.getElementById('page-content');
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Save failed: ' + err.message, 'error');
    }
  }

  // ── Public ──────────────────────────────────────────────────────────

  return {
    render,
    _openEditModal,
    _saveStrategy,
    _filterViolations
  };
})();
