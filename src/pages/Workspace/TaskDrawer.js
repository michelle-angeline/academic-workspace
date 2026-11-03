import { useEffect, useRef, useState } from 'react';
import { CalendarIcon, ChevronDownIcon, PenLineIcon, PlusIcon, XIcon } from '../../components/Icons';
import { createTask } from '../../services/tasks';
import './TaskDrawer.css';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// Today's date as YYYY-MM-DD in local time (the format <input type="date"> uses)
function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Slide-in drawer for creating a task. Fields match the task table:
// title, notes, deadline, priority, status (+ workspace_id from the open workspace).
function TaskDrawer({ workspace, initialStatus = 'To Do', onCreated, onClose }) {
  const [form, setForm] = useState({
    title: '',
    notes: '',
    deadline: '',
    priority: 'Medium',
    status: initialStatus,
  });
  const [titleError, setTitleError] = useState('');
  const [deadlineError, setDeadlineError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  // Focus the title once when the drawer opens
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape (the ref keeps the latest onClose without re-adding the listener)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (field === 'title') setTitleError('');
    if (field === 'deadline') setDeadlineError('');
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError('Please enter a task title.');
      titleRef.current?.focus();
      return;
    }
    // The calendar blocks past dates, but a past date can still be typed in by hand
    if (form.deadline && form.deadline < todayISO()) {
      setDeadlineError('Cannot be before today.');
      return;
    }

    setSaving(true);
    try {
      const task = await createTask(workspace.workspace_id, form);
      onCreated(task);
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="td-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="td-drawer" role="dialog" aria-modal="true" aria-labelledby="td-heading">
        <header className="td-head">
          <span className="td-workspace">
            <span className="td-workspace__dot" /> {workspace.workspace_name}
          </span>
          <button type="button" className="td-close" onClick={onClose} aria-label="Close">
            <XIcon width={18} height={18} />
          </button>
        </header>

        <form className="td-body" onSubmit={handleSubmit} noValidate>
          <h2 className="td-heading" id="td-heading">New Task</h2>

          {/* Title */}
          <div className="td-field">
            <div className="td-label-row">
              <label htmlFor="td-title" className="td-eyebrow">
                Task Title <span className="td-required">*</span>
              </label>
              {titleError && <span className="td-error">{titleError}</span>}
            </div>
            <input
              id="td-title"
              ref={titleRef}
              className={`td-title-input ${titleError ? 'td-title-input--error' : ''}`}
              type="text"
              maxLength={200}
              placeholder="e.g. Literature Synthesis Matrix Draft"
              value={form.title}
              onChange={update('title')}
              aria-invalid={Boolean(titleError)}
            />
          </div>

          {/* Properties */}
          <div className="td-props">
            <div className="td-prop">
              <span className="td-prop__label">Workspace</span>
              <span className="td-pill td-pill--readonly">
                <span className="td-workspace__dot" /> {workspace.workspace_name}
              </span>
            </div>

            <label className="td-prop">
              <span className="td-prop__label">Status</span>
              <span className="td-select">
                <select className="td-pill td-pill--status" value={form.status} onChange={update('status')}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDownIcon width={12} height={12} strokeWidth={2.5} />
              </span>
            </label>

            <label className="td-prop">
              <span className="td-prop__label">Priority</span>
              <span className="td-select">
                <select
                  className={`td-pill td-pill--priority td-pill--${form.priority.toLowerCase()}`}
                  value={form.priority}
                  onChange={update('priority')}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p} Priority</option>
                  ))}
                </select>
                <ChevronDownIcon width={12} height={12} strokeWidth={2.5} />
              </span>
            </label>

            <label className="td-prop">
              <span className="td-prop__label">
                Target Deadline
                {deadlineError && <span className="td-error"> {deadlineError}</span>}
              </span>
              <span className="td-date">
                <CalendarIcon width={13} height={13} />
                <input
                  className={`td-pill ${deadlineError ? 'td-pill--error' : ''}`}
                  type="date"
                  min={todayISO()}
                  value={form.deadline}
                  onChange={update('deadline')}
                  aria-invalid={Boolean(deadlineError)}
                />
              </span>
            </label>
          </div>

          {/* Notes */}
          <div className="td-field">
            <div className="td-label-row">
              <label htmlFor="td-notes" className="td-section-label">
                <PenLineIcon width={14} height={14} /> Task Notes
              </label>
              <span className="td-hint">Embedded notes for this task</span>
            </div>
            <textarea
              id="td-notes"
              className="td-notes"
              rows={5}
              placeholder="Context, references, or next steps for this task..."
              value={form.notes}
              onChange={update('notes')}
            />
          </div>

          <footer className="td-actions">
            {submitError && <p className="td-submit-error" role="alert">{submitError}</p>}
            <button type="button" className="td-btn td-btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="td-btn td-btn--primary" disabled={saving}>
              <PlusIcon width={13} height={13} strokeWidth={3} /> {saving ? 'Creating…' : 'Create Task'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

export default TaskDrawer;
