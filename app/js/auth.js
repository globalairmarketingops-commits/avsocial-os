/**
 * AvSocialOS v2 — Auth / Role Management Module
 * Handles user identity, role-based permissions, and session persistence.
 *
 * Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > auth.js
 */

const Auth = (() => {
  'use strict';

  const STORAGE_KEY_USER = 'avsocialos_user';

  // ── User Directory ──────────────────────────────────────────────────

  const USERS = {
    casey:   { name: 'Casey Jones',        role: 'full_access',  initials: 'CJ', color: '#97CB00' },
    clay:    { name: 'Clay Martin',        role: 'full_access',  initials: 'CM', color: '#6366F1' },
    keaton:  { name: 'Keaton Fenwick',     role: 'operator',     initials: 'KF', color: '#4782D3' },
    sydney:  { name: 'Sydney Eldridge',    role: 'contributor',  initials: 'SE', color: '#8B5CF6' },
    abby:    { name: 'Abby Sheets',        role: 'contributor',  initials: 'AS', color: '#EC4899' },
    ian:     { name: 'Ian Lumpp',          role: 'contributor',  initials: 'IL', color: '#F59E0B' },
    jadda:   { name: 'Jadda Tyree',        role: 'contributor',  initials: 'JT', color: '#14B8A6' },
    jeffrey: { name: 'Jeffrey Carrithers', role: 'viewer',       initials: 'JC', color: '#94A3B8' }
  };

  // ── Permission Matrix ───────────────────────────────────────────────

  // Actions: create, read, update, delete, approve, override_qa, edit_strategy, export
  // Entities checked: posts, tasks, briefs, publish_status, utm_tracking,
  //   templates, channel_strategy, rule_violations, series, post_learnings,
  //   metrics_platform, metrics_content, competitor, ian_metrics, audit_log, formulas

  const PERMISSIONS = {
    viewer: {
      _actions: ['read']
    },
    contributor: {
      _actions: ['read', 'create'],
      _createEntities: ['briefs'],
      _updateOwn: true  // can update items where created_by matches current user
    },
    operator: {
      _actions: ['read', 'create', 'update', 'export'],
      _createEntities: ['posts', 'tasks', 'briefs', 'publish_status', 'utm_tracking', 'templates'],
      _updateEntities: ['posts', 'tasks', 'briefs', 'publish_status', 'utm_tracking', 'templates'],
      _denyDelete: true,
      _denyEntities: ['channel_strategy']
    },
    full_access: {
      _all: true
    }
  };

  let _currentUserId = null;

  // ── Internal ────────────────────────────────────────────────────────

  function _loadFromSession() {
    try {
      return sessionStorage.getItem(STORAGE_KEY_USER);
    } catch (e) {
      return null;
    }
  }

  function _saveToSession(userId) {
    try {
      sessionStorage.setItem(STORAGE_KEY_USER, userId);
    } catch (e) {
      console.warn('[Auth] Could not write to sessionStorage');
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  function init() {
    const stored = _loadFromSession();
    if (stored && USERS[stored]) {
      _currentUserId = stored;
    } else {
      _currentUserId = 'casey';
      _saveToSession('casey');
    }
    return _currentUserId;
  }

  function getUser() {
    return _currentUserId;
  }

  function getRole() {
    const user = USERS[_currentUserId];
    return user ? user.role : 'viewer';
  }

  function getUserInfo() {
    if (!_currentUserId || !USERS[_currentUserId]) return null;
    return Object.assign({ id: _currentUserId }, USERS[_currentUserId]);
  }

  function setUser(userId) {
    if (!USERS[userId]) {
      console.error('[Auth] Unknown user:', userId);
      return false;
    }
    _currentUserId = userId;
    _saveToSession(userId);

    // Trigger UI refresh if the app provides a hook
    if (typeof window.onAuthChange === 'function') {
      window.onAuthChange(getUserInfo());
    }
    // Also dispatch a DOM event for decoupled listeners
    window.dispatchEvent(new CustomEvent('auth:change', { detail: getUserInfo() }));
    return true;
  }

  /**
   * Permission check.
   * @param {string} action  — create | read | update | delete | approve | override_qa | edit_strategy | export
   * @param {string} entity  — posts, tasks, briefs, channel_strategy, etc.
   * @param {object} [item]  — optional item to check ownership (must have created_by field)
   * @returns {boolean}
   */
  function can(action, entity, item) {
    const role = getRole();
    const perms = PERMISSIONS[role];
    if (!perms) return false;

    // full_access — everything allowed
    if (perms._all) return true;

    // Deny list — entity blocked entirely for this role
    if (perms._denyEntities && perms._denyEntities.includes(entity)) {
      return action === 'read'; // can still read, just not modify
    }

    // Viewer — read only
    if (role === 'viewer') {
      return action === 'read';
    }

    // Read is always allowed for authenticated users
    if (action === 'read') return true;

    // Delete check
    if (action === 'delete') {
      if (perms._denyDelete) return false;
      if (role === 'contributor') return false;
    }

    // Approve / override_qa / edit_strategy — full_access only (already handled above)
    if (['approve', 'override_qa', 'edit_strategy'].includes(action)) {
      return false;
    }

    // Contributor specifics
    if (role === 'contributor') {
      if (action === 'create') {
        return perms._createEntities && perms._createEntities.includes(entity);
      }
      if (action === 'update') {
        if (!perms._updateOwn) return false;
        // Ownership check
        if (item && item.created_by && item.created_by !== _currentUserId) return false;
        return true;
      }
      if (action === 'export') return false;
      return false;
    }

    // Operator specifics
    if (role === 'operator') {
      if (action === 'create') {
        return perms._createEntities && perms._createEntities.includes(entity);
      }
      if (action === 'update') {
        return perms._updateEntities && perms._updateEntities.includes(entity);
      }
      if (action === 'export') return true;
      return false;
    }

    return false;
  }

  /**
   * Returns HTML string for a user-picker widget (dropdown pill).
   * Mount in the topbar with element.innerHTML = Auth.renderUserPicker().
   */
  function renderUserPicker() {
    const current = getUserInfo();
    if (!current) return '';

    const optionsHtml = Object.entries(USERS).map(([id, u]) => {
      const selected = id === _currentUserId ? ' selected' : '';
      return `<option value="${id}"${selected}>${u.initials} — ${u.name} (${u.role})</option>`;
    }).join('');

    return `
      <div class="auth-picker" style="display:inline-flex;align-items:center;gap:8px;">
        <span class="auth-avatar" style="
          display:inline-flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:50%;
          background:${current.color};color:#fff;
          font-size:12px;font-weight:700;
        ">${current.initials}</span>
        <select class="auth-select" onchange="Auth.setUser(this.value)" style="
          background:#1e293b;color:#e2e8f0;border:1px solid #334155;
          border-radius:6px;padding:4px 8px;font-size:13px;cursor:pointer;
        ">
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  /**
   * Returns headers object for API calls.
   */
  function getHeaders() {
    return {
      'X-User': _currentUserId || 'casey',
      'X-Role': getRole()
    };
  }

  // ── Expose ──────────────────────────────────────────────────────────

  return {
    init,
    getUser,
    getRole,
    getUserInfo,
    setUser,
    can,
    renderUserPicker,
    getHeaders,
    USERS  // expose for UI rendering (read-only by convention)
  };
})();
