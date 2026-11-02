import { useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import { CheckCircleIcon, ChevronRightIcon, GridIcon } from '../../components/Icons';
import { createWorkspace } from '../../services/workspaces';
import './NewWorkspace.css';

// Matches the workspace table: workspace_name, description (user_id comes from the signed-in user)
const EMPTY_FORM = {
  workspace_name: '',
  description: '',
};

function NewWorkspace({ user, workspaces, onWorkspaceCreated, onNavigate, onSignOut }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);

  const handleInput = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (field === 'workspace_name') setNameError('');
    setSubmitError('');
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setNameError('');
    setSubmitError('');
    setCreated(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.workspace_name.trim()) {
      setNameError('Please enter a workspace name.');
      return;
    }

    setSaving(true);
    try {
      const workspace = await createWorkspace(user.user_id, form);
      setCreated(workspace);
      onWorkspaceCreated?.(workspace);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Once saved, the form is read-only until the user chooses "Create Another"
  const locked = Boolean(created) || saving;

  return (
    <AppLayout user={user} workspaces={workspaces} active="new-workspace" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content nw-content">
        {/* ---------- Header ---------- */}
        <header className="nw-header">
          <p className="nw-breadcrumb">
            <span className="nw-breadcrumb__link">
              <GridIcon width={11} height={11} /> Workspaces
            </span>
            <ChevronRightIcon width={10} height={10} strokeWidth={3} />
            <span className="nw-breadcrumb__current">Create New Workspace</span>
          </p>
          <h1 className="nw-title">Create New Workspace</h1>
          <p className="nw-intro">
            Set up a dedicated academic module, capstone milestone, or independent research track to systematically map
            course deliverables, embedded task notes, and early alerts.
          </p>
        </header>

        <form className="nw-layout" onSubmit={handleSubmit} noValidate>
          <fieldset className="nw-form" disabled={locked}>
            {/* ---------- Details ---------- */}
            <section className="nw-card">
              <div className="nw-card__head">
                <span className="nw-card__icon"><GridIcon width={15} height={15} /></span>
                <div className="nw-card__titles">
                  <h2 className="nw-card__title">Workspace Details</h2>
                </div>
              </div>

              <div className="nw-field">
                <div className="nw-field__labels">
                  <label htmlFor="nw-name">
                    Workspace Name <span className="nw-required">*</span>
                  </label>
                  {nameError && <span className="nw-field__error">{nameError}</span>}
                </div>
                <input
                  id="nw-name"
                  className={`nw-input ${nameError ? 'nw-input--error' : ''}`}
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Distributed Systems"
                  value={form.workspace_name}
                  onChange={handleInput('workspace_name')}
                  aria-invalid={Boolean(nameError)}
                />
              </div>

              <div className="nw-field">
                <div className="nw-field__labels">
                  <label htmlFor="nw-description">Description</label>
                </div>
                <textarea
                  id="nw-description"
                  className="nw-input nw-textarea"
                  rows={4}
                  placeholder="What does this workspace cover?"
                  value={form.description}
                  onChange={handleInput('description')}
                />
              </div>
            </section>
          </fieldset>

          {/* ---------- Footer actions ---------- */}
          <div className="nw-footer">
            {created ? (
              <>
                <p className="nw-footer__success" role="status">
                  <CheckCircleIcon width={16} height={16} /> “{created.workspace_name}” was created.
                </p>
                <button type="button" className="nw-btn nw-btn--text" onClick={resetForm}>
                  Create Another
                </button>
                <button type="button" className="nw-btn nw-btn--primary" onClick={() => onNavigate('dashboard')}>
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <button type="button" className="nw-btn nw-btn--text nw-btn--cancel" onClick={() => onNavigate('dashboard')}>
                  Cancel
                </button>
                {submitError && <p className="nw-footer__error" role="alert">{submitError}</p>}
                <button type="button" className="nw-btn nw-btn--text" onClick={resetForm} disabled={saving}>
                  Reset Form
                </button>
                <button type="submit" className="nw-btn nw-btn--primary" disabled={saving}>
                  <CheckCircleIcon width={16} height={16} /> {saving ? 'Creating…' : 'Create Workspace'}
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </AppLayout>
  );
}

export default NewWorkspace;
