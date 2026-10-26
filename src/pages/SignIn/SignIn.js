import { useState } from 'react';
import { signIn } from '../../services/auth';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AtIcon,
  BookOpenIcon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  LockIcon,
  WarningIcon,
} from '../../components/Icons';
import './SignIn.css';

function SignIn({ onSignedIn, onCreateAccount }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasError = Boolean(error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email, password);
      onSignedIn?.(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear the error state as soon as the user starts correcting their input.
  const handleChange = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="signin-page">
      <header className="signin-brand">
        <span className="signin-brand__logo">
          <GraduationCapIcon />
        </span>
        <span className="signin-brand__name">Athena</span>
      </header>

      <main className="signin-card">
        <div className="signin-card__icon">
          <BookOpenIcon width={26} height={26} />
        </div>
        <h1 className="signin-card__title">Athena</h1>
        <p className="signin-card__subtitle">
          Your personal academic workspace
        </p>

        {hasError && (
          <div className="signin-alert" role="alert">
            <AlertCircleIcon className="signin-alert__icon" />
            <div>
              <p className="signin-alert__title">Authentication failed</p>
              <p className="signin-alert__message">{error}</p>
            </div>
          </div>
        )}

        <form className="signin-form" onSubmit={handleSubmit} noValidate>
          <div className="signin-field">
            <div className="signin-field__labels">
              <label htmlFor="email">Email Address</label>
              {hasError && (
                <span className="signin-field__error">
                  <WarningIcon width={13} height={13} />
                  Unrecognized account
                </span>
              )}
            </div>
            <div className={`signin-input ${hasError ? 'signin-input--error' : ''}`}>
              <AtIcon className="signin-input__icon" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@mail.com"
                value={email}
                onChange={handleChange(setEmail)}
                aria-invalid={hasError}
              />
              {hasError && <AlertCircleIcon className="signin-input__status" />}
            </div>
          </div>

          <div className="signin-field">
            <div className="signin-field__labels">
              <label htmlFor="password">Password</label>
              {hasError && <span className="signin-field__error">Incorrect password</span>}
            </div>
            <div className={`signin-input ${hasError ? 'signin-input--error' : ''}`}>
              <LockIcon className="signin-input__icon" />
              <input
                id="password"
                className="signin-input__password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={handleChange(setPassword)}
                aria-invalid={hasError}
              />
              <button
                type="button"
                className="signin-input__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="signin-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading && <ArrowRightIcon width={18} height={18} />}
          </button>
        </form>

        <p className="signin-footer">
          Don't have an account yet?{' '}
          <button type="button" className="signin-footer__link" onClick={onCreateAccount}>
            Create an account
          </button>
        </p>
      </main>
    </div>
  );
}

export default SignIn;
