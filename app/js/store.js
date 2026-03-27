/* =====================================================================
   AvSocialOS — API-Backed Cache Store
   Thin cache layer over api.js with localStorage fallback for settings.
   v2.0 — March 2026
   ===================================================================== */

const Store = (() => {

  const _cache = {};
  const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 minutes
  const _staleness = {}; // per-entity override in ms

  // ---- Cache helpers ----

  function _cacheKey(entityName, filters) {
    const suffix = filters ? JSON.stringify(filters) : '_all';
    return entityName + ':' + suffix;
  }

  function _isCacheStale(entityName, filters) {
    const key = _cacheKey(entityName, filters);
    const entry = _cache[key];
    if (!entry) return true;
    const maxAge = _staleness[entityName] || DEFAULT_STALE_MS;
    return (Date.now() - entry.timestamp) > maxAge;
  }

  function _setCache(entityName, filters, data) {
    const key = _cacheKey(entityName, filters);
    _cache[key] = { data, timestamp: Date.now() };
  }

  function _getCache(entityName, filters) {
    const key = _cacheKey(entityName, filters);
    const entry = _cache[key];
    return entry ? entry.data : null;
  }

  // ---- API-backed CRUD ----

  async function getEntity(entityName, filters) {
    if (!_isCacheStale(entityName, filters)) {
      return _getCache(entityName, filters);
    }
    try {
      if (typeof API !== 'undefined' && API[entityName] && API[entityName].list) {
        const data = await API[entityName].list(filters);
        _setCache(entityName, filters, data);
        return data;
      }
    } catch (e) {
      console.warn(`Store.getEntity: API fetch failed for "${entityName}"`, e);
    }
    // Return stale cache if API fails
    return _getCache(entityName, filters);
  }

  async function getEntityById(entityName, id) {
    const cacheKey = entityName + ':id:' + id;
    const entry = _cache[cacheKey];
    if (entry && (Date.now() - entry.timestamp) < (_staleness[entityName] || DEFAULT_STALE_MS)) {
      return entry.data;
    }
    try {
      if (typeof API !== 'undefined' && API[entityName] && API[entityName].get) {
        const data = await API[entityName].get(id);
        _cache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      }
    } catch (e) {
      console.warn(`Store.getEntityById: API fetch failed for "${entityName}/${id}"`, e);
    }
    return entry ? entry.data : null;
  }

  async function createEntity(entityName, data) {
    try {
      if (typeof API !== 'undefined' && API[entityName] && API[entityName].create) {
        const created = await API[entityName].create(data);
        invalidateCache(entityName);
        return created;
      }
    } catch (e) {
      console.error(`Store.createEntity: failed for "${entityName}"`, e);
      throw e;
    }
  }

  async function updateEntity(entityName, id, data) {
    try {
      if (typeof API !== 'undefined' && API[entityName] && API[entityName].update) {
        const updated = await API[entityName].update(id, data);
        invalidateCache(entityName);
        return updated;
      }
    } catch (e) {
      console.error(`Store.updateEntity: failed for "${entityName}/${id}"`, e);
      throw e;
    }
  }

  async function deleteEntity(entityName, id) {
    try {
      if (typeof API !== 'undefined' && API[entityName] && API[entityName].delete) {
        await API[entityName].delete(id);
        invalidateCache(entityName);
        return true;
      }
    } catch (e) {
      console.error(`Store.deleteEntity: failed for "${entityName}/${id}"`, e);
      throw e;
    }
  }

  // ---- Cache management ----

  function invalidateCache(entityName) {
    Object.keys(_cache).forEach(key => {
      if (key.startsWith(entityName + ':')) {
        delete _cache[key];
      }
    });
  }

  function invalidateAll() {
    Object.keys(_cache).forEach(key => delete _cache[key]);
  }

  function getCacheAge(entityName) {
    // Find the most recent cache entry for this entity
    let newest = null;
    Object.keys(_cache).forEach(key => {
      if (key.startsWith(entityName + ':') && _cache[key]) {
        if (!newest || _cache[key].timestamp > newest) {
          newest = _cache[key].timestamp;
        }
      }
    });
    return newest ? (Date.now() - newest) : null;
  }

  function setCacheStaleness(entityName, ms) {
    _staleness[entityName] = ms;
  }

  // ---- Backward-compatible localStorage for UI settings ----

  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Store.get: corrupted key "${key}"`, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Store.set: write failed for "${key}"`, e);
      if (typeof Components !== 'undefined' && Components.showToast) {
        Components.showToast('Storage limit reached — some data may not have saved.', 'error');
      }
      return false;
    }
  }

  function isInitialized() {
    return get('social_initialized') === true;
  }

  function markInitialized() {
    set('social_initialized', true);
  }

  function resetAll() {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('social_') || k.startsWith('avsocial_') || k.startsWith('windsor_')
    );
    keys.forEach(k => localStorage.removeItem(k));
    invalidateAll();
  }

  return {
    // API-backed cache
    getEntity, getEntityById, createEntity, updateEntity, deleteEntity,
    invalidateCache, invalidateAll, getCacheAge, setCacheStaleness,
    // Backward-compatible localStorage (settings/preferences)
    get, set, isInitialized, markInitialized, resetAll
  };
})();
