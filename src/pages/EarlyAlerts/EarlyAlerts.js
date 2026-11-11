import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarXIcon,
  CheckCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  FlagIcon,
  HourglassIcon,
  MailIcon,
  PauseCircleIcon,
  PieChartIcon,
  ShieldCheckIcon,
  SlidersIcon,
  TimerIcon,
} from '../../components/Icons';
import { markAllAlertsRead, setAlertRead, syncAlerts } from '../../services/alerts';
import { TASKS_CHANGED_EVENT } from '../../services/tasks';
import { parseDate, RULE_ORDER } from '../../utils/alertRules';
import './EarlyAlerts.css';

// Display settings for the four deterministic rules (see utils/alertRules.js)
const KINDS = {
  overdue: {
    label: 'Overdue',
    title: 'Overdue Alerts',
    subtitle: (n) => `${n} task${n === 1 ? '' : 's'} past scheduled target deadline`,
    rule: 'Rule: Task past target deadline',
    chip: 'Overdue: >0d past',
    Icon: CalendarXIcon,
    ReasonIcon: AlertCircleIcon,
    color: '#ba1a1a',
  },
  due: {
    label: 'Due Soon',
    title: 'Due Soon Alerts (≤ 3 Days)',
    subtitle: (n) => `${n} task${n === 1 ? '' : 's'} nearing final submission deadlines`,
    rule: 'Rule: Deadline within 72 hours & uncompleted',
    chip: 'Due Soon: ≤3 days',
    Icon: HourglassIcon,
    ReasonIcon: TimerIcon,
    color: '#006c49',
  },
  inactive: {
    label: 'Inactive',
    title: 'Stalled & Inactive Alerts (≥ 7 Days)',
    subtitle: (n) => `${n} task${n === 1 ? '' : 's'} in progress or review without updates`,
    rule: 'Rule: No activity for 7+ consecutive days',
    chip: 'Inactive: ≥7 days',
    Icon: PauseCircleIcon,
    ReasonIcon: PauseCircleIcon,
    color: '#6d3bd7',
  },
  priority: {
    label: 'High Priority',
    title: 'High Priority Not Started',
    subtitle: (n) => `${n} high-importance task${n === 1 ? '' : 's'} not started yet`,
    rule: 'Rule: Priority = High & Status = To Do',
    chip: 'High Pri: not started',
    Icon: FlagIcon,
    ReasonIcon: FlagIcon,
    color: '#00668a',
  },
};

