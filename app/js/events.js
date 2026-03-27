/* =====================================================================
   AvSocialOS — Event System v2
   Full CRUD, compliance, navigation, and role event taxonomy.
   In-memory buffer for future GA4 integration.
   Convention: social_{category}_{action}
   ===================================================================== */

const Events = (() => {

  const BUFFER_MAX = 500;
  const _buffer = [];

  // ---- Event taxonomy ----
  const EVENTS = {
    // Navigation
    NAV_CLICK:                'social_nav_click',
    NAV_BACK:                 'social_nav_back',

    // CRUD — Posts
    POST_CREATED:             'social_post_created',
    POST_UPDATED:             'social_post_updated',
    POST_DELETED:             'social_post_deleted',

    // CRUD — Tasks
    TASK_CREATED:             'social_task_created',
    TASK_UPDATED:             'social_task_updated',
    TASK_STAGE_CHANGED:       'social_task_stage_changed',
    TASK_DELETED:             'social_task_deleted',
    TASK_BLOCKED:             'social_task_blocked',
    TASK_UNBLOCKED:           'social_task_unblocked',

    // CRUD — Briefs
    BRIEF_SUBMITTED:          'social_brief_submitted',
    BRIEF_TRIAGED:            'social_brief_triaged',
    BRIEF_ACCEPTED:           'social_brief_accepted',
    BRIEF_REJECTED:           'social_brief_rejected',
    BRIEF_TO_TASK:            'social_brief_to_task',

    // CRUD — Calendar
    CALENDAR_ENTRY_CREATED:   'social_calendar_entry_created',
    CALENDAR_ENTRY_EDITED:    'social_calendar_entry_edited',
    CALENDAR_ENTRY_DELETED:   'social_calendar_entry_deleted',

    // CRUD — UTM
    UTM_CREATED:              'social_utm_created',
    UTM_COPIED:               'social_utm_copied',

    // CRUD — Series
    SERIES_CREATED:           'social_series_created',
    SERIES_UPDATED:           'social_series_updated',

    // Compliance
    VIOLATION_CREATED:        'social_violation_created',
    VIOLATION_OVERRIDDEN:     'social_violation_overridden',
    VIOLATION_RESOLVED:       'social_violation_resolved',
    PREFLIGHT_RUN:            'social_preflight_run',
    QA_OVERRIDE:              'social_qa_override',

    // Publishing
    POST_PUBLISH_CONFIRMED:   'social_post_publish_confirmed',
    POST_MISMATCH_FLAGGED:    'social_post_mismatch_flagged',
    POST_STALE_FLAGGED:       'social_post_stale_flagged',

    // Auth
    USER_CHANGED:             'social_user_changed',
    ROLE_CHECKED:             'social_role_checked',

    // Settings
    DATERANGE_CHANGE:         'social_daterange_change'
  };

  // ---- Core ----

  function getSessionId() {
    let sid = sessionStorage.getItem('avsocialos_session');
    if (!sid) {
      sid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('avsocialos_session', sid);
    }
    return sid;
  }

  function log(eventName, payload = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
      ...payload
    };

    // Console output
    console.log(`[AvSocialOS] ${eventName}`, event);

    // Buffer for future GA4 integration
    _buffer.push(event);
    if (_buffer.length > BUFFER_MAX) {
      _buffer.shift();
    }

    return event;
  }

  function getBuffer() {
    return [..._buffer];
  }

  function clearBuffer() {
    _buffer.length = 0;
  }

  return { log, getBuffer, clearBuffer, EVENTS };
})();
