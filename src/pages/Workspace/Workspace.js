import { useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  FileTextIcon,
  ListChecksIcon,
  MoreVerticalIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
  TargetIcon,
  TimerIcon,
  WarningIcon,
  ZapIcon,
} from '../../components/Icons';
import './Workspace.css';

// ---------- Hardcoded demo tasks (replace with GET /api/tasks?workspace_id=... later) ----------
// Fields follow the task table; `subtasks` is { done, total } until subtasks are loaded too.
// Deadlines are relative to today so the overdue / due-soon alerts always make sense.

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setHours(0, 0, 0, 0);
const daysFromNow = (n) => new Date(today.getTime() + n * DAY);

const DEMO_TASKS = [
  {
    task_id: 1,
    title: 'ER Diagram Normalization Exercise',
    notes: 'Normalize up to 3NF and justify each step.',
    deadline: daysFromNow(-1),
    priority: 'High',
    status: 'In Progress',
    subtasks: { done: 3, total: 5 },
  },
  {
    task_id: 2,
    title: 'Subnetting & Routing Table Lab Report',
    notes: 'Include packet tracer screenshots.',
    deadline: daysFromNow(2),
    priority: 'Medium',
    status: 'In Progress',
    subtasks: { done: 4, total: 6 },
  },
  {
    task_id: 3,
    title: 'Literature Synthesis Matrix Draft',
    notes: 'Matrix.docx shared with supervisor.',
    deadline: daysFromNow(10),
    priority: 'Medium',
    status: 'Review',
    subtasks: { done: 4, total: 5 },
  },
  {
    task_id: 4,
    title: 'Hypothesis Testing Problem Set',
    notes: '',
    deadline: daysFromNow(4),
    priority: 'Medium',
    status: 'To Do',
    subtasks: { done: 0, total: 4 },
  },
  {
    task_id: 5,
    title: 'Interactive Prototype User Testing Prep',
    notes: 'Recruit 5 participants.',
    deadline: daysFromNow(5),
    priority: 'High',
    status: 'To Do',
    subtasks: { done: 0, total: 3 },
  },
  {
    task_id: 6,
    title: 'Chapter 1 Literature Review',
    notes: 'Submitted for feedback.',
    deadline: daysFromNow(-3),
    priority: 'Low',
    status: 'Done',
    subtasks: { done: 6, total: 6 },
  },
];

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];

// Card color scheme per task status (taken from the design's card gradients)
const STATUS_STYLE = {
  'To Do': { tone: 'blue', Icon: ListChecksIcon },
  'In Progress': { tone: 'green', Icon: TimerIcon },
  Review: { tone: 'purple', Icon: EyeIcon },
  Done: { tone: 'done', Icon: CheckCircleIcon },
};

const SORTS = {
  deadline: { label: 'Sort by: Deadline', compare: (a, b) => a.deadline - b.deadline },
  progress: { label: 'Sort by: Progress', compare: (a, b) => progressOf(b) - progressOf(a) },
  title: { label: 'Sort by: Title', compare: (a, b) => a.title.localeCompare(b.title) },
};

const progressOf = (task) => (task.subtasks.total ? Math.round((task.subtasks.done / task.subtasks.total) * 100) : 0);
const daysUntil = (date) => Math.round((date - today) / DAY);
const formatDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Early-alert rules (same idea as the Settings page): overdue, due within 3 days, high priority not started
function alertFor(task) {
  if (task.status === 'Done') return null;
  const days = daysUntil(task.deadline);
  if (days < 0) return { kind: 'overdue', Icon: WarningIcon, title: 'Overdue Alert', text: `Past deadline by ${plural(-days, 'day')}` };
  if (days <= 3) {
    const when = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
    return { kind: 'due', Icon: ClockIcon, title: when, text: `Deadline ${formatDate(task.deadline)}` };
  }
  if (task.priority === 'High' && task.status === 'To Do') {
    return { kind: 'priority', Icon: ZapIcon, title: 'High Priority Not Started', text: 'Still in To Do' };
  }
  return null;
}

// ---------- Components ----------