const RULES = [
  { kind: 'overdue', name: '1. Overdue Boundary', formula: 'now() > deadline', text: 'Triggers when today is past the deadline and the status is not Done.' },
  { kind: 'due', name: '2. Near-Term Horizon', formula: 'diff ≤ 72h', text: 'Triggers when the deadline is within 3 days and the status is not Done.' },
  { kind: 'inactive', name: '3. Inactivity Threshold', formula: 'idle_days ≥ 7', text: "Triggers when a task in 'In Progress' or 'Review' hasn't been updated for 7+ days." },
  { kind: 'priority', name: '4. High Urgency Stall', formula: "pri = 'High' & status = 'To Do'", text: 'Flags high-priority tasks that have not been started yet.' },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const percent = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// "Nov 9, 2026", plus the time when it isn't midnight
function formatDate(date) {
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!date.getHours() && !date.getMinutes()) return day;
  return `${day}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

// The date line shown on the alert card (the trigger reason is the stored alert_message)
function describeMeta(kind, days, task) {
  if (kind === 'inactive') return `Last updated: ${formatDate(task.lastActivity)} • ${plural(days, 'day')} ago`;
  if (task.deadline) return `Deadline: ${formatDate(task.deadline)}`;
  return 'No deadline set';
}

// ---------- Components ----------

function AlertCard({ alert, onToggleRead, onOpen }) {
  const kind = KINDS[alert.kind];
  const { ReasonIcon } = kind;

  return (
    <article className={`ea-alert ${alert.read ? 'ea-alert--read' : ''}`} style={{ '--kind': kind.color }}>
      <span className="ea-alert__accent" aria-hidden="true" />
      <div className="ea-alert__top">
        <div className="ea-alert__info">
          <h3 className="ea-alert__title">{alert.task.title}</h3>
          <div className="ea-alert__tags">
            <span className="ea-tag">
              <span className="ea-tag__dot ea-tag__dot--workspace" />
              {alert.workspace.workspace_name}
            </span>
            {alert.read ? (
              <span className="ea-tag ea-tag--read">
                <CheckIcon width={10} height={10} strokeWidth={3} /> Read
              </span>
            ) : (
              <span className="ea-tag ea-tag--unread">
                <span className="ea-tag__dot" /> Unread
              </span>
            )}
          </div>
          <p className="ea-alert__generated">
            <ClockIcon width={12} height={12} /> {alert.meta}
          </p>
        </div>

        <div className="ea-alert__actions">
          <button type="button" className="ea-btn ea-btn--soft" onClick={() => onToggleRead(alert)}>
            {alert.read ? (
              <>
                <MailIcon width={12} height={12} /> Mark Unread
              </>
            ) : (
              <>
                <CheckIcon width={12} height={12} strokeWidth={3} /> Mark Read
              </>
            )}
          </button>
          <button
            type="button"
            className={`ea-btn ${alert.read ? 'ea-btn--text' : 'ea-btn--primary'}`}
            onClick={() => onOpen(alert.workspace.workspace_id)}
          >
            Open Task <ArrowRightIcon width={11} height={11} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="ea-reason">
        <ReasonIcon width={16} height={16} className="ea-reason__icon" />
        <div>
          <p className="ea-reason__label">Deterministic Trigger Reason</p>
          <p className="ea-reason__text">{alert.reason}</p>
        </div>
      </div>
    </article>
  );
}

// Shown in a section when no task matches its rule
function NotFoundCard({ kind, message }) {
  return (
    <article className="ea-alert ea-alert--empty" style={{ '--kind': KINDS[kind].color }}>
      <span className="ea-alert__accent" aria-hidden="true" />
      <div className="ea-empty-card">
        <span className="ea-empty-card__icon"><CheckCircleIcon width={18} height={18} /></span>
        <div>
          <h3 className="ea-alert__title">Not Found</h3>
          <p className="ea-empty-card__text">{message}</p>
        </div>
      </div>
    </article>
  );
}

function EarlyAlerts({ user, workspaces, onNavigate, onSignOut }) {
  const [rows, setRows] = useState(null); // alert rows from the database, null while loading
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | a rule kind
  const [workspaceFilter, setWorkspaceFilter] = useState('all');

  // Re-sync whenever a task changes elsewhere (e.g. edited in another view)
  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(TASKS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onChange);
  }, []);

  // Run the alert engine on the server: it saves the alerts to the alert table and returns them
  useEffect(() => {
    if (!user?.user_id || !workspaces) return undefined;
    let cancelled = false;
    setLoadError('');
    syncAlerts(user.user_id)
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, workspaces, version]);

  // One card per alert row
  const alerts = useMemo(() => {
    if (!rows) return [];
    return rows.map((row) => {
      const task = {
        title: row.task.title,
        status: row.task.status,
        deadline: parseDate(row.task.deadline),
        lastActivity: parseDate(row.task.updated_at || row.task.created_at),
      };
      return {
        key: row.alert_id,
        alertId: row.alert_id,
        kind: row.kind,
        task,
        workspace: { workspace_id: row.task.workspace_id, workspace_name: row.workspace_name },
        read: Boolean(row.is_read),
        meta: describeMeta(row.kind, row.days, task),
        reason: row.alert_message,
      };
    });
  }, [rows]);

  // Read state is saved in alert.is_read; the card updates right away and rolls back on failure
  const setRead = (ids, isRead) =>
    setRows((prev) => prev?.map((r) => (ids.includes(r.alert_id) ? { ...r, is_read: isRead ? 1 : 0 } : r)));

  const toggleRead = (alert) => {
    const next = !alert.read;
    setActionError('');
    setRead([alert.alertId], next);
    setAlertRead(alert.alertId, next).catch((err) => {
      setRead([alert.alertId], !next);
      setActionError(err.message);
    });
  };
  const markAllRead = () => {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.alertId);
    setActionError('');
    setRead(unreadIds, true);
    markAllAlertsRead(user.user_id).catch((err) => {
      setRead(unreadIds, false);
      setActionError(err.message);
    });
  };
  const openWorkspace = (workspaceId) => onNavigate('workspace', workspaceId);

  // Header stats cover every alert; the filters, sections and chart follow the workspace dropdown
  const unreadCount = alerts.filter((a) => !a.read).length;
  const alertWorkspaceCount = new Set(alerts.map((a) => a.workspace.workspace_id)).size;
  const scoped = alerts.filter((a) => workspaceFilter === 'all' || String(a.workspace.workspace_id) === workspaceFilter);
  const countOf = (kind) => scoped.filter((a) => a.kind === kind).length;
  const visible = scoped.filter((a) => filter === 'all' || (filter === 'unread' ? !a.read : a.kind === filter));
  const sectionKinds = RULE_ORDER.includes(filter) ? [filter] : RULE_ORDER;
  const scopeName =
    workspaceFilter === 'all'
      ? 'your workspaces'
      : workspaces?.find((w) => String(w.workspace_id) === workspaceFilter)?.workspace_name || 'this workspace';

  const filters = [
    { id: 'all', label: `All Alerts (${scoped.length})` },
    { id: 'unread', label: `Unread (${scoped.filter((a) => !a.read).length})` },
    ...RULE_ORDER.map((k) => ({ id: k, label: `${KINDS[k].label} (${countOf(k)})` })),
  ];

  // Donut chart: one conic-gradient slice per rule, sized by its share of the alerts
  let angle = 0;
  const slices = RULE_ORDER.map((k) => {
    const start = angle;
    angle += (countOf(k) / (scoped.length || 1)) * 360;
    return `${KINDS[k].color} ${start}deg ${angle}deg`;
  }).join(', ');

  const loading = !loadError && (!workspaces || !rows);

  return (
    <AppLayout user={user} workspaces={workspaces} active="early-alerts" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content ea-content">
        <span className="ea-orb ea-orb--blue" aria-hidden="true" />
        <span className="ea-orb ea-orb--mint" aria-hidden="true" />
        <span className="ea-orb ea-orb--violet" aria-hidden="true" />

        {/* ---------- Header ---------- */}
        <header className="ea-header">
          <div className="ea-header__row">
            <div>
              <h1 className="ea-title">Early Alerts Center</h1>
              <p className="ea-intro">
                Deterministic rule-based notifications to keep your academic progress on schedule across all courses.
                Zero probabilistic estimates.
              </p>
            </div>
            <dl className="ea-stats">
              <div className="ea-stat">
                <dt>Unread</dt>
                <dd className="ea-stat__value--red">{unreadCount}</dd>
              </div>
              <div className="ea-stat">
                <dt>Active</dt>
                <dd className="ea-stat__value--blue">{alerts.length}</dd>
              </div>
              <div className="ea-stat">
                <dt>Workspaces</dt>
                <dd className="ea-stat__value--green">{alertWorkspaceCount}</dd>
              </div>
            </dl>
          </div>

          <section className="ea-banner">
            <div className="ea-banner__text">
              <span className="ea-banner__icon"><ShieldCheckIcon width={20} height={20} /></span>
              <div>
                <h2 className="ea-banner__title">100% Fixed Deterministic Logic</h2>
                <p className="ea-banner__desc">
                  All alerts are generated automatically from fixed, deterministic rules based on deadline proximity,
                  inactivity, and priority thresholds — not probabilistic or predictive estimates.
                </p>
              </div>
            </div>
            <div className="ea-banner__chips">
              {RULE_ORDER.map((k) => (
                <span key={k} className={`ea-chip ea-chip--${k}`}>
                  <span className="ea-chip__dot" /> {KINDS[k].chip}
                </span>
              ))}
            </div>
          </section>
        </header>

        {/* ---------- Toolbar ---------- */}
        <div className="ea-toolbar">
          <div className="ea-filters" role="group" aria-label="Filter alerts">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ea-filter ${filter === f.id ? 'ea-filter--active' : ''}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ea-toolbar__actions">
            <label className="ea-select">
              <span className="sr-only">Workspace</span>
              <select value={workspaceFilter} onChange={(e) => setWorkspaceFilter(e.target.value)}>
                <option value="all">All Workspaces</option>
                {workspaces?.map((w) => (
                  <option key={w.workspace_id} value={String(w.workspace_id)}>{w.workspace_name}</option>
                ))}
              </select>
              <ChevronDownIcon width={10} height={10} strokeWidth={3} />
            </label>
            <button type="button" className="ea-mark-all" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheckIcon width={14} height={14} /> Mark all as read
            </button>
          </div>
        </div>

        {/* ---------- Alert stream + side panels ---------- */}
        <div className="ea-layout">
          <div className="ea-stream">
            {loadError && <p className="ea-status ea-status--error" role="alert">{loadError}</p>}
            {actionError && <p className="ea-status ea-status--error" role="alert">{actionError}</p>}
            {loading && <p className="ea-status">Checking your tasks…</p>}

            {!loading &&
              !loadError &&
              sectionKinds.map((k) => {
                const items = visible.filter((a) => a.kind === k);
                const kind = KINDS[k];
                const emptyMessage =
                  filter === 'unread' && countOf(k) > 0
                    ? 'All alerts for this rule have been read.'
                    : `No tasks in ${scopeName} match this rule right now.`;
                return (
                  <section key={k} className={`ea-section ea-section--${k}`}>
                    <div className="ea-section__head">
                      <div className="ea-section__heading">
                        <span className="ea-section__icon"><kind.Icon width={15} height={15} /></span>
                        <div>
                          <h2 className="ea-section__title">{kind.title}</h2>
                          <p className="ea-section__subtitle">
                            {items.length ? kind.subtitle(items.length) : 'No matching tasks found'}
                          </p>
                        </div>
                      </div>
                      <span className="ea-section__rule">
                        <span className="ea-chip__dot" /> {kind.rule}
                      </span>
                    </div>
                    {items.length ? (
                      items.map((a) => (
                        <AlertCard key={a.key} alert={a} onToggleRead={toggleRead} onOpen={openWorkspace} />
                      ))
                    ) : (
                      <NotFoundCard kind={k} message={emptyMessage} />
                    )}
                  </section>
                );
              })}
          </div>

          <aside className="ea-side">
            <section className="ea-panel">
              <div className="ea-panel__head">
                <h2 className="ea-panel__title">
                  <SlidersIcon width={16} height={16} /> Rule Transparency
                </h2>
                <span className="ea-engine">Engine Active</span>
              </div>
              <p className="ea-panel__intro">
                Athena checks every task in your workspaces each time this page opens and saves the results as alerts, using four strict boolean
                conditions:
              </p>
              <ul className="ea-rules">
                {RULES.map((r) => (
                  <li key={r.kind} className="ea-rule" style={{ '--kind': KINDS[r.kind].color }}>
                    <div className="ea-rule__head">
                      <span className="ea-rule__name">{r.name}</span>
                      <code>{r.formula}</code>
                    </div>
                    <p>{r.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ea-panel">
              <div className="ea-panel__head">
                <h2 className="ea-panel__title">
                  <PieChartIcon width={16} height={16} /> Alert Breakdown
                </h2>
              </div>
              <div
                className="ea-donut"
                style={{ background: scoped.length ? `conic-gradient(${slices})` : '#eaedff' }}
                role="img"
                aria-label={`${scoped.length} total alerts`}
              >
                <div className="ea-donut__hole">
                  <strong>{scoped.length}</strong>
                  <span>Total Alerts</span>
                </div>
              </div>
              <ul className="ea-legend">
                {RULE_ORDER.map((k) => {
                  const n = countOf(k);
                  return (
                    <li key={k}>
                      <span className="ea-legend__dot" style={{ background: KINDS[k].color }} />
                      <span className="ea-legend__label">{KINDS[k].label}</span>
                      <code>
                        {n} item{n === 1 ? '' : 's'} ({percent(n, scoped.length)}%)
                      </code>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </AppLayout>
  );
}

export default EarlyAlerts;
