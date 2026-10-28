import { useState } from 'react';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ClockIcon,
  FileTextIcon,
  FlagIcon,
  FolderIcon,
  GraduationCapIcon,
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
import { WORKSPACES } from '../../data/workspaces';
import './Dashboard.css';

// ---------- Hardcoded demo data (replace with API data later) ----------

const workspace = (id) => WORKSPACES.find((w) => w.id === id);

const ALERTS = [
  {
    kind: 'overdue',
    tag: 'OVERDUE - Past deadline by 1 day',
    TagIcon: ClockIcon,
    workspace: 'db',
    title: 'ER Diagram Normalization Exercise',
    action: 'Mark Review',
    meta: [
      { icon: ClockIcon, text: 'Yesterday, 11:59 PM', tone: 'danger' },
      { icon: FlagIcon, text: 'Priority: High' },
    ],
  },
  {
    kind: 'due',
    tag: 'DUE IN 2 DAYS - Approaching deadline',
    TagIcon: TimerIcon,
    workspace: 'cn',
    title: 'Subnetting & Routing Table Lab Report',
    action: 'Open Workspace',
    meta: [
      { icon: CalendarIcon, text: 'Wednesday, Oct 14', tone: 'primary' },
      { text: '2 subtasks pending' },
    ],
    note: 'Task Notes embedded',
  },
  {
    kind: 'due',
    tag: 'DUE IN 3 DAYS - Approaching deadline',
    TagIcon: TimerIcon,
    workspace: 'stats',
    title: 'Statistical Hypothesis Testing Problem Set',
    action: 'Start Work',
    meta: [
      { icon: CalendarIcon, text: 'Thursday, Oct 15', tone: 'primary' },
      { text: '4 subtasks pending' },
    ],
  },
  {
    kind: 'inactive',
    tag: 'INACTIVE - No activity for 8 days',
    TagIcon: ShieldAlertIcon,
    workspace: 'cap',
    inlineWorkspace: true,
    title: 'Literature Synthesis Matrix Draft',
    action: 'Resume Task',
    meta: [
      { text: 'Status: In Progress' },
      { text: 'Stalled since Oct 4', tone: 'purple' },
      { icon: FileTextIcon, text: 'Matrix.docx', tone: 'strong' },
    ],
  },
  {
    kind: 'priority',
    tag: 'HIGH PRIORITY - Task not started',
    TagIcon: ZapIcon,
    workspace: 'hci',
    inlineWorkspace: true,
    title: 'Interactive Prototype User Testing Prep',
    action: 'Initialize',
    meta: [{ text: 'Status: To Do' }, { text: 'Deadline in 5 days', tone: 'strong' }],
  },
];

const DISTRIBUTION = [
  { label: 'To Do', count: 8, color: '#38b6f0' },
  { label: 'In Progress', count: 9, color: '#00658d' },
  { label: 'In Review', count: 3, color: '#b3a4f3' },
  { label: 'Completed', count: 8, color: '#5ee0a8' },
];

const DEADLINES = [
  { month: 'OCT', day: 14, title: 'Computer Networks Lab Report', when: 'Wednesday (in 2 days)', workspace: 'cn', status: 'In Progress' },
  { month: 'OCT', day: 15, title: 'Applied Statistics Problem Set', when: 'Thursday (in 3 days)', workspace: 'stats', status: 'To Do' },
  { month: 'OCT', day: 17, title: 'HCI Usability Testing Script', when: 'Saturday (in 5 days)', workspace: 'hci', status: 'To Do' },
  { month: 'OCT', day: 20, title: 'Capstone Chapter 2 Architecture Review', when: 'Tuesday, next week', workspace: 'cap', status: 'Review' },
  { month: 'OCT', day: 23, title: 'Database Stored Procedures Benchmark', when: 'Friday (in 11 days)', workspace: 'db', status: 'To Do' },
];

const TOTAL_TASKS = DISTRIBUTION.reduce((sum, d) => sum + d.count, 0);
const MILESTONE_DONE = 19;
const MILESTONE_TOTAL = 28;
const MILESTONE_PCT = Math.round((MILESTONE_DONE / MILESTONE_TOTAL) * 100);

const percent = (done, total) => Math.round((done / total) * 100);
const statusClass = (status) => `dash-status dash-status--${status.toLowerCase().replace(/\s+/g, '-')}`;

// ---------- Component ----------

