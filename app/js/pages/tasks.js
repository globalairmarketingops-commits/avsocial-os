/* =====================================================================
   AvSocialOS v2 — Tasks & Pipeline Page
   5-stage production pipeline: Draft → Casey Review → Approved →
   In Progress → Published. Full CRUD with stage transitions, blockers,
   SLA tracking, and linked post/brief chips.

   Location: 12_TECH_STACK_AND_AI > AvSocialOS > app > js > pages > tasks.js
   ===================================================================== */

const TasksPage = (() => {
  'use strict';

  let _container = null;
  let _tasks = [];
  let _posts = [];
  let _briefs = [];

  // ── Pipeline Stage Definitions ────────────────────────────────────

  const STAGES = SeedData.getPipelineStages();

  // ── Render ────────────────────────────────────────────────────────

  async function render(container) {
    _container = container;
    _container.innerHTML = Components.emptyState('&#9203;', 'Loading tasks...', '', null);

    try {
      const [tasksRes, postsRes, briefsRes] = await Promise.all([
        API.tasks.list(),
        API.posts.list(),
        API.briefs.list()
      ]);
      _tasks = tasksRes || [];
      _posts = postsRes || [];
      _briefs = briefsRes || [];
    } catch (err) {
      _container.innerHTML = Components.alertBanner(
        'Failed to load tasks: ' + (err.message || 'Unknown error'), 'error'
      );
      console.error('[TasksPage] Load error:', err);
      return;
    }

    _renderPage();
  }

  // ── Page Assembly ─────────────────────────────────────────────────

  function _renderPage() {
    const now = new Date();
    const totalTasks = _tasks.length;
    const t1Count = _tasks.filter(t => (t.tier || '').toUpperCase() === 'T1').length;
    const t2Count = _tasks.filter(t => (t.tier || '').toUpperCase() === 'T2').length;
    const activeCount = _tasks.filter(t =>
      t.stage === 'in_progress' || t.stage === 'in_review'
    ).length;
    const overdueCount = _tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now && t.stage !== 'published';
    }).length;

    // Prepare pipeline tasks with linked items
    const pipelineTasks = _tasks.map(t => _enrichTask(t));

    // Table column definitions
    const canEdit = Auth.can('update', 'tasks');
    const canDelete = Auth.can('delete', 'tasks');

    const tableColumns = [
      { key: 'tier', label: 'Tier', render: (v) => v ? Components.tierBadge(v) : '\u2014' },
      { key: 'title', label: 'Task', render: (v) => '<strong>' + _esc(v || '') + '</strong>' },
      { key: 'assignee', label: 'Owner', render: (v) => _renderAssignee(v) },
      { key: 'status', label: 'Status', render: (v) => Components.statusBadge(v || 'draft') },
      { key: 'due_date', label: 'Due', render: (v) => Components.formatDate(v) },
      {
        key: 'brief_id', label: 'Brief', render: (v) => {
          if (!v) return '\u2014';
          const brief = _briefs.find(b => b.id === v);
          const label = brief ? (brief.title || v) : v;
          return '<span class="linked-tag" title="' + _esc(label) + '">' + _esc(label) + '</span>';
        }
      },
      { key: 'tags', label: 'Tags', render: (v) => _renderTags(v) },
      {
        key: '_actions', label: 'Actions', render: (_, row) => {
          let html = '';
          if (canEdit) {
            html += '<button class="btn btn-sm btn-secondary" onclick="TasksPage._openEditModal(\'' + _esc(row.id) + '\')">Edit</button> ';
          }
          if (canDelete) {
            html += '<button class="btn btn-sm btn-secondary" style="color:var(--ga-red)" onclick="TasksPage._confirmDelete(\'' + _esc(row.id) + '\')">Delete</button>';
          }
          return html || '\u2014';
        }
      }
    ];

    _container.innerHTML =
      '<div class="domain-page">' +

      Components.sectionHeader(
        'Tasks & Pipeline',
        '5-stage production pipeline \u2014 GlobalAir.com Social Operations'
      ) +

      // Part A: KPI Row
      '<div>' +
        Components.partHeader('A', 'Task Overview') +
        '<div class="row-grid row-grid-5">' +
          Components.kpiTile('Total Tasks', totalTasks, { icon: '&#128203;' }) +
          Components.kpiTile('T1 Immediate', t1Count, {
            icon: '&#128308;', subtitle: 'Blocks scaling / at-risk'
          }) +
          Components.kpiTile('T2 This Sprint', t2Count, {
            icon: '&#128992;', subtitle: 'High impact this sprint'
          }) +
          Components.kpiTile('Active', activeCount, {
            icon: '&#9889;', subtitle: 'In Progress + In Review'
          }) +
          Components.kpiTile('Overdue', overdueCount, {
            icon: '&#9888;',
            subtitle: overdueCount > 0 ? 'Needs attention' : 'All on track'
          }) +
        '</div>' +
      '</div>' +

      // Part B: Pipeline Board
      '<div>' +
        Components.partHeader('B', 'Pipeline Board') +
        _renderPipelineBoard(pipelineTasks) +
      '</div>' +

      // Part C: All Tasks Table
      '<div>' +
        Components.partHeader('C', 'All Tasks') +
        '<div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">' +
          (Auth.can('create', 'tasks')
            ? '<button class="btn btn-primary" onclick="TasksPage._openCreateModal()">+ New Task</button>'
            : '') +
        '</div>' +
        Components.table(tableColumns, _tasks, {
          sortable: true,
          id: 'tasks-table',
          emptyMessage: 'No tasks found. Create one to get started.'
        }) +
      '</div>' +

      // Part D: Quick Links
      '<div>' +
        Components.partHeader('D', 'Quick Links') +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
          '<a href="https://app.sendible.com" target="_blank" rel="noopener" class="btn btn-secondary">Sendible &#8599;</a>' +
          '<a href="https://www.canva.com" target="_blank" rel="noopener" class="btn btn-secondary">Canva &#8599;</a>' +
        '</div>' +
      '</div>' +

      '</div>';
  }

  // ── Pipeline Board (with stage action buttons) ────────────────────

  function _renderPipelineBoard(tasks) {
    const stages = STAGES;
    let html = '<div class="pipeline-board">';

    stages.forEach(function (stage, stageIdx) {
      const stageTasks = tasks.filter(function (t) { return t.stage === stage.id; });

      html += '<div class="pipeline-column" data-stage="' + stage.id + '">' +
        '<div class="pipeline-column-header">' +
          '<span class="pipeline-column-title">' + _esc(stage.label) + '</span>' +
          '<span class="pipeline-column-count">' + stageTasks.length + '</span>' +
        '</div>' +
        '<div class="pipeline-column-body">';

      if (stageTasks.length === 0) {
        html += '<div class="pipeline-empty">No tasks</div>';
      } else {
        stageTasks.forEach(function (t) {
          html += Components.pipelineItemV2(t, {
            showSla: true, showBlocker: true, showLinked: true
          });

          // Stage transition and blocker buttons
          html += '<div style="display:flex;gap:4px;padding:4px 8px 8px;flex-wrap:wrap;">';

          if (stageIdx > 0) {
            html += '<button class="btn btn-sm btn-secondary" ' +
              'onclick="TasksPage._moveStage(\'' + _esc(t.id) + '\',\'back\')" ' +
              'title="Move to ' + stages[stageIdx - 1].label + '">&larr; Back</button>';
          }

          if (stageIdx < stages.length - 1) {
            var nextStage = stages[stageIdx + 1];
            var needsApproval = nextStage.id === 'approved';
            var canApprove = Auth.can('approve', 'tasks');

            if (needsApproval && !canApprove) {
              html += '<button class="btn btn-sm btn-secondary" disabled ' +
                'title="Only full_access can approve">Next (locked) &#128274;</button>';
            } else {
              html += '<button class="btn btn-sm btn-primary" ' +
                'onclick="TasksPage._moveStage(\'' + _esc(t.id) + '\',\'next\')" ' +
                'title="Move to ' + nextStage.label + '">Next &rarr;</button>';
            }
          }

          // Blocker toggle
          if (t.blocker || t.blocker_reason) {
            html += '<button class="btn btn-sm btn-secondary" style="color:var(--ga-green)" ' +
              'onclick="TasksPage._unblock(\'' + _esc(t.id) + '\')" ' +
              'title="Remove blocker">Unblock</button>';
          } else {
            html += '<button class="btn btn-sm btn-secondary" style="color:var(--ga-red)" ' +
              'onclick="TasksPage._block(\'' + _esc(t.id) + '\')" ' +
              'title="Mark as blocked">Block</button>';
          }

          html += '</div>';
        });
      }

      html += '</div></div>';
    });

    html += '</div>';
    return html;
  }

  // ── Enrichment ────────────────────────────────────────────────────

  function _enrichTask(task) {
    var enriched = Object.assign({}, task);

    // Build linked items array for pipelineItemV2
    var linked = [];
    if (task.brief_id) {
      var brief = _briefs.find(function (b) { return b.id === task.brief_id; });
      linked.push({
        type: 'brief',
        label: brief ? (brief.title || task.brief_id) : task.brief_id
      });
    }
    // Linked posts that reference this task
    var linkedPosts = _posts.filter(function (p) { return p.task_id === task.id; });
    linkedPosts.forEach(function (p) {
      linked.push({ type: 'post', label: p.title || p.id });
    });
    enriched.linked = linked;

    // SLA due fallback
    if (!enriched.sla_due && enriched.due_date) {
      enriched.sla_due = enriched.due_date;
    }

    // Blocker field mapping
    if (enriched.blocker_reason && !enriched.blocker) {
      enriched.blocker = enriched.blocker_reason;
    }

    return enriched;
  }

  // ── Render Helpers ────────────────────────────────────────────────

  function _renderAssignee(userId) {
    if (!userId) return '<span style="color:var(--ga-muted)">Unassigned</span>';
    var team = SeedData.getTeam();
    var member = team.find(function (m) { return m.id === userId; });
    if (!member) return _esc(userId);
    return '<span style="display:inline-flex;align-items:center;gap:4px;">' +
      '<span class="avatar" style="width:22px;height:22px;font-size:9px;background:' +
        member.color + '">' + member.initials + '</span>' +
      _esc(member.name) +
    '</span>';
  }

  function _renderTags(tags) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) return '\u2014';
    return tags.map(function (t) { return Components.badge(t, 'blue'); }).join(' ');
  }

  // ── Create Task ───────────────────────────────────────────────────

  function _openCreateModal() {
    var team = SeedData.getTeam();
    var teamOptions = team.map(function (m) { return { value: m.id, label: m.name }; });
    var tierOptions = [
      { value: 'T1', label: 'T1 \u2014 Immediate' },
      { value: 'T2', label: 'T2 \u2014 This Sprint' },
      { value: 'T3', label: 'T3 \u2014 Next Sprint' },
      { value: 'T4', label: 'T4 \u2014 Backlog' }
    ];
    var briefOptions = _briefs.map(function (b) {
      return { value: b.id, label: b.title || b.id };
    });

    var formHtml =
      '<form id="task-create-form" onsubmit="TasksPage._submitCreate(event)">' +
        Components.formGroup('Title',
          Components.formInput('title', '', { placeholder: 'Task title', required: true }),
          { required: true }
        ) +
        Components.formRow(
          Components.formGroup('Assignee',
            Components.formSelect('assignee', teamOptions, '', { placeholder: 'Select team member' })
          ),
          Components.formGroup('Tier',
            Components.formSelect('tier', tierOptions, 'T2', { placeholder: 'Select tier', required: true }),
            { required: true }
          )
        ) +
        Components.formRow(
          Components.formGroup('Due Date',
            Components.formInput('due_date', '', { type: 'date' })
          ),
          Components.formGroup('Brief',
            Components.formSelect('brief_id', briefOptions, '', { placeholder: 'Link to brief (optional)' })
          )
        ) +
        Components.formGroup('Tags',
          Components.formInput('tags', '', { placeholder: 'Comma-separated tags (e.g., ppc, urgent, listing)' }),
          { helpText: 'Separate multiple tags with commas' }
        ) +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
          '<button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Create Task</button>' +
        '</div>' +
      '</form>';

    Components.showModal('Create Task', formHtml);
  }

  async function _submitCreate(e) {
    e.preventDefault();
    var form = e.target;
    var title = form.querySelector('[name="title"]').value.trim();
    if (!title) {
      Components.showToast('Title is required', 'error');
      return;
    }

    var tagsRaw = form.querySelector('[name="tags"]').value.trim();
    var tags = tagsRaw
      ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];

    var data = {
      title: title,
      assignee: form.querySelector('[name="assignee"]').value || null,
      tier: form.querySelector('[name="tier"]').value || 'T2',
      due_date: form.querySelector('[name="due_date"]').value || null,
      brief_id: form.querySelector('[name="brief_id"]').value || null,
      tags: tags,
      status: 'draft',
      stage: 'draft',
      stage_entered_at: new Date().toISOString(),
      created_by: Auth.getUser(),
      created_at: new Date().toISOString()
    };

    try {
      await API.tasks.create(data);
      Events.log(Events.EVENTS.TASK_CREATED, {
        title: data.title, tier: data.tier, assignee: data.assignee
      });
      Components.closeModal();
      Components.showToast('Task created', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to create task: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Edit Task ─────────────────────────────────────────────────────

  function _openEditModal(taskId) {
    var task = _tasks.find(function (t) { return t.id === taskId; });
    if (!task) {
      Components.showToast('Task not found', 'error');
      return;
    }

    var team = SeedData.getTeam();
    var teamOptions = team.map(function (m) { return { value: m.id, label: m.name }; });
    var tierOptions = [
      { value: 'T1', label: 'T1 \u2014 Immediate' },
      { value: 'T2', label: 'T2 \u2014 This Sprint' },
      { value: 'T3', label: 'T3 \u2014 Next Sprint' },
      { value: 'T4', label: 'T4 \u2014 Backlog' }
    ];
    var briefOptions = _briefs.map(function (b) {
      return { value: b.id, label: b.title || b.id };
    });
    var stageOptions = STAGES.map(function (s) {
      return { value: s.id, label: s.label };
    });
    var tagsStr = Array.isArray(task.tags) ? task.tags.join(', ') : (task.tags || '');

    var formHtml =
      '<form id="task-edit-form" onsubmit="TasksPage._submitEdit(event, \'' + _esc(taskId) + '\')">' +
        Components.formGroup('Title',
          Components.formInput('title', task.title || '', { placeholder: 'Task title', required: true }),
          { required: true }
        ) +
        Components.formRow(
          Components.formGroup('Assignee',
            Components.formSelect('assignee', teamOptions, task.assignee || '', { placeholder: 'Select team member' })
          ),
          Components.formGroup('Tier',
            Components.formSelect('tier', tierOptions, task.tier || 'T2', { placeholder: 'Select tier', required: true }),
            { required: true }
          )
        ) +
        Components.formRow(
          Components.formGroup('Due Date',
            Components.formInput('due_date', task.due_date || '', { type: 'date' })
          ),
          Components.formGroup('Stage',
            Components.formSelect('stage', stageOptions, task.stage || 'draft')
          )
        ) +
        Components.formGroup('Brief',
          Components.formSelect('brief_id', briefOptions, task.brief_id || '', { placeholder: 'Link to brief (optional)' })
        ) +
        Components.formGroup('Tags',
          Components.formInput('tags', tagsStr, { placeholder: 'Comma-separated tags' }),
          { helpText: 'Separate multiple tags with commas' }
        ) +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
          '<button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">Save Changes</button>' +
        '</div>' +
      '</form>';

    Components.showModal('Edit Task', formHtml);
  }

  async function _submitEdit(e, taskId) {
    e.preventDefault();
    var form = e.target;
    var title = form.querySelector('[name="title"]').value.trim();
    if (!title) {
      Components.showToast('Title is required', 'error');
      return;
    }

    var tagsRaw = form.querySelector('[name="tags"]').value.trim();
    var tags = tagsRaw
      ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];

    var oldTask = _tasks.find(function (t) { return t.id === taskId; });
    var newStage = form.querySelector('[name="stage"]').value || 'draft';
    var stageChanged = oldTask && oldTask.stage !== newStage;

    // Approval gate
    if (stageChanged && newStage === 'approved' && !Auth.can('approve', 'tasks')) {
      Components.showToast('Only full_access users can move tasks to Approved', 'error');
      return;
    }

    var data = {
      title: title,
      assignee: form.querySelector('[name="assignee"]').value || null,
      tier: form.querySelector('[name="tier"]').value || 'T2',
      due_date: form.querySelector('[name="due_date"]').value || null,
      brief_id: form.querySelector('[name="brief_id"]').value || null,
      stage: newStage,
      status: newStage,
      tags: tags,
      updated_at: new Date().toISOString()
    };

    if (stageChanged) {
      data.stage_entered_at = new Date().toISOString();
    }

    try {
      await API.tasks.update(taskId, data);
      Events.log(Events.EVENTS.TASK_UPDATED, {
        task_id: taskId, title: data.title, stage: data.stage
      });
      if (stageChanged) {
        Events.log(Events.EVENTS.TASK_STAGE_CHANGED, {
          task_id: taskId, from: oldTask.stage, to: newStage
        });
      }
      Components.closeModal();
      Components.showToast('Task updated', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to update task: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Delete Task ───────────────────────────────────────────────────

  function _confirmDelete(taskId) {
    var task = _tasks.find(function (t) { return t.id === taskId; });
    var title = task ? task.title : taskId;
    Components.confirmDialog(
      'Delete Task',
      'Are you sure you want to delete "' + title + '"? This cannot be undone.',
      async function () {
        try {
          await API.tasks.delete(taskId);
          Events.log(Events.EVENTS.TASK_DELETED, { task_id: taskId });
          Components.showToast('Task deleted', 'success');
          await render(_container);
        } catch (err) {
          Components.showToast(
            'Failed to delete task: ' + (err.message || 'Unknown error'), 'error'
          );
        }
      }
    );
  }

  // ── Stage Transitions ─────────────────────────────────────────────

  async function _moveStage(taskId, direction) {
    var task = _tasks.find(function (t) { return t.id === taskId; });
    if (!task) {
      Components.showToast('Task not found', 'error');
      return;
    }

    var stageIds = STAGES.map(function (s) { return s.id; });
    var currentIdx = stageIds.indexOf(task.stage);
    if (currentIdx < 0) {
      Components.showToast('Unknown current stage', 'error');
      return;
    }

    var newIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= stageIds.length) {
      Components.showToast('Cannot move further in that direction', 'error');
      return;
    }

    var newStage = stageIds[newIdx];

    // Approval gate
    if (newStage === 'approved' && !Auth.can('approve', 'tasks')) {
      Components.showToast('Only full_access users can approve tasks', 'error');
      return;
    }

    try {
      await API.tasks.update(taskId, {
        stage: newStage,
        status: newStage,
        stage_entered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      Events.log(Events.EVENTS.TASK_STAGE_CHANGED, {
        task_id: taskId,
        from: task.stage,
        to: newStage,
        moved_by: Auth.getUser()
      });
      Components.showToast('Moved to ' + STAGES[newIdx].label, 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Stage change failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  // ── Blocker Management ────────────────────────────────────────────

  async function _block(taskId) {
    var reason = prompt('Blocker reason:');
    if (!reason || !reason.trim()) return;

    try {
      await API.tasks.update(taskId, {
        blocker_reason: reason.trim(),
        blocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      Events.log(Events.EVENTS.TASK_BLOCKED, {
        task_id: taskId, reason: reason.trim(), blocked_by: Auth.getUser()
      });
      Components.showToast('Task marked as blocked', 'error');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to block task: ' + (err.message || 'Unknown error'), 'error');
    }
  }

  async function _unblock(taskId) {
    try {
      await API.tasks.update(taskId, {
        blocker_reason: null,
        blocker_resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      Events.log(Events.EVENTS.TASK_UNBLOCKED, {
        task_id: taskId, unblocked_by: Auth.getUser()
      });
      Components.showToast('Blocker removed', 'success');
      await render(_container);
    } catch (err) {
      Components.showToast('Failed to unblock task: ' + (err.message || 'Unknown error'), 'error');
    }
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
    // Exposed for onclick handlers in generated HTML
    _openCreateModal: _openCreateModal,
    _submitCreate: _submitCreate,
    _openEditModal: _openEditModal,
    _submitEdit: _submitEdit,
    _confirmDelete: _confirmDelete,
    _moveStage: _moveStage,
    _block: _block,
    _unblock: _unblock
  };
})();
