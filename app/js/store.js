/* =====================================================================
   AvSocialOS — localStorage Store
   Versioned CRUD with staleness detection and corruption recovery
   ===================================================================== */

const Store = (() => {

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
      Components && Components.showToast && Components.showToast('Storage limit reached — some data may not have saved.', 'error');
      return false;
    }
  }

  function getVersioned(key) {
    return get(key);
  }

  function setVersioned(key, value, updater = 'system') {
    const existing = get(key) || {};
    const previous = JSON.parse(JSON.stringify(existing));
    const updated = {
      ...existing,
      ...value,
      last_updated: new Date().toISOString(),
      updated_by: updater,
      _version_history: [
        ...(existing._version_history || []),
        {
          date: new Date().toISOString(),
          updater,
          previous_value: previous,
          new_value: value
        }
      ].slice(-50)
    };
    return set(key, updated);
  }

  function appendToArray(key, item) {
    const arr = get(key) || [];
    const exists = arr.find(x => x.id === item.id);
    if (exists) return false;
    arr.push(item);
    return set(key, arr);
  }

  function updateInArray(key, id, updates) {
    const arr = get(key) || [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return false;
    arr[idx] = { ...arr[idx], ...updates };
    return set(key, arr);
  }

  function removeFromArray(key, id) {
    const arr = get(key) || [];
    const filtered = arr.filter(x => x.id !== id);
    return set(key, filtered);
  }

  function isStale(key, thresholdDays) {
    const data = get(key);
    if (!data) return true;
    const lastUpdated = data.last_updated || data.last_upload_date;
    if (!lastUpdated) return true;
    const age = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    return age > thresholdDays;
  }

  function getAge(key) {
    const data = get(key);
    if (!data) return null;
    const lastUpdated = data.last_updated || data.last_upload_date;
    if (!lastUpdated) return null;
    return (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
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
  }

  return {
    get, set, getVersioned, setVersioned,
    appendToArray, updateInArray, removeFromArray,
    isStale, getAge, isInitialized, markInitialized, resetAll
  };
})();
