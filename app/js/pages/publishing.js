/* =====================================================================
   AvSocialOS v2 — Publishing Control Center
   Single source of truth for publish readiness. The most important
   operational page in the system.
   ===================================================================== */

const PublishingPage = (() => {

  // ── State ───────────────────────────────────────────────────────────
  let _posts = [];
  let _tasks = [];
  let _pubStatuses = [];
  let _violations = [];
  let _templates = [];
  let _readinessMap = {};

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

  function _hoursUntil(iso) {
    if (!iso) return Infinity;
    return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
  }

  function _hoursSince(iso) {
    if (!iso) return Infinity;
    return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
  }

  // ── Readiness Computation ─────────────────────────────────────────

  function computeReadiness(post, tasks, violations, templates) {
    const task = tasks.find(t => t.post_id === post.id || t.id === post.task_id);
    const template = templates.find(t => t.id === post.template_id);
    const postViolations = violations.filter(v =>
      (v.post_id === post.id || v.post_id === post.post_id) &&
      v.blocking_flag && !v.resolved_flag
    );

    return {
      task_approved: !!(task && ['approved', 'in_progress', 'published'].includes(task.status)),
      asset_attached: !!(post.template_id && template),
      utm_present: !!(post.utm_source && post.utm_medium && post.utm_campaign),
      tinyurl_present: !!post.tinyurl,
      broker_attributed: post.content_type !== 'listing' || !!post.broker_name,
      compliance_passed: postViolations.length === 0,
      casey_reviewed: !!(task && task.status !== 'draft' && task.status !== 'in_review'),
      sendible_synced: false // Manual confirmation for now
    };
  }

  function _readinessScore(checks) {
    const keys = Object.keys(checks);
    const passed = keys.filter(k => checks[k] === true).length;
    return Math.round((passed / keys.length) * 100);
  }

  function _isReady(checks) {
    return Object.values(checks).every(v => v === true);
  }

  function _readinessIcons(checks) {
    const labels = {
      task_approved: 'Task',
      asset_attached: 'Asset',
      utm_present: 'UTM',
      tinyurl_present: 'TinyURL',
      broker_attributed: 'Broker',
      compliance_passed: 'QA',
      casey_reviewed: 'Review',
      sendible_synced: 'Sendible'
    };
    return Object.entries(checks).map(([k, v]) => {
      const icon = v ? '&#9989;' : '&#10060;';
      return `<span title="${labels[k] || k}: ${v ? 'Pass' : 'Fail'}" style="font-size:12px;cursor:default;">${icon}</span>`;
    }).join(' ');
  }

  // ── Classify Posts into Readiness Board columns ───────────────────

  function _classifyPost(post, checks) {
    const pubStatus = _pubStatuses.find(ps => ps.post_id === post.id);

    // Published
    if (pubStatus && pubStatus.published_at && pubStatus.verification_state === 'verified') {
      return 'published';
    }

    // Stale/Mismatch: scheduled >48h ago with no publish confirmation
    if (post.scheduled_at && _hoursSince(post.scheduled_at) > 48 && (!pubStatus || !pubStatus.published_at)) {
      return 'stale';
    }

    // Blocked: has unresolved blocking violations
    if (!checks.compliance_passed) {
      return 'blocked';
    }

    // Needs Review: task is still in Casey Review stage
    if (!checks.casey_reviewed) {
      return 'needs_review';
    }

    // Scheduled: has scheduled_at but not published
    if (post.scheduled_at && !pubStatus?.published_at) {
      return 'scheduled';
    }

    // Approved: task approved but not yet scheduled
    if (checks.task_approved && !post.scheduled_at) {
      return 'approved';
    }

    // Default to needs_review
    return 'needs_review';
  }

  // ── Render ──────────────────────────────────────────────────────────

  async function render(container) {
    try {
      const [posts, tasks, pubStatuses, violations, templates] = await Promise.all([
        API.posts.list(),
        API.tasks.list(),
        API.publish_status.list(),
        API.rule_violations.list(),
        API.templates.list()
      ]);
      _posts = posts || [];
      _tasks = tasks || [];
      _pubStatuses = pubStatuses || [];
      _violations = violations || [];
      _templates = templates || [];
    } catch (err) {
      container.innerHTML = Components.alertBanner('Failed to load publishing data: ' + err.message, 'error');
      return;
    }

    // Compute readiness for all posts
    _readinessMap = {};
    _posts.forEach(post => {
      _readinessMap[post.id] = computeReadiness(post, _tasks, _violations, _templates);
    });

    // KPI computation
    const activeStatuses = ['draft', 'in_review', 'approved', 'in_progress', 'scheduled'];
    const activePosts = _posts.filter(p => activeStatuses.includes(p.status));

    let readyCount = 0;
    let blockedCount = 0;
    let needsReviewCount = 0;
    let staleCount = 0;
    let totalScore = 0;

    activePosts.forEach(p => {
      const checks = _readinessMap[p.id];
      if (!checks) return;
      const cls = _classifyPost(p, checks);
      if (cls === 'blocked') blockedCount++;
      else if (cls === 'needs_review') needsReviewCount++;
      else if (cls === 'stale') staleCount++;
      if (_isReady(checks)) readyCount++;
      totalScore += _readinessScore(checks);
    });

    const avgReadiness = activePosts.length > 0 ? Math.round(totalScore / activePosts.length) : 0;
    const truthAccuracy = Formulas.publishTruthAccuracy(_pubStatuses);

    // Build board columns
    const boardColumns = [
      { id: 'blocked', label: 'Blocked', color: 'var(--ga-red)' },
      { id: 'needs_review', label: 'Needs Review', color: 'var(--ga-amber)' },
      { id: 'approved', label: 'Approved', color: 'var(--ga-blue)' },
      { id: 'scheduled', label: 'Scheduled', color: 'var(--ga-blue)' },
      { id: 'published', label: 'Published', color: 'var(--ga-green)' },
      { id: 'stale', label: 'Stale / Mismatch', color: 'var(--ga-muted)' }
    ];

    const boardPosts = {};
    boardColumns.forEach(col => { boardPosts[col.id] = []; });
    activePosts.forEach(p => {
      const checks = _readinessMap[p.id];
      if (!checks) return;
      const cls = _classifyPost(p, checks);
      if (boardPosts[cls]) boardPosts[cls].push(p);
    });
    // Also classify published posts
    _posts.filter(p => p.status === 'published').forEach(p => {
      const checks = _readinessMap[p.id];
      if (!checks) return;
      const cls = _classifyPost(p, checks);
      if (cls === 'published' && !boardPosts.published.find(bp => bp.id === p.id)) {
        boardPosts.published.push(p);
      }
    });

    // Operator queue: posts due in next 48 hours
    const now = new Date();
    const cutoff48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const operatorQueue = _posts
      .filter(p => {
        if (!p.scheduled_at) return false;
        const sched = new Date(p.scheduled_at);
        return sched >= now && sched <= cutoff48h;
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

    // Mismatch detector: scheduled but no publish confirmation after scheduled time
    const mismatched = _posts.filter(p => {
      if (!p.scheduled_at) return false;
      if (new Date(p.scheduled_at) > now) return false;
      const pubStatus = _pubStatuses.find(ps => ps.post_id === p.id);
      return !pubStatus || !pubStatus.published_at;
    });

    // Stale posts: approved with no scheduled_at for >48h
    const stalePosts = _posts.filter(p => {
      if (p.status !== 'approved' && p.status !== 'in_progress') return false;
      if (p.scheduled_at) return false;
      if (!p.updated_at && !p.created_at) return true;
      const ref = p.updated_at || p.created_at;
      return _hoursSince(ref) > 48;
    });

    container.innerHTML = `
      <div class="domain-page">

        <!-- Section Header -->
        <div class="section-header">
          <div class="section-title">Publishing Control Center</div>
          <div class="section-subtitle">Single source of truth for publish readiness \u2014 GlobalAir.com</div>
        </div>

        <!-- Part A: KPI Row -->
        <div>
          <div class="part-header">
            <span class="part-label">A</span>
            <span class="part-title">Publishing KPIs</span>
          </div>
          <div class="row-grid row-grid-6">
            ${Components.kpiTile('Publish Ready', readyCount, { icon: '\u2705' })}
            ${Components.kpiTile('Blocked', blockedCount, { icon: '\ud83d\udeab' })}
            ${Components.kpiTile('Needs Review', needsReviewCount, { icon: '\ud83d\udd0d' })}
            ${Components.kpiTile('Stale', staleCount, { icon: '\u26a0\ufe0f' })}
            ${Components.kpiTile('Readiness Score', avgReadiness, { suffix: '%' })}
            ${Components.kpiTile('Truth Accuracy', truthAccuracy.percentage, { suffix: '%' })}
          </div>
        </div>

        <!-- Part B: Readiness Board -->
        <div>
          <div class="part-header">
            <span class="part-label">B</span>
            <span class="part-title">Readiness Board</span>
          </div>
          <div class="row-grid row-grid-6" style="align-items:flex-start;">
            ${boardColumns.map(col => {
              const colPosts = boardPosts[col.id] || [];
              return `
                <div class="pipeline-stage">
                  <div class="pipeline-title">
                    <span class="status-dot" style="background:${col.color}"></span>
                    ${col.label}
                    <span class="pipeline-count">${colPosts.length}</span>
                  </div>
                  ${colPosts.length > 0
                    ? colPosts.map(p => _renderPostCard(p)).join('')
                    : '<div style="font-size:12px;color:var(--ga-muted);text-align:center;padding:20px">No posts</div>'
                  }
                </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Part C: Operator Queue -->
        <div>
          <div class="part-header">
            <span class="part-label">C</span>
            <span class="part-title">Operator Queue &mdash; Next 48 Hours</span>
            <span style="font-size:12px;color:var(--ga-muted);margin-left:12px;">${operatorQueue.length} posts</span>
          </div>
          ${operatorQueue.length > 0 ? Components.table(
            [
              { key: 'title', label: 'Post', render: v => `<strong>${_esc(v || 'Untitled')}</strong>` },
              { key: 'platform', label: 'Platform', render: v => Components.badge(v || '\u2014', 'blue') },
              { key: 'scheduled_at', label: 'Scheduled', render: v => _formatDateTime(v) },
              { key: 'assignee', label: 'Assignee', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? `<span class="avatar" style="width:22px;height:22px;font-size:9px;background:${m.color}">${m.initials}</span> ${m.name.split(' ')[0]}` : (v || '\u2014');
              }},
              { key: 'id', label: 'Readiness', render: (v, row) => {
                const checks = _readinessMap[row.id];
                if (!checks) return '\u2014';
                const score = _readinessScore(checks);
                const color = score === 100 ? 'var(--ga-green)' : score >= 75 ? 'var(--ga-amber)' : 'var(--ga-red)';
                return `<span style="font-weight:700;color:${color}">${score}%</span> ${_readinessIcons(checks)}`;
              }}
            ],
            operatorQueue,
            { sortable: true }
          ) : Components.emptyState('\ud83d\udcc5', 'No posts scheduled in the next 48 hours.', '', null)}
        </div>

        <!-- Part D: Publish Confirmation -->
        <div>
          <div class="part-header">
            <span class="part-label">D</span>
            <span class="part-title">Publish Confirmation</span>
          </div>
          ${_renderConfirmationSection()}
        </div>

        <!-- Part E: Mismatch Detector -->
        <div>
          <div class="part-header">
            <span class="part-label">E</span>
            <span class="part-title">Mismatch Detector</span>
          </div>
          ${mismatched.length > 0 ? `
            <div class="card">
              ${mismatched.map(p => Components.alertBanner(
                `<strong>${_esc(p.title || 'Untitled')}</strong> (${_esc(p.platform || '')}) \u2014 Scheduled ${_formatDateTime(p.scheduled_at)} but no publish confirmation`,
                'error'
              )).join('')}
            </div>
          ` : Components.emptyState('\u2705', 'No mismatches detected. All scheduled posts are confirmed.', '', null)}
        </div>

        <!-- Part F: Stale Posts -->
        <div>
          <div class="part-header">
            <span class="part-label">F</span>
            <span class="part-title">Stale Posts</span>
            <span style="font-size:12px;color:var(--ga-muted);margin-left:12px;">${stalePosts.length} stale</span>
          </div>
          ${stalePosts.length > 0 ? Components.table(
            [
              { key: 'title', label: 'Post', render: v => `<strong>${_esc(v || 'Untitled')}</strong>` },
              { key: 'platform', label: 'Platform', render: v => Components.badge(v || '\u2014', 'muted') },
              { key: 'status', label: 'Status', render: v => Components.statusBadge(v) },
              { key: 'assignee', label: 'Assignee', render: v => {
                const m = SeedData.getTeam().find(t => t.id === v);
                return m ? m.name.split(' ')[0] : (v || '\u2014');
              }},
              { key: 'updated_at', label: 'Last Updated', render: v => _formatDate(v) },
              { key: 'id', label: 'Age', render: (v, row) => {
                const ref = row.updated_at || row.created_at;
                const hrs = _hoursSince(ref);
                return hrs < 24 ? Math.round(hrs) + 'h' : Math.round(hrs / 24) + 'd';
              }}
            ],
            stalePosts,
            { sortable: true }
          ) : Components.emptyState('\u2705', 'No stale posts. All approved posts are scheduled.', '', null)}
        </div>

      </div>`;
  }

  // ── Sub-renderers ─────────────────────────────────────────────────

  function _renderPostCard(post) {
    const checks = _readinessMap[post.id] || {};
    const platforms = SeedData.getPlatforms();
    const platInfo = platforms[(post.platform || '').toLowerCase()];
    const platIcon = platInfo ? `<span style="color:${platInfo.color};font-weight:700;font-size:12px;">${platInfo.icon}</span>` : '';

    const assignee = SeedData.getTeam().find(m => m.id === post.assignee);
    const assigneeHtml = assignee
      ? `<span class="avatar" style="width:18px;height:18px;font-size:8px;background:${assignee.color}">${assignee.initials}</span>`
      : '';

    return `
      <div class="pipeline-item" style="padding:10px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          ${platIcon}
          <span class="pipeline-item-title" style="font-size:12px;">${_esc(post.title || 'Untitled')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ga-muted);margin-bottom:6px;">
          ${assigneeHtml}
          <span>${post.scheduled_at ? _formatDateTime(post.scheduled_at) : 'Not scheduled'}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;">
          ${_readinessIcons(checks)}
        </div>
      </div>`;
  }

  function _renderConfirmationSection() {
    // Show scheduled posts that need publish confirmation
    const now = new Date();
    const needsConfirmation = _posts.filter(p => {
      if (!p.scheduled_at) return false;
      if (new Date(p.scheduled_at) > now) return false;
      const pubStatus = _pubStatuses.find(ps => ps.post_id === p.id);
      return !pubStatus || pubStatus.verification_state !== 'verified';
    });

    if (needsConfirmation.length === 0) {
      return Components.emptyState('\u2705', 'All past-due scheduled posts are confirmed.', '', null);
    }

    return Components.table(
      [
        { key: 'title', label: 'Post', render: v => `<strong>${_esc(v || 'Untitled')}</strong>` },
        { key: 'platform', label: 'Platform', render: v => Components.badge(v || '\u2014', 'blue') },
        { key: 'scheduled_at', label: 'Scheduled', render: v => _formatDateTime(v) },
        { key: 'id', label: 'Action', render: (v) => `
          <button class="btn btn-sm btn-primary" onclick="PublishingPage.confirmPublished('${_esc(v)}')">Confirm Published</button>
        `}
      ],
      needsConfirmation,
      { sortable: true }
    );
  }

  // ── Actions ───────────────────────────────────────────────────────

  async function confirmPublished(postId) {
    try {
      const now = new Date().toISOString();
      const existing = _pubStatuses.find(ps => ps.post_id === postId);

      if (existing) {
        await API.publish_status.update(existing.id, {
          published_at: now,
          verification_state: 'verified',
          verified_by: Auth.getUser(),
          verified_at: now
        });
      } else {
        await API.publish_status.create({
          post_id: postId,
          published_at: now,
          verification_state: 'verified',
          verified_by: Auth.getUser(),
          verified_at: now
        });
      }

      Events.log(Events.EVENTS.POST_PUBLISH_CONFIRMED, {
        post_id: postId,
        verified_by: Auth.getUser()
      });
      Components.showToast('Publish confirmed', 'success');

      // Re-render
      const container = document.querySelector('.domain-page').parentElement;
      if (container) await render(container);
    } catch (err) {
      Components.showToast('Failed to confirm publish: ' + err.message, 'error');
    }
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render,
    confirmPublished
  };

})();
