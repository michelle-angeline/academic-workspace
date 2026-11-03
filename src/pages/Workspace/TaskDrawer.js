import { useEffect, useRef, useState } from 'react';
import { CalendarIcon, CheckIcon, ChevronDownIcon, PenLineIcon, PlusIcon, XIcon } from '../../components/Icons';
import { createTask, updateTask } from '../../services/tasks';
import './TaskDrawer.css';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// Today's date as YYYY-MM-DD in local time (the format <input type="date"> uses)
function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Typing in the title/notes waits this long after the last keystroke before saving
const TEXT_SAVE_DELAY = 600;

// Slide-in drawer for creating or editing a task. Fields match the task table:
// title, notes, deadline, priority, status (+ workspace_id from the open workspace).
// Pass `task` (a row from the API) to edit it; leave it out to create a new task.
// New tasks are saved with "Create Task" (onSaved). Edits are saved to the database
// automatically as you change them (onUpdated is called with each saved row).
function TaskDrawer({ workspace, task, onSaved, onUpdated, onClose }) {
  const editing = Boolean(task);
  // DATETIME "2026-11-20 00:00:00" -> "2026-11-20" for the date input
  const originalDeadline = task?.deadline ? String(task.deadline).slice(0, 10) : '';
  const [form, setForm] = useState({
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    deadline: originalDeadline,
    priority: task?.priority ?? 'Medium',
    status: task?.status ?? 'To Do',
  });
  const [titleError, setTitleError] = useState('');
  const [deadlineError, setDeadlineError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  // Edit mode only: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [saveState, setSaveState] = useState('idle');
  const titleRef = useRef(null);

  // ---------- Autosave (edit mode) ----------
  // Refs so timers and in-flight requests always see the latest values.
  const formRef = useRef(form);
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  // Returns the validation errors for a form ({} when it can be saved)
  const validate = (f) => {
    const errors = {};
    if (!f.title.trim()) errors.title = 'Please enter a task title.';
    // The calendar blocks past dates, but a past date can still be typed in by hand.
    // An existing task may keep its original (possibly past) deadline.
    if (f.deadline && f.deadline !== originalDeadline && f.deadline < todayISO()) {
      errors.deadline = 'Cannot be before today.';
    }
    return errors;
  };

  // Saves the latest form. Saves run one at a time; a change made while a save is
  // in flight is queued, so an older request can never overwrite a newer one.
  const runSave = async () => {
    timerRef.current = null;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    const current = formRef.current;
    if (Object.keys(validate(current)).length) {
      setSaveState('idle');
      return;
    }

    inFlightRef.current = true;
    setSaveState('saving');
    try {
      const row = await updateTask(task.task_id, current);
      onUpdatedRef.current?.(row);
      setSubmitError('');
      setSaveState(queuedRef.current || timerRef.current ? 'pending' : 'saved');
    } catch (err) {
      setSubmitError(err.message);
      setSaveState('error');
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        runSave();
      }
    }
  };

  const scheduleSave = (delay) => {
    clearTimeout(timerRef.current);
    setSaveState('pending');
    timerRef.current = setTimeout(runSave, delay);
  };

  // Closing saves any change that is still waiting for its timer
  const handleClose = () => {
    if (editing && timerRef.current) {
      clearTimeout(timerRef.current);
      runSave();
    }
    onClose();
  };

  // Focus the title once when the drawer opens
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape (the ref keeps the latest handler without re-adding the listener)
  const onCloseRef = useRef(handleClose);
  onCloseRef.current = handleClose;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const update = (field) => (e) => {
    const next = { ...formRef.current, [field]: e.target.value };
    formRef.current = next;
    setForm(next);
    setSubmitError('');

    if (!editing) {
      if (field === 'title') setTitleError('');
      if (field === 'deadline') setDeadlineError('');
      return;
    }

    // Edit mode: show problems right away and save once the value is valid
    const errors = validate(next);
    setTitleError(errors.title || '');
    setDeadlineError(errors.deadline || '');
    if (Object.keys(errors).length) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setSaveState('idle');
      return;
    }
    scheduleSave(field === 'title' || field === 'notes' ? TEXT_SAVE_DELAY : 0);
  };

  // Create mode: "Create Task". Edit mode: Enter / "Done" just closes (changes are already saved).
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      handleClose();
      return;
    }

    const errors = validate(form);
    setTitleError(errors.title || '');
    setDeadlineError(errors.deadline || '');
    if (errors.title) titleRef.current?.focus();
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      onSaved(await createTask(workspace.workspace_id, form));
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  };

  const saveMessage = {
    pending: 'Unsaved changes…',
    saving: 'Saving…',
    saved: 'All changes saved',
  }[saveState];

  return (
    <div className="td-overlay" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <aside className="td-drawer" role="dialog" aria-modal="true" aria-labelledby="td-heading">
        <header className="td-head">
          <span className="td-workspace">
            <span className="td-workspace__dot" /> {workspace.workspace_name}
          </span>
          <button type="button" className="td-close" onClick={handleClose} aria-label="Close">
            <XIcon width={18} height={18} />
          </button>
        </header>

        <form className="td-body" onSubmit={handleSubmit} noValidate>
          <h2 className="td-heading" id="td-heading">{editing ? 'Edit Task' : 'New Task'}</h2>

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
            {editing ? (
              <>
                <p className={`td-save-status td-save-status--${saveState}`} role="status" aria-live="polite">
                  {saveState === 'saved' && <CheckIcon width={12} height={12} strokeWidth={3} />}
                  {saveMessage || 'Changes save automatically'}
                </p>
                <button type="submit" className="td-btn td-btn--primary">
                  <CheckIcon width={13} height={13} strokeWidth={3} /> Done
                </button>
              </>
            ) : (
              <>
                <button type="button" className="td-btn td-btn--ghost" onClick={handleClose} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="td-btn td-btn--primary" disabled={saving}>
                  <PlusIcon width={13} height={13} strokeWidth={3} /> {saving ? 'Creating…' : 'Create Task'}
                </button>
              </>
            )}
          </footer>
        </form>
      </aside>
    </div>
  );
}

export default TaskDrawer;
