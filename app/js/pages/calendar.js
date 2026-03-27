/* =====================================================================
   AvSocialOS v2 — Content Calendar Page
   Month / Week / Day views with platform cadence meters, gap alerts,
   unscheduled tray, posting rules, and full post CRUD.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > calendar.js
   ===================================================================== */

const CalendarPage = (() => {
  'use strict';

  let _container = null;
  let _posts = [];
  let _strategy = {};
  let _currentView = 'week';  // month | week | day
  let _viewDate = new Date();  // anchor date for the current view

  const PLATFORMS = SeedData.getPlatforms();

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading calendar...', '', null);

    try {
      var results = await Promise.all([
        API.posts.list(),
        API.channel_strategy.list()
      ]);
      _posts = results[0] || [];
      // channel_strategy may be array or object; normalize to keyed object
      var rawStrategy = results[1] || {};
      if (Array.isArray(rawStrategy)) {
        _strategy = {};
        rawStrategy.forEach(function (s) {
          if (s.platform) _strategy[s.platform] = s;
        });
      } else {
        _strategy = rawStrategy;
      }
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load calendar data: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[CalendarPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    var gapAlerts = Validators.checkCadenceGaps(_posts, _strategy);

    // Unscheduled approved posts
    var unscheduled = _posts.filter(function (p) {
      return (p.status === 'approved' || p.stage === 'approved') && !p.scheduled_at;
    });

    _container.innerHTML =
      '<div class="domain-page">' +

      Components.sectionHeader(
        'Content Calendar',
        'Post scheduling, platform cadence, and gap detection \u2014 GlobalAir.com'
      ) +

      // Part A: View Toggle + Navigation
      '<div>' +
        Components.partHeader('A', 'Calendar View') +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">' +
          Components.tabBar(
            [
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' }
            ],
            _currentView,
            'CalendarPage._setView'
          ) +
          '<div style="display:flex;gap:4px;align-items:center;">' +
            '<button class="btn btn-sm btn-secondary" onclick="CalendarPage._nav(\'prev\')">&larr;</button>' +
            '<span style="font-weight:600;min-width:140px;text-align:center;" id="cal-nav-label">' +
              _getNavLabel() +
            '</span>' +
            '<button class="btn btn-sm btn-secondary" onclick="CalendarPage._nav(\'next\')">&rarr;</button>' +
            '<button class="btn btn-sm btn-secondary" onclick="CalendarPage._nav(\'today\')" style="margin-left:8px;">Today</button>' +
          '</div>' +
          (Auth.can('create', 'posts')
            ? '<button class="btn btn-primary" onclick="CalendarPage._openCreateModal()" style="margin-left:auto;">+ New Post</button>'
            : '') +
        '</div>' +
        '<div id="cal-view-container">' +
          _renderCalendarView() +
        '</div>' +
      '</div>' +

      // Part D: Platform Cadence Meters
      '<div>' +
        Components.partHeader('D', 'Platform Cadence') +
        '<div class="row-grid row-grid-3">' +
          _renderCadenceMeters() +
        '</div>' +
      '</div>' +

      // Part E: Gap Alerts
      '<div>' +
        Components.partHeader('E', 'Gap Alerts') +
        (gapAlerts.length > 0
          ? gapAlerts.map(function (g) {
              var msg = g.gap_hours === Infinity
                ? 'No upcoming posts scheduled'
                : 'Next post in ' + g.gap_hours + ' hours (>48h gap)';
              return Components.gapAlert(g.platform, msg);
            }).join('')
          : '<div style="padding:12px;color:var(--ga-muted);font-style:italic;">No cadence gaps detected in the next 48 hours.</div>'
        ) +
      '</div>' +

      // Part F: Unscheduled Approved Tray
      '<div>' +
        Components.partHeader('F', 'Unscheduled Approved Posts') +
        (unscheduled.length > 0
          ? '<div class="row-grid row-grid-3">' +
              unscheduled.map(function (p) { return _renderPostMiniCard(p); }).join('') +
            '</div>'
          : Components.emptyState('&#9989;', 'All approved posts are scheduled.', '', null)
        ) +
      '</div>' +

      // Part G: Platform Posting Rules
      '<div>' +
        Components.partHeader('G', 'Platform Posting Rules') +
        '<div class="row-grid row-grid-3">' +
          Object.keys(PLATFORMS).map(function (pid) {
            var p = PLATFORMS[pid];
            return '<div class="card" style="padding:12px;border-top:3px solid ' + p.color + ';">' +
              '<div style="font-weight:700;margin-bottom:4px;">' + _esc(p.name) + '</div>' +
              '<div style="font-size:12px;color:var(--ga-muted);">' + _esc(p.rules) + '</div>' +
              '<div style="font-size:11px;margin-top:4px;">Daily target: <strong>' + p.daily + '</strong> | Category: ' + _esc(p.cat) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '</div>';
  }

  // ── Calendar Views ────────────────────────────────────────────────

  function _renderCalendarView() {
    if (_currentView === 'month') return _renderMonthView();
    if (_currentView === 'day') return _renderDayView();
    return _renderWeekView();
  }

  // -- Month View --

  function _renderMonthView() {
    var year = _viewDate.getFullYear();
    var month = _viewDate.getMonth();

    // Build events for calendarGrid
    var events = _posts
      .filter(function (p) { return p.scheduled_at; })
      .map(function (p) {
        var d = new Date(p.scheduled_at);
        var dateStr = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        var platInfo = PLATFORMS[(p.platform || '').toLowerCase()];
        return {
          date: dateStr,
          label: p.title || 'Post',
          color: platInfo ? platInfo.color : 'var(--ga-blue)'
        };
      });

    return Components.calendarGrid(year, month, events);
  }

  // -- Week View --

  function _renderWeekView() {
    var weekStart = _getWeekStart(_viewDate);
    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var today = new Date();
    var todayStr = _dateStr(today);

    var html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">';
    days.forEach(function (day) {
      var ds = _dateStr(day);
      var isToday = ds === todayStr;
      var dayPosts = _getPostsForDate(day);

      html += '<div class="card" style="padding:8px;min-height:180px;' +
        (isToday ? 'border:2px solid var(--ga-green);' : '') + '">' +
        '<div style="font-weight:700;font-size:12px;margin-bottom:6px;' +
          (isToday ? 'color:var(--ga-green);' : '') + '">' +
          dayNames[day.getDay()] + ' ' + (day.getMonth() + 1) + '/' + day.getDate() +
        '</div>';

      if (dayPosts.length === 0) {
        html += '<div style="font-size:11px;color:var(--ga-muted);font-style:italic;">No posts</div>';
      } else {
        dayPosts.forEach(function (p) {
          html += _renderPostCard(p);
        });
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // -- Day View --

  function _renderDayView() {
    var dayPosts = _getPostsForDate(_viewDate);
    dayPosts.sort(function (a, b) {
      return new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
    });

    if (dayPosts.length === 0) {
      return Components.emptyState('&#128197;', 'No posts scheduled for this day.', '', null);
    }

    var html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    dayPosts.forEach(function (p) {
      var time = p.scheduled_at ? new Date(p.scheduled_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit'
      }) : 'Unscheduled';
      var platInfo = PLATFORMS[(p.platform || '').toLowerCase()];

      html += '<div class="card" style="padding:12px;border-left:4px solid ' +
        (platInfo ? platInfo.color : 'var(--ga-blue)') + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<div style="font-size:13px;font-weight:600;color:var(--ga-muted);">' + _esc(time) + '</div>' +
          Components.statusBadge(p.status || 'draft') +
        '</div>' +
        '<div style="font-weight:700;margin-bottom:4px;">' + _esc(p.title || 'Untitled') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;">' +
          (platInfo ? '<span style="background:' + platInfo.color + ';color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;">' + platInfo.icon + ' ' + platInfo.name + '</span>' : '') +
          _renderContentTypeIcon(p.content_type) +
          _renderAssignee(p.assignee) +
          _renderReadiness(p) +
          (p.pilot_first_flag ? Components.pilotFirstChip(SeedData.isPilotFirstType(p.content_type)) : '') +
          (p.series_name ? '<span class="linked-tag">' + _esc(p.series_name) + '</span>' : '') +
          (p.campaign_name ? '<span class="linked-tag">' + _esc(p.campaign_name) + '</span>' : '') +
        '</div>' +
        '<div style="margin-top:8px;display:flex;gap:4px;">' +
          (Auth.can('update', 'posts')
            ? '<button class="btn btn-sm btn-secondary" onclick="CalendarPage._openEditModal(\'' + _esc(p.id) + '\')">Edit</button>'
            : '') +
          (Auth.can('delete', 'posts')
            ? '<button class="btn btn-sm btn-secondary" style="color:var(--ga-red)" onclick="CalendarPage._confirmDelete(\'' + _esc(p.id) + '\')">Delete</button>'
            : '') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  // ── Post Card (compact, for week view) ────────────────────────────

  function _renderPostCard(post) {
    var platInfo = PLATFORMS[(post.platform || '').toLowerCase()];
    var borderColor = platInfo ? platInfo.color : 'var(--ga-blue)';

    return '<div style="padding:6px;margin-bottom:4px;border-left:3px solid ' + borderColor +
      ';background:var(--ga-surface,#f8fafc);border-radius:4px;font-size:11px;cursor:pointer;" ' +
      'onclick="CalendarPage._openEditModal(\'' + _esc(post.id) + '\')" title="Click to edit">' +
        '<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;">' +
          (platInfo ? '<span style="color:' + platInfo.color + ';font-weight:700;">' + platInfo.icon + '</span>' : '') +
          '<strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">' +
            _esc(post.title || 'Untitled') +
          '</strong>' +
        '</div>' +
        '<div style="display:flex;gap:3px;flex-wrap:wrap;align-items:center;">' +
          _renderContentTypeIcon(post.content_type) +
          _renderAssigneeMini(post.assignee) +
          Components.statusBadge(post.status || 'draft') +
        '</div>' +
        '<div style="display:flex;gap:3px;margin-top:2px;">' +
          _readinessIndicator('UTM', !!(post.utm_source || (post.utm && post.utm.utm_source))) +
          _readinessIndicator('Tiny', !!post.tinyurl) +
          _readinessIndicator('Brkr', post.content_type !== 'listing' || !!post.broker_name) +
          _readinessIndicator('Asset', !!post.asset_url) +
        '</div>' +
        (post.pilot_first_flag
          ? '<div style="margin-top:2px;">&#9992; Pilot</div>'
          : '') +
      '</div>';
  }

  // ── Mini Post Card (unscheduled tray) ─────────────────────────────

  function _renderPostMiniCard(post) {
    var platInfo = PLATFORMS[(post.platform || '').toLowerCase()];
    return '<div class="card" style="padding:10px;border-left:4px solid ' +
      (platInfo ? platInfo.color : 'var(--ga-blue)') + ';">' +
      '<div style="font-weight:700;margin-bottom:4px;">' + _esc(post.title || 'Untitled') + '</div>' +
      '<div style="font-size:12px;color:var(--ga-muted);">' +
        (platInfo ? platInfo.name : _esc(post.platform || '')) +
        ' &middot; ' + _esc(post.content_type || '') +
      '</div>' +
      (Auth.can('update', 'posts')
        ? '<button class="btn btn-sm btn-primary" style="margin-top:6px;" onclick="CalendarPage._openEditModal(\'' + _esc(post.id) + '\')">Schedule</button>'
        : '') +
    '</div>';
  }

  // ── Cadence Meters ────────────────────────────────────────────────

  function _renderCadenceMeters() {
    var html = '';
    Object.keys(PLATFORMS).forEach(function (pid) {
      var p = PLATFORMS[pid];
      var strat = _strategy[pid];
      var target = strat && strat.target ? strat.target : (p.daily * 7);  // weekly target
      var actual = _posts.filter(function (post) {
        if ((post.platform || '').toLowerCase() !== pid) return false;
        // Count posts in the current view period
        if (!post.scheduled_at) return false;
        var postDate = new Date(post.scheduled_at);
        var weekStart = _getWeekStart(_viewDate);
        var weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return postDate >= weekStart && postDate < weekEnd;
      }).length;
      html += Components.cadenceMeter(p.name, actual, target);
    });
    return html;
  }

  // ── Readiness Helpers ─────────────────────────────────────────────

  function _renderReadiness(post) {
    return '<span style="display:inline-flex;gap:3px;">' +
      _readinessIndicator('UTM', !!(post.utm_source || (post.utm && post.utm.utm_source))) +
      _readinessIndicator('TinyURL', !!post.tinyurl) +
      _readinessIndicator('Broker', post.content_type !== 'listing' || !!post.broker_name) +
      _readinessIndicator('Asset', !!post.asset_url) +
    '</span>';
  }

  function _readinessIndicator(label, passed) {
    var icon = passed ? '&#10003;' : '&#10007;';
    var color = passed ? 'var(--ga-green)' : 'var(--ga-red)';
    return '<span style="font-size:10px;color:' + color + ';" title="' + label + '">' +
      label + icon + '</span>';
  }

  function _renderContentTypeIcon(contentType) {
    var types = SeedData.getContentTypes();
    var ct = types.find(function (t) { return t.id === contentType; });
    if (!ct) return '';
    return '<span title="' + _esc(ct.name) + '">' + ct.icon + '</span>';
  }

  function _renderAssignee(userId) {
    if (!userId) return '';
    var team = SeedData.getTeam();
    var member = team.find(function (m) { return m.id === userId; });
    if (!member) return '';
    return '<span class="avatar" style="width:18px;height:18px;font-size:8px;background:' +
      member.color + '" title="' + _esc(member.name) + '">' + member.initials + '</span>';
  }

  function _renderAssigneeMini(userId) {
    if (!userId) return '';
    var team = SeedData.getTeam();
    var member = team.find(function (m) { return m.id === userId; });
    if (!member) return '';
    return '<span class="avatar" style="width:16px;height:16px;font-size:7px;background:' +
      member.color + '" title="' + _esc(member.name) + '">' + member.initials + '</span>';
  }

  // ── Navigation ────────────────────────────────────────────────────

  function _setView(view) {
    _currentView = view;
    _renderPage();
  }

  function _nav(dir) {
    if (dir === 'today') {
      _viewDate = new Date();
    } else if (_currentView === 'month') {
      _viewDate.setMonth(_viewDate.getMonth() + (dir === 'next' ? 1 : -1));
    } else if (_currentView === 'week') {
      _viewDate.setDate(_viewDate.getDate() + (dir === 'next' ? 7 : -7));
    } else {
      _viewDate.setDate(_viewDate.getDate() + (dir === 'next' ? 1 : -1));
    }
    _renderPage();
  }

  function _getNavLabel() {
    var opts;
    if (_currentView === 'month') {
      opts = { month: 'long', year: 'numeric' };
    } else if (_currentView === 'week') {
      var ws = _getWeekStart(_viewDate);
      var we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return (ws.getMonth() + 1) + '/' + ws.getDate() + ' \u2013 ' +
        (we.getMonth() + 1) + '/' + we.getDate() + ', ' + we.getFullYear();
    } else {
      opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    }
    return _viewDate.toLocaleDateString('en-US', opts);
  }

  // ── Date Helpers ──────────────────────────────────────────────────

  function _getWeekStart(date) {
    var d = new Date(date);
    var day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function _dateStr(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function _getPostsForDate(date) {
    var ds = _dateStr(date);
    return _posts.filter(function (p) {
      if (!p.scheduled_at) return false;
      var pd = new Date(p.scheduled_at);
      return _dateStr(pd) === ds;
    });
  }

  // ── Create Post ───────────────────────────────────────────────────

  function _openCreateModal() {
    var team = SeedData.getTeam();
    var teamOptions = team.map(function (m) { return { value: m.id, label: m.name }; });
    var platformOptions = Object.keys(PLATFORMS).map(function (pid) {
      return { value: pid, label: PLATFORMS[pid].name };
    });
    var contentTypes = SeedData.getContentTypes().map(function (ct) {
      return { value: ct.id, label: ct.icon + ' ' + ct.name };
    });
    var categories = SeedData.getCategories().map(function (c) {
      return { value: c.id, label: c.name };
    });
    var ctaTypes = SeedData.getCtaTypes().map(function (c) {
      return { value: c.id, label: c.name };
    });
    var seriesTypes = SeedData.getSeriesTypes().map(function (s) {
      return { value: s.id, label: s.name };
    });

    var formHtml =
      '<form id="post-create-form" onsubmit="CalendarPage._submitCreate(event)">' +
        Components.formGroup('Title',
          Components.formInput('title', '', { placeholder: 'Post title', required: true }),
          { required: true }
        ) +
        Components.formRow(
          Components.formGroup('Platform',
            Components.formSelect('platform', platformOptions, '', { placeholder: 'Select platform', required: true }),
            { required: true }
          ),
          Components.formGroup('Content Type',
            Components.formSelect('content_type', contentTypes, '', { placeholder: 'Select type' })
          )
        ) +
        Components.formRow(
          Components.formGroup('Category',
            Components.formSelect('category', categories, '', { placeholder: 'Select category' })
          ),
          Components.formGroup('Assignee',
            Components.formSelect('assignee', teamOptions, '', { placeholder: 'Select assignee' })
          )
        ) +
        Components.formRow(
          Components.formGroup('Date',
            Components.formInput('scheduled_date', '', { type: 'date' })
          ),
          Components.formGroup('Time',
            Components.formInput('scheduled_time', '', { type: 'time' })
          )
        ) +
        Components.formGroup('Copy Text',
          Components.formTextarea('copy_text', '', { placeholder: 'Post copy...', rows: 3, maxLength: 2000 })
        ) +
        Components.formGroup('Broker Name',
          Components.formInput('broker_name', '', { placeholder: 'Required for listing posts' })
        ) +
        Components.formRow(
          Components.formGroup('UTM Source',
            Components.formInput('utm_source', 'social', { placeholder: 'social' })
          ),
          Components.formGroup('UTM Medium',
            Components.formInput('utm_medium', '', { placeholder: 'Platform name' })
          ),
          Components.formGroup('UTM Campaign',
            Components.formInput('utm_campaign', '', { placeholder: 'listing_mar_2026' })
          )
        ) +
        Components.formRow(
          Components.formGroup('TinyURL',
            Components.formInput('tinyurl', '', { placeholder: 'https://tinyurl.com/...' })
          ),
          Components.formGroup('Landing URL',
            Components.formInput('landing_url', '', { placeholder: 'https://www.globalair.com/...' })
          )
        ) +
        Components.formRow(
          Components.formGroup('CTA Type',
            Components.formSelect('cta_type', ctaTypes, '', { placeholder: 'Select CTA' })
          ),
          Components.formGroup('Series',
            Components.formSelect('series_id', seriesTypes, '', { placeholder: 'Link to series (optional)' })
          )
        ) +
        '<div id="pilot-first-hint" style="margin-bottom:12px;">' +
          Components.formCheckbox('pilot_first_flag', 'Pilot-First Content') +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
          '<button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Create Post</button>' +
        '</div>' +
      '</form>';

    Components.showModal('New Post', formHtml);

    // Auto-suggest pilot_first_flag
    setTimeout(function () {
      var ctSelect = document.querySelector('#post-create-form [name="content_type"]');
      if (ctSelect) {
        ctSelect.addEventListener('change', function () {
          var cb = document.querySelector('#post-create-form [name="pilot_first_flag"]');
          if (cb) cb.checked = SeedData.isPilotFirstType(ctSelect.value);
        });
      }
    }, 100);
  }

  async function _submitCreate(e) {
    e.preventDefault();
    var form = e.target;
    var title = form.querySelector('[name="title"]').value.trim();
    if (!title) {
      Components.showToast('Title is required', 'error');
      return;
    }

    var scheduledDate = form.querySelector('[name="scheduled_date"]').value;
    var scheduledTime = form.querySelector('[name="scheduled_time"]').value;
    var scheduledAt = null;
    if (scheduledDate) {
      scheduledAt = scheduledDate + (scheduledTime ? 'T' + scheduledTime + ':00' : 'T09:00:00');
    }

    var pilotCb = form.querySelector('[name="pilot_first_flag"]');

    var data = {
      title: title,
      platform: form.querySelector('[name="platform"]').value || null,
      content_type: form.querySelector('[name="content_type"]').value || null,
      category: form.querySelector('[name="category"]').value || null,
      assignee: form.querySelector('[name="assignee"]').value || null,
      scheduled_at: scheduledAt,
      copy_text: form.querySelector('[name="copy_text"]').value || null,
      broker_name: form.querySelector('[name="broker_name"]').value || null,
      utm_source: form.querySelector('[name="utm_source"]').value || null,
      utm_medium: form.querySelector('[name="utm_medium"]').value || null,
      utm_campaign: form.querySelector('[name="utm_campaign"]').value || null,
      tinyurl: form.querySelector('[name="tinyurl"]').value || null,
      landing_url: form.querySelector('[name="landing_url"]').value || null,
      cta_type: form.querySelector('[name="cta_type"]').value || null,
      series_id: form.querySelector('[name="series_id"]').value || null,
      pilot_first_flag: pilotCb ? pilotCb.checked : false,
      status: 'draft',
      stage: 'draft',
      created_by: Auth.getUser(),
      created_at: new Date().toISOString()
    };

    // Build utm sub-object for validators
    data.utm = {
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign
    };

    // Run validation and show warnings (non-blocking)
    var validation = Validators.validatePost(data);
    var warnings = validation.filter(function (v) { return !v.passed; });
    if (warnings.length > 0) {
      var msgs = warnings.map(function (w) { return w.description; });
      Components.showToast('Warnings: ' + msgs.join('; '), 'error');
    }

    try {
      await API.posts.create(data);
      Events.log(Events.EVENTS.POST_CREATED, {
        title: data.title, platform: data.platform, content_type: data.content_type
      });
      Components.closeModal();
      Components.showToast('Post created', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to create post: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Edit Post ─────────────────────────────────────────────────────

  function _openEditModal(postId) {
    var post = _posts.find(function (p) { return p.id === postId; });
    if (!post) {
      Components.showToast('Post not found', 'error');
      return;
    }

    var team = SeedData.getTeam();
    var teamOptions = team.map(function (m) { return { value: m.id, label: m.name }; });
    var platformOptions = Object.keys(PLATFORMS).map(function (pid) {
      return { value: pid, label: PLATFORMS[pid].name };
    });
    var contentTypes = SeedData.getContentTypes().map(function (ct) {
      return { value: ct.id, label: ct.icon + ' ' + ct.name };
    });
    var categories = SeedData.getCategories().map(function (c) {
      return { value: c.id, label: c.name };
    });
    var ctaTypes = SeedData.getCtaTypes().map(function (c) {
      return { value: c.id, label: c.name };
    });
    var seriesTypes = SeedData.getSeriesTypes().map(function (s) {
      return { value: s.id, label: s.name };
    });
    var stageOptions = SeedData.getPipelineStages().map(function (s) {
      return { value: s.id, label: s.label };
    });

    // Parse existing scheduled_at
    var existingDate = '';
    var existingTime = '';
    if (post.scheduled_at) {
      var dt = new Date(post.scheduled_at);
      existingDate = dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0');
      existingTime = String(dt.getHours()).padStart(2, '0') + ':' +
        String(dt.getMinutes()).padStart(2, '0');
    }

    var formHtml =
      '<form id="post-edit-form" onsubmit="CalendarPage._submitEdit(event, \'' + _esc(postId) + '\')">' +
        Components.formGroup('Title',
          Components.formInput('title', post.title || '', { placeholder: 'Post title', required: true }),
          { required: true }
        ) +
        Components.formRow(
          Components.formGroup('Platform',
            Components.formSelect('platform', platformOptions, post.platform || '', { placeholder: 'Select platform' })
          ),
          Components.formGroup('Content Type',
            Components.formSelect('content_type', contentTypes, post.content_type || '', { placeholder: 'Select type' })
          )
        ) +
        Components.formRow(
          Components.formGroup('Category',
            Components.formSelect('category', categories, post.category || '', { placeholder: 'Select category' })
          ),
          Components.formGroup('Assignee',
            Components.formSelect('assignee', teamOptions, post.assignee || '', { placeholder: 'Select assignee' })
          )
        ) +
        Components.formRow(
          Components.formGroup('Date',
            Components.formInput('scheduled_date', existingDate, { type: 'date' })
          ),
          Components.formGroup('Time',
            Components.formInput('scheduled_time', existingTime, { type: 'time' })
          )
        ) +
        Components.formGroup('Stage',
          Components.formSelect('stage', stageOptions, post.stage || 'draft')
        ) +
        Components.formGroup('Copy Text',
          Components.formTextarea('copy_text', post.copy_text || '', { rows: 3, maxLength: 2000 })
        ) +
        Components.formGroup('Broker Name',
          Components.formInput('broker_name', post.broker_name || '', { placeholder: 'Required for listing posts' })
        ) +
        Components.formRow(
          Components.formGroup('UTM Source',
            Components.formInput('utm_source', post.utm_source || (post.utm && post.utm.utm_source) || 'social')
          ),
          Components.formGroup('UTM Medium',
            Components.formInput('utm_medium', post.utm_medium || (post.utm && post.utm.utm_medium) || '')
          ),
          Components.formGroup('UTM Campaign',
            Components.formInput('utm_campaign', post.utm_campaign || (post.utm && post.utm.utm_campaign) || '')
          )
        ) +
        Components.formRow(
          Components.formGroup('TinyURL',
            Components.formInput('tinyurl', post.tinyurl || '')
          ),
          Components.formGroup('Landing URL',
            Components.formInput('landing_url', post.landing_url || '')
          )
        ) +
        Components.formRow(
          Components.formGroup('CTA Type',
            Components.formSelect('cta_type', ctaTypes, post.cta_type || '', { placeholder: 'Select CTA' })
          ),
          Components.formGroup('Series',
            Components.formSelect('series_id', seriesTypes, post.series_id || '', { placeholder: 'Link to series (optional)' })
          )
        ) +
        '<div style="margin-bottom:12px;">' +
          Components.formCheckbox('pilot_first_flag', 'Pilot-First Content', post.pilot_first_flag) +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
          '<button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Changes</button>' +
        '</div>' +
      '</form>';

    Components.showModal('Edit Post', formHtml);
  }

  async function _submitEdit(e, postId) {
    e.preventDefault();
    var form = e.target;
    var title = form.querySelector('[name="title"]').value.trim();
    if (!title) {
      Components.showToast('Title is required', 'error');
      return;
    }

    var scheduledDate = form.querySelector('[name="scheduled_date"]').value;
    var scheduledTime = form.querySelector('[name="scheduled_time"]').value;
    var scheduledAt = null;
    if (scheduledDate) {
      scheduledAt = scheduledDate + (scheduledTime ? 'T' + scheduledTime + ':00' : 'T09:00:00');
    }

    var pilotCb = form.querySelector('[name="pilot_first_flag"]');

    var data = {
      title: title,
      platform: form.querySelector('[name="platform"]').value || null,
      content_type: form.querySelector('[name="content_type"]').value || null,
      category: form.querySelector('[name="category"]').value || null,
      assignee: form.querySelector('[name="assignee"]').value || null,
      scheduled_at: scheduledAt,
      stage: form.querySelector('[name="stage"]').value || 'draft',
      status: form.querySelector('[name="stage"]').value || 'draft',
      copy_text: form.querySelector('[name="copy_text"]').value || null,
      broker_name: form.querySelector('[name="broker_name"]').value || null,
      utm_source: form.querySelector('[name="utm_source"]').value || null,
      utm_medium: form.querySelector('[name="utm_medium"]').value || null,
      utm_campaign: form.querySelector('[name="utm_campaign"]').value || null,
      tinyurl: form.querySelector('[name="tinyurl"]').value || null,
      landing_url: form.querySelector('[name="landing_url"]').value || null,
      cta_type: form.querySelector('[name="cta_type"]').value || null,
      series_id: form.querySelector('[name="series_id"]').value || null,
      pilot_first_flag: pilotCb ? pilotCb.checked : false,
      updated_at: new Date().toISOString()
    };

    try {
      await API.posts.update(postId, data);
      Events.log(Events.EVENTS.POST_UPDATED, {
        post_id: postId, title: data.title, platform: data.platform
      });
      Components.closeModal();
      Components.showToast('Post updated', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to update post: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Delete Post ───────────────────────────────────────────────────

  function _confirmDelete(postId) {
    var post = _posts.find(function (p) { return p.id === postId; });
    var title = post ? post.title : postId;
    Components.confirmDialog(
      'Delete Post',
      'Are you sure you want to delete "' + title + '"? This cannot be undone.',
      async function () {
        try {
          await API.posts.delete(postId);
          Events.log(Events.EVENTS.POST_DELETED, { post_id: postId });
          Components.showToast('Post deleted', 'success');
          await render(_container);
        } catch (err) {
          Components.showToast(
            'Failed to delete post: ' + (err.message || 'Unknown error'), 'error'
          );
        }
      }
    );
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
    _setView: _setView,
    _nav: _nav,
    _openCreateModal: _openCreateModal,
    _submitCreate: _submitCreate,
    _openEditModal: _openEditModal,
    _submitEdit: _submitEdit,
    _confirmDelete: _confirmDelete
  };
})();
