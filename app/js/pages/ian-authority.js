/* =====================================================================
   AvSocialOS v2 — Ian Authority Engine
   Ian Lumpp's personal brand metrics, topic clusters, derivative content,
   repurposing queue, and authority-to-commercial attribution.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > ian-authority.js
   ===================================================================== */

const IanAuthorityPage = (() => {
  'use strict';

  let _container = null;
  let _ianMetrics = {};
  let _posts = [];
  let _series = [];

  const TEAM = SeedData.getTeam();
  const PLATFORMS = SeedData.getPlatforms();

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading Ian Authority data...', '', null);

    try {
      const results = await Promise.all([
        API.ian_metrics.list(),
        API.posts.list(),
        API.series.list()
      ]);
      // ian_metrics may come back as array or object
      const ianRaw = results[0];
      _ianMetrics = Array.isArray(ianRaw) && ianRaw.length > 0 ? ianRaw[0] : (ianRaw || {});
      _posts = results[1] || [];
      _series = results[2] || [];
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load Ian authority data: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[IanAuthorityPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    var ian = _ianMetrics;

    // Filter Ian-related posts
    var ianPosts = _posts.filter(function (p) {
      return p.assignee === 'ian' || p.content_type === 'ian_authority' ||
             (p.created_by === 'ian') || (p.owner === 'ian');
    });

    // Filter Ian-related series
    var ianSeries = _series.filter(function (s) {
      return s.owner === 'ian' || s.series_type === 'ian_authority_clips' ||
             s.series_type === 'podcast_snippets';
    });

    // Scheduled / draft posts for authority queue
    var upcomingPosts = ianPosts.filter(function (p) {
      return p.status === 'draft' || p.status === 'scheduled' || p.status === 'in_review' ||
             p.stage === 'draft' || p.stage === 'in_review' || p.stage === 'approved';
    });

    // Published posts for repurposing analysis
    var publishedPosts = ianPosts.filter(function (p) {
      return p.status === 'published' || p.stage === 'published';
    });

    // Posts driving downstream engagement
    var commercialPosts = publishedPosts.filter(function (p) {
      return (p.clicks || 0) > 0 || (p.sessions || 0) > 0;
    });

    // Posts not yet repurposed
    var notRepurposed = publishedPosts.filter(function (p) {
      return !p.has_derivatives && !p.derivative_count;
    });

    // Top performing post
    var topPost = publishedPosts.reduce(function (best, p) {
      var score = (p.engagement_rate || 0) + (p.clicks || 0) * 0.01;
      var bestScore = best ? ((best.engagement_rate || 0) + (best.clicks || 0) * 0.01) : -1;
      return score > bestScore ? p : best;
    }, null);

    // Theme distribution
    var themes = ian.theme_distribution || [];

    // Event linkages
    var eventLinkages = ian.event_linkages || [];

    // Derivative clips
    var derivativeCount = ian.derivative_clips || 0;

    _container.innerHTML =
      '<div class="domain-page">' +

      // Section Header
      Components.sectionHeader(
        'Ian Lumpp &#8212; Authority Engine',
        'Brand authority metrics, topic clusters, and content systematization'
      ) +

      // Part A: Authority Scorecard
      '<div>' +
        Components.partHeader('A', 'Authority Scorecard') +
        '<div class="row-grid row-grid-6">' +
          Components.kpiTile('LinkedIn Posts', ian.posts || ianPosts.length) +
          Components.kpiTile('Engagement Rate', ian.eng || ian.engagement_rate || 0, { suffix: '%', change: ian.growth || ian.growth_rate }) +
          Components.kpiTile('Impressions', ian.imp || ian.impressions || 0) +
          Components.kpiTile('Post Frequency', ian.freq || ian.frequency || '&#8212;') +
          Components.kpiTile('Authority Score', ian.authority_score || '&#8212;') +
          Components.kpiTile('Growth Rate', ian.growth || ian.growth_rate || 0, { suffix: '%' }) +
        '</div>' +
      '</div>' +

      // Part B: Engagement Detail
      '<div>' +
        Components.partHeader('B', 'Engagement Detail') +
        '<div class="row-grid row-grid-3">' +
          Components.kpiTile('Comments', ian.comments || 0) +
          Components.kpiTile('Shares', ian.shares || 0) +
          Components.kpiTile('Derivative Clips', derivativeCount) +
        '</div>' +
      '</div>' +

      // Part C: Top Performing Post
      '<div>' +
        Components.partHeader('C', 'Top Performing Post') +
        (topPost
          ? '<div class="card" style="border-left:4px solid var(--ga-amber)">' +
              '<div style="font-size:14px;font-weight:700;color:var(--ga-navy);margin-bottom:8px">' + _esc(topPost.title || topPost.name || 'Untitled') + '</div>' +
              '<div style="display:flex;gap:16px;font-size:12px;color:var(--ga-charcoal)">' +
                '<span>Platform: <strong>' + _esc(topPost.platform || '') + '</strong></span>' +
                '<span>Engagement: <strong>' + (topPost.engagement_rate || 0) + '%</strong></span>' +
                '<span>Clicks: <strong>' + (topPost.clicks || 0) + '</strong></span>' +
                '<span>Sessions: <strong>' + (topPost.sessions || 0) + '</strong></span>' +
              '</div>' +
            '</div>'
          : '<div class="card" style="border-left:4px solid var(--ga-amber)">' +
              '<div style="font-size:14px;color:var(--ga-muted)">No published post data available.</div>' +
            '</div>') +
      '</div>' +

      // Part D: Topic Cluster Board
      '<div>' +
        Components.partHeader('D', 'Topic Cluster Board') +
        (themes.length > 0
          ? '<div class="row-grid row-grid-4">' +
              themes.map(function (t) {
                var statusLabel = 'on-track';
                var statusColor = 'green';
                if (t.status === 'behind') { statusLabel = 'behind'; statusColor = 'red'; }
                else if (t.status === 'ahead') { statusLabel = 'ahead'; statusColor = 'blue'; }
                else if (t.actual_count != null && t.target_count != null) {
                  if (t.actual_count < t.target_count) { statusLabel = 'behind'; statusColor = 'red'; }
                  else if (t.actual_count > t.target_count) { statusLabel = 'ahead'; statusColor = 'blue'; }
                }
                return '<div class="card">' +
                  '<div style="font-weight:700;font-size:13px;color:var(--ga-navy)">' + _esc(t.theme || t.name || '') + '</div>' +
                  '<div style="font-size:12px;color:var(--ga-charcoal);margin-top:4px">' +
                    (t.actual_count != null ? t.actual_count : t.post_count || 0) + ' posts' +
                  '</div>' +
                  '<div style="font-size:11px;color:var(--ga-muted);margin-top:2px">Target: ' + (t.target_cadence || t.target || '1/week') + '</div>' +
                  '<div style="margin-top:6px">' + Components.badge(statusLabel, statusColor) + '</div>' +
                '</div>';
              }).join('') +
            '</div>'
          : '<div class="row-grid row-grid-4">' +
              _defaultThemes().map(function (t) {
                return '<div class="card">' +
                  '<div style="font-weight:700;font-size:13px;color:var(--ga-navy)">' + t.name + '</div>' +
                  '<div style="font-size:11px;color:var(--ga-muted);margin-top:4px">Target: ' + t.cadence + '</div>' +
                  '<div style="margin-top:6px">' + Components.badge('awaiting data', 'muted') + '</div>' +
                '</div>';
              }).join('') +
            '</div>') +
      '</div>' +

      // Part E: Upcoming Authority Queue
      '<div>' +
        Components.partHeader('E', 'Upcoming Authority Queue') +
        (upcomingPosts.length > 0
          ? Components.table(
              [
                { key: 'title', label: 'Title', render: function (v) { return '<strong>' + _esc(v || 'Untitled') + '</strong>'; } },
                { key: 'platform', label: 'Platform', render: function (v) { var p = PLATFORMS[(v || '').toLowerCase()]; return p ? p.name : (v || '&#8212;'); } },
                { key: 'scheduled_at', label: 'Scheduled', render: function (v) { return v ? Components.formatDate(v) : '&#8212;'; } },
                { key: 'status', label: 'Status', render: function (v) { return Components.statusBadge(v || 'draft'); } },
                { key: 'readiness', label: 'Readiness', render: function (v, row) {
                    var ready = row.readiness_passed || row.qa_passed;
                    return ready ? Components.badge('Ready', 'green') : Components.badge('Not Ready', 'amber');
                  }
                }
              ],
              upcomingPosts
            )
          : Components.emptyState('&#128203;', 'No upcoming Ian authority posts in the queue.', '', null)) +
      '</div>' +

      // Part F: Event Tie-In Panel
      '<div>' +
        Components.partHeader('F', 'Event Tie-In Panel') +
        (eventLinkages.length > 0
          ? '<div class="row-grid row-grid-3">' +
              eventLinkages.map(function (evt) {
                return '<div class="card" style="border-left:4px solid var(--ga-blue)">' +
                  '<div style="font-weight:700;font-size:13px;color:var(--ga-navy)">' + _esc(evt.name || evt.event_name || '') + '</div>' +
                  '<div style="font-size:12px;color:var(--ga-charcoal);margin-top:4px">' +
                    (evt.start_date ? Components.formatDate(evt.start_date) : '') +
                    (evt.end_date ? ' &#8212; ' + Components.formatDate(evt.end_date) : '') +
                  '</div>' +
                  '<div style="font-size:11px;color:var(--ga-muted);margin-top:6px">Suggested: ' + _esc(evt.suggested_content || evt.content_types || 'LinkedIn posts, podcast recap') + '</div>' +
                '</div>';
              }).join('') +
            '</div>'
          : '<div class="card" style="font-size:12px;color:var(--ga-muted)">No event linkages configured. Add events in the Events module to generate tie-in suggestions.</div>') +
      '</div>' +

      // Part G: Derivative Clip Inventory
      '<div>' +
        Components.partHeader('G', 'Derivative Clip Inventory') +
        '<div class="card">' +
          '<div style="font-size:13px;color:var(--ga-charcoal);margin-bottom:8px">' +
            'Total derivative assets created from primary Ian content: <strong>' + derivativeCount + '</strong>' +
          '</div>' +
          _renderDerivativeList() +
        '</div>' +
      '</div>' +

      // Part H: Authority-to-Commercial Assist
      '<div>' +
        Components.partHeader('H', 'Authority-to-Commercial Assist') +
        (commercialPosts.length > 0
          ? Components.table(
              [
                { key: 'title', label: 'Post Title', render: function (v) { return '<strong>' + _esc(v || 'Untitled') + '</strong>'; } },
                { key: 'platform', label: 'Platform', render: function (v) { var p = PLATFORMS[(v || '').toLowerCase()]; return p ? p.name : (v || '&#8212;'); } },
                { key: 'clicks', label: 'Clicks' },
                { key: 'sessions', label: 'Sessions' }
              ],
              commercialPosts,
              { sortable: true }
            )
          : Components.emptyState('&#128203;', 'No Ian posts with downstream attribution yet.', '', null)) +
      '</div>' +

      // Part I: Comment Quality Tracker
      '<div>' +
        Components.partHeader('I', 'Comment Quality Tracker') +
        '<div class="card" style="border-left:4px solid var(--ga-amber)">' +
          '<div style="font-size:13px;color:var(--ga-charcoal)">' +
            'Placeholder for tracking high-value comments on Ian&#8217;s posts. Manual entry for now &#8212; future integration with LinkedIn API.' +
          '</div>' +
          '<div style="margin-top:8px;font-size:12px;color:var(--ga-muted)">' +
            'Track broker responses, industry leader engagement, and partnership signals.' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Part J: Repurposing Queue
      '<div>' +
        Components.partHeader('J', 'Repurposing Queue') +
        (notRepurposed.length > 0
          ? '<div class="row-grid row-grid-3">' +
              notRepurposed.map(function (p) {
                return '<div class="card">' +
                  '<div style="font-weight:600;font-size:13px;color:var(--ga-navy);margin-bottom:6px">' + _esc(p.title || p.name || 'Untitled') + '</div>' +
                  '<div style="font-size:11px;color:var(--ga-muted);margin-bottom:8px">' +
                    'Platform: ' + _esc(p.platform || '') + ' &middot; ' +
                    'Published: ' + (p.published_at ? Components.formatDate(p.published_at) : '&#8212;') +
                  '</div>' +
                  (Auth.can('create', 'briefs')
                    ? '<button class="btn btn-secondary" style="font-size:11px;padding:4px 10px" ' +
                      'onclick="IanAuthorityPage.createDerivativeBrief(\'' + _esc(p.id || p.post_id || '') + '\')">Create Derivative</button>'
                    : '') +
                '</div>';
              }).join('') +
            '</div>'
          : Components.emptyState('&#10003;', 'All published Ian posts have derivative content.', '', null)) +
      '</div>' +

      // Part K: Content Rules
      '<div>' +
        Components.partHeader('K', 'Content Rules') +
        '<div class="card" style="border-left:4px solid var(--ga-red)">' +
          '<div style="font-size:13px;font-weight:600;color:var(--ga-red);margin-bottom:6px">Authority Layer Rule</div>' +
          '<div style="font-size:13px;color:var(--ga-charcoal)">' +
            'Ian does NOT appear in listing copy. He operates at the brand authority layer, not the transaction layer.' +
          '</div>' +
          '<div style="font-size:12px;color:var(--ga-charcoal);margin-top:8px">' +
            'All Ian authority content requires Casey review before publishing. No exceptions.' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Part L: Systematization Status
      '<div>' +
        Components.partHeader('L', 'Systematization Status') +
        _renderSystematization() +
      '</div>' +

      '</div>';
  }

  // ── Derivative Content List ───────────────────────────────────────

  function _renderDerivativeList() {
    var derivatives = _ianMetrics.derivatives || [];
    if (derivatives.length === 0) {
      return '<div style="font-size:12px;color:var(--ga-muted)">No derivative clip data available. Derivatives include: podcast snippets, IG carousels, short videos, LinkedIn article summaries.</div>';
    }

    return Components.table(
      [
        { key: 'primary_title', label: 'Primary Post' },
        { key: 'derivative_type', label: 'Clip Type' },
        { key: 'platform', label: 'Platform', render: function (v) { var p = PLATFORMS[(v || '').toLowerCase()]; return p ? p.name : (v || '&#8212;'); } },
        { key: 'status', label: 'Status', render: function (v) { return Components.statusBadge(v || 'draft'); } }
      ],
      derivatives
    );
  }

  // ── Systematization Status ────────────────────────────────────────

  function _renderSystematization() {
    var items = [
      { area: 'LinkedIn posting cadence', status: _ianMetrics.syst_linkedin || 'in_progress', owner: 'Ian / Casey', note: 'Target: 2-3/week, authority topics' },
      { area: 'Podcast clip distribution', status: _ianMetrics.syst_podcast || 'draft', owner: 'Keaton', note: 'Short clips for LI/IG/TikTok' },
      { area: 'Event content SOP', status: _ianMetrics.syst_events || 'draft', owner: 'Casey', note: 'Pre/during/post event workflow' },
      { area: 'Broker network content', status: _ianMetrics.syst_broker || 'draft', owner: 'Ian', note: 'Relationship-based posts' },
      { area: 'NBAA relationship leverage', status: _ianMetrics.syst_nbaa || 'in_progress', owner: 'Ian', note: 'Top 40 network activation' }
    ];

    var canEdit = Auth.can('edit_strategy', 'ian_metrics');

    return Components.table(
      [
        { key: 'area', label: 'Area' },
        { key: 'status', label: 'Status', render: function (v, row) {
            if (canEdit) {
              var opts = ['draft', 'in_progress', 'completed'].map(function (opt) {
                return '<option value="' + opt + '"' + (v === opt ? ' selected' : '') + '>' + opt.replace(/_/g, ' ') + '</option>';
              }).join('');
              return '<select class="form-select" style="font-size:11px;padding:2px 6px" ' +
                'onchange="IanAuthorityPage.updateSystematization(\'' + _esc(row.area) + '\', this.value)">' + opts + '</select>';
            }
            return Components.statusBadge(v);
          }
        },
        { key: 'owner', label: 'Owner' },
        { key: 'note', label: 'Notes' }
      ],
      items,
      { sortable: false }
    );
  }

  // ── Default Themes (fallback) ─────────────────────────────────────

  function _defaultThemes() {
    return [
      { name: 'Market Intelligence', cadence: '1/week' },
      { name: 'Broker Relationships', cadence: '1/week' },
      { name: 'Aviation Authority', cadence: '1/week' },
      { name: 'NBAA Network', cadence: '2/month' }
    ];
  }

  // ── Create Derivative Brief ───────────────────────────────────────

  async function createDerivativeBrief(postId) {
    if (!Auth.can('create', 'briefs')) {
      Components.showToast('Permission denied', 'error');
      return;
    }

    var post = _posts.find(function (p) { return (p.id || p.post_id) === postId; });
    if (!post) {
      Components.showToast('Post not found', 'error');
      return;
    }

    var brief = {
      title: 'Derivative: ' + (post.title || post.name || 'Untitled'),
      request_type: 'ian_authority',
      source_post_id: postId,
      description: 'Create derivative content from Ian authority post: ' + (post.title || ''),
      assignee: 'keaton',
      status: 'draft',
      created_by: Auth.getUser()
    };

    try {
      await API.briefs.create(brief);
      Events.log(Events.EVENTS.BRIEF_SUBMITTED, { source: 'ian_repurposing', post_id: postId });
      Components.showToast('Derivative brief created', 'success');
    } catch (err) {
      Components.showToast('Failed to create brief: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Update Systematization Status ─────────────────────────────────

  async function updateSystematization(area, newStatus) {
    if (!Auth.can('edit_strategy', 'ian_metrics')) {
      Components.showToast('Only full_access users can edit systematization status', 'error');
      return;
    }

    // Map area to field key
    var fieldMap = {
      'LinkedIn posting cadence': 'syst_linkedin',
      'Podcast clip distribution': 'syst_podcast',
      'Event content SOP': 'syst_events',
      'Broker network content': 'syst_broker',
      'NBAA relationship leverage': 'syst_nbaa'
    };

    var field = fieldMap[area];
    if (!field) return;

    var update = {};
    update[field] = newStatus;

    try {
      var metricsId = _ianMetrics.id || _ianMetrics.ian_metrics_id || 'ian';
      await API.ian_metrics.update(metricsId, update);
      _ianMetrics[field] = newStatus;
      Components.showToast('Systematization updated: ' + area, 'success');
    } catch (err) {
      Components.showToast('Failed to update: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Escape Helper ─────────────────────────────────────────────────

  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render: render,
    createDerivativeBrief: createDerivativeBrief,
    updateSystematization: updateSystematization
  };
})();
