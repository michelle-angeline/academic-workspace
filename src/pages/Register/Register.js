import { useState } from 'react';
import { signUp } from '../../services/auth';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AtIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  GraduationCapSolidIcon,
  IdBadgeIcon,
  LockIcon,
  ShieldCheckIcon,
} from '../../components/Icons';
import './Register.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

function validate({ fullName, email, password, confirmPassword }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Please enter your full name.';
  if (!email.trim()) errors.email = 'Please enter your email.';
  else if (!EMAIL.test(email.trim())) errors.email = 'Please enter a valid email.';
  if (password.length < 8 || !HAS_SYMBOL.test(password)) {
    errors.password = 'At least 8 characters, including a symbol.';
  }
  if (!confirmPassword) errors.confirmPassword = 'Please re-enter your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

function Register({ onRegistered, onSignIn }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMatch = form.confirmPassword !== '' && form.confirmPassword === form.password;

  // Clear a field's error as soon as the user starts correcting it.
  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      const user = await signUp(form);
      onRegistered?.(user);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `register-input ${errors[field] ? 'register-input--error' : ''}`;

  return (
    <div className="register-page">
      <header className="register-brand">
        <span className="register-brand__logo">
          <GraduationCapIcon />
        </span>
        <span className="register-brand__name">Athena</span>
      </header>

      <main className="register-card">
        <div className="register-card__icon">
          <GraduationCapSolidIcon width={24} height={24} />
        </div>
        <h1 className="register-card__title">Create an Account</h1>
        <p className="register-card__subtitle">
          Your personal academic workspace
        </p>

        {submitError && (
          <div className="register-alert" role="alert">
            <AlertCircleIcon className="register-alert__icon" />
            <p className="register-alert__message">{submitError}</p>
          </div>
        )}

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <div className="register-field">
            <div className="register-field__labels">
              <label htmlFor="fullName">Full Name</label>
              {errors.fullName && <span className="register-field__error">{errors.fullName}</span>}
            </div>
            <div className={inputClass('fullName')}>
              <IdBadgeIcon className="register-input__icon" />
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Alex Morgan"
                value={form.fullName}
                onChange={handleChange('fullName')}
                aria-invalid={Boolean(errors.fullName)}
              />
            </div>
          </div>

          <div className="register-field">
            <div className="register-field__labels">
              <label htmlFor="email">Email</label>
              {errors.email && <span className="register-field__error">{errors.email}</span>}
            </div>
            <div className={inputClass('email')}>
              <AtIcon className="register-input__icon" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@mail.com"
                value={form.email}
                onChange={handleChange('email')}
                aria-invalid={Boolean(errors.email)}
              />
            </div>
          </div>

          <div className="register-field">
            <div className="register-field__labels">
              <label htmlFor="password">Password</label>
              {errors.password && <span className="register-field__error">{errors.password}</span>}
            </div>
            <div className={inputClass('password')}>
              <LockIcon className="register-input__icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters, include symbols"
                value={form.password}
                onChange={handleChange('password')}
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                className="register-input__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="register-field">
            <div className="register-field__labels">
              <label htmlFor="confirmPassword">Confirm Password</label>
              {errors.confirmPassword && (
                <span className="register-field__error">{errors.confirmPassword}</span>
              )}
            </div>
            <div className={inputClass('confirmPassword')}>
              <ShieldCheckIcon className="register-input__icon" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              <CheckCircleIcon
                className={`register-input__status ${passwordsMatch ? 'register-input__status--ok' : ''}`}
              />
            </div>
          </div>

          <button type="submit" className="register-submit" disabled={loading}>
            {loading ? 'Creating workspace…' : 'Create Academic Workspace'}
            {!loading && <ArrowRightIcon width={18} height={18} />}
          </button>
        </form>

        <p className="register-footer">
          Already have an account?{' '}
          <button type="button" className="register-footer__link" onClick={onSignIn}>
            Sign in
            <ChevronRightIcon width={14} height={14} strokeWidth={2.5} />
          </button>
        </p>
      </main>
    </div>
  );
}

export default Register;
