import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  PenLineIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  TrashIcon,
  WarningIcon,
} from '../../components/Icons';
import { deleteTask, listTasks } from '../../services/tasks';
import { matchRules, parseDate } from '../../utils/alertRules';
import TaskDrawer from './TaskDrawer';
import './Workspace.css';

// ---------- Tasks come from the database (GET /api/tasks?workspace_id=...) ----------

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);

const COLUMNS = [
  { status: 'To Do', tone: 'todo' },
  { status: 'In Progress', tone: 'progress' },
  { status: 'Review', tone: 'review' },
  { status: 'Done', tone: 'done' },
];

const PRIORITIES = ['High', 'Medium', 'Low'];

const DEADLINE_FILTERS = {
  all: { label: 'Deadline: All Dates', test: () => true },
  overdue: { label: 'Deadline: Overdue', test: (t) => t.deadline && t.status !== 'Done' && daysUntil(t.deadline) < 0 },
  week: { label: 'Deadline: Next 7 Days', test: (t) => t.deadline && daysUntil(t.deadline) >= 0 && daysUntil(t.deadline) <= 7 },
  later: { label: 'Deadline: Later', test: (t) => !t.deadline || daysUntil(t.deadline) > 7 },
};


// Shapes a task row from the API for the board. Subtasks aren't loaded yet, so progress is 0/0;
// updated_at is the last activity used by the inactivity alert.
const fromRow = (row) => ({
  task_id: row.task_id,
  title: row.title,
  notes: row.notes || '',
  deadline: parseDate(row.deadline),
  priority: row.priority,
  status: row.status,
  subtasks: { done: 0, total: 0 },
  last_activity: parseDate(row.updated_at || row.created_at) || today,
  row, // the original API row, used to fill the edit drawer
});


const daysUntil = (date) => Math.round((date - today) / DAY);
const formatDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const formatShort = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const progressOf = (task) => (task.subtasks.total ? Math.round((task.subtasks.done / task.subtasks.total) * 100) : 0);

// Early-alert rules (same rules as the Settings page). Returns null when the task is healthy.
function alertFor(task) {
  const [match] = matchRules(
    { status: task.status, priority: task.priority, deadline: task.deadline, lastActivity: task.last_activity },
    today
  );
  if (!match) return null;
  if (match.kind === 'overdue') return { kind: 'overdue', text: `Overdue by ${plural(match.days, 'day')}` };
  if (match.kind === 'due') {
    const when = match.days === 0 ? 'Due today' : match.days === 1 ? 'Due tomorrow' : `Due in ${match.days} days`;
    return { kind: 'due', text: `${when} (${formatShort(task.deadline)})` };
  }
  if (match.kind === 'inactive') return { kind: 'inactive', text: `Inactive for ${match.days} days • Stalled` };
  return { kind: 'priority', text: 'High priority • Not started' };
}

// ---------- Components ----------

