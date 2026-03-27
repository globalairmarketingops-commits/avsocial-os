/* =====================================================================
   AvSocialOS v2 — Competitor Pulse (Controller.com Gap Analysis)
   Head-to-head comparison, authority gap analysis, content variety,
   uncontested opportunities, and strategic positioning.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > competitor.js
   ===================================================================== */

const CompetitorPage = (() => {
  'use strict';

  let _container = null;
  let _competitorData = {};
  let _metrics = {};
  let _posts = [];

  const PLATFORMS = SeedData.getPlatforms();
  const PLAT_KEYS = ['linkedin', 'facebook', 'instagram', 'twitter', 'youtube', 'tiktok'];

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading competitor data...', '', null);

    try {
      const results = await Promise.all([
        API.competitor.list(),
        API.metrics_platform.list(),
        API.posts.list()
      ]);
      // Competitor data may be array or keyed object
      var compRaw = results[0];
      if (Array.isArray(compRaw)) {
        _competitorData = {};
        compRaw.forEach(function (c) {
          if (c.platform) _competitorData[c.platform.toLowerCase()] = c;
        });
      } else {
        _competitorData = compRaw || {};
      }

      var metricsRaw = results[1];
      if (Array.isArray(metricsRaw)) {
        _metrics = {};
        metricsRaw.forEach(function (m) {
          if (m.platform) _metrics[m.platform.toLowerCase()] = m;
        });
      } else {
        _metrics = metricsRaw || {};
      }

      _posts = results[2] || [];
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load competitor data: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[CompetitorPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    _container.innerHTML =
      '<div class="domain-page">' +

      // Section Header
      Components.sectionHeader(
        'Competitor Pulse',
        'GlobalAir.com vs Controller.com social presence analysis'
      ) +

      // Part A: Head-to-Head Comparison Table
      '<div>' +
        Components.partHeader('A', 'Head-to-Head Comparison') +
        '<div class="card">' +
          _renderComparisonTable() +
        '</div>' +
      '</div>' +

      // Part B: Platform Status Cards
      '<div>' +
        Components.partHeader('B', 'Platform Status Cards') +
        '<div class="row-grid row-grid-3">' +
          PLAT_KEYS.map(function (k) { return _renderPlatformStatusCard(k); }).join('') +
        '</div>' +
      '</div>' +

      // Part C: Authority Gap by Platform
      '<div>' +
        Components.partHeader('C', 'Authority Gap by Platform') +
        '<div class="row-grid row-grid-3">' +
          PLAT_KEYS.map(function (k) { return _renderAuthorityGapCard(k); }).join('') +
        '</div>' +
      '</div>' +

      // Part D: Content Variety Index
      '<div>' +
        Components.partHeader('D', 'Content Variety Index') +
        _renderContentVarietyComparison() +
      '</div>' +

      // Part E: Uncontested Opportunity Board
      '<div>' +
        Components.partHeader('E', 'Uncontested Opportunity Board') +
        _renderUncontestedOpportunities() +
      '</div>' +

      // Part F: Competitor Series Tracker
      '<div>' +
        Components.partHeader('F', 'Competitor Series Tracker') +
        _renderCompetitorSeries() +
      '</div>' +

      // Part G: Broker/Brand Narrative Comparison
      '<div>' +
        Components.partHeader('G', 'Broker / Brand Narrative Comparison') +
        _renderNarrativeComparison() +
      '</div>' +

      // Part H: Strategic Positioning Note
      '<div>' +
        Components.partHeader('H', 'Strategic Positioning') +
        '<div class="card" style="border-left:4px solid var(--ga-green)">' +
          '<div style="font-size:13px;font-weight:600;color:var(--ga-navy);margin-bottom:8px">Competitive Advantage Summary</div>' +
          '<div style="font-size:13px;color:var(--ga-charcoal)">' +
            'Controller.com relies on auto-posted listing reposts with zero creative strategy. ' +
            'GlobalAir.com wins on engagement quality, content variety, and authority positioning. ' +
            'YouTube and TikTok are uncontested &#8212; first-mover advantage is available now.' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Part I: Future Automation Banner
      '<div>' +
        '<div class="card" style="background:var(--ga-navy);color:#e2e8f0;border:none">' +
          '<div style="font-size:13px;font-weight:600;margin-bottom:4px">&#9881; Future Automation</div>' +
          '<div style="font-size:12px;opacity:0.85">' +
            'Competitor data is currently manual. Future: automated via social listening feeds and SEMrush integration.' +
          '</div>' +
        '</div>' +
      '</div>' +

      '</div>';
  }

  // ── Part A: Comparison Table ──────────────────────────────────────

  function _renderComparisonTable() {
    var html = '<table class="data-table"><thead><tr>' +
      '<th>Platform</th>' +
      '<th>GA Followers</th>' +
      '<th>Controller Followers</th>' +
      '<th>Follower Gap</th>' +
      '<th>GA Engagement</th>' +
      '<th>Controller Eng.</th>' +
      '<th>Engagement Gap</th>' +
      '<th>Gap Status</th>' +
      '<th>Controller Notes</th>' +
    '</tr></thead><tbody>';

    PLAT_KEYS.forEach(function (k) {
      var p = PLATFORMS[k];
      var ga = _metrics[k] || {};
      var c = _competitorData[k] || {};

      var gaFollowers = ga.followers || 0;
      var cFollowers = c.followers || 0;
      var followerGap = gaFollowers - cFollowers;
      var gaEng = ga.engagement || ga.engagement_rate || 0;
      var cEng = c.eng || c.engagement || c.engagement_rate || 0;
      var engGap = +(gaEng - cEng).toFixed(1);

      var gapStatus, gapBadge;
      if (cFollowers === 0 && cEng === 0) {
        gapStatus = 'Uncontested'; gapBadge = 'green';
      } else if (gaEng > cEng * 2) {
        gapStatus = 'Dominant'; gapBadge = 'green';
      } else if (gaEng > cEng) {
        gapStatus = 'Quality Lead'; gapBadge = 'blue';
      } else if (gaEng >= cEng * 0.8) {
        gapStatus = 'Competitive'; gapBadge = 'amber';
      } else {
        gapStatus = 'Behind'; gapBadge = 'red';
      }

      var follGapColor = followerGap >= 0 ? 'var(--ga-green)' : 'var(--ga-red)';
      var engGapColor = engGap >= 0 ? 'var(--ga-green)' : 'var(--ga-red)';

      html += '<tr>' +
        '<td>' +
          '<span class="platform-icon" style="background:' + p.color + ';width:22px;height:22px;font-size:10px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;margin-right:6px;vertical-align:middle">' + p.icon + '</span>' +
          '<strong>' + p.name + '</strong>' +
        '</td>' +
        '<td>' + gaFollowers.toLocaleString() + '</td>' +
        '<td>' + cFollowers.toLocaleString() + '</td>' +
        '<td style="font-weight:700;color:' + follGapColor + '">' + (followerGap >= 0 ? '+' : '') + followerGap.toLocaleString() + '</td>' +
        '<td style="font-weight:700;color:var(--ga-green)">' + gaEng + '%</td>' +
        '<td style="color:var(--ga-muted)">' + cEng + '%</td>' +
        '<td style="font-weight:700;color:' + engGapColor + '">' + (engGap >= 0 ? '+' : '') + engGap + '%</td>' +
        '<td>' + Components.badge(gapStatus, gapBadge) + '</td>' +
        '<td style="font-size:12px;color:var(--ga-muted)">' + (c.note || c.notes || '') + '</td>' +
      '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  // ── Part B: Platform Status Cards ─────────────────────────────────

  function _renderPlatformStatusCard(k) {
    var p = PLATFORMS[k];
    var ga = _metrics[k] || {};
    var c = _competitorData[k] || {};

    var gaFollowers = ga.followers || 0;
    var cFollowers = c.followers || 0;
    var follGap = gaFollowers - cFollowers;
    var gaEng = ga.engagement || ga.engagement_rate || 0;
    var cEng = c.eng || c.engagement || c.engagement_rate || 0;
    var engGap = +(gaEng - cEng).toFixed(1);
    var cPostsWk = c.postsWk || c.posts_per_week || 0;
    var authorityGap = c.authority_gap_score != null ? c.authority_gap_score : '&#8212;';
    var contentVariety = c.content_variety_score != null ? c.content_variety_score : '&#8212;';

    return '<div class="platform-card" style="border-top-color:' + p.color + '">' +
      '<div class="platform-header">' +
        '<div class="platform-icon" style="background:' + p.color + '">' + p.icon + '</div>' +
        '<div class="platform-name">' + p.name + '</div>' +
      '</div>' +
      '<div style="font-size:12px;display:flex;flex-direction:column;gap:6px">' +
        '<div>Follower gap: <strong style="color:' + (follGap >= 0 ? 'var(--ga-green)' : 'var(--ga-red)') + '">' + (follGap >= 0 ? '+' : '') + follGap.toLocaleString() + '</strong></div>' +
        '<div>Engagement gap: <strong style="color:' + (engGap >= 0 ? 'var(--ga-green)' : 'var(--ga-red)') + '">' + (engGap >= 0 ? '+' : '') + engGap + '%</strong></div>' +
        '<div>Controller posts/wk: <strong>' + cPostsWk + '</strong></div>' +
        '<div>Authority gap: <strong>' + authorityGap + '</strong></div>' +
        '<div>Content variety: <strong>' + contentVariety + '</strong></div>' +
        '<div style="color:var(--ga-muted);font-size:11px;margin-top:4px">' + (c.note || c.notes || '') + '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Part C: Authority Gap Cards ───────────────────────────────────

  function _renderAuthorityGapCard(k) {
    var p = PLATFORMS[k];
    var c = _competitorData[k] || {};

    var authorityGap = c.authority_gap_score != null ? c.authority_gap_score : null;
    var label, color;

    if (authorityGap === null) {
      // Infer from follower/engagement data
      var ga = _metrics[k] || {};
      var gaEng = ga.engagement || ga.engagement_rate || 0;
      var cEng = c.eng || c.engagement || c.engagement_rate || 0;
      var cFollowers = c.followers || 0;

      if (cFollowers === 0 && cEng === 0) {
        label = 'Uncontested'; color = 'green';
      } else if (gaEng > cEng * 1.5) {
        label = 'GA Dominant'; color = 'green';
      } else if (gaEng > cEng) {
        label = 'GA Advantage'; color = 'blue';
      } else {
        label = 'Gap Exists'; color = 'amber';
      }
    } else if (authorityGap > 0) {
      label = 'GA Advantage (+' + authorityGap + ')'; color = 'green';
    } else if (authorityGap === 0) {
      label = 'Neutral'; color = 'amber';
    } else {
      label = 'Controller Leads (' + authorityGap + ')'; color = 'red';
    }

    return '<div class="card" style="border-left:4px solid ' + p.color + '">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<span class="platform-icon" style="background:' + p.color + ';width:24px;height:24px;font-size:10px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff">' + p.icon + '</span>' +
        '<strong style="font-size:13px">' + p.name + '</strong>' +
      '</div>' +
      '<div>' + Components.badge(label, color) + '</div>' +
    '</div>';
  }

  // ── Part D: Content Variety Index ─────────────────────────────────

  function _renderContentVarietyComparison() {
    // Count unique content types GlobalAir uses
    var gaFormats = new Set();
    _posts.forEach(function (p) {
      if (p.content_type) gaFormats.add(p.content_type);
    });

    var gaFormatList = [
      'Listing Posts', 'Carousels', 'AvGeek Content', 'FBO Spotlights',
      'Ramp Ramble', 'Authority Posts (Ian)', 'Videos / Reels',
      'Fuel Price Maps', 'BrokerNet Stats', 'Event Content', 'Game Winner'
    ];

    var controllerFormatList = [
      'Auto-posted Listings'
    ];

    return '<div class="row-grid row-grid-2">' +
      // GlobalAir column
      '<div class="card" style="border-left:4px solid var(--ga-green)">' +
        '<div style="font-weight:700;font-size:14px;color:var(--ga-navy);margin-bottom:8px">' +
          'GlobalAir.com &#8212; ' + Math.max(gaFormats.size, gaFormatList.length) + ' formats' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          gaFormatList.map(function (f) {
            return Components.badge(f, 'green');
          }).join('') +
        '</div>' +
      '</div>' +

      // Controller column
      '<div class="card" style="border-left:4px solid var(--ga-red)">' +
        '<div style="font-weight:700;font-size:14px;color:var(--ga-navy);margin-bottom:8px">' +
          'Controller.com &#8212; ' + controllerFormatList.length + ' format' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
          controllerFormatList.map(function (f) {
            return Components.badge(f, 'red');
          }).join('') +
        '</div>' +
        '<div style="font-size:11px;color:var(--ga-muted);margin-top:8px">Zero creative strategy. No engagement-first content.</div>' +
      '</div>' +
    '</div>';
  }

  // ── Part E: Uncontested Opportunities ─────────────────────────────

  function _renderUncontestedOpportunities() {
    var uncontested = PLAT_KEYS.filter(function (k) {
      var c = _competitorData[k] || {};
      return (c.followers || 0) === 0 && (c.eng || c.engagement || c.engagement_rate || 0) === 0;
    });

    // Fallback: YouTube and TikTok are known uncontested
    if (uncontested.length === 0) {
      uncontested = ['youtube', 'tiktok'];
    }

    if (uncontested.length === 0) {
      return '<div class="card" style="font-size:12px;color:var(--ga-muted)">No fully uncontested platforms detected.</div>';
    }

    return '<div class="row-grid row-grid-' + Math.min(uncontested.length, 3) + '">' +
      uncontested.map(function (k) {
        var p = PLATFORMS[k];
        var ga = _metrics[k] || {};
        return '<div class="card" style="border-left:4px solid var(--ga-green);background:linear-gradient(135deg, #f0fdf4, #fff)">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
            '<span class="platform-icon" style="background:' + p.color + ';width:28px;height:28px;font-size:11px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff">' + p.icon + '</span>' +
            '<strong style="font-size:14px;color:var(--ga-navy)">' + p.name + '</strong>' +
            Components.badge('UNCONTESTED', 'green') +
          '</div>' +
          '<div style="font-size:12px;color:var(--ga-charcoal);display:flex;flex-direction:column;gap:4px">' +
            '<div>Controller status: <strong style="color:var(--ga-red)">No presence</strong></div>' +
            '<div>GA followers: <strong>' + (ga.followers || 0).toLocaleString() + '</strong></div>' +
            '<div>GA capability: <strong style="color:var(--ga-green)">Active</strong></div>' +
          '</div>' +
          '<div style="margin-top:10px;font-size:12px;font-weight:600;color:var(--ga-green)">' +
            'Recommended: Expand content cadence. First-mover advantage available.' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ── Part F: Competitor Series Tracker ──────────────────────────────

  function _renderCompetitorSeries() {
    // Manual competitor series tracking
    var competitorSeries = [];
    PLAT_KEYS.forEach(function (k) {
      var c = _competitorData[k] || {};
      if (c.recurring_content || c.series_notes) {
        competitorSeries.push({
          platform: PLATFORMS[k].name,
          content: c.recurring_content || c.series_notes || 'Auto-posted listings only',
          frequency: c.series_frequency || '&#8212;'
        });
      }
    });

    if (competitorSeries.length === 0) {
      // Default known behavior
      competitorSeries = [
        { platform: 'LinkedIn', content: 'Auto-posted listings, no engagement strategy', frequency: 'Daily' },
        { platform: 'Facebook', content: 'Auto-posted listings, page reposts', frequency: 'Daily' },
        { platform: 'Instagram', content: 'Occasional listing photos', frequency: 'Sporadic' }
      ];
    }

    return '<div class="row-grid row-grid-3">' +
      competitorSeries.map(function (cs) {
        return '<div class="card">' +
          '<div style="font-weight:700;font-size:13px;color:var(--ga-navy);margin-bottom:6px">Controller &#8212; ' + _esc(cs.platform) + '</div>' +
          '<div style="font-size:12px;color:var(--ga-charcoal);margin-bottom:4px">' + _esc(cs.content) + '</div>' +
          '<div style="font-size:11px;color:var(--ga-muted)">Frequency: ' + cs.frequency + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ── Part G: Narrative Comparison ──────────────────────────────────

  function _renderNarrativeComparison() {
    return '<div class="row-grid row-grid-2">' +
      // GlobalAir narrative
      '<div class="card" style="border-left:4px solid var(--ga-green)">' +
        '<div style="font-weight:700;font-size:14px;color:var(--ga-navy);margin-bottom:8px">GlobalAir.com Narrative</div>' +
        '<div style="font-size:12px;color:var(--ga-charcoal);display:flex;flex-direction:column;gap:6px">' +
          '<div>&#10003; Broker relationship storytelling</div>' +
          '<div>&#10003; Authority positioning via Ian Lumpp</div>' +
          '<div>&#10003; AvGeek community engagement</div>' +
          '<div>&#10003; Pilot-first content strategy</div>' +
          '<div>&#10003; Multi-format content variety</div>' +
          '<div>&#10003; Event-driven thought leadership</div>' +
        '</div>' +
      '</div>' +

      // Controller narrative
      '<div class="card" style="border-left:4px solid var(--ga-red)">' +
        '<div style="font-weight:700;font-size:14px;color:var(--ga-navy);margin-bottom:8px">Controller.com Narrative</div>' +
        '<div style="font-size:12px;color:var(--ga-charcoal);display:flex;flex-direction:column;gap:6px">' +
          '<div>&#10007; Transactional only &#8212; no brand story</div>' +
          '<div>&#10007; No personal brand / authority figure</div>' +
          '<div>&#10007; No community engagement</div>' +
          '<div>&#10007; Auto-posted listings as sole content</div>' +
          '<div>&#10007; Single format across all platforms</div>' +
          '<div>&#10007; No event content strategy</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Escape Helper ─────────────────────────────────────────────────

  function _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render: render
  };
})();