function TaskCard({ task }) {
  const { tone, Icon } = STATUS_STYLE[task.status];
  const pct = progressOf(task);
  const alert = alertFor(task);
  const overdue = alert?.kind === 'overdue';

  return (
    <article className={`ws-card ws-card--${tone}`}>
      <div className="ws-card__body">
        <div className="ws-card__header">
          <span className="ws-card__icon"><Icon width={16} height={16} /></span>
          <div className="ws-card__titles">
            <p className="ws-card__meta">
              {task.status} • {task.priority} priority
            </p>
            <h2 className="ws-card__title">{task.title}</h2>
          </div>
          <button type="button" className="ws-card__menu" aria-label={`${task.title} options`}>
            <MoreVerticalIcon width={16} height={16} />
          </button>
        </div>

        <div className="ws-progress">
          <div className="ws-progress__head">
            <span>Subtask Progress</span>
            <span className="ws-progress__pct">
              {pct}% ({task.subtasks.done}/{task.subtasks.total})
            </span>
          </div>
          <div className="ws-progress__bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="ws-progress__metrics">
            <span>{task.subtasks.done} Completed</span>
            <span>{task.subtasks.total - task.subtasks.done} Remaining</span>
            <span className={overdue ? 'ws-text--danger' : undefined}>Due {formatDate(task.deadline)}</span>
          </div>
        </div>

        {alert && (
          <div className={`ws-alert ws-alert--${alert.kind}`}>
            <alert.Icon width={14} height={14} />
            <div>
              <p className="ws-alert__title">{alert.title}</p>
              <p className="ws-alert__text">{alert.text}</p>
            </div>
          </div>
        )}
      </div>

      <div className="ws-card__footer">
        <span className="ws-card__notes">
          <FileTextIcon width={12} height={12} /> {task.notes ? 'Notes in task' : 'No notes'}
        </span>
        <button type="button" className="ws-card__open">
          Open Task <ArrowRightIcon width={10} height={10} strokeWidth={3} />
        </button>
      </div>
    </article>
  );
}

function Workspace({ user, workspaces, workspace, onNavigate, onSignOut }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('deadline');
  const [query, setQuery] = useState('');

  const tasks = DEMO_TASKS;

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .sort(SORTS[sort].compare);
  }, [tasks, statusFilter, sort, query]);

  const activeCount = tasks.filter((t) => t.status !== 'Done').length;
  const avgCompletion = tasks.length ? Math.round(tasks.reduce((sum, t) => sum + progressOf(t), 0) / tasks.length) : 0;
  const flaggedCount = tasks.filter(alertFor).length;

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

        {/* ---------- Heading ---------- */}
        <header className="ws-header">
          <p className="ws-breadcrumb">
            <span>Academic Workspaces</span>
            <ChevronRightIcon width={10} height={10} strokeWidth={3} />
            <span className="ws-breadcrumb__current">Overview</span>
          </p>
          <div className="ws-header__row">
            <div className="ws-header__text">
              <h1 className="ws-title">{workspace.workspace_name}</h1>
              {workspace.description && <p className="ws-description">{workspace.description}</p>}
            </div>
            <div className="ws-stats">
              <span className="ws-stat">
                <span className="ws-stat__dot" /> {plural(activeCount, 'Active Task')}
              </span>
              <span className="ws-stat">
                <CheckCircleIcon width={12} height={12} className="ws-stat__icon--green" /> {plural(tasks.length, 'Total Task')}
              </span>
              <span className="ws-stat">
                <TargetIcon width={12} height={12} className="ws-stat__icon--blue" /> {avgCompletion}% Avg. Completion
              </span>
              <span className="ws-stat ws-stat--alert">
                <span className="ws-stat__dot" /> {plural(flaggedCount, 'Flagged Alert')}
              </span>
            </div>
          </div>
        </header>

        {/* ---------- Toolbar ---------- */}
        <div className="ws-toolbar">
          <div className="ws-toolbar__controls">
            <label className="ws-select">
              <span className="sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDownIcon width={12} height={12} />
            </label>
            <label className="ws-select ws-select--sort">
              <span className="sr-only">Sort tasks</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
              <SortIcon width={12} height={12} />
            </label>
            <label className="ws-search">
              <SearchIcon width={12} height={12} />
              <input
                type="search"
                placeholder="Filter tasks by title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="ws-create-btn">
            <PlusIcon width={14} height={14} strokeWidth={2.5} /> Create Task
          </button>
        </div>

        {/* ---------- Task grid ---------- */}
        <section className="ws-grid" aria-label="Tasks">
          {visibleTasks.map((task) => (
            <TaskCard key={task.task_id} task={task} />
          ))}

          {visibleTasks.length === 0 && <p className="ws-grid__empty">No tasks match your filters.</p>}

          <article className="ws-card ws-card--create">
            <span className="ws-card--create__plus"><PlusIcon width={28} height={28} /></span>
            <h2 className="ws-card--create__title">Create New Task</h2>
            <p className="ws-card--create__text">Add a new assignment, milestone, or deliverable to this workspace.</p>
            <button type="button" className="ws-card--create__btn">
              <PlusIcon width={12} height={12} strokeWidth={2.5} /> Create Task
            </button>
          </article>
        </section>
      </main>
    </AppLayout>
  );
}

export default Workspace;
