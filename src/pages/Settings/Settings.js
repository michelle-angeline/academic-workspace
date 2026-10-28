import { useRef, useState } from 'react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Avatar from '../../components/Avatar';
import {
  BellIcon,
  CalendarClockIcon,
  CalendarXIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  HourglassIcon,
  IdBadgeIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MinusIcon,
  MonitorIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldIcon,
  SlidersIcon,
  UploadIcon,
  UserIcon,
} from '../../components/Icons';
import { changePassword, removeProfilePhoto, updateProfile, uploadProfilePhoto } from '../../services/users';
import './Settings.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const TABS = [
  { id: 'profile', label: 'Profile & Identity', Icon: IdBadgeIcon },
  { id: 'password', label: 'Password & Security', Icon: KeyIcon },
  { id: 'rules', label: 'Early Alert Rules', Icon: SlidersIcon },
  { id: 'sessions', label: 'Sessions & Access', Icon: MonitorIcon, disabled: true },
];

// Alert rules have no table in the database yet, so they are kept in this browser per user.
const DEFAULT_RULES = {
  dueSoon: { enabled: true, days: 3 },
  stalled: { enabled: true, days: 7 },
  highPriority: { enabled: true },
};

const rulesKey = (user) => `athena.alertRules.${user?.user_id ?? 'guest'}`;

function loadRules(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(rulesKey(user)));
    if (saved) return { ...DEFAULT_RULES, ...saved };
  } catch {
    // Storage unavailable or corrupted: fall back to defaults
  }
  return DEFAULT_RULES;
}

// ---------- Small building blocks ----------

