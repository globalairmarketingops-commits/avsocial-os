/* =====================================================================
   AvSocialOS v2 — QA & Compliance Gate
   Where platform doctrine becomes enforceable. All compliance
   validation, override management, and pilot-first monitoring.
   ===================================================================== */

const QAPage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _posts = [];
  let _violations = [];
  let _strategy = [];
  let _allResults = [];
  let _violationFilter = { platform: 'all', severity: 'all', resolved: 'all' };
  let _selectedPreflightPostId = null;

  // ── Helpers ─────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _formatDate(iso) {
    if (!iso) return '\u2014';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function _formatDateTime(iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
      const [posts, violations, strategy] = await Promise.all([
        API.posts.list(),
        API.rule_violations.list(),
        API.channel_strategy.list()
      ]);
      _posts = posts || [];
      _violations = violations || [];
      _strategy = strategy || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load QA data: ' + err.message, 'error');
      return;
    }

    const isFullAccess = Auth.getRole() === 'full_access';
    const strategyMap = _strategyAsMap(_strategy);

    // Run validators on all active posts
    const activeStatuses = ['draft', 'in_review', 'approved', 'in_progress', 'scheduled'];
    const activePosts = _posts.filter(p => activeStatuses.includes(p.status));
    _allResults = activePosts.map(post => ({
      post,
      validation: Validators.validatePost(post)
    }));

    // KPI computation
    const totalActive = activePosts.length;
    let passCount = 0;
    let failCount = 0;
    _allResults.forEach(r => {
      const blockingFails = r.validation.filter(v => v.blocking && !v.passed);
      if (blockingFails.length === 0) passCount++;
      else failCount++;
    });
    const complianceRate = totalActive > 0 ? Math.round((passCount / totalActive) * 100 * 10) / 10 : 0;

    const unresolvedBlocking = _violations.filter(v => v.blocking_flag && !v.resolved_flag);
    const criticalViolations = unresolvedBlocking.length;
    const blockedPostIds = new Set(unresolvedBlocking.map(v => v.post_id));
    const blockedPostCount = blockedPostIds.size;

    const overrides = _violations.filter(v => v.override_by);
    const overrideRate = _violations.length > 0 ? Math.round((overrides.length / _violations.length) * 100 * 10) / 10 : 0;

    const pilotMix = Formulas.pilotFirstMix(activePosts);
    const cadenceGaps = Validators.checkCadenceGaps(_posts, strategyMap);

    // Blocked posts queue
    const blockedPosts = activePosts.filter(p => blockedPostIds.has(p.id));

    // Rule compliance by platform
    const ruleCompliance = Formulas.ruleCompliance(activePosts, _violations);

    // Repeat offender patterns
    const offenderMap = {};
    _violations.forEach(v => {
      if (!v.assignee && !v.created_by) return;
      const key = (v.assignee || v.created_by) + '::' + (v.rule_code || 'UNKNOWN');
      if (!offenderMap[key]) {
        offenderMap[key] = { assignee: v.assignee || v.created_by, rule_code: v.rule_code, count: 0 };
      }
      offenderMap[key].count++;
    });
    const repeatOffenders = Object.values(offenderMap).filter(o => o.count >= 2).sort((a, b) => b.count - a.count);

    container.innerHTML = `
      <div class="domain-page">

        <!-- Section Header -->
        <div class="section-header">
          <div class="section-title">QA & Compliance Gate</div>
          <div class="section-subtitle">Platform doctrine enforcement \u2014 GlobalAir.com</div>
        </div>

        <!-- Part A: KPI Row -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Compliance KPIs</span>
          </div>
          <div class="row-grid row-grid-5">
            ${Components.kpiTile('Compliance Rate', complianceRate, { suffix: '%', icon: '\u2705' })}
            ${Components.kpiTile('Override Rate', overrideRate, { suffix: '%', icon: '\u26a0\ufe0f' })}
            ${Components.kpiTile('Critical Violations', criticalViolations, { icon: '\ud83d\udeab' })}
            ${Components.kpiTile('Blocked Posts', blockedPostCount, { icon: '\ud83d\udd34' })}
            ${Components.kpiTile('Pilot-First Mix', pilotMix.percentage, {
              suffix: '%',
              icon: pilotMix.belowTarget ? '\u26a0\ufe0f' : '\u2708\ufe0f',
              subtitle: 'Target: 50%'
            })}
          </div>
        </div>

        <!-- Part B: Blocked Posts Queue -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Blocked Posts Queue</span>
            <span style="font-size:12px;color:var(--ga-muted);margin-left:12px;">${blockedPosts.length} blocked</span>
          </div>
          ${blockedPosts.length > 0 ? `
            <div style="display:grid;gap:12px;">
              ${blockedPosts.map(post => {
                const postViolations = unresolvedBlocking.filter(v => v.post_id === post.id);
                return `
                  <div class="card" style="border-left:4px solid var(--ga-red);padding:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                      <div>
                        <strong style="color:var(--ga-navy)">${_esc(post.title || 'Untitled')}</strong>
                        <span style="margin-left:8px;">${Components.badge(post.platform || '\u2014', 'blue')}</span>
                      </div>
                      ${Components.publishStatusBadge('blocked')}
                    </div>
                    ${postViolations.map(v => `
                      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding:8px;background:var(--ga-bg);border-radius:6px;">
                        ${Components.severityBadge(v.severity || 'Error')}
                        <code style="font-size:11px;color:var(--ga-charcoal)">${_esc(v.rule_code || '')}</code>
                        <span style="font-size:12px;color:var(--ga-muted);flex:1">${_esc(v.description || '')}</span>
                        ${isFullAccess ? `<button class="btn btn-sm btn-secondary" onclick="QAPage.overrideViolation('${_esc(v.id)}')">Override</button>` : ''}
                      </div>
                    `).join('')}
                  </div>`;
              }).join('')}
            </div>
          ` : Components.emptyState('\u2705', 'No blocked posts. All active posts pass compliance.', '', null)}
        </div>

        <!-- Part C: Violation Feed -->
        <div>
          <div class="part-header">
            <span class="part-label">C</span>
            <span class="part-title">Violation Feed</span>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            ${Components.filterBar(
              [
                { value: 'all', label: 'All Platforms' },
                ...Object.keys(SeedData.getPlatforms()).map(p => ({ value: p, label: SeedData.getPlatforms()[p].name }))
              ],
              _violationFilter.platform,
              'QAPage.filterViolations_platform'
            )}
            ${Components.filterBar(
              [
                { value: 'all', label: 'All Severity' },
                { value: 'error', label: 'Error' },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Info' }
              ],
              _violationFilter.severity,
              'QAPage.filterViolations_severity'
            )}
            ${Components.filterBar(
              [
                { value: 'all', label: 'All Status' },
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'resolved', label: 'Resolved' }
              ],
              _violationFilter.resolved,
              'QAPage.filterViolations_resolved'
            )}
          </div>
          <div id="qa-violation-feed" style="max-height:400px;overflow-y:auto;">
            ${_renderViolationFeed(_violations, _violationFilter)}
          </div>
        </div>

        <!-- Part D: Preflight Validator -->
        <div>
          <div class="part-header">
            <span class="part-label">D</span>
            <span class="part-title">Preflight Validator</span>
          </div>
          <div class="card">
            <div style="margin-bottom:12px;">
              ${Components.formGroup('Select Post', Components.formSelect('preflight_post_id',
                activePosts.map(p => ({ value: p.id, label: (p.title || 'Untitled') + ' (' + (p.platform || '\u2014') + ')' })),
                _selectedPreflightPostId || '',
                { placeholder: 'Choose a post to validate\u2026', id: 'fi-preflight_post_id' }
              ))}
            </div>
            <button class="btn btn-primary" onclick="QAPage.runPreflight()">Run Preflight Check</button>
            <div id="qa-preflight-results" style="margin-top:16px;"></div>
          </div>
        </div>

        <!-- Part E: Rule Compliance by Platform -->
        <div>
          <div class="part-header">
            <span class="part-label">E</span>
            <span class="part-title">Rule Compliance by Platform</span>
          </div>
          <div class="card">
            ${Object.keys(ruleCompliance.byPlatform).length > 0 ? Components.table(
              [
                { key: 'platform', label: 'Platform', render: v => {
                  const p = SeedData.getPlatforms()[v];
                  return p ? `<span style="color:${p.color};font-weight:700">${p.icon}</span> ${p.name}` : v;
                }},
                { key: 'compliant', label: 'Compliant' },
                { key: 'total', label: 'Total' },
                { key: 'percentage', label: 'Compliance %', render: v => {
                  const color = v >= 90 ? 'var(--ga-green)' : v >= 70 ? 'var(--ga-amber)' : 'var(--ga-red)';
                  return `<span style="font-weight:700;color:${color}">${v}%</span>`;
                }}
              ],
              Object.entries(ruleCompliance.byPlatform).map(([platform, data]) => ({
                platform,
                compliant: data.compliant,
                total: data.total,
                percentage: data.percentage
              })),
              { sortable: true }
            ) : Components.emptyState('\ud83d\udcca', 'No compliance data yet.', '', null)}
          </div>
        </div>

        <!-- Part F: Repeat Offender Patterns -->
        <div>
          <div class="part-header">
            <span class="part-label">F</span>
            <span class="part-title">Repeat Offender Patterns</span>
          </div>
          ${repeatOffenders.length > 0 ? Components.table(
            [
              { key: 'assignee', label: 'Assignee', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${m.color}">${m.initials}</span> ${m.name}` : (v || '\u2014');
              }},
              { key: 'rule_code', label: 'Rule', render: v => `<code style="font-size:11px">${_esc(v)}</code>` },
              { key: 'count', label: 'Occurrences', render: v => {
                const color = v >= 5 ? 'var(--ga-red)' : v >= 3 ? 'var(--ga-amber)' : 'var(--ga-charcoal)';
                return `<strong style="color:${color}">${v}</strong>`;
              }}
            ],
            repeatOffenders,
            { sortable: true }
          ) : Components.emptyState('\u2705', 'No repeat patterns detected.', '', null)}
        </div>

        <!-- Part G: Pilot-First Mix Monitor -->
        <div>
          <div class="part-header">
            <span class="part-label">G</span>
            <span class="part-title">Pilot-First Mix Monitor</span>
          </div>
          <div class="card" style="display:flex;align-items:center;gap:24px;">
            ${Components.gauge(pilotMix.percentage, 100, {
              label: 'Pilot-First',
              thresholds: { red: 30, amber: 50 }
            })}
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--ga-navy);margin-bottom:4px;">
                ${pilotMix.percentage}% Pilot-First
              </div>
              <div style="font-size:12px;color:var(--ga-muted);margin-bottom:8px;">
                ${pilotMix.pilotFirst} of ${pilotMix.total} active posts | Target: 50%
              </div>
              ${pilotMix.belowTarget
                ? Components.alertBanner(
                    `Gap Alert: ${(50 - pilotMix.percentage).toFixed(1)}% below target. Increase pilot-first content to meet 50% mix.`,
                    'error'
                  )
                : `<span style="color:var(--ga-green);font-weight:600;">\u2705 On target</span>`
              }
            </div>
          </div>
        </div>

        <!-- Part H: Cadence Gap Monitor -->
        <div>
          <div class="part-header">
            <span class="part-label">H</span>
            <span class="part-title">Cadence Gap Monitor</span>
          </div>
          ${cadenceGaps.length > 0 ? `
            <div style="display:grid;gap:8px;">
              ${cadenceGaps.map(gap => {
                const p = SeedData.getPlatforms()[gap.platform];
                const pName = p ? p.name : gap.platform;
                const gapLabel = gap.gap_hours === Infinity
                  ? 'No upcoming posts scheduled'
                  : `Next post in ${Math.round(gap.gap_hours)}h (gap > 48h)`;
                return Components.gapAlert(pName, gapLabel);
              }).join('')}
            </div>
          ` : Components.emptyState('\u2705', 'All active platforms have posts scheduled within 48 hours.', '', null)}
        </div>

        <!-- Part I: Override Log -->
        <div>
          <div class="part-header">
            <span class="part-label">I</span>
            <span class="part-title">Override Log</span>
          </div>
          ${overrides.length > 0 ? Components.table(
            [
              { key: 'created_at', label: 'Date', render: v => _formatDate(v) },
              { key: 'post_id', label: 'Post', render: (v) => {
                const post = _posts.find(p => p.id === v);
                return post ? _esc(post.title || 'Untitled') : `<code>${_esc(String(v).slice(0, 8))}</code>`;
              }},
              { key: 'rule_code', label: 'Rule', render: v => `<code style="font-size:11px">${_esc(v || '')}</code>` },
              { key: 'override_by', label: 'Overridden By', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${m.color}">${m.initials}</span> ${m.name.split(' ')[0]}` : (v || '\u2014');
              }},
              { key: 'override_reason', label: 'Reason', render: v => _esc(v || '\u2014') }
            ],
            overrides,
            { sortable: true }
          ) : Components.emptyState('\ud83d\udccb', 'No overrides recorded.', '', null)}
        </div>

      </div>`;
  }

  // ── Sub-renderers ─────────────────────────────────────────────────

  function _renderViolationFeed(violations, filter) {
    let filtered = [...violations];

    if (filter.platform !== 'all') {
      filtered = filtered.filter(v => (v.platform || '').toLowerCase() === filter.platform);
    }
    if (filter.severity !== 'all') {
      filtered = filtered.filter(v => (v.severity || '').toLowerCase() === filter.severity);
    }
    if (filter.resolved === 'resolved') {
      filtered = filtered.filter(v => v.resolved_flag);
    } else if (filter.resolved === 'unresolved') {
      filtered = filtered.filter(v => !v.resolved_flag);
    }

    if (filtered.length === 0) {
      return Components.emptyState('\ud83d\udccb', 'No violations match the current filters.', '', null);
    }

    return filtered.map(v => {
      const post = _posts.find(p => p.id === v.post_id);
      const postTitle = post ? (post.title || 'Untitled') : 'Unknown Post';
      const resolvedTag = v.resolved_flag
        ? '<span class="ga-badge ga-badge-green" style="margin-left:8px;">Resolved</span>'
        : '<span class="ga-badge ga-badge-red" style="margin-left:8px;">Open</span>';

      return `
        <div class="card" style="margin-bottom:6px;padding:10px 14px;border-left:3px solid ${v.blocking_flag && !v.resolved_flag ? 'var(--ga-red)' : 'var(--ga-border)'};">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${Components.severityBadge(v.severity || 'Info')}
            <code style="font-size:11px;color:var(--ga-charcoal)">${_esc(v.rule_code || '')}</code>
            ${resolvedTag}
            <span style="font-size:11px;color:var(--ga-muted);margin-left:auto;">${_formatDateTime(v.created_at)}</span>
          </div>
          <div style="font-size:12px;color:var(--ga-charcoal);margin-top:4px;">${_esc(v.description || '')}</div>
          <div style="font-size:11px;color:var(--ga-muted);margin-top:2px;">
            Post: <strong>${_esc(postTitle)}</strong>
            ${v.platform ? ' | Platform: ' + _esc(v.platform) : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ── Actions ───────────────────────────────────────────────────────

  async function overrideViolation(violationId) {
    if (Auth.getRole() !== 'full_access') {
      Components.showToast('Only full_access users can override violations', 'error');
      return;
    }

    const reason = prompt('Override reason:');
    if (!reason || !reason.trim()) {
      Components.showToast('Override reason is required', 'error');
      return;
    }

    try {
      await API.rule_violations.update(violationId, {
        resolved_flag: true,
        override_by: Auth.getUser(),
        override_reason: reason.trim(),
        override_at: new Date().toISOString()
      });

      Events.log(Events.EVENTS.QA_OVERRIDE, {
        violation_id: violationId,
        override_by: Auth.getUser(),
        reason: reason.trim()
      });
      Components.showToast('Violation overridden', 'success');

      const container = document.querySelector('.domain-page').parentElement;
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Failed to override violation: ' + err.message, 'error');
    }
  }

  function runPreflight() {
    const selectEl = document.querySelector('[name="preflight_post_id"]');
    const resultsEl = document.getElementById('qa-preflight-results');
    if (!selectEl || !resultsEl) return;

    const postId = selectEl.value;
    if (!postId) {
      Components.showToast('Select a post first', 'error');
      return;
    }

    const post = _posts.find(p => String(p.id) === String(postId));
    if (!post) {
      resultsEl.innerHTML = Components.alertBanner('Post not found', 'error');
      return;
    }

    _selectedPreflightPostId = postId;
    const results = Validators.validatePost(post);
    const blockingFails = results.filter(r => r.blocking && !r.passed);
    const allPass = blockingFails.length === 0;

    Events.log(Events.EVENTS.PREFLIGHT_RUN, {
      post_id: postId,
      all_pass: allPass,
      total_rules: results.length,
      failures: results.filter(r => !r.passed).length
    });

    const checks = results.map(r => ({
      label: r.rule_code + ': ' + r.description,
      passed: r.passed
    }));

    resultsEl.innerHTML = `
      ${allPass
        ? `<div class="card" style="background:var(--ga-green);color:#fff;padding:16px;text-align:center;border-radius:8px;margin-bottom:12px;">
            <strong style="font-size:16px;">READY FOR PUBLISHING</strong>
            <div style="font-size:13px;margin-top:4px;">All ${results.length} rules passed</div>
          </div>`
        : `<div class="card" style="background:var(--ga-red);color:#fff;padding:16px;text-align:center;border-radius:8px;margin-bottom:12px;">
            <strong style="font-size:16px;">BLOCKED</strong>
            <div style="font-size:13px;margin-top:4px;">${blockingFails.length} blocking violation${blockingFails.length > 1 ? 's' : ''}</div>
          </div>`
      }
      ${Components.readinessChecklist(checks)}
    `;
  }

  function filterViolations_platform(val) {
    _violationFilter.platform = val;
    _refreshViolationFeed();
  }

  function filterViolations_severity(val) {
    _violationFilter.severity = val;
    _refreshViolationFeed();
  }

  function filterViolations_resolved(val) {
    _violationFilter.resolved = val;
    _refreshViolationFeed();
  }

  function _refreshViolationFeed() {
    const feedEl = document.getElementById('qa-violation-feed');
    if (feedEl) {
      feedEl.innerHTML = _renderViolationFeed(_violations, _violationFilter);
    }
    // Update active filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      const filterVal = chip.dataset.filter;
      if (!filterVal) return;
      // Determine which filter group this chip belongs to by checking values
      const platformKeys = ['all', ...Object.keys(SeedData.getPlatforms())];
      const severityKeys = ['all', 'error', 'warning', 'info'];
      const resolvedKeys = ['all', 'unresolved', 'resolved'];

      if (platformKeys.includes(filterVal) && chip.closest('.filter-bar')?.querySelector(`[data-filter="linkedin"]`)) {
        chip.classList.toggle('filter-active', filterVal === _violationFilter.platform);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render,
    overrideViolation,
    runPreflight,
    filterViolations_platform,
    filterViolations_severity,
    filterViolations_resolved
  };

})();
