/* =====================================================================
   AvSocialOS — Event System
   Structured console.log events for v1. Wire to GA4 in Sprint 3.
   Convention: social_[domain]_[component]_[action]
   ===================================================================== */

const Events = (() => {
  function log(eventName, payload = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
      ...payload
    };
    console.log(`[AvSocialOS] ${eventName}`, event);
    return event;
  }

  function getSessionId() {
    let sid = sessionStorage.getItem('avsocialos_session');
    if (!sid) {
      sid = 'ses_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('avsocialos_session', sid);
    }
    return sid;
  }

  return { log };
})();