function Message({ message }) {
  if (!message) return null;
  return (
    <p className={`settings-message settings-message--${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
      {message.text}
    </p>
  );
}

function PasswordField({ id, label, value, onChange, placeholder, autoComplete, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="settings-field">
      <div className="settings-field__labels">
        <label htmlFor={id}>{label}</label>
        {error && <span className="settings-field__error">{error}</span>}
      </div>
      <div className={`settings-input ${error ? 'settings-input--error' : ''}`}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          className="settings-input__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <span className="settings-toggle">
      <span className="settings-toggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`settings-switch ${checked ? 'settings-switch--on' : ''}`}
        onClick={() => onChange?.(!checked)}
      >
        <span className="settings-switch__thumb" />
      </button>
    </span>
  );
}

function DaysControl({ value, min, max, mid, midLabel, onChange, accent, disabled }) {
  const set = (next) => onChange(Math.min(max, Math.max(min, next)));
  const unit = (n) => (n === 1 ? 'Day' : 'Days');
  return (
    <div className={`settings-days ${disabled ? 'settings-days--disabled' : ''}`} style={{ '--accent-color': accent }}>
      <div className="settings-days__value">
        <strong>{value}</strong> {unit(value)}
        <button type="button" className="settings-step" onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label="Decrease days">
          <MinusIcon width={14} height={14} />
        </button>
        <button type="button" className="settings-step" onClick={() => set(value + 1)} disabled={disabled || value >= max} aria-label="Increase days">
          <PlusIcon width={14} height={14} />
        </button>
      </div>
      <div className="settings-days__range">
        <div className="settings-days__labels">
          <span>{min} {unit(min)}</span>
          <span>{mid} Days ({midLabel})</span>
          <span>{max} Days</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="Days threshold"
          style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ---------- Page ----------

function Settings({ user, onUserUpdated, onNavigate, onSignOut }) {
  const sectionRefs = { profile: useRef(null), password: useRef(null), rules: useRef(null) };
  const [activeTab, setActiveTab] = useState('profile');

  // Profile
  const [profile, setProfile] = useState({ name: user.name, email: user.email });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileMessage, setProfileMessage] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInput = useRef(null);
  const profileDirty = profile.name !== user.name || profile.email !== user.email;

  // Password
  const emptyPasswords = { current: '', next: '', confirm: '' };
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Alert rules
  const [rules, setRules] = useState(() => loadRules(user));
  const [rulesMessage, setRulesMessage] = useState(null);

  const goToTab = (id) => {
    setActiveTab(id);
    sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ----- Profile handlers -----

  const handleProfileChange = (field) => (e) => {
    setProfile((p) => ({ ...p, [field]: e.target.value }));
    setProfileErrors((errs) => ({ ...errs, [field]: undefined }));
    setProfileMessage(null);
  };

  const discardProfile = () => {
    setProfile({ name: user.name, email: user.email });
    setProfileErrors({});
    setProfileMessage(null);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!profile.name.trim()) errors.name = 'Please enter your full name.';
    if (!EMAIL.test(profile.email.trim())) errors.email = 'Please enter a valid email.';
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingProfile(true);
    try {
      const updated = await updateProfile(user.user_id, profile);
      onUserUpdated(updated);
      setProfile({ name: updated.name, email: updated.email });
      setProfileMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow choosing the same file again later
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setProfileMessage({ type: 'error', text: 'Photo must be a JPG, PNG, WEBP or GIF image.' });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setProfileMessage({ type: 'error', text: 'Photo must be 2 MB or smaller.' });
      return;
    }

    setPhotoBusy(true);
    setProfileMessage(null);
    try {
      const updated = await uploadProfilePhoto(user.user_id, file);
      onUserUpdated(updated);
      setProfileMessage({ type: 'success', text: 'Profile photo updated.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    setProfileMessage(null);
    try {
      const updated = await removeProfilePhoto(user.user_id);
      onUserUpdated(updated);
      setProfileMessage({ type: 'success', text: 'Profile photo removed.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message });
    } finally {
      setPhotoBusy(false);
    }
  };

  // ----- Password handlers -----

  const handlePasswordChange = (field) => (e) => {
    setPasswords((p) => ({ ...p, [field]: e.target.value }));
    setPasswordErrors((errs) => ({ ...errs, [field]: undefined }));
    setPasswordMessage(null);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!passwords.current) errors.current = 'Required.';
    if (passwords.next.length < 8 || !HAS_SYMBOL.test(passwords.next)) {
      errors.next = 'Min. 8 characters with a symbol.';
    } else if (passwords.next === passwords.current) {
      errors.next = 'Must differ from current.';
    }
    if (!passwords.confirm) errors.confirm = 'Required.';
    else if (passwords.confirm !== passwords.next) errors.confirm = 'Passwords do not match.';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    try {
      await changePassword(user.user_id, passwords.current, passwords.next);
      setPasswords(emptyPasswords);
      setPasswordMessage({ type: 'success', text: 'Password updated.' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  // ----- Alert rule handlers -----

  const updateRule = (rule, changes) => {
    setRules((r) => ({ ...r, [rule]: { ...r[rule], ...changes } }));
    setRulesMessage(null);
  };

  const saveRules = () => {
    try {
      localStorage.setItem(rulesKey(user), JSON.stringify(rules));
      setRulesMessage({ type: 'success', text: 'Alert rules saved.' });
    } catch {
      setRulesMessage({ type: 'error', text: 'Could not save alert rules in this browser.' });
    }
  };

  const restoreDefaults = () => {
    setRules(DEFAULT_RULES);
    setRulesMessage({ type: 'info', text: 'Defaults restored. Click Save Alert Rules to keep them.' });
  };

  return (
    <AppLayout user={user} active="settings" onNavigate={onNavigate} onSignOut={onSignOut}>
      <main className="dash-content settings-content">
        {/* ---------- Header ---------- */}
        <header className="settings-header">
          <p className="settings-breadcrumb">
            <button type="button" onClick={() => onNavigate('dashboard')}>Athena</button>
            <span aria-hidden="true">/</span>
            <strong>Settings &amp; Preferences</strong>
          </p>
          <div className="settings-header__row">
            <div>
              <h1 className="settings-title">Account Settings &amp; Preferences</h1>
              <p className="settings-intro">
                Manage your academic credentials, secure session authentications, and fine-tune the deterministic
                early alert engine thresholds evaluating across all workspaces.
              </p>
            </div>
            <span className="settings-engine">
              <span className="dash-dot dash-dot--live" /> Rules Engine: Active &amp; Synced
            </span>
          </div>

          <nav className="settings-tabs" aria-label="Settings sections">
            {TABS.map(({ id, label, Icon, disabled }) => (
              <button
                key={id}
                type="button"
                className={`settings-tab ${activeTab === id ? 'settings-tab--active' : ''}`}
                onClick={() => goToTab(id)}
                disabled={disabled}
                title={disabled ? 'Coming soon' : undefined}
              >
                <Icon width={15} height={15} /> {label}
              </button>
            ))}
          </nav>
        </header>

        {/* ---------- Profile ---------- */}
        <section className="settings-card" ref={sectionRefs.profile}>
          <div className="settings-card__head">
            <span className="settings-card__icon settings-card__icon--blue"><UserIcon width={18} height={18} /></span>
            <div>
              <h2 className="settings-card__title">Personal Academic Profile</h2>
            </div>
          </div>

          <div className="settings-identity">
            <Avatar user={user} className="settings-identity__avatar" />
            <div className="settings-identity__info">
              <p className="settings-identity__name">{user.name}</p>
              <p className="settings-identity__email">{user.email}</p>
              <div className="settings-identity__actions">
                <button
                  type="button"
                  className="settings-upload"
                  onClick={() => fileInput.current.click()}
                  disabled={photoBusy}
                >
                  <UploadIcon width={13} height={13} /> {photoBusy ? 'Uploading…' : 'Upload New Photo'}
                </button>
                {user.profile_photo && (
                  <button type="button" className="settings-link-btn" onClick={handleRemovePhoto} disabled={photoBusy}>
                    Remove
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept={PHOTO_TYPES.join(',')}
                  onChange={handlePhotoSelected}
                  hidden
                />
              </div>
              <p className="settings-identity__hint">JPG, PNG, WEBP or GIF, up to 2 MB.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} noValidate>
            <div className="settings-grid settings-grid--2">
              <div className="settings-field">
                <div className="settings-field__labels">
                  <label htmlFor="settings-name">Full Name</label>
                  {profileErrors.name && <span className="settings-field__error">{profileErrors.name}</span>}
                </div>
                <div className={`settings-input ${profileErrors.name ? 'settings-input--error' : ''}`}>
                  <input
                    id="settings-name"
                    type="text"
                    autoComplete="name"
                    value={profile.name}
                    onChange={handleProfileChange('name')}
                    aria-invalid={Boolean(profileErrors.name)}
                  />
                </div>
              </div>

              <div className="settings-field">
                <div className="settings-field__labels">
                  <label htmlFor="settings-email">Email Address</label>
                  {profileErrors.email && <span className="settings-field__error">{profileErrors.email}</span>}
                </div>
                <div className={`settings-input ${profileErrors.email ? 'settings-input--error' : ''}`}>
                  <input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    value={profile.email}
                    onChange={handleProfileChange('email')}
                    aria-invalid={Boolean(profileErrors.email)}
                  />
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <Message message={profileMessage} />
              <button type="button" className="settings-btn settings-btn--ghost" onClick={discardProfile} disabled={!profileDirty || savingProfile}>
                Discard
              </button>
              <button type="submit" className="settings-btn settings-btn--primary" disabled={!profileDirty || savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* ---------- Password ---------- */}
        <section className="settings-card" ref={sectionRefs.password}>
          <div className="settings-card__head">
            <span className="settings-card__icon settings-card__icon--purple"><ShieldIcon width={18} height={18} /></span>
            <div>
              <h2 className="settings-card__title">Password &amp; Security</h2>
              <p className="settings-card__subtitle">Authentication tokens, credentials, and institutional single sign-on link</p>
            </div>
          </div>

          <form onSubmit={savePassword} noValidate>
            <div className="settings-grid settings-grid--3">
              <PasswordField
                id="current-password"
                label="Current Password"
                autoComplete="current-password"
                placeholder="Enter current password"
                value={passwords.current}
                onChange={handlePasswordChange('current')}
                error={passwordErrors.current}
              />
              <PasswordField
                id="new-password"
                label="New Password"
                autoComplete="new-password"
                placeholder="Enter new strong passphrase"
                value={passwords.next}
                onChange={handlePasswordChange('next')}
                error={passwordErrors.next}
              />
              <PasswordField
                id="confirm-new-password"
                label="Confirm New Password"
                autoComplete="new-password"
                placeholder="Confirm password"
                value={passwords.confirm}
                onChange={handlePasswordChange('confirm')}
                error={passwordErrors.confirm}
              />
            </div>

            <div className="settings-actions">
              <Message message={passwordMessage} />
              <button type="submit" className="settings-btn settings-btn--soft" disabled={savingPassword}>
                <LockIcon width={15} height={15} /> {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* ---------- Early alert rules ---------- */}
        <section className="settings-card" ref={sectionRefs.rules}>
          <div className="settings-card__head">
            <span className="settings-card__icon settings-card__icon--gradient"><SlidersIcon width={18} height={18} /></span>
            <div>
              <h2 className="settings-card__title">Early Alert Rules Configuration</h2>
              <p className="settings-card__subtitle settings-card__subtitle--narrow">
                Configure rule conditions and alert thresholds across academic workspaces to help detect upcoming
                deadlines and potential task delays early.
              </p>
            </div>
          </div>

          <div className="settings-signal">
            <span className="settings-signal__icon"><BellIcon width={15} height={15} /></span>
            <p>
              <strong>4 Active Alert Signals Currently Triggered</strong>
              <span>Evaluated across 5 Workspaces (Database Systems, Capstone, HCI, Computer Networks, Applied Stats)</span>
            </p>
          </div>

          <ul className="settings-rules">
            <li className="settings-rule">
              <span className="settings-rule__icon settings-rule__icon--red"><CalendarXIcon width={17} height={17} /></span>
              <div className="settings-rule__body">
                <h3 className="settings-rule__title">
                  Rule 1: Overdue Deliverable Alert <span className="settings-badge settings-badge--red">Overdue Flag</span>
                </h3>
                <p className="settings-rule__desc">
                  Flag any uncompleted task whose submission deadline timestamp has elapsed. Triggers persistent red
                  urgent banners on course boards and drawer notifications.
                </p>
                <p className="settings-rule__note settings-rule__note--red">
                  <LockIcon width={12} height={12} /> Strict Deterministic Rule (Always active on overdue tasks)
                </p>
              </div>
              <Toggle label="Active" checked disabled />
            </li>

            <li className="settings-rule">
              <span className="settings-rule__icon settings-rule__icon--blue"><CalendarClockIcon width={17} height={17} /></span>
              <div className="settings-rule__body">
                <h3 className="settings-rule__title">
                  Rule 2: Due Soon Horizon Window <span className="settings-badge settings-badge--amber">Amber Pre-Warning</span>
                </h3>
                <p className="settings-rule__desc">
                  Alert when an uncompleted task deadline is approaching within a customizable horizon window.
                </p>
                <DaysControl
                  value={rules.dueSoon.days}
                  min={1}
                  max={7}
                  mid={3}
                  midLabel="Standard"
                  accent="#00658d"
                  disabled={!rules.dueSoon.enabled}
                  onChange={(days) => updateRule('dueSoon', { days })}
                />
                <p className="settings-rule__note">
                  <InfoIcon width={13} height={13} /> Tasks with deadlines within ≤ {rules.dueSoon.days}{' '}
                  {rules.dueSoon.days === 1 ? 'day' : 'days'} will trigger amber warning flags on your Kanban board and
                  dashboard summary.
                </p>
              </div>
              <Toggle
                label={rules.dueSoon.enabled ? 'Enabled' : 'Disabled'}
                checked={rules.dueSoon.enabled}
                onChange={(enabled) => updateRule('dueSoon', { enabled })}
              />
            </li>

            <li className="settings-rule">
              <span className="settings-rule__icon settings-rule__icon--purple"><HourglassIcon width={17} height={17} /></span>
              <div className="settings-rule__body">
                <h3 className="settings-rule__title">
                  Rule 3: Stalled / Inactive Task Threshold <span className="settings-badge settings-badge--purple">Stalled Flag</span>
                </h3>
                <p className="settings-rule__desc">
                  Flag tasks in 'In Progress' or 'Review' that have had no recent updates or recorded activity.
                  Identifies academic stagnation early.
                </p>
                <DaysControl
                  value={rules.stalled.days}
                  min={3}
                  max={14}
                  mid={7}
                  midLabel="Recommended"
                  accent="#7c4ddb"
                  disabled={!rules.stalled.enabled}
                  onChange={(days) => updateRule('stalled', { days })}
                />
                <p className="settings-rule__note settings-rule__note--purple">
                  <InfoIcon width={13} height={13} /> Tasks idle for longer than {rules.stalled.days} days trigger
                  stalled alerts.
                </p>
              </div>
              <Toggle
                label={rules.stalled.enabled ? 'Enabled' : 'Disabled'}
                checked={rules.stalled.enabled}
                onChange={(enabled) => updateRule('stalled', { enabled })}
              />
            </li>

            <li className="settings-rule">
              <span className="settings-rule__icon settings-rule__icon--sky" aria-hidden="true">!</span>
              <div className="settings-rule__body">
                <h3 className="settings-rule__title">
                  Rule 4: High Priority Not Started <span className="settings-badge settings-badge--blue">Procrastination Alert</span>
                </h3>
                <p className="settings-rule__desc">
                  Flag academic tasks marked as High Priority that have not yet been started (status remains 'To Do').
                </p>
              </div>
              <Toggle
                label={rules.highPriority.enabled ? 'Enabled' : 'Disabled'}
                checked={rules.highPriority.enabled}
                onChange={(enabled) => updateRule('highPriority', { enabled })}
              />
            </li>
          </ul>

          <div className="settings-actions settings-actions--split">
            <button type="button" className="settings-btn settings-btn--ghost" onClick={restoreDefaults}>
              <RotateCcwIcon width={14} height={14} /> Restore Defaults
            </button>
            <Message message={rulesMessage} />
            <button type="button" className="settings-btn settings-btn--primary" onClick={saveRules}>
              <CheckIcon width={15} height={15} /> Save Alert Rules
            </button>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default Settings;