function TaskCard({ task, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const done = task.status === 'Done';
  const alert = alertFor(task);
  const pct = progressOf(task);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(task);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  return (
    <article className={`ws-task ${done ? 'ws-task--done' : ''}`}>
      <div className="ws-task__top">
        <span className={`ws-priority ws-priority--${task.priority.toLowerCase()}`}>{task.priority}</span>
        <div className="ws-task__actions">
          {done && (
            <span className="ws-task__check" aria-label="Completed"><CheckIcon width={11} height={11} strokeWidth={3.5} /></span>
          )}
          <button type="button" className="ws-task__icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task">
            <PenLineIcon width={13} height={13} />
          </button>
          <button
            type="button"
            className="ws-task__icon-btn ws-task__icon-btn--danger"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <TrashIcon width={13} height={13} />
          </button>
        </div>
      </div>

      <h3 className="ws-task__title">{task.title}</h3>

      {alert && (
        <p className={`ws-badge ws-badge--${alert.kind}`} title={alert.text}>
          <span className="ws-badge__dot" />
          <span className="ws-badge__text">{alert.text}</span>
        </p>
      )}

      <div className="ws-subtasks">
        <div className="ws-subtasks__head">
          <span>Subtasks</span>
          <code>
            {task.subtasks.done}/{task.subtasks.total} ({pct}%)
          </code>
        </div>
        <div className={`ws-subtasks__bar ws-subtasks__bar--${done ? 'done' : alert?.kind || 'normal'}`}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="ws-task__footer">
        {done ? (
          <p className="ws-task__date ws-task__date--done">
            <CheckIcon width={11} height={11} strokeWidth={3} /> Completed {formatShort(task.last_activity)}
          </p>
        ) : (
          <p className={`ws-task__date ${alert?.kind === 'overdue' ? 'ws-task__date--overdue' : ''}`}>
            <CalendarIcon width={11} height={11} /> {task.deadline ? formatDate(task.deadline) : 'No deadline'}
            {alert?.kind === 'overdue' && ' (Overdue)'}
          </p>
        )}
        {task.notes && (
          <p className="ws-task__note" title={task.notes}>
            <FileTextIcon width={11} height={11} />
            <span>Task Note: {task.notes}</span>
          </p>
        )}
      </div>

      {confirming && (
        <div className="ws-task__confirm" role="alertdialog" aria-label="Confirm delete">
          <p>Delete this task?</p>
          {deleteError && <p className="ws-task__confirm-error">{deleteError}</p>}
          <div className="ws-task__confirm-actions">
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </button>
            <button type="button" className="ws-task__confirm-delete" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Workspace({ user, workspaces, workspace, onNavigate, onSignOut }) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [deadline, setDeadline] = useState('all');
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [dbTasks, setDbTasks] = useState([]);
  const [loadError, setLoadError] = useState('');
  // null while the drawer is closed; { task: null } to create, { task: row } to edit
  const [drawer, setDrawer] = useState(null);

  const workspaceId = workspace?.workspace_id;
  useEffect(() => {
    if (workspaceId === undefined) return undefined;
    let cancelled = false;
    setDbTasks([]);
    setLoadError('');
    listTasks(workspaceId)
      .then((rows) => !cancelled && setDbTasks(rows.map(fromRow)))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const tasks = dbTasks;

  // A new task was created: add it and close the drawer
  const handleTaskCreated = (row) => {
    setDbTasks((list) => [...list, fromRow(row)]);
    setDrawer(null);
  };

  // An edit was autosaved: replace the card with the row the API returned (drawer stays open)
  const handleTaskUpdated = (row) => {
    setDbTasks((list) => list.map((t) => (t.task_id === row.task_id ? fromRow(row) : t)));
  };

  // Throws on failure so the card can show the error
  const handleTaskDelete = async (task) => {
    await deleteTask(task.task_id);
    setDbTasks((list) => list.filter((t) => t.task_id !== task.task_id));
  };

  const totalDone = tasks.filter((t) => t.status === 'Done').length;
  const completion = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;
  const alerted = tasks.filter(alertFor);
  const overdueCount = alerted.filter((t) => alertFor(t).kind === 'overdue').length;
  const atRiskCount = alerted.length - overdueCount;

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        (!q || t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)) &&
        (priority === 'all' || t.priority === priority) &&
        DEADLINE_FILTERS[deadline].test(t) &&
        (!alertsOnly || alertFor(t))
    );
  }, [tasks, query, priority, deadline, alertsOnly]);

  const columns = COLUMNS.filter((c) => status === 'all' || c.status === status);

  const layoutProps = {
    user,
    workspaces,
    active: 'workspace',
    activeWorkspaceId: workspace?.workspace_id,
    onNavigate,
    onSignOut,
  };

  // Workspace list still loading, or the workspace no longer exists
  if (!workspace) {
    return (
      <AppLayout {...layoutProps}>
        <main className="dash-content ws-content">
          <p className="ws-empty">
            {workspaces ? 'This workspace could not be found.' : 'Loading workspace…'}{' '}
            {workspaces && (
              <button type="button" onClick={() => onNavigate('dashboard')}>
                Back to Dashboard
              </button>
            )}
          </p>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout {...layoutProps}>
      <main className="dash-content ws-content">
        {/* Soft background glows from the design */}
        <span className="ws-glow ws-glow--blue" aria-hidden="true" />
        <span className="ws-glow ws-glow--mint" aria-hidden="true" />

        {/* ---------- Breadcrumb & quick stats ---------- */}
        <div className="ws-topline">
          <p className="ws-breadcrumb">
            <span className="ws-breadcrumb__link">
              <FolderIcon width={13} height={13} /> Workspaces
            </span>
            <ChevronRightIcon width={10} height={10} strokeWidth={3} className="ws-breadcrumb__sep" />
            <span className="ws-breadcrumb__current">
              <span className="ws-breadcrumb__dot" /> {workspace.workspace_name}
            </span>
          </p>
          <div className="ws-pills">
            <span className="ws-pill">
              <RotateCcwIcon width={12} height={12} /> {plural(tasks.length, 'Task')} Total
            </span>
            <span className="ws-pill ws-pill--risk">
              <span className="ws-pill__dot" /> {atRiskCount} At Risk
            </span>
            <span className="ws-pill ws-pill--overdue">
              <span className="ws-pill__dot" /> {overdueCount} Overdue
            </span>
          </div>
        </div>

        {/* ---------- Title card ---------- */}
        <header className="ws-hero">
          <div className="ws-hero__text">
            <h1 className="ws-title">{workspace.workspace_name}</h1>
            {workspace.description && <p className="ws-description">{workspace.description}</p>}
            <p className="ws-benchmark">
              Progress: <strong>{completion}% completed</strong> ({totalDone}/{plural(tasks.length, 'task')})
              <span className="ws-benchmark__bar">
                <span style={{ width: `${completion}%` }} />
              </span>
            </p>
          </div>
          <div className="ws-hero__actions">
            <button type="button" className="ws-btn ws-btn--primary" onClick={() => setDrawer({ task: null })}>
              <PlusIcon width={12} height={12} strokeWidth={3} /> Add Task
            </button>
          </div>
        </header>

        {/* ---------- Toolbar ---------- */}
        <section className="ws-toolbar" aria-label="Board filters">
          <div className="ws-toolbar__row">
            <label className="ws-search">
              <SearchIcon width={14} height={14} />
              <input
                type="search"
                placeholder={`Search ${workspace.workspace_name} tasks or notes...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="ws-toolbar__row ws-toolbar__row--filters">
            <div className="ws-filters">
              <label className="ws-select">
                <span className="sr-only">Priority</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="all">Priority: All</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>Priority: {p}</option>
                  ))}
                </select>
                <ChevronDownIcon width={10} height={10} strokeWidth={3} />
              </label>
              <label className="ws-select">
                <span className="sr-only">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="all">Status: All Stages</option>
                  {COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>Status: {c.status}</option>
                  ))}
                </select>
                <ChevronDownIcon width={10} height={10} strokeWidth={3} />
              </label>
              <label className="ws-select">
                <span className="sr-only">Deadline</span>
                <select value={deadline} onChange={(e) => setDeadline(e.target.value)}>
                  {Object.entries(DEADLINE_FILTERS).map(([key, f]) => (
                    <option key={key} value={key}>{f.label}</option>
                  ))}
                </select>
                <ChevronDownIcon width={10} height={10} strokeWidth={3} />
              </label>
            </div>
            <button
              type="button"
              className={`ws-alert-toggle ${alertsOnly ? 'ws-alert-toggle--on' : ''}`}
              aria-pressed={alertsOnly}
              onClick={() => setAlertsOnly((v) => !v)}
            >
              <WarningIcon width={12} height={12} /> Show At-Risk / Alerted Only ({alerted.length})
              <span className="ws-alert-toggle__dot" />
            </button>
          </div>
        </section>

        {loadError && <p className="ws-load-error" role="alert">{loadError}</p>}

        {/* ---------- Kanban board ---------- */}
        <section className="ws-board" aria-label="Kanban board">
          {columns.map((col) => {
            const colTasks = visibleTasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className={`ws-column ws-column--${col.tone}`}>
                <div className="ws-column__head">
                  <h2 className="ws-column__title">
                    <span className="ws-column__dot" />
                    {col.status}
                    <span className="ws-column__count">{colTasks.length}</span>
                  </h2>
                </div>
                <div className="ws-column__cards">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      onEdit={(t) => setDrawer({ task: t.row })}
                      onDelete={handleTaskDelete}
                    />
                  ))}
                  {colTasks.length === 0 && <p className="ws-column__empty">No tasks</p>}
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {drawer && (
        <TaskDrawer
          workspace={workspace}
          task={drawer.task}
          onSaved={handleTaskCreated}
          onUpdated={handleTaskUpdated}
          onClose={() => setDrawer(null)}
        />
      )}
    </AppLayout>
  );
}

export default Workspace;