function Dashboard({ user, onNavigate, onSignOut }) {
  const [scope, setScope] = useState('all');

  const fullName = user?.name?.trim() || 'Student';
  const firstName = fullName.split(/\s+/)[0];

  return (
    <AppLayout user={user} active="dashboard" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content">
        {/* ---------- Greeting ---------- */}
        <section className="dash-hero">
          <p className="dash-hero__eyebrow">
            <span className="dash-hero__week">
              <GraduationCapIcon width={13} height={13} />
              Week 8 of 16 • Midterm Period
            </span>
            <span className="dash-hero__date">• Monday, October 12, 2026</span>
          </p>
          <h1 className="dash-hero__title">
            Hello, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="dash-hero__summary">
            <span className="dash-dot dash-dot--live" />
            You have <strong>4 tasks</strong> that need prompt attention today. 2 assignments due within 72 hours.
          </p>

          <div className="dash-filters">
            <span className="dash-filters__label">Filter scope:</span>
            <button
              type="button"
              className={`dash-filter ${scope === 'all' ? 'dash-filter--active' : ''}`}
              onClick={() => setScope('all')}
            >
              All Workspaces ({WORKSPACES.length})
            </button>
            {WORKSPACES.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`dash-filter ${scope === w.id ? 'dash-filter--active' : ''}`}
                onClick={() => setScope(w.id)}
              >
                <span className="dash-dot" style={{ background: w.color }} />
                {w.name}
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Stat cards ---------- */}
        <section className="dash-stats">
          <article className="dash-stat dash-stat--blue">
            <header>
              <span>Total Active Tasks</span>
              <span className="dash-stat__icon"><ListChecksIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">28<small>tasks</small></p>
            <p className="dash-stat__foot">
              <FolderIcon width={14} height={14} /> across 5 workspaces
            </p>
          </article>

          <article className="dash-stat dash-stat--green">
            <header>
              <span>Completed This Week</span>
              <span className="dash-stat__icon"><CheckCircleIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">12<small>closed</small></p>
            <p className="dash-pill dash-pill--green">
              <TrendingUpIcon width={12} height={12} /> +4 vs previous week
            </p>
          </article>

          <article className="dash-stat dash-stat--sky">
            <header>
              <span>Due in 3 Days</span>
              <span className="dash-stat__icon"><ClockIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">3<small>deliverables</small></p>
            <p className="dash-pill dash-pill--blue">! High attention required</p>
          </article>

          <article className="dash-stat dash-stat--red">
            <header>
              <span>Overdue</span>
              <span className="dash-stat__icon"><WarningIcon width={16} height={16} /></span>
            </header>
            <p className="dash-stat__value">1<small>pending</small></p>
            <p className="dash-pill dash-pill--red">
              <span className="dash-dot" /> Needs immediate resolution
            </p>
          </article>
        </section>

        {/* ---------- Milestone progress ---------- */}
        <section className="dash-card dash-milestone">
          <div className="dash-milestone__head">
            <div>
              <h2 className="dash-card__title">
                <TargetIcon width={18} height={18} /> Semester Milestone Progress
              </h2>
              <p className="dash-card__subtitle">
                Midterm Benchmark Target: 65% • You are currently ahead by +3%
              </p>
            </div>
            <div className="dash-milestone__score">
              <span>
                <strong>{MILESTONE_PCT}%</strong>
                <small>{MILESTONE_DONE} / {MILESTONE_TOTAL} finished</small>
              </span>
              <span
                className="dash-ring"
                style={{ '--pct': MILESTONE_PCT }}
                role="img"
                aria-label={`${MILESTONE_PCT}% complete`}
              >
                <TrendingUpIcon width={14} height={14} />
              </span>
            </div>
          </div>

          <div className="dash-bar dash-bar--large">
            <span className="dash-bar__fill dash-bar__fill--gradient" style={{ width: `${MILESTONE_PCT}%` }} />
          </div>

          <div className="dash-courses">
            {WORKSPACES.map((w) => {
              const pct = percent(w.done, w.total);
              return (
                <div key={w.id} className="dash-course">
                  <div className="dash-course__head">
                    <span>{w.name}</span>
                    <span className="dash-course__pct" style={{ color: w.color }}>{pct}%</span>
                  </div>
                  <div className="dash-bar">
                    <span className="dash-bar__fill" style={{ width: `${pct}%`, background: w.color }} />
                  </div>
                  <p className="dash-course__count">{w.done}/{w.total} tasks</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="dash-columns">
          <div className="dash-column">
            {/* ---------- Early alerts ---------- */}
            <section className="dash-card" id="alerts">
              <div className="dash-card__head">
                <div>
                  <h2 className="dash-card__title">
                    <span className="dash-dot dash-dot--danger" /> Rule-Based Early Alerts
                    <span className="dash-pill dash-pill--red dash-pill--small">4 active</span>
                  </h2>
                  <p className="dash-card__subtitle">
                    Triggered automatically based on deadline proximity, status stagnation, and priority rules.
                  </p>
                </div>
                <button type="button" className="dash-icon-btn" aria-label="Alert rules">
                  <SlidersIcon width={18} height={18} />
                </button>
              </div>

              <ul className="dash-alerts">
                {ALERTS.map((alert) => {
                  const ws = workspace(alert.workspace);
                  const { TagIcon } = alert;
                  return (
                    <li key={alert.title} className="dash-alert">
                      <div className="dash-alert__body">
                        <p className="dash-alert__tags">
                          <span className={`dash-tag dash-tag--${alert.kind}`}>
                            <TagIcon width={12} height={12} /> {alert.tag}
                          </span>
                          {alert.inlineWorkspace && <span className="dash-alert__ws">{ws.name}</span>}
                        </p>
                        {!alert.inlineWorkspace && <p className="dash-alert__ws">{ws.name}</p>}
                        <h3 className="dash-alert__title">{alert.title}</h3>
                        <p className="dash-alert__meta">
                          {alert.meta.map(({ icon: Icon, text, tone }) => (
                            <span key={text} className={tone ? `dash-tone--${tone}` : undefined}>
                              {Icon && <Icon width={13} height={13} />} {text}
                            </span>
                          ))}
                        </p>
                        {alert.note && (
                          <p className="dash-alert__note">
                            <CheckSquareIcon width={13} height={13} /> {alert.note}
                          </p>
                        )}
                      </div>
                      <div className="dash-alert__actions">
                        <button type="button" className={`dash-action dash-action--${alert.kind}`}>
                          {alert.action}
                        </button>
                        {alert.kind === 'overdue' && (
                          <button type="button" className="dash-icon-btn" aria-label="Reschedule">
                            <CalendarClockIcon width={18} height={18} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ---------- Upcoming deadlines ---------- */}
            <section className="dash-card">
              <div className="dash-card__head">
                <div>
                  <h2 className="dash-card__title">Upcoming Chronological Deadlines</h2>
                  <p className="dash-card__subtitle">Next 14 days schedule mapped from course syllabus</p>
                </div>
                <span className="dash-card__link">{DEADLINES.length} Upcoming</span>
              </div>

              <ul className="dash-deadlines">
                {DEADLINES.map((d) => {
                  const ws = workspace(d.workspace);
                  return (
                    <li key={d.title} className="dash-deadline">
                      <span className="dash-deadline__date">
                        <small>{d.month}</small>
                        {d.day}
                      </span>
                      <span className="dash-deadline__info">
                        <strong>{d.title}</strong>
                        <span>
                          {d.when} • <span style={{ color: ws.color }}>{ws.name}</span>
                        </span>
                      </span>
                      <span className={statusClass(d.status)}>{d.status}</span>
                    </li>
                  );
                })}
              </ul>
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
                <a href="#board" className="dash-card__link">
                  Open Board <ArrowRightIcon width={13} height={13} />
                </a>
              </div>

              <div className="dash-stack" role="img" aria-label="Task distribution by status">
                {DISTRIBUTION.map((d) => (
                  <span key={d.label} style={{ flex: d.count, background: d.color }} />
                ))}
              </div>

              <ul className="dash-legend">
                {DISTRIBUTION.map((d) => (
                  <li key={d.label}>
                    <span className="dash-legend__dot" style={{ background: d.color }} />
                    <span className="dash-legend__label">{d.label}</span>
                    <span className="dash-legend__value">
                      {d.count} ({percent(d.count, TOTAL_TASKS)}%)
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
                <span className="dash-pill dash-pill--green dash-pill--small">Pending</span>
              </div>
              <div className="dash-reflection__prompt">
                <p className="dash-reflection__label">Week 8 Reflection Prompt</p>
                <p className="dash-reflection__text">
                  "How did your time estimation match actual study hours this week? Any blockers encountered in
                  Capstone?"
                </p>
              </div>
              <button type="button" className="dash-reflection__btn">
                <PenLineIcon width={15} height={15} /> Write Sunday Reflection
              </button>
            </section>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

export default Dashboard;
