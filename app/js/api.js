/**
 * AvSocialOS v2 — API Client Module
 * Replaces direct localStorage access with server-backed REST calls.
 * All page modules call API.posts.list(), API.tasks.create(), etc.
 *
 * Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > api.js
 */

const API = (() => {
  'use strict';

  const BASE_URL = '';

  // ── Helpers ──────────────────────────────────────────────────────────

  function _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (typeof Auth !== 'undefined') {
      const authHeaders = Auth.getHeaders();
      Object.assign(headers, authHeaders);
    }
    return headers;
  }

  function _buildQuery(filters) {
    if (!filters || typeof filters !== 'object') return '';
    const params = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return params ? `?${params}` : '';
  }

  function _showToast(message, type) {
    if (typeof Components !== 'undefined' && typeof Components.showToast === 'function') {
      Components.showToast(message, type || 'error');
    } else {
      console.error('[API]', message);
    }
  }

  async function _request(method, url, body) {
    const opts = {
      method: method,
      headers: _getHeaders()
    };
    if (body !== undefined && body !== null) {
      opts.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${BASE_URL}${url}`, opts);
    } catch (err) {
      _showToast('Server unreachable', 'error');
      throw new Error('Network error: server unreachable');
    }

    if (response.status === 204) return null;

    if (response.status === 403) {
      _showToast('Permission denied', 'error');
      throw new Error('403 Permission denied');
    }

    if (response.status === 404) {
      return null;
    }

    if (response.status >= 500) {
      let msg = 'Server error';
      try {
        const errBody = await response.json();
        msg = errBody.error || errBody.message || msg;
      } catch (_) { /* ignore parse failure */ }
      _showToast(msg, 'error');
      throw new Error(`500 ${msg}`);
    }

    if (!response.ok) {
      let msg = `Request failed (${response.status})`;
      try {
        const errBody = await response.json();
        msg = errBody.error || errBody.message || msg;
      } catch (_) { /* ignore */ }
      throw new Error(msg);
    }

    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  }

  // ── Entity Factory ──────────────────────────────────────────────────

  function _createEntity(resource) {
    return {
      async list(filters) {
        const result = await _request('GET', `/api/${resource}${_buildQuery(filters)}`);
        // Server returns {data: [], total: N} — unwrap to return the array
        if (result && result.data && Array.isArray(result.data)) return result.data;
        if (Array.isArray(result)) return result;
        return [];
      },
      async get(id) {
        return _request('GET', `/api/${resource}/${encodeURIComponent(id)}`);
      },
      async create(data) {
        return _request('POST', `/api/${resource}`, data);
      },
      async update(id, data) {
        return _request('PUT', `/api/${resource}/${encodeURIComponent(id)}`, data);
      },
      async delete(id) {
        return _request('DELETE', `/api/${resource}/${encodeURIComponent(id)}`);
      }
    };
  }

  function _createReadOnly(resource) {
    return {
      async list(filters) {
        const result = await _request('GET', `/api/${resource}${_buildQuery(filters)}`);
        if (result && result.data && Array.isArray(result.data)) return result.data;
        if (Array.isArray(result)) return result;
        return [];
      }
    };
  }

  // ── Public API ──────────────────────────────────────────────────────

  return {
    // Standard CRUD entities
    posts:            _createEntity('posts'),
    tasks:            _createEntity('tasks'),
    briefs:           _createEntity('briefs'),
    publish_status:   _createEntity('publish_status'),
    rule_violations:  _createEntity('rule_violations'),
    series:           _createEntity('series'),
    post_learnings:   _createEntity('post_learnings'),
    metrics_platform: _createEntity('metrics_platform'),
    metrics_content:  _createEntity('metrics_content'),
    utm_tracking:     _createEntity('utm_tracking'),
    competitor:       _createEntity('competitor'),
    ian_metrics:      _createEntity('ian_metrics'),
    templates:        _createEntity('templates'),
    channel_strategy: _createEntity('channel_strategy'),

    // Read-only
    audit_log: _createReadOnly('audit_log'),

    // Formulas — special endpoints
    formulas: {
      async get(name) {
        return _request('GET', `/api/formulas/${encodeURIComponent(name)}`);
      },
      async list() {
        return _request('GET', '/api/formulas');
      }
    },

    // Health check
    async health() {
      return _request('GET', '/api/health');
    }
  };
})();
