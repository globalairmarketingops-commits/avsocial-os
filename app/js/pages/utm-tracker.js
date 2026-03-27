/* =====================================================================
   AvSocialOS v2 — UTM Tracker Page
   UTM builder, parameter integrity auditing, post-level attribution,
   missing-UTM exceptions, naming governance, and Windsor.ai flag.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > utm-tracker.js
   ===================================================================== */

const UTMPage = (() => {
  'use strict';

  let _container = null;
  let _utmData = [];
  let _posts = [];

  const PLATFORMS = SeedData.getPlatforms();

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading UTM data...', '', null);

    try {
      var results = await Promise.all([
        API.utm_tracking.list(),
        API.posts.list()
      ]);
      _utmData = results[0] || [];
      _posts = results[1] || [];
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load UTM data: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[UTMPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    // KPI computations
    var totalClicks = _utmData.reduce(function (sum, u) { return sum + (u.clicks || 0); }, 0);
    var totalSessions = _utmData.reduce(function (sum, u) { return sum + (u.sessions || 0); }, 0);
    var totalQI = _utmData.reduce(function (sum, u) { return sum + (u.qi || 0); }, 0);
    var convRate = totalClicks > 0
      ? Math.round((totalQI / totalClicks) * 100 * 10) / 10
      : 0;

    // Parameter integrity via Formulas
    var validCount = _utmData.filter(function (u) {
      return u.parameter_valid_flag === true || u.parameter_valid === true;
    }).length;
    var integrity = Formulas.parameterIntegrity({
      valid: validCount,
      total: _utmData.length
    });

    // Missing-UTM posts: scheduled or published but no UTM data
    var missingUtm = _posts.filter(function (p) {
      if (p.status !== 'scheduled' && p.status !== 'published' &&
          p.stage !== 'published' && p.stage !== 'in_progress') return false;
      return !p.utm_source && !(p.utm && p.utm.utm_source);
    });

    // Broken parameter records
    var brokenParams = _utmData.filter(function (u) {
      return u.parameter_valid_flag === false || u.parameter_valid === false;
    });

    _container.innerHTML =
      '<div class="domain-page">' +

      Components.sectionHeader(
        'UTM Tracker',
        'Attribution tracking, parameter governance, and conversion signal \u2014 GlobalAir.com'
      ) +

      // Part A: KPI Row
      '<div>' +
        Components.partHeader('A', 'Attribution KPIs') +
        '<div class="row-grid row-grid-5">' +
          Components.kpiTile('Total Clicks', totalClicks, { icon: '&#128070;' }) +
          Components.kpiTile('Sessions', totalSessions, { icon: '&#128200;' }) +
          Components.kpiTile('Qualified Inquiries', totalQI, {
            icon: '&#9989;',
            subtitle: totalQI > 0 ? 'Signal active' : 'No QI detected yet'
          }) +
          Components.kpiTile('Conversion Rate', convRate, {
            suffix: '%', icon: '&#128176;'
          }) +
          Components.kpiTile('Parameter Integrity', integrity.percentage, {
            suffix: '%', icon: '&#128274;',
            subtitle: integrity.valid + '/' + integrity.total + ' valid'
          }) +
        '</div>' +
      '</div>' +

      // Part H: Windsor.ai Connection Flag
      '<div>' +
        Components.alertBanner(
          '&#128279; <strong>Windsor.ai Connection Pending.</strong> Live GA4 data connection not yet active. ' +
          'Current data is from seed/manual entry. Windsor.ai integration point ready \u2014 connect via IntelOS.',
          'info'
        ) +
      '</div>' +

      // Part B: UTM Builder Form
      '<div>' +
        Components.partHeader('B', 'UTM Builder') +
        '<div class="card" style="padding:16px;">' +
          _renderBuilderForm() +
        '</div>' +
      '</div>' +

      // Part C: Post-Level Attribution Table
      '<div>' +
        Components.partHeader('C', 'Post-Level Attribution') +
        _renderAttributionTable() +
      '</div>' +

      // Part D: Missing-UTM Exception Queue
      '<div>' +
        Components.partHeader('D', 'Missing-UTM Exception Queue') +
        (missingUtm.length > 0
          ? '<div class="row-grid row-grid-2">' +
              missingUtm.map(function (p) { return _renderMissingUtmCard(p); }).join('') +
            '</div>'
          : Components.emptyState('&#9989;', 'All active posts have UTM parameters.', '', null)
        ) +
      '</div>' +

      // Part E: Broken Parameter Audit
      '<div>' +
        Components.partHeader('E', 'Broken Parameter Audit') +
        (brokenParams.length > 0
          ? _renderBrokenParamsTable(brokenParams)
          : Components.emptyState('&#9989;', 'No broken UTM parameters detected.', '', null)
        ) +
      '</div>' +

      // Part F: Naming Governance Panel
      '<div>' +
        Components.partHeader('F', 'Naming Governance') +
        '<div class="card" style="padding:16px;">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">' +
            _governanceCard('utm_source', 'Always "social"', 'social') +
            _governanceCard('utm_medium', 'Platform name, lowercase', 'linkedin, facebook, instagram') +
            _governanceCard('utm_campaign', '[type]_[month_year]', 'listing_mar_2026') +
            _governanceCard('utm_content', 'Post ID or short descriptor', 'post_123, piston_cessna') +
          '</div>' +
        '</div>' +
      '</div>' +

      // Part G: UTM Structure Reference
      '<div>' +
        Components.partHeader('G', 'UTM Structure Reference') +
        '<div class="card" style="padding:16px;">' +
          '<pre style="background:var(--ga-surface,#0f172a);color:var(--ga-green);padding:16px;border-radius:8px;' +
            'font-family:monospace;font-size:13px;overflow-x:auto;white-space:pre-wrap;margin:0;">' +
'https://www.globalair.com/[landing-page]\n' +
'  ?utm_source=social\n' +
'  &utm_medium=[platform]\n' +
'  &utm_campaign=[type]_[month]_[year]\n' +
'  &utm_content=[post_id_or_descriptor]\n' +
'\n' +
'Naming Rules:\n' +
'  - All lowercase, no spaces\n' +
'  - Underscores only (no hyphens, no special chars)\n' +
'  - Campaign format: [a-z_]+ (e.g., listing_mar_2026)\n' +
'  - Source is always "social" for social media posts\n' +
'  - Medium matches platform: linkedin, facebook, instagram, twitter, youtube, tiktok' +
          '</pre>' +
        '</div>' +
      '</div>' +

      '</div>';
  }

  // ── UTM Builder Form ──────────────────────────────────────────────

  function _renderBuilderForm() {
    var mediumOptions = Object.keys(PLATFORMS).map(function (pid) {
      return { value: pid, label: PLATFORMS[pid].name };
    });

    return '<form id="utm-builder-form" onsubmit="UTMPage._submitBuilder(event)">' +
      Components.formRow(
        Components.formGroup('utm_source',
          Components.formInput('utm_source', 'social', { placeholder: 'social', required: true }),
          { required: true, helpText: 'Always "social" for social posts' }
        ),
        Components.formGroup('utm_medium',
          Components.formSelect('utm_medium', mediumOptions, '', { placeholder: 'Select platform', required: true }),
          { required: true }
        )
      ) +
      Components.formRow(
        Components.formGroup('utm_campaign',
          Components.formInput('utm_campaign', '', {
            placeholder: 'listing_mar_2026', required: true
          }),
          { required: true, helpText: 'Format: [type]_[month]_[year] \u2014 lowercase, underscores only' }
        ),
        Components.formGroup('utm_content',
          Components.formInput('utm_content', '', { placeholder: 'Post ID or descriptor' })
        )
      ) +
      Components.formGroup('Landing URL',
        Components.formInput('landing_url', '', {
          placeholder: 'https://www.globalair.com/...', required: true
        }),
        { required: true, helpText: 'Must start with https://www.globalair.com' }
      ) +
      '<div id="utm-preview" style="margin:12px 0;">' +
        '<div style="font-weight:600;margin-bottom:4px;font-size:12px;">Generated URL:</div>' +
        '<pre id="utm-url-output" style="background:var(--ga-surface,#0f172a);color:var(--ga-green);' +
          'padding:12px;border-radius:6px;font-family:monospace;font-size:12px;word-break:break-all;' +
          'margin:0;min-height:40px;white-space:pre-wrap;">Enter values above to generate URL</pre>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
        '<button type="button" class="btn btn-secondary" onclick="UTMPage._generateUrl()">Generate URL</button>' +
        '<button type="button" class="btn btn-secondary" onclick="UTMPage._copyUrl()">Copy to Clipboard</button>' +
      '</div>' +
      Components.formGroup('TinyURL',
        Components.formInput('tinyurl', '', { placeholder: 'Paste shortened URL here (manual for now)' }),
        { helpText: 'TinyURL automation placeholder \u2014 paste manually' }
      ) +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
        '<button type="submit" class="btn btn-primary">Save UTM Record</button>' +
      '</div>' +
    '</form>';
  }

  function _generateUrl() {
    var form = document.getElementById('utm-builder-form');
    if (!form) return '';

    var source = form.querySelector('[name="utm_source"]').value.trim();
    var medium = form.querySelector('[name="utm_medium"]').value.trim();
    var campaign = form.querySelector('[name="utm_campaign"]').value.trim();
    var content = form.querySelector('[name="utm_content"]').value.trim();
    var landingUrl = form.querySelector('[name="landing_url"]').value.trim();

    if (!landingUrl) {
      var output = document.getElementById('utm-url-output');
      if (output) output.textContent = 'Enter a landing URL first';
      return '';
    }

    var separator = landingUrl.includes('?') ? '&' : '?';
    var params = [];
    if (source) params.push('utm_source=' + encodeURIComponent(source));
    if (medium) params.push('utm_medium=' + encodeURIComponent(medium));
    if (campaign) params.push('utm_campaign=' + encodeURIComponent(campaign));
    if (content) params.push('utm_content=' + encodeURIComponent(content));

    var fullUrl = landingUrl + (params.length > 0 ? separator + params.join('&') : '');

    var output = document.getElementById('utm-url-output');
    if (output) output.textContent = fullUrl;

    return fullUrl;
  }

  function _copyUrl() {
    var output = document.getElementById('utm-url-output');
    if (!output) return;
    var url = output.textContent;
    if (!url || url === 'Enter values above to generate URL' || url === 'Enter a landing URL first') {
      Components.showToast('Generate a URL first', 'error');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        Components.showToast('Copied to clipboard', 'success');
        Events.log(Events.EVENTS.UTM_COPIED, { url: url });
      }).catch(function () {
        _fallbackCopy(url);
      });
    } else {
      _fallbackCopy(url);
    }
  }

  function _fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      Components.showToast('Copied to clipboard', 'success');
      Events.log(Events.EVENTS.UTM_COPIED, { url: text });
    } catch (e) {
      Components.showToast('Copy failed \u2014 manually select and copy', 'error');
    }
    document.body.removeChild(ta);
  }

  async function _submitBuilder(e) {
    e.preventDefault();
    var form = e.target;

    var source = form.querySelector('[name="utm_source"]').value.trim();
    var medium = form.querySelector('[name="utm_medium"]').value.trim();
    var campaign = form.querySelector('[name="utm_campaign"]').value.trim();
    var content = form.querySelector('[name="utm_content"]').value.trim();
    var landingUrl = form.querySelector('[name="landing_url"]').value.trim();
    var tinyurl = form.querySelector('[name="tinyurl"]').value.trim();

    // Validation
    if (!source || !medium || !campaign) {
      Components.showToast('Source, medium, and campaign are required', 'error');
      return;
    }

    if (!landingUrl.startsWith('https://www.globalair.com')) {
      Components.showToast('Landing URL must start with https://www.globalair.com', 'error');
      return;
    }

    // Naming governance check
    var campaignPattern = /^[a-z_]+$/;
    var parameterValid = campaignPattern.test(campaign);
    var validationErrors = [];
    if (!parameterValid) {
      validationErrors.push('Campaign name must be lowercase letters and underscores only');
    }
    if (source !== 'social') {
      validationErrors.push('Source should be "social" for social media posts');
      parameterValid = false;
    }

    var fullUrl = _generateUrl();

    var data = {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      utm_content: content || null,
      landing_url: landingUrl,
      full_url: fullUrl,
      tinyurl: tinyurl || null,
      parameter_valid_flag: parameterValid,
      parameter_valid: parameterValid,
      validation_errors: validationErrors.length > 0 ? validationErrors : null,
      clicks: 0,
      sessions: 0,
      qi: 0,
      created_by: Auth.getUser(),
      created_at: new Date().toISOString()
    };

    try {
      await API.utm_tracking.create(data);
      Events.log(Events.EVENTS.UTM_CREATED, {
        utm_source: source, utm_medium: medium, utm_campaign: campaign, valid: parameterValid
      });
      Components.showToast(
        parameterValid ? 'UTM record saved' : 'UTM saved with governance warnings',
        parameterValid ? 'success' : 'error'
      );
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to save UTM record: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Attribution Table ─────────────────────────────────────────────

  function _renderAttributionTable() {
    var columns = [
      { key: 'created_at', label: 'Date', render: function (v) { return Components.formatDate(v); } },
      {
        key: 'post_title', label: 'Post', render: function (v, row) {
          // Try to find linked post
          var label = v || row.utm_content || row.utm_campaign || '\u2014';
          return '<strong>' + _esc(label) + '</strong>';
        }
      },
      {
        key: 'utm_medium', label: 'Platform', render: function (v) {
          var platInfo = PLATFORMS[(v || '').toLowerCase()];
          if (!platInfo) return _esc(v || '\u2014');
          return '<span style="display:inline-flex;align-items:center;gap:4px;">' +
            '<span style="color:' + platInfo.color + ';font-weight:700;">' + platInfo.icon + '</span>' +
            _esc(platInfo.name) +
          '</span>';
        }
      },
      { key: 'clicks', label: 'Clicks', render: function (v) { return (v || 0).toLocaleString(); } },
      { key: 'sessions', label: 'Sessions', render: function (v) { return (v || 0).toLocaleString(); } },
      {
        key: 'qi', label: 'QI', render: function (v) {
          var val = v || 0;
          var style = val > 0 ? 'color:var(--ga-green);font-weight:700;' : '';
          return '<span style="' + style + '">' + val + '</span>';
        }
      },
      {
        key: '_conv', label: 'Conv %', render: function (_, row) {
          var clicks = row.clicks || 0;
          var qi = row.qi || 0;
          if (clicks === 0) return '\u2014';
          return (Math.round((qi / clicks) * 100 * 10) / 10) + '%';
        }
      },
      {
        key: '_yield', label: 'Session Yield', render: function (_, row) {
          var sessions = row.sessions || 0;
          var qi = row.qi || 0;
          if (sessions === 0) return '\u2014';
          return (Math.round((qi / sessions) * 1000) / 1000).toFixed(3);
        }
      },
      {
        key: 'parameter_valid_flag', label: 'Param Valid', render: function (v, row) {
          var valid = v === true || row.parameter_valid === true;
          return Components.complianceChip(valid, valid ? 'Valid' : 'Invalid');
        }
      }
    ];

    return Components.table(columns, _utmData, {
      sortable: true,
      id: 'utm-attribution-table',
      emptyMessage: 'No UTM tracking data yet. Use the builder above to create records.'
    });
  }

  // ── Missing UTM Cards ─────────────────────────────────────────────

  function _renderMissingUtmCard(post) {
    var platInfo = PLATFORMS[(post.platform || '').toLowerCase()];
    return '<div class="card" style="padding:12px;border-left:4px solid var(--ga-red);">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">' +
        '<span style="color:var(--ga-red);font-size:16px;">&#9888;</span>' +
        '<strong>' + _esc(post.title || 'Untitled') + '</strong>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--ga-muted);margin-bottom:4px;">' +
        (platInfo ? platInfo.name : _esc(post.platform || '')) +
        ' &middot; ' + Components.statusBadge(post.status || post.stage || 'draft') +
        (post.scheduled_at ? ' &middot; ' + Components.formatDate(post.scheduled_at) : '') +
      '</div>' +
      '<div style="font-size:11px;color:var(--ga-red);">Missing: utm_source, utm_medium, utm_campaign</div>' +
    '</div>';
  }

  // ── Broken Parameters Table ───────────────────────────────────────

  function _renderBrokenParamsTable(records) {
    var columns = [
      { key: 'created_at', label: 'Date', render: function (v) { return Components.formatDate(v); } },
      { key: 'utm_campaign', label: 'Campaign', render: function (v) { return '<code>' + _esc(v || '') + '</code>'; } },
      { key: 'utm_medium', label: 'Medium', render: function (v) { return _esc(v || '\u2014'); } },
      { key: 'utm_source', label: 'Source', render: function (v) { return _esc(v || '\u2014'); } },
      {
        key: 'validation_errors', label: 'Errors', render: function (v) {
          if (!v || !Array.isArray(v) || v.length === 0) return '\u2014';
          return v.map(function (err) {
            return '<span class="ga-badge ga-badge-red" style="font-size:10px;">' + _esc(err) + '</span>';
          }).join(' ');
        }
      }
    ];

    return Components.table(columns, records, {
      sortable: true,
      id: 'utm-broken-table',
      emptyMessage: 'No broken parameters.'
    });
  }

  // ── Governance Card ───────────────────────────────────────────────

  function _governanceCard(param, rule, example) {
    return '<div style="padding:10px;background:var(--ga-surface,#f8fafc);border-radius:8px;border:1px solid var(--ga-border,#e2e8f0);">' +
      '<div style="font-weight:700;font-size:13px;color:var(--ga-navy);margin-bottom:4px;">' + _esc(param) + '</div>' +
      '<div style="font-size:12px;margin-bottom:4px;">' + _esc(rule) + '</div>' +
      '<code style="font-size:11px;color:var(--ga-muted);">' + _esc(example) + '</code>' +
    '</div>';
  }

  // ── Util ──────────────────────────────────────────────────────────

  function _esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Public API ────────────────────────────────────────────────────

  return {
    render: render,
    _generateUrl: _generateUrl,
    _copyUrl: _copyUrl,
    _submitBuilder: _submitBuilder
  };
})();
