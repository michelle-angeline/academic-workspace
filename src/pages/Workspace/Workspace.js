import { useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  GripVerticalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersIcon,
  WarningIcon,
} from '../../components/Icons';
import './Workspace.css';

// ---------- Hardcoded demo tasks (replace with GET /api/tasks?workspace_id=... later) ----------
// Fields follow the task table (title, notes, deadline, priority, status). `subtasks` is { done, total }
// until subtasks are loaded, and `last_activity` is a demo-only field for the inactivity alert.
// Dates are relative to today so the overdue / due-soon / inactive alerts always make sense.

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);
const daysFromNow = (n) => new Date(today.getTime() + n * DAY);

const DEMO_TASKS = [
  { task_id: 1, title: 'System Integration Testing Plan', notes: 'Integration test matrix', deadline: daysFromNow(10), priority: 'High', status: 'To Do', subtasks: { done: 0, total: 4 }, last_activity: daysFromNow(-2) },
  { task_id: 2, title: 'Survey Instrument IRB Consent Form', notes: 'Participant consent template', deadline: daysFromNow(17), priority: 'Low', status: 'To Do', subtasks: { done: 1, total: 2 }, last_activity: daysFromNow(-1) },
  { task_id: 3, title: 'Literature Synthesis Matrix Draft', notes: '14 papers synthesized so far', deadline: daysFromNow(12), priority: 'High', status: 'In Progress', subtasks: { done: 3, total: 7 }, last_activity: daysFromNow(-8) },
  { task_id: 4, title: 'Backend REST API Endpoints Implementation', notes: 'CRUD routes for tasks', deadline: daysFromNow(2), priority: 'Medium', status: 'In Progress', subtasks: { done: 4, total: 6 }, last_activity: daysFromNow(-1) },
  { task_id: 5, title: 'User Authentication Flow & Session Management', notes: 'Refresh token rotation', deadline: daysFromNow(6), priority: 'Medium', status: 'In Progress', subtasks: { done: 5, total: 6 }, last_activity: daysFromNow(0) },
  { task_id: 6, title: 'Chapter 2 Theoretical Framework & Architecture Draft', notes: 'Advisor requested revisions', deadline: daysFromNow(-1), priority: 'High', status: 'Review', subtasks: { done: 4, total: 4 }, last_activity: daysFromNow(-2) },
  { task_id: 7, title: 'Database Schema Normalization Benchmark', notes: '3NF vs BCNF comparison', deadline: daysFromNow(5), priority: 'Low', status: 'Review', subtasks: { done: 3, total: 3 }, last_activity: daysFromNow(-1) },
  { task_id: 8, title: 'Project Charter & Research Proposal Defense', notes: 'Approved by committee', deadline: daysFromNow(-30), priority: 'High', status: 'Done', subtasks: { done: 5, total: 5 }, last_activity: daysFromNow(-30) },
  { task_id: 9, title: 'Requirements Elicitation & Student Survey (N=30)', notes: 'Survey responses coded', deadline: daysFromNow(-25), priority: 'Medium', status: 'Done', subtasks: { done: 3, total: 3 }, last_activity: daysFromNow(-25) },
  { task_id: 10, title: 'System Architecture & ER Diagram Draft', notes: 'Entity relationships finalized', deadline: daysFromNow(-21), priority: 'Medium', status: 'Done', subtasks: { done: 4, total: 4 }, last_activity: daysFromNow(-21) },
];

const COLUMNS = [
  { status: 'To Do', tone: 'todo' },
  { status: 'In Progress', tone: 'progress' },
  { status: 'Review', tone: 'review' },
  { status: 'Done', tone: 'done' },
];

const PRIORITIES = ['High', 'Medium', 'Low'];

const DEADLINE_FILTERS = {
  all: { label: 'Deadline: All Dates', test: () => true },
  overdue: { label: 'Deadline: Overdue', test: (t) => t.status !== 'Done' && daysUntil(t.deadline) < 0 },
  week: { label: 'Deadline: Next 7 Days', test: (t) => daysUntil(t.deadline) >= 0 && daysUntil(t.deadline) <= 7 },
  later: { label: 'Deadline: Later', test: (t) => daysUntil(t.deadline) > 7 },
};

const INACTIVE_DAYS = 7;
const DUE_SOON_DAYS = 3;

const daysUntil = (date) => Math.round((date - today) / DAY);
const formatDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const formatShort = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const progressOf = (task) => (task.subtasks.total ? Math.round((task.subtasks.done / task.subtasks.total) * 100) : 0);

// Early-alert rules (same rules as the Settings page). Returns null when the task is healthy.
function alertFor(task) {
  if (task.status === 'Done') return null;
  const days = daysUntil(task.deadline);
  if (days < 0) return { kind: 'overdue', text: `Overdue by ${plural(-days, 'day')}` };
  if (days <= DUE_SOON_DAYS) {
    const when = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    return { kind: 'due', text: `${when} (${formatShort(task.deadline)})` };
  }
  const idle = -daysUntil(task.last_activity);
  if ((task.status === 'In Progress' || task.status === 'Review') && idle >= INACTIVE_DAYS) {
    return { kind: 'inactive', text: `Inactive for ${idle} days • Stalled` };
  }
  if (task.priority === 'High' && task.status === 'To Do') return { kind: 'priority', text: 'High priority • Not started' };
  return null;
}

// ---------- Components ----------

function TaskCard({ task }) {
  const done = task.status === 'Done';
  const alert = alertFor(task);
  const pct = progressOf(task);

  return (
    <article className={`ws-task ${done ? 'ws-task--done' : ''}`}>
      <div className="ws-task__top">
        <span className={`ws-priority ws-priority--${task.priority.toLowerCase()}`}>{task.priority}</span>
        {done ? (
          <span className="ws-task__check" aria-label="Completed"><CheckIcon width={11} height={11} strokeWidth={3.5} /></span>
        ) : (
          <GripVerticalIcon width={12} height={12} className="ws-task__grip" aria-hidden="true" />
        )}
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
            <CheckIcon width={11} height={11} strokeWidth={3} /> Completed {formatShort(task.deadline)}
          </p>
        ) : (
          <p className={`ws-task__date ${alert?.kind === 'overdue' ? 'ws-task__date--overdue' : ''}`}>
            <CalendarIcon width={11} height={11} /> {formatDate(task.deadline)}
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
    </article>
  );
}

function Workspace({ user, workspaces, workspace, onNavigate, onSignOut }) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [deadline, setDeadline] = useState('all');
  const [alertsOnly, setAlertsOnly] = useState(false);

  const tasks = DEMO_TASKS;

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
            <button type="button" className="ws-btn ws-btn--primary">
              <PlusIcon width={12} height={12} strokeWidth={3} /> Add Task
            </button>
            <button type="button" className="ws-btn ws-btn--soft">
              <SlidersIcon width={12} height={12} /> Filter &amp; Views
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
                  <button type="button" className="ws-column__add" aria-label={`Add task to ${col.status}`}>
                    <PlusIcon width={12} height={12} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="ws-column__cards">
                  {colTasks.map((task) => (
                    <TaskCard key={task.task_id} task={task} />
                  ))}
                  {colTasks.length === 0 && <p className="ws-column__empty">No tasks</p>}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </AppLayout>
  );
}

export default Workspace;
