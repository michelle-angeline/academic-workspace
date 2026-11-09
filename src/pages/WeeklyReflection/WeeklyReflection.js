import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  HomeIcon,
  HourglassIcon,
  PenLineIcon,
  SearchIcon,
  TrendingUpIcon,
  WarningIcon,
} from '../../components/Icons';
import { createReflection, listReflections, updateReflection } from '../../services/reflections';
import { listTasks } from '../../services/tasks';
import { DAY, matchRules, parseDate } from '../../utils/alertRules';
import './WeeklyReflection.css';

// A reflection is one row of the reflection table: week_start (Monday, YYYY-MM-DD),
// reflection_text, created_at and user_id. These questions guide what to write in reflection_text.
const GUIDING_TEXT =
  'What went well this week? What obstacles or friction points did I face? What actionable adjustments will I make next week?';

// ---------- Date helpers (weeks run Monday–Sunday, due Sunday 11:59 PM) ----------

function weekOf(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 0, 0);
  return { start, end };
}

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shortDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = (d) => `${longDate(d)}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
const weekRange = ({ start, end }) => `${shortDate(start)} – ${longDate(end)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- Weekly metrics from the user's tasks ----------

function weeklyMetrics(taskEntries, week) {
  const lastWeekStart = new Date(week.start.getTime() - 7 * DAY);
  const inRange = (d, from, to) => d && d >= from && d <= to;

  const tasks = taskEntries.map(({ row, workspace }) => ({
    title: row.title,
    status: row.status,
    priority: row.priority,
    deadline: parseDate(row.deadline),
    lastActivity: parseDate(row.updated_at || row.created_at),
    workspace,
  }));

  // A Done task counts for the week it was last updated in (when it was marked Done)
  const done = tasks.filter((t) => t.status === 'Done');
  const completed = done.filter((t) => inRange(t.lastActivity, week.start, week.end));
  const completedLastWeek = done.filter((t) => inRange(t.lastActivity, lastWeekStart, week.start)).length;

  const rules = tasks.map((t) => ({ task: t, kinds: matchRules(t).map((m) => m.kind) }));
  const overdue = rules.filter((r) => r.kinds.includes('overdue')).map((r) => r.task);
  const stalled = rules.filter((r) => r.kinds.includes('inactive')).length;

  return { completed, delta: completed.length - completedLastWeek, overdue, stalled };
}

// ---------- Components ----------

function HistoryEntry({ reflection, number, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const textRef = useRef(null);
  const week = weekOf(parseDate(reflection.week_start));

  // Only offer "Read Full Entry" when the 3-line preview actually cuts the text off
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el && !expanded) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [reflection.reflection_text, expanded, editing]);

  const startEditing = () => {
    setDraft(reflection.reflection_text);
    setError('');
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) {
      setError('Reflection cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onUpdated(await updateReflection(reflection.reflection_id, draft));
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="wr-entry">
      <div className="wr-entry__head">
        <div className="wr-entry__heading">
          <span className="wr-entry__num">{number}</span>
          <div>
            <h3 className="wr-entry__title">Week of {weekRange(week)}</h3>
            <p className="wr-entry__meta">Submitted on {dateTime(parseDate(reflection.created_at))}</p>
          </div>
        </div>
        {!editing && (
          <button type="button" className="wr-entry__update" onClick={startEditing}>
            <PenLineIcon width={12} height={12} /> Update Reflection
          </button>
        )}
      </div>

      {editing ? (
        <div className="wr-entry__edit">
          <textarea
            className={`wr-textarea ${error ? 'wr-textarea--error' : ''}`}
            rows={6}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            aria-label={`Edit reflection for the week of ${weekRange(week)}`}
            autoFocus
          />
          <div className="wr-entry__edit-actions">
            {error && <span className="wr-message wr-message--error" role="alert">{error}</span>}
            <button type="button" className="wr-btn wr-btn--ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="wr-btn wr-btn--primary" onClick={save} disabled={saving}>
              <CheckIcon width={13} height={13} strokeWidth={3} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p ref={textRef} className={`wr-entry__text ${expanded ? 'wr-entry__text--full' : ''}`}>
            {reflection.reflection_text}
          </p>
          {(clamped || expanded) && (
            <button
              type="button"
              className="wr-entry__toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show Less' : 'Read Full Entry'}
              <ArrowRightIcon
                width={11}
                height={11}
                strokeWidth={3}
                className={expanded ? 'wr-entry__toggle-icon--up' : ''}
              />
            </button>
          )}
        </>
      )}
    </article>
  );
}

function WeeklyReflection({ user, workspaces, onNavigate, onSignOut }) {
  const week = useMemo(() => weekOf(new Date()), []);
  const weekStartISO = toISODate(week.start);

  const [reflections, setReflections] = useState(null); // null while loading
  const [taskEntries, setTaskEntries] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [textError, setTextError] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  // The user's reflection for this week, if already submitted
  const thisWeek = reflections?.find((r) => String(r.week_start).slice(0, 10) === weekStartISO);

  // Load the user's reflections
  useEffect(() => {
    let cancelled = false;
    listReflections(user.user_id)
      .then((rows) => {
        if (cancelled) return;
        setReflections(rows);
      })
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user, weekStartISO]);

  // Load the tasks of every workspace for the evidence cards
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

  const metrics = useMemo(() => (taskEntries ? weeklyMetrics(taskEntries, week) : null), [taskEntries, week]);

  // Creates this week's reflection; once submitted, it is changed with "Update Reflection" in the history
  const submit = async (e) => {
    e.preventDefault();
    if (thisWeek) return;
    if (!text.trim()) {
      setTextError('Please write your reflection before submitting.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const saved = await createReflection(user.user_id, weekStartISO, text);
      setReflections((list) => [saved, ...(list || [])]);
      setText('');
      setMessage({ type: 'success', text: 'Weekly reflection submitted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdated = (saved) =>
    setReflections((list) => list.map((r) => (r.reflection_id === saved.reflection_id ? saved : r)));


  const q = query.trim().toLowerCase();
  const history = reflections || [];
  const visibleHistory = q ? history.filter((r) => r.reflection_text.toLowerCase().includes(q)) : history;
  const firstOverdue = metrics?.overdue[0];

  return (
    <AppLayout user={user} workspaces={workspaces} active="weekly-reflection" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content wr-content">
        <span className="wr-glow wr-glow--blue" aria-hidden="true" />
        <span className="wr-glow wr-glow--mint" aria-hidden="true" />

        {/* ---------- 1. Header ---------- */}
        <header className="wr-header">
          <p className="wr-breadcrumb">
            <button type="button" onClick={() => onNavigate('dashboard')}>
              <HomeIcon width={11} height={11} /> Dashboard
            </button>
            <span aria-hidden="true">/</span>
            <strong>Weekly Reflection</strong>
          </p>
          <h1 className="wr-title">
            Weekly Academic Reflection <span className="wr-week-badge">This Week</span>
          </h1>
          <div className="wr-banner">
            <p className="wr-banner__dates">
              <CalendarIcon width={16} height={16} />
              {weekRange(week)}
            </p>
            <p className="wr-banner__status">
              {thisWeek ? 'Reflection Submitted' : 'Reflection Pending'}
              <span className={`wr-due ${thisWeek ? 'wr-due--done' : ''}`}>
                <span className="wr-due__dot" />
                {thisWeek ? `Submitted ${shortDate(parseDate(thisWeek.created_at))}` : 'Due Sunday 11:59 PM'}
              </span>
            </p>
          </div>
        </header>

        {loadError && <p className="wr-load-error" role="alert">{loadError}</p>}

        {/* ---------- 2. Evidence from this week's tasks ---------- */}
        <section className="wr-evidence">
          <h2 className="wr-section-title">
            <TrendingUpIcon width={16} height={16} /> Retrospective Evidence &amp; Weekly Metrics
          </h2>
          <div className="wr-metrics">
            <article className="wr-metric wr-metric--green">
              <div className="wr-metric__head">
                <span>Completed Tasks</span>
                {metrics && (
                  <span className="wr-pill wr-pill--green">
                    <TrendingUpIcon width={10} height={10} strokeWidth={3} />
                    {metrics.delta >= 0 ? '+' : ''}
                    {metrics.delta} vs last week
                  </span>
                )}
              </div>
              <p className="wr-metric__value">
                {metrics ? metrics.completed.length : '–'}
                <small>tasks closed this week</small>
              </p>
              {metrics && metrics.completed.length > 0 ? (
                <ul className="wr-metric__list">
                  {metrics.completed.slice(0, 3).map((t, i) => (
                    <li key={`${t.title}-${i}`}>
                      <CheckCircleIcon width={11} height={11} /> {t.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wr-metric__empty">{metrics ? 'No tasks marked Done this week yet.' : 'Loading…'}</p>
              )}
              {metrics && metrics.completed.length > 3 && (
                <p className="wr-metric__foot wr-metric__foot--blue">+{metrics.completed.length - 3} other tasks</p>
              )}
            </article>

            <article className="wr-metric wr-metric--red">
              <div className="wr-metric__head">
                <span>Friction Points</span>
                {metrics && metrics.overdue.length > 0 && <span className="wr-pill wr-pill--red">Early Alert Flag</span>}
              </div>
              <p className={`wr-metric__value ${metrics?.overdue.length ? 'wr-metric__value--red' : ''}`}>
                {metrics ? metrics.overdue.length : '–'}
                <small>overdue deliverable{metrics?.overdue.length === 1 ? '' : 's'}</small>
              </p>
              {firstOverdue && (
                <div className="wr-friction">
                  <p className="wr-friction__label">
                    <WarningIcon width={11} height={11} /> {firstOverdue.workspace.workspace_name}
                  </p>
                  <p className="wr-friction__task">{firstOverdue.title}</p>
                </div>
              )}
              {metrics && (
                <p className="wr-stalled">
                  <HourglassIcon width={10} height={10} /> {plural(metrics.stalled, 'stalled item')} (7+ days inactive)
                </p>
              )}
              {metrics && (metrics.overdue.length > 0 || metrics.stalled > 0) && (
                <p className="wr-metric__foot wr-metric__foot--red">Requires diagnosis below</p>
              )}
            </article>
          </div>
        </section>

        {/* ---------- 3. Reflection form (one reflection_text per week) ---------- */}
        <section className="wr-journal">
          <div className="wr-journal__head">
            <span className="wr-journal__icon"><BookOpenIcon width={22} height={22} /></span>
            <div>
              <h2 className="wr-journal__title">Weekly Reflection</h2>
              <p className="wr-journal__due">
                Week of {weekRange(week)} • Due {dateTime(week.end)}
              </p>
            </div>
          </div>

          <form className="wr-form" onSubmit={submit} noValidate>
            <div className="wr-prompt">
              <div className="wr-prompt__labels">
                <label htmlFor="wr-text" className="wr-prompt__title">
                  Reflect on your week
                </label>
                {textError && <span className="wr-prompt__error">{textError}</span>}
              </div>
              <p className="wr-guides">{GUIDING_TEXT}</p>
              <textarea
                id="wr-text"
                className={`wr-textarea ${textError ? 'wr-textarea--error' : ''}`}
                rows={9}
                placeholder={
                  thisWeek
                    ? "You've already submitted this week's reflection. Use Update Reflection in the history below to change it."
                    : "Write about what went well, the obstacles you faced, and what you'll adjust next week..."
                }
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setTextError('');
                  setMessage(null);
                }}
                aria-invalid={Boolean(textError)}
                disabled={Boolean(thisWeek) || (!reflections && !loadError)}
              />
            </div>

            <footer className="wr-form__footer">
              <div className="wr-form__actions">
                {message && (
                  <span className={`wr-message wr-message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
                    {message.text}
                  </span>
                )}
                <button type="submit" className="wr-btn wr-btn--primary" disabled={saving || !reflections || Boolean(thisWeek)}>
                  <CheckCircleIcon width={15} height={15} />
                  {saving ? 'Submitting…' : thisWeek ? 'Submitted This Week' : 'Submit Weekly Reflection'}
                </button>
              </div>
            </footer>
          </form>
        </section>

        {/* ---------- 4. History from the reflection table ---------- */}
        <section className="wr-history">
          <div className="wr-history__head">
            <div>
              <h2 className="wr-history__title">
                Reflection History &amp; Archives
                {reflections && (
                  <span className="wr-pill wr-pill--green">{plural(reflections.length, 'reflection')} archived</span>
                )}
              </h2>
              <p className="wr-history__intro">
                Review prior self-assessments to detect repeating learning patterns and longitudinal velocity.
              </p>
            </div>
            <label className="wr-search">
              <SearchIcon width={12} height={12} />
              <input type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>

          <div className="wr-history__list">
            {!reflections && !loadError && <p className="wr-history__empty">Loading reflections…</p>}
            {visibleHistory.map((r) => (
              <HistoryEntry
                key={r.reflection_id}
                reflection={r}
                number={history.length - history.indexOf(r)}
                onUpdated={handleUpdated}
              />
            ))}
            {reflections && visibleHistory.length === 0 && (
              <p className="wr-history__empty">
                {q ? 'No reflections match your search.' : 'No reflections yet. Your submitted reflections will appear here.'}
              </p>
            )}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default WeeklyReflection;
