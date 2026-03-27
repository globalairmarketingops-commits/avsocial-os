/* =====================================================================
   AvSocialOS — Windsor.ai Integration Layer
   Data fetch abstraction with cache and staleness handling.
   Phase 5: Wire to Windsor.ai MCP connectors.
   Currently serves cached/seed data with staleness indicators.
   ===================================================================== */

const Windsor = (() => {
  const CACHE_KEY = 'windsor_cache';
  const CACHE_TTL_HOURS = 24;
  const STALE_THRESHOLD_HOURS = 48;

  function getCache() {
    return Store.get(CACHE_KEY) || {
      facebook: { timestamp: null, data: null },
      instagram: { timestamp: null, data: null },
      linkedin: { timestamp: null, data: null },
      ga4: { timestamp: null, data: null }
    };
  }

  function getCachedData(connector) {
    const cache = getCache();
    return cache[connector]?.data || null;
  }

  function getCacheAge(connector) {
    const cache = getCache();
    const ts = cache[connector]?.timestamp;
    if (!ts) return null;
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60);
  }

  function isStale(connector) {
    const age = getCacheAge(connector);
    if (age === null) return true;
    return age > STALE_THRESHOLD_HOURS;
  }

  function isFresh(connector) {
    const age = getCacheAge(connector);
    if (age === null) return false;
    return age <= CACHE_TTL_HOURS;
  }

  function getStatus(connector) {
    const age = getCacheAge(connector);
    if (age === null) return 'pending';
    if (age <= CACHE_TTL_HOURS) return 'fresh';
    if (age <= STALE_THRESHOLD_HOURS) return 'aging';
    return 'stale';
  }

  // Placeholder for future Windsor.ai MCP integration
  function fetchFacebook(accounts, fields, dateRange) {
    console.log('[Windsor] fetchFacebook called — awaiting MCP connection', { accounts, fields, dateRange });
    return getCachedData('facebook');
  }

  function fetchInstagram(accounts, fields, dateRange) {
    console.log('[Windsor] fetchInstagram called — awaiting MCP connection', { accounts, fields, dateRange });
    return getCachedData('instagram');
  }

  function fetchLinkedIn(accounts, fields, dateRange) {
    console.log('[Windsor] fetchLinkedIn called — awaiting MCP connection', { accounts, fields, dateRange });
    return getCachedData('linkedin');
  }

  function fetchGA4(accounts, fields, dateRange, cleanChannelOnly = true) {
    console.log('[Windsor] fetchGA4 called — awaiting MCP connection', { accounts, fields, dateRange, cleanChannelOnly });
    return getCachedData('ga4');
  }

  function updateCache(connector, data) {
    const cache = getCache();
    cache[connector] = {
      timestamp: new Date().toISOString(),
      data: data
    };
    Store.set(CACHE_KEY, cache);
  }

  // Check if a platform data source is suspended
  function isPlatformSuspended(platform) {
    const platformConnectors = {
      facebook: ['facebook', 'ga4'],
      instagram: ['instagram', 'ga4'],
      linkedin: ['linkedin', 'ga4'],
      twitter: [] // Manual data, not Windsor
    };
    const connectors = platformConnectors[platform] || [];
    return connectors.some(c => isStale(c));
  }

  return {
    getCache, getCachedData, getCacheAge,
    isStale, isFresh, getStatus, isPlatformSuspended,
    fetchFacebook, fetchInstagram, fetchLinkedIn, fetchGA4,
    updateCache,
    CACHE_TTL_HOURS, STALE_THRESHOLD_HOURS
  };
})();
