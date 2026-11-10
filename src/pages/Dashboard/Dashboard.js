import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  FolderIcon,
  ListChecksIcon,
  PenLineIcon,
  ShieldAlertIcon,
  SlidersIcon,
  SproutIcon,
  TargetIcon,
  TimerIcon,
  TrendingUpIcon,
  WarningIcon,
  ZapIcon,
} from '../../components/Icons';
import AppLayout from '../../components/AppLayout/AppLayout';
import { listReflections } from '../../services/reflections';
import { listTasks } from '../../services/tasks';
import { DAY, daysUntil, matchRules, parseDate, startOfToday } from '../../utils/alertRules';
import './Dashboard.css';

// Everything on this page comes from the database: the user's workspaces, their tasks and reflections.

// Workspace colors, assigned by position in the sidebar list
const PALETTE = ['#00658d', '#0b7a55', '#7c4ddb', '#38b6f0', '#b3a4f3', '#d97706', '#be185d'];

const STATUS_COLORS = [
  { status: 'To Do', label: 'To Do', color: '#38b6f0' },
  { status: 'In Progress', label: 'In Progress', color: '#00658d' },
  { status: 'Review', label: 'In Review', color: '#b3a4f3' },
  { status: 'Done', label: 'Completed', color: '#5ee0a8' },
];

const ALERT_TAGS = {
  overdue: { Icon: ClockIcon, text: (d) => `OVERDUE - Past deadline by ${plural(d, 'day')}` },
  due: { Icon: TimerIcon, text: (d) => (d === 0 ? 'DUE TODAY' : d === 1 ? 'DUE TOMORROW' : `DUE IN ${d} DAYS`) + ' - Approaching deadline' },
  inactive: { Icon: ShieldAlertIcon, text: (d) => `INACTIVE - No activity for ${plural(d, 'day')}` },
  priority: { Icon: ZapIcon, text: () => 'HIGH PRIORITY - Task not started' },
};

