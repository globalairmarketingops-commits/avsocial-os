/* =====================================================================
   Av/SocialOS v2.0.0 — Node.js REST API Server
   Pure Node.js http module — zero external dependencies
   Static file server + full CRUD API + formula engine + audit logging
   Port: 8093 (configurable via PORT env var)
   ===================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 8093;
const APP_DIR = path.join(__dirname, 'app');
const DATA_DIR = path.join(__dirname, 'data');

const ENTITIES = [
  'posts', 'tasks', 'briefs', 'publish_status', 'rule_violations',
  'series', 'post_learnings', 'metrics_platform', 'metrics_content',
  'utm_tracking', 'competitor', 'ian_metrics', 'templates',
  'channel_strategy', 'audit_log'
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.csv':  'text/csv',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.map':  'application/json'
};

// ---------------------------------------------------------------------------
// Role-Based Access Control
// ---------------------------------------------------------------------------

const ROLE_PERMISSIONS = {
  viewer: {
    allowed_methods: ['GET'],
    writable_entities: []
  },
  contributor: {
    allowed_methods: ['GET', 'POST', 'PUT'],
    post_entities: ['briefs'],
    put_own_only: true,
    writable_entities: ['briefs']
  },
  operator: {
    allowed_methods: ['GET', 'POST', 'PUT'],
    writable_entities: ['posts', 'tasks', 'briefs', 'publish_status', 'utm_tracking', 'templates'],
    blocked_entities: ['channel_strategy']
  },
  full_access: {
    allowed_methods: ['GET', 'POST', 'PUT', 'DELETE'],
    writable_entities: ENTITIES.filter(e => e !== 'audit_log')
  }
};

// ---------------------------------------------------------------------------
// Data Store — File-backed JSON
// ---------------------------------------------------------------------------

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  for (const entity of ENTITIES) {
    const filePath = path.join(DATA_DIR, `${entity}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf8');
    }
  }
}

function readEntity(entity) {
  const filePath = path.join(DATA_DIR, `${entity}.json`);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeEntity(entity, data) {
  const filePath = path.join(DATA_DIR, `${entity}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function generateId(prefix) {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${ts}_${rand}`;
}

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

function appendAudit(entry) {
  const log = readEntity('audit_log');
  const record = {
    id: 'audit_' + Date.now(),
    timestamp: new Date().toISOString(),
    user: entry.user || 'anonymous',
    role: entry.role || 'full_access',
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    previous_value: entry.previous_value || null,
    new_value: entry.new_value || null
  };
  log.push(record);
  writeEntity('audit_log', log);
}

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User, X-Role'
};

// ---------------------------------------------------------------------------
// Response Helpers
// ---------------------------------------------------------------------------

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message, details) {
  const body = { error: true, message };
  if (details) body.details = details;
  sendJSON(res, status, body);
}

function send204(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

// ---------------------------------------------------------------------------
// Request Body Parser
// ---------------------------------------------------------------------------

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw || raw.trim() === '') return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Route Matching
// ---------------------------------------------------------------------------

function parseRoute(pathname) {
  // /api/formulas/{name}
  const formulaMatch = pathname.match(/^\/api\/formulas\/([a-z_]+)$/);
  if (formulaMatch) return { type: 'formula', name: formulaMatch[1] };

  // /api/formulas
  if (pathname === '/api/formulas') return { type: 'formula_list' };

  // /api/health
  if (pathname === '/api/health') return { type: 'health' };

  // /api/{entity}/{id}
  const entityItemMatch = pathname.match(/^\/api\/([a-z_]+)\/(.+)$/);
  if (entityItemMatch && ENTITIES.includes(entityItemMatch[1])) {
    return { type: 'entity_item', entity: entityItemMatch[1], id: decodeURIComponent(entityItemMatch[2]) };
  }

  // /api/{entity}
  const entityMatch = pathname.match(/^\/api\/([a-z_]+)$/);
  if (entityMatch && ENTITIES.includes(entityMatch[1])) {
    return { type: 'entity_list', entity: entityMatch[1] };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Access Control Middleware
// ---------------------------------------------------------------------------

function checkAccess(role, method, entity, itemData, user) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return { allowed: false, reason: `Unknown role: ${role}` };

  // Method check
  if (!perms.allowed_methods.includes(method)) {
    return { allowed: false, reason: `Role '${role}' cannot perform ${method}` };
  }

  // GET is always allowed for any valid role
  if (method === 'GET') return { allowed: true };

  // audit_log is always read-only
  if (entity === 'audit_log') {
    return { allowed: false, reason: 'audit_log is read-only' };
  }

  // Blocked entities (operator cannot mutate channel_strategy)
  if (perms.blocked_entities && perms.blocked_entities.includes(entity)) {
    return { allowed: false, reason: `Role '${role}' cannot mutate '${entity}'` };
  }

  // Contributor: POST only to specific entities
  if (role === 'contributor' && method === 'POST') {
    if (!perms.post_entities.includes(entity)) {
      return { allowed: false, reason: `Role 'contributor' can only POST to: ${perms.post_entities.join(', ')}` };
    }
    return { allowed: true };
  }

  // Contributor: PUT own items only
  if (role === 'contributor' && method === 'PUT') {
    if (!perms.writable_entities.includes(entity)) {
      return { allowed: false, reason: `Role 'contributor' cannot update '${entity}'` };
    }
    if (perms.put_own_only && itemData && itemData.created_by !== user) {
      return { allowed: false, reason: 'Contributors can only update their own items' };
    }
    return { allowed: true };
  }

  // Contributor: no DELETE
  if (role === 'contributor' && method === 'DELETE') {
    return { allowed: false, reason: "Role 'contributor' cannot delete items" };
  }

  // Operator: check writable entities, no DELETE
  if (role === 'operator') {
    if (method === 'DELETE') {
      return { allowed: false, reason: "Role 'operator' cannot delete items" };
    }
    if (!perms.writable_entities.includes(entity)) {
      return { allowed: false, reason: `Role 'operator' cannot mutate '${entity}'` };
    }
    return { allowed: true };
  }

  // full_access: check writable entities
  if (!perms.writable_entities.includes(entity)) {
    return { allowed: false, reason: `Cannot mutate '${entity}'` };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Formula Engine
// ---------------------------------------------------------------------------

const FORMULAS = {

  publish_ready_rate() {
    const posts = readEntity('posts');
    if (posts.length === 0) return { value: 0, unit: '%', total: 0, ready: 0, description: 'Percentage of posts in publish-ready state' };
    const ready = posts.filter(p => p.status === 'ready' || p.status === 'published' || p.status === 'approved').length;
    return { value: round((ready / posts.length) * 100), unit: '%', total: posts.length, ready, description: 'Percentage of posts in publish-ready state' };
  },

  blocked_rate() {
    const posts = readEntity('posts');
    const violations = readEntity('rule_violations');
    if (posts.length === 0) return { value: 0, unit: '%', total_posts: 0, blocked: 0, active_violations: 0, description: 'Rate of posts blocked by rule violations' };
    const blocked = posts.filter(p => p.status === 'blocked' || p.status === 'rejected').length;
    const activeViolations = violations.filter(v => v.status === 'active' || v.status === 'open' || !v.resolved_at).length;
    return { value: round((blocked / posts.length) * 100), unit: '%', total_posts: posts.length, blocked, active_violations: activeViolations, description: 'Rate of posts blocked by rule violations' };
  },

  pilot_first_mix() {
    const posts = readEntity('posts');
    if (posts.length === 0) return { value: 0, unit: '%', total: 0, pilot_first: 0, description: 'Percentage of posts using pilot-first (buyer-intent) framing' };
    const pilotFirst = posts.filter(p => p.content_type === 'pilot_first' || p.buyer_intent === true || p.category === 'buyer_intent').length;
    return { value: round((pilotFirst / posts.length) * 100), unit: '%', total: posts.length, pilot_first: pilotFirst, description: 'Percentage of posts using pilot-first (buyer-intent) framing' };
  },

  on_time_publish_rate() {
    const posts = readEntity('posts');
    const pubStatus = readEntity('publish_status');
    if (pubStatus.length === 0) return { value: 0, unit: '%', total: 0, on_time: 0, description: 'Percentage of posts published on or before scheduled time' };
    const onTime = pubStatus.filter(ps => {
      if (!ps.scheduled_at || !ps.published_at) return false;
      return new Date(ps.published_at) <= new Date(ps.scheduled_at);
    }).length;
    return { value: round((onTime / pubStatus.length) * 100), unit: '%', total: pubStatus.length, on_time: onTime, description: 'Percentage of posts published on or before scheduled time' };
  },

  stage_sla_compliance() {
    const tasks = readEntity('tasks');
    if (tasks.length === 0) return { value: 0, unit: '%', total: 0, compliant: 0, description: 'Percentage of tasks completing within SLA for their stage' };
    const compliant = tasks.filter(t => t.sla_met === true || t.within_sla === true).length;
    return { value: round((compliant / tasks.length) * 100), unit: '%', total: tasks.length, compliant, description: 'Percentage of tasks completing within SLA for their stage' };
  },

  cadence_compliance() {
    const posts = readEntity('posts');
    const channelStrategy = readEntity('channel_strategy');
    if (channelStrategy.length === 0) return { value: 0, unit: '%', strategies: 0, description: 'Compliance rate of actual posting cadence vs planned channel strategy' };
    let totalTargets = 0;
    let metTargets = 0;
    for (const cs of channelStrategy) {
      if (!cs.platform || !cs.target_per_week) continue;
      totalTargets++;
      const platformPosts = posts.filter(p => p.platform === cs.platform);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentPosts = platformPosts.filter(p => p.created_at && new Date(p.created_at) >= weekAgo);
      if (recentPosts.length >= cs.target_per_week) metTargets++;
    }
    if (totalTargets === 0) return { value: 0, unit: '%', strategies: channelStrategy.length, targets_evaluated: 0, description: 'Compliance rate of actual posting cadence vs planned channel strategy' };
    return { value: round((metTargets / totalTargets) * 100), unit: '%', strategies: channelStrategy.length, targets_evaluated: totalTargets, targets_met: metTargets, description: 'Compliance rate of actual posting cadence vs planned channel strategy' };
  },

  rule_compliance() {
    const posts = readEntity('posts');
    const violations = readEntity('rule_violations');
    if (posts.length === 0) return { value: 0, unit: '%', total_posts: 0, violating_posts: 0, total_violations: 0, description: 'Percentage of posts with zero rule violations' };
    const violatingPostIds = new Set(violations.map(v => v.post_id).filter(Boolean));
    const clean = posts.filter(p => !violatingPostIds.has(p.id)).length;
    return { value: round((clean / posts.length) * 100), unit: '%', total_posts: posts.length, clean_posts: clean, violating_posts: violatingPostIds.size, total_violations: violations.length, description: 'Percentage of posts with zero rule violations' };
  },

  template_performance() {
    const templates = readEntity('templates');
    if (templates.length === 0) return { value: 0, unit: 'avg_uses', total_templates: 0, description: 'Average usage count across all templates' };
    const totalUses = templates.reduce((sum, t) => sum + (t.use_count || t.times_used || 0), 0);
    return { value: round(totalUses / templates.length, 1), unit: 'avg_uses', total_templates: templates.length, total_uses: totalUses, description: 'Average usage count across all templates' };
  },

  post_to_session_rate() {
    const utm = readEntity('utm_tracking');
    if (utm.length === 0) return { value: 0, unit: '%', total_tracked: 0, with_sessions: 0, description: 'Percentage of tracked posts that generated at least one session' };
    const withSessions = utm.filter(u => (u.sessions || 0) > 0).length;
    return { value: round((withSessions / utm.length) * 100), unit: '%', total_tracked: utm.length, with_sessions: withSessions, description: 'Percentage of tracked posts that generated at least one session' };
  },

  post_to_qi_yield() {
    const utm = readEntity('utm_tracking');
    if (utm.length === 0) return { value: 0, unit: 'qi_per_post', total_tracked: 0, total_qi: 0, description: 'Average qualified inquiries per tracked post' };
    const totalQI = utm.reduce((sum, u) => sum + (u.qi || u.qualified_inquiries || 0), 0);
    return { value: round(totalQI / utm.length, 2), unit: 'qi_per_post', total_tracked: utm.length, total_qi: totalQI, description: 'Average qualified inquiries per tracked post' };
  },

  parameter_integrity() {
    const utm = readEntity('utm_tracking');
    if (utm.length === 0) return { value: 0, unit: '%', total: 0, valid: 0, description: 'Percentage of UTM records with complete required parameters' };
    const requiredFields = ['utm_source', 'utm_medium', 'utm_campaign'];
    const valid = utm.filter(u => requiredFields.every(f => u[f] && u[f].trim() !== '')).length;
    return { value: round((valid / utm.length) * 100), unit: '%', total: utm.length, valid, invalid: utm.length - valid, description: 'Percentage of UTM records with complete required parameters' };
  },

  series_completion() {
    const series = readEntity('series');
    if (series.length === 0) return { value: 0, unit: '%', total_series: 0, completed: 0, description: 'Percentage of content series that have reached completion' };
    const completed = series.filter(s => s.status === 'completed' || s.status === 'done').length;
    return { value: round((completed / series.length) * 100), unit: '%', total_series: series.length, completed, description: 'Percentage of content series that have reached completion' };
  },

  learning_coverage() {
    const posts = readEntity('posts');
    const learnings = readEntity('post_learnings');
    if (posts.length === 0) return { value: 0, unit: '%', total_posts: 0, posts_with_learnings: 0, total_learnings: 0, description: 'Percentage of posts that have associated learnings captured' };
    const postIdsWithLearnings = new Set(learnings.map(l => l.post_id).filter(Boolean));
    const covered = posts.filter(p => postIdsWithLearnings.has(p.id)).length;
    return { value: round((covered / posts.length) * 100), unit: '%', total_posts: posts.length, posts_with_learnings: covered, total_learnings: learnings.length, description: 'Percentage of posts that have associated learnings captured' };
  },

  publish_truth_accuracy() {
    const pubStatus = readEntity('publish_status');
    if (pubStatus.length === 0) return { value: 0, unit: '%', total: 0, verified: 0, description: 'Percentage of publish status records that are verified accurate' };
    const verified = pubStatus.filter(ps => ps.verified === true || ps.confirmed === true).length;
    return { value: round((verified / pubStatus.length) * 100), unit: '%', total: pubStatus.length, verified, description: 'Percentage of publish status records that are verified accurate' };
  }
};

function round(n, decimals = 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ---------------------------------------------------------------------------
// Entity CRUD Handlers
// ---------------------------------------------------------------------------

function handleEntityList(req, res, entity, query) {
  const data = readEntity(entity);

  // Filter by query params
  let filtered = data;
  for (const [key, value] of Object.entries(query)) {
    if (key === 'limit' || key === 'offset') continue;
    filtered = filtered.filter(item => {
      const itemVal = item[key];
      if (itemVal === undefined || itemVal === null) return false;
      return String(itemVal).toLowerCase() === String(value).toLowerCase();
    });
  }

  // Pagination for audit_log
  if (entity === 'audit_log') {
    const limit = parseInt(query.limit) || 100;
    const offset = parseInt(query.offset) || 0;
    const total = filtered.length;
    // Return most recent first
    filtered = filtered.slice().reverse().slice(offset, offset + limit);
    return sendJSON(res, 200, { data: filtered, total, limit, offset });
  }

  sendJSON(res, 200, { data: filtered, total: filtered.length });
}

function handleEntityItem(res, entity, id) {
  const data = readEntity(entity);
  const item = data.find(d => d.id === id);
  if (!item) return sendError(res, 404, `Item '${id}' not found in '${entity}'`);
  sendJSON(res, 200, { data: item });
}

function handleEntityCreate(req, res, entity, body, user, role) {
  const data = readEntity(entity);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(res, 400, 'Request body must be a JSON object');
  }

  const item = { ...body };
  if (!item.id) item.id = generateId(entity.slice(0, 4));
  item.created_at = new Date().toISOString();
  if (user) item.created_by = user;

  // Check for duplicate id
  if (data.some(d => d.id === item.id)) {
    return sendError(res, 400, `Item with id '${item.id}' already exists in '${entity}'`);
  }

  data.push(item);
  writeEntity(entity, data);

  appendAudit({
    user, role,
    action: 'create',
    entity_type: entity,
    entity_id: item.id,
    new_value: item
  });

  sendJSON(res, 201, { data: item });
}

function handleEntityUpdate(req, res, entity, id, body, user, role) {
  const data = readEntity(entity);
  const index = data.findIndex(d => d.id === id);
  if (index === -1) return sendError(res, 404, `Item '${id}' not found in '${entity}'`);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(res, 400, 'Request body must be a JSON object');
  }

  const previous = { ...data[index] };
  const updated = { ...data[index], ...body, id, updated_at: new Date().toISOString() };
  data[index] = updated;
  writeEntity(entity, data);

  appendAudit({
    user, role,
    action: 'update',
    entity_type: entity,
    entity_id: id,
    previous_value: previous,
    new_value: updated
  });

  sendJSON(res, 200, { data: updated });
}

function handleEntityDelete(res, entity, id, user, role) {
  const data = readEntity(entity);
  const index = data.findIndex(d => d.id === id);
  if (index === -1) return sendError(res, 404, `Item '${id}' not found in '${entity}'`);

  const previous = data[index];
  data.splice(index, 1);
  writeEntity(entity, data);

  appendAudit({
    user, role,
    action: 'delete',
    entity_type: entity,
    entity_id: id,
    previous_value: previous
  });

  send204(res);
}

// ---------------------------------------------------------------------------
// Static File Server
// ---------------------------------------------------------------------------

function serveStaticFile(req, res, pathname) {
  // Default to index.html
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  }

  const filePath = path.join(APP_DIR, pathname);

  // Security: prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(APP_DIR))) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file not found and no extension, try serving index.html (SPA fallback)
      if (err.code === 'ENOENT' && !path.extname(pathname)) {
        const indexPath = path.join(APP_DIR, 'index.html');
        fs.readFile(indexPath, (err2, data2) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache', ...CORS_HEADERS });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS_HEADERS });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      ...CORS_HEADERS
    });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Main Request Router
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    // Non-API routes: serve static files
    if (!pathname.startsWith('/api/') && pathname !== '/api') {
      serveStaticFile(req, res, pathname);
      return;
    }

    // Extract auth headers
    const user = req.headers['x-user'] || null;
    const role = req.headers['x-role'] || 'full_access';

    // Validate role
    if (!ROLE_PERMISSIONS[role]) {
      return sendError(res, 400, `Invalid role: '${role}'. Valid roles: ${Object.keys(ROLE_PERMISSIONS).join(', ')}`);
    }

    // Parse route
    const route = parseRoute(pathname);

    // ---- Health Check ----
    if (route && route.type === 'health') {
      return sendJSON(res, 200, {
        status: 'ok',
        app: 'Av/SocialOS',
        version: '2.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        entities: ENTITIES.length,
        data_dir: DATA_DIR
      });
    }

    // ---- Formula List ----
    if (route && route.type === 'formula_list') {
      const list = Object.keys(FORMULAS).map(name => ({
        name,
        endpoint: `/api/formulas/${name}`
      }));
      return sendJSON(res, 200, { data: list, total: list.length });
    }

    // ---- Formula Compute ----
    if (route && route.type === 'formula') {
      const fn = FORMULAS[route.name];
      if (!fn) return sendError(res, 404, `Formula '${route.name}' not found`, { available: Object.keys(FORMULAS) });
      try {
        const result = fn();
        return sendJSON(res, 200, { formula: route.name, ...result, computed_at: new Date().toISOString() });
      } catch (e) {
        return sendError(res, 500, `Formula computation failed: ${e.message}`);
      }
    }

    // ---- Entity Routes ----
    if (route && (route.type === 'entity_list' || route.type === 'entity_item')) {
      const entity = route.entity;

      // Parse query params into plain object
      const query = {};
      url.searchParams.forEach((value, key) => { query[key] = value; });

      // GET requests
      if (method === 'GET') {
        if (route.type === 'entity_list') return handleEntityList(req, res, entity, query);
        if (route.type === 'entity_item') return handleEntityItem(res, entity, route.id);
      }

      // Mutation access check (method-level)
      const accessCheck = checkAccess(role, method, entity, null, user);
      if (!accessCheck.allowed) {
        return sendError(res, 403, accessCheck.reason);
      }

      // Parse body for POST/PUT
      let body = {};
      if (method === 'POST' || method === 'PUT') {
        try {
          body = await parseBody(req);
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      }

      // POST — create
      if (method === 'POST' && route.type === 'entity_list') {
        return handleEntityCreate(req, res, entity, body, user, role);
      }

      // PUT — update
      if (method === 'PUT' && route.type === 'entity_item') {
        // Contributor: check ownership before allowing update
        if (role === 'contributor') {
          const data = readEntity(entity);
          const existing = data.find(d => d.id === route.id);
          if (!existing) return sendError(res, 404, `Item '${route.id}' not found in '${entity}'`);
          const ownerCheck = checkAccess(role, method, entity, existing, user);
          if (!ownerCheck.allowed) return sendError(res, 403, ownerCheck.reason);
        }
        return handleEntityUpdate(req, res, entity, route.id, body, user, role);
      }

      // DELETE
      if (method === 'DELETE' && route.type === 'entity_item') {
        return handleEntityDelete(res, entity, route.id, user, role);
      }

      // Method not allowed for this route shape
      return sendError(res, 400, `${method} not supported on this endpoint`);
    }

    // ---- No route matched ----
    sendError(res, 404, `Endpoint not found: ${method} ${pathname}`);

  } catch (err) {
    console.error('[SERVER ERROR]', err);
    sendError(res, 500, 'Internal server error');
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

ensureDataDir();

server.listen(PORT, () => {
  console.log('');
  console.log('  Av/SocialOS v2.0.0');
  console.log('  ──────────────────────────────');
  console.log(`  Local:     http://localhost:${PORT}`);
  console.log(`  API:       http://localhost:${PORT}/api`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
  console.log(`  Formulas:  http://localhost:${PORT}/api/formulas`);
  console.log(`  Entities:  ${ENTITIES.length} data stores`);
  console.log('  ──────────────────────────────');
  console.log('');
});