const MAX_ALERTS = 5;
const DEADLINE_WINDOW_DAYS = 14;
const MAX_DEADLINES = 6;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const percent = (part, total) => (total ? Math.round((part / total) * 100) : 0);
const statusClass = (status) => `dash-status dash-status--${status.toLowerCase().replace(/\s+/g, '-')}`;
const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function relativeDay(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// ---------- Component ----------

function Dashboard({ user, workspaces, onNavigate, onSignOut }) {
  const [scope, setScope] = useState('all'); // 'all' or a workspace_id
  const [taskEntries, setTaskEntries] = useState(null); // null while loading
  const [reflections, setReflections] = useState(null);
  const [loadError, setLoadError] = useState('');

  const fullName = user?.name?.trim() || 'Student';
  const firstName = fullName.split(/\s+/)[0];
  const today = useMemo(startOfToday, []);
  const weekStart = useMemo(() => mondayOf(today), [today]);

  // Tasks of every workspace
  useEffect(() => {
    if (!workspaces) return undefined;
    let cancelled = false;
    Promise.all(
      workspaces.map((w) => listTasks(w.workspace_id).then((rows) => rows.map((row) => ({ row, workspace: w }))))
    )
      .then((lists) => !cancelled && setTaskEntries(lists.flat()))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [workspaces]);

  // Reflections, for the weekly reflection card
  useEffect(() => {
    let cancelled = false;
    listReflections(user.user_id)
      .then((rows) => !cancelled && setReflections(rows))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Shape each task once
  const allTasks = useMemo(
    () =>
      (taskEntries || []).map(({ row, workspace }) => {
        const task = {
          id: row.task_id,
          title: row.title,
          notes: row.notes,
          status: row.status,
          priority: row.priority,
          deadline: parseDate(row.deadline),
          lastActivity: parseDate(row.updated_at || row.created_at),
          workspace,
        };
        return { ...task, rules: matchRules(task, today) };
      }),
    [taskEntries, today]
  );

  const colorOf = (workspaceId) => {
    const index = (workspaces || []).findIndex((w) => w.workspace_id === workspaceId);
    return PALETTE[(index < 0 ? 0 : index) % PALETTE.length];
  };

  const tasks = scope === 'all' ? allTasks : allTasks.filter((t) => t.workspace.workspace_id === scope);
  const loaded = Boolean(taskEntries);
  const scopedWorkspaces = scope === 'all' ? workspaces || [] : (workspaces || []).filter((w) => w.workspace_id === scope);

  // ----- Stats -----
  const active = tasks.filter((t) => t.status !== 'Done');
  const done = tasks.filter((t) => t.status === 'Done');
  // A Done task counts for the week it was last updated in (when it was marked Done)
  const completedThisWeek = done.filter((t) => t.lastActivity >= weekStart).length;
  const lastWeekStart = new Date(weekStart.getTime() - 7 * DAY);
  const completedLastWeek = done.filter((t) => t.lastActivity >= lastWeekStart && t.lastActivity < weekStart).length;
  const weekDelta = completedThisWeek - completedLastWeek;

  const alerts = tasks.flatMap((t) => t.rules.map((r) => ({ ...r, task: t })));
  const dueSoon = alerts.filter((a) => a.kind === 'due').length;
  const overdue = alerts.filter((a) => a.kind === 'overdue').length;
  const attentionTasks = tasks.filter((t) => t.rules.length > 0).length;

  // ----- Progress -----
  const completionPct = percent(done.length, tasks.length);
  const workspaceProgress = scopedWorkspaces.map((w) => {
    const own = allTasks.filter((t) => t.workspace.workspace_id === w.workspace_id);
    const ownDone = own.filter((t) => t.status === 'Done').length;
    return { workspace: w, done: ownDone, total: own.length, pct: percent(ownDone, own.length) };
  });

  // ----- Distribution -----
  const distribution = STATUS_COLORS.map((s) => ({ ...s, count: tasks.filter((t) => t.status === s.status).length }));

  // ----- Upcoming deadlines (not Done, within the next 14 days) -----
  const upcoming = tasks
    .filter((t) => t.status !== 'Done' && t.deadline)
    .map((t) => ({ task: t, days: daysUntil(t.deadline, today) }))
    .filter((d) => d.days >= 0 && d.days <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.task.deadline - b.task.deadline);

  // ----- Reflection -----
  const weekStartISO = toISODate(weekStart);
  const reflectionSubmitted = reflections?.some((r) => String(r.week_start).slice(0, 10) === weekStartISO);

  const openWorkspace = (workspaceId) => onNavigate('workspace', workspaceId);
  const value = (n) => (loaded ? n : '–');

  let summary;
  if (!loaded) summary = 'Checking your tasks…';
  else if (!workspaces?.length) summary = 'Create your first workspace to start tracking tasks.';
  else if (!tasks.length) summary = 'No tasks yet. Add tasks inside a workspace to see them here.';
  else if (!attentionTasks) summary = 'All caught up — no tasks need prompt attention right now.';

  return (
    <AppLayout user={user} workspaces={workspaces} active="dashboard" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content">
        {/* ---------- Greeting ---------- */}
        <section className="dash-hero">
          <p className="dash-hero__eyebrow">
            <span className="dash-hero__week">
              <CalendarIcon width={13} height={13} />
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </p>
          <h1 className="dash-hero__title">
            Hello, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="dash-hero__summary">
            <span className="dash-dot dash-dot--live" />
            {summary || (
              <>
                You have <strong>{plural(attentionTasks, 'task')}</strong> that need prompt attention.{' '}
                {plural(dueSoon, 'deliverable')} due within 72 hours.
              </>
            )}
          </p>

          {loadError && <p className="dash-load-error" role="alert">{loadError}</p>}

          {workspaces?.length > 0 && (
            <div className="dash-filters">
              <span className="dash-filters__label">Filter scope:</span>
              <button
                type="button"
                className={`dash-filter ${scope === 'all' ? 'dash-filter--active' : ''}`}
                onClick={() => setScope('all')}
              >
                All Workspaces ({workspaces.length})
              </button>
              {workspaces.map((w) => (
                <button
                  key={w.workspace_id}
                  type="button"
                  className={`dash-filter ${scope === w.workspace_id ? 'dash-filter--active' : ''}`}
                  onClick={() => setScope(w.workspace_id)}
                >
                  <span className="dash-dot" style={{ background: colorOf(w.workspace_id) }} />
                  {w.workspace_name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---------- Stat cards ---------- */}
        <section className="dash-stats">
          <article className="dash-stat dash-stat--blue">
            <header>
              <span>Total Active Tasks</span>
              <span className="dash-stat__icon"><ListChecksIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">{value(active.length)}<small>tasks</small></p>
            <p className="dash-stat__foot">
              <FolderIcon width={14} height={14} /> across {plural(scopedWorkspaces.length, 'workspace')}
            </p>
          </article>

          <article className="dash-stat dash-stat--green">
            <header>
              <span>Completed This Week</span>
              <span className="dash-stat__icon"><CheckCircleIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">{value(completedThisWeek)}<small>closed</small></p>
            {loaded && (
              <p className="dash-pill dash-pill--green">
                <TrendingUpIcon width={12} height={12} /> {weekDelta >= 0 ? '+' : ''}
                {weekDelta} vs previous week
              </p>
            )}
          </article>

          <article className="dash-stat dash-stat--sky">
            <header>
              <span>Due in 3 Days</span>
              <span className="dash-stat__icon"><ClockIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">{value(dueSoon)}<small>deliverables</small></p>
            {loaded && dueSoon > 0 && <p className="dash-pill dash-pill--blue">! High attention required</p>}
          </article>

          <article className="dash-stat dash-stat--red">
            <header>
              <span>Overdue</span>
              <span className="dash-stat__icon"><WarningIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">{value(overdue)}<small>pending</small></p>
            {loaded && overdue > 0 && (
              <p className="dash-pill dash-pill--red">
                <span className="dash-dot" /> Needs immediate resolution
              </p>
            )}
          </article>
        </section>

        {/* ---------- Progress ---------- */}
        <section className="dash-card dash-milestone">
          <div className="dash-milestone__head">
            <div>
              <h2 className="dash-card__title">
                <TargetIcon width={18} height={18} /> Task Completion Progress
              </h2>
              <p className="dash-card__subtitle">
                {loaded
                  ? `${done.length} of ${plural(tasks.length, 'task')} completed ${scope === 'all' ? 'across your workspaces' : 'in this workspace'}`
                  : 'Loading…'}
              </p>
            </div>
            <div className="dash-milestone__score">
              <span>
                <strong>{loaded ? `${completionPct}%` : '–'}</strong>
                <small>{done.length} / {tasks.length} finished</small>
              </span>
              <span className="dash-ring" style={{ '--pct': completionPct }} role="img" aria-label={`${completionPct}% complete`}>
                <TrendingUpIcon width={14} height={14} />
              </span>
            </div>
          </div>

          <div className="dash-bar dash-bar--large">
            <span className="dash-bar__fill dash-bar__fill--gradient" style={{ width: `${completionPct}%` }} />
          </div>

          {workspaceProgress.length > 0 ? (
            <div className="dash-courses">
              {workspaceProgress.map(({ workspace: w, done: wDone, total, pct }) => (
                <button key={w.workspace_id} type="button" className="dash-course" onClick={() => openWorkspace(w.workspace_id)}>
                  <div className="dash-course__head">
                    <span>{w.workspace_name}</span>
                    <span className="dash-course__pct" style={{ color: colorOf(w.workspace_id) }}>{pct}%</span>
                  </div>
                  <div className="dash-bar">
                    <span className="dash-bar__fill" style={{ width: `${pct}%`, background: colorOf(w.workspace_id) }} />
                  </div>
                  <p className="dash-course__count">{wDone}/{plural(total, 'task')}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="dash-empty">No workspaces yet.</p>
          )}
        </section>

        <div className="dash-columns">
          <div className="dash-column">
            {/* ---------- Early alerts ---------- */}
            <section className="dash-card" id="alerts">
              <div className="dash-card__head">
                <div>
                  <h2 className="dash-card__title">
                    <span className="dash-dot dash-dot--danger" /> Rule-Based Early Alerts
                    <span className="dash-pill dash-pill--red dash-pill--small">{alerts.length} active</span>
                  </h2>
                  <p className="dash-card__subtitle">
                    Triggered automatically based on deadline proximity, status stagnation, and priority rules.
                  </p>
                </div>
                <button
                  type="button"
                  className="dash-icon-btn"
                  aria-label="Open Early Alerts"
                  title="Open Early Alerts"
                  onClick={() => onNavigate('early-alerts')}
                >
                  <SlidersIcon width={18} height={18} />
                </button>
              </div>

              {alerts.length > 0 ? (
                <ul className="dash-alerts">
                  {alerts.slice(0, MAX_ALERTS).map((alert) => {
                    const { task } = alert;
                    const tag = ALERT_TAGS[alert.kind];
                    return (
                      <li key={`${task.id}:${alert.kind}`} className="dash-alert">
                        <div className="dash-alert__body">
                          <p className="dash-alert__tags">
                            <span className={`dash-tag dash-tag--${alert.kind}`}>
                              <tag.Icon width={12} height={12} /> {tag.text(alert.days)}
                            </span>
                          </p>
                          <p className="dash-alert__ws">{task.workspace.workspace_name}</p>
                          <h3 className="dash-alert__title">{task.title}</h3>
                          <p className="dash-alert__meta">
                            {task.deadline ? (
                              <span className={alert.kind === 'overdue' ? 'dash-tone--danger' : 'dash-tone--primary'}>
                                <CalendarIcon width={13} height={13} />{' '}
                                {task.deadline.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                              </span>
                            ) : (
                              <span>No deadline</span>
                            )}
                            <span>Status: {task.status}</span>
                            <span>
                              <FlagIcon width={13} height={13} /> Priority: {task.priority}
                            </span>
                          </p>
                        </div>
                        <div className="dash-alert__actions">
                          <button
                            type="button"
                            className={`dash-action dash-action--${alert.kind}`}
                            onClick={() => openWorkspace(task.workspace.workspace_id)}
                          >
                            Open Workspace
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="dash-empty">{loaded ? 'No early alerts — every task is on track.' : 'Loading…'}</p>
              )}

              {alerts.length > MAX_ALERTS && (
                <button type="button" className="dash-card__more" onClick={() => onNavigate('early-alerts')}>
                  View all {alerts.length} alerts <ArrowRightIcon width={13} height={13} />
                </button>
              )}
            </section>

            {/* ---------- Upcoming deadlines ---------- */}
            <section className="dash-card">
              <div className="dash-card__head">
                <div>
                  <h2 className="dash-card__title">Upcoming Chronological Deadlines</h2>
                  <p className="dash-card__subtitle">Unfinished tasks due in the next {DEADLINE_WINDOW_DAYS} days</p>
                </div>
                <span className="dash-card__link">{upcoming.length} Upcoming</span>
              </div>

              {upcoming.length > 0 ? (
                <ul className="dash-deadlines">
                  {upcoming.slice(0, MAX_DEADLINES).map(({ task, days }) => (
                    <li key={task.id} className="dash-deadline">
                      <span className="dash-deadline__date">
                        <small>{task.deadline.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</small>
                        {task.deadline.getDate()}
                      </span>
                      <span className="dash-deadline__info">
                        <strong>{task.title}</strong>
                        <span>
                          {task.deadline.toLocaleDateString(undefined, { weekday: 'long' })} ({relativeDay(days)}) •{' '}
                          <span style={{ color: colorOf(task.workspace.workspace_id) }}>{task.workspace.workspace_name}</span>
                        </span>
                      </span>
                      <span className={statusClass(task.status)}>{task.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dash-empty">
                  {loaded ? `No unfinished tasks due in the next ${DEADLINE_WINDOW_DAYS} days.` : 'Loading…'}
                </p>
              )}
            </section>
          </div>

          <div className="dash-column">
            {/* ---------- Task distribution ---------- */}
            <section className="dash-card">
              <div className="dash-card__head">
                <div>
                  <h2 className="dash-card__title">Task Distribution</h2>
                  <p className="dash-card__subtitle">Current academic workload balance</p>
                </div>
                {scope !== 'all' && (
                  <button type="button" className="dash-card__link dash-card__link--button" onClick={() => openWorkspace(scope)}>
                    Open Board <ArrowRightIcon width={13} height={13} />
                  </button>
                )}
              </div>

              <div className="dash-stack" role="img" aria-label="Task distribution by status">
                {tasks.length > 0 ? (
                  distribution.map((d) => d.count > 0 && <span key={d.status} style={{ flex: d.count, background: d.color }} />)
                ) : (
                  <span className="dash-stack__empty" />
                )}
              </div>

              <ul className="dash-legend">
                {distribution.map((d) => (
                  <li key={d.status}>
                    <span className="dash-legend__dot" style={{ background: d.color }} />
                    <span className="dash-legend__label">{d.label}</span>
                    <span className="dash-legend__value">
                      {d.count} ({percent(d.count, tasks.length)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ---------- Weekly reflection ---------- */}
            <section className="dash-card dash-reflection" id="reflection">
              <div className="dash-card__head">
                <h2 className="dash-card__title">
                  <SproutIcon width={18} height={18} /> Weekly Reflection
                </h2>
                {reflections && (
                  <span className={`dash-pill dash-pill--small ${reflectionSubmitted ? 'dash-pill--blue' : 'dash-pill--green'}`}>
                    {reflectionSubmitted ? 'Submitted' : 'Pending'}
                  </span>
                )}
              </div>
              <div className="dash-reflection__prompt">
                <p className="dash-reflection__text">
                  "What went well this week? What obstacles did you face? What will you adjust next week?"
                </p>
              </div>
              <button type="button" className="dash-reflection__btn" onClick={() => onNavigate('weekly-reflection')}>
                <PenLineIcon width={15} height={15} /> {reflectionSubmitted ? 'View Weekly Reflection' : 'Write Sunday Reflection'}
              </button>
            </section>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

export default Dashboard;
