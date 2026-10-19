import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, MessageCircleMore } from 'lucide-react';
import { getApiError } from '../../api/chatApi';
import { loginAccount, registerAccount } from '../../api/authApi';
import styles from './AuthScreen.module.css';

/**
 * ChatGPT-inspired authentication screen. Uses the EXISTING Express MVC auth
 * endpoints: POST /api/auth/login and POST /api/auth/register.
 * No direct database calls, unconfigured OAuth buttons, or new backend routes.
 */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const switchMode = () => {
    if (busy) return;
    setMode(current => current === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
    setConfirmPassword('');
    setPasswordVisible(false);
  };

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setBusy(true);
    try {
      const result = isRegister
        ? await registerAccount({ name: name.trim(), email: email.trim(), password })
        : await loginAccount({ email: email.trim(), password });
      onAuthenticated(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand} aria-label='ChatGPT Clone'>
          <span className={styles.brandIcon} aria-hidden='true'><MessageCircleMore size={21} strokeWidth={2.2} /></span>
          <span>ChatGPT <span className={styles.brandLight}>Clone</span></span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.formPanel} aria-labelledby='auth-title'>
          <div className={styles.mobileLogo} aria-hidden='true'>
            <MessageCircleMore size={29} strokeWidth={2} />
          </div>
          <h1 id='auth-title'>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className={styles.description}>
            {isRegister
              ? 'Make an account to save your conversations and AI projects.'
              : 'Log in to continue your conversations and projects.'}
          </p>

          <form className={styles.form} onSubmit={submit} aria-busy={busy}>
            {isRegister && (
              <div className={styles.field}>
                <label htmlFor='auth-name'>Full name</label>
                <input id='auth-name' type='text' autoComplete='name' maxLength={80} required
                  value={name} onChange={event => setName(event.target.value)}
                  placeholder='Enter your name' disabled={busy} />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor='auth-email'>Email address</label>
              <input id='auth-email' type='email' inputMode='email' autoCapitalize='none'
                autoComplete='email' maxLength={254} required
                value={email} onChange={event => setEmail(event.target.value)}
                placeholder='Enter your email address' disabled={busy} />
            </div>

            <div className={styles.field}>
              <label htmlFor='auth-password'>Password</label>
              <div className={styles.passwordBox}>
                <input id='auth-password' type={passwordVisible ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 10 : undefined} maxLength={128} required
                  value={password} onChange={event => setPassword(event.target.value)}
                  placeholder={isRegister ? 'At least 10 characters' : 'Enter your password'} disabled={busy} />
                <button type='button' className={styles.visibilityButton}
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}>
                  {passwordVisible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className={styles.field}>
                <label htmlFor='auth-confirm'>Confirm password</label>
                <input id='auth-confirm' type={passwordVisible ? 'text' : 'password'}
                  autoComplete='new-password' minLength={10} maxLength={128} required
                  value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                  placeholder='Re-enter your password' disabled={busy} />
              </div>
            )}

            {error && <p className={styles.error} role='alert'>{error}</p>}

            <button type='submit' className={styles.submit} disabled={busy}>
              {busy ? <LoaderCircle size={19} className={styles.spinner} aria-hidden='true' /> : null}
              <span>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Continue'}</span>
              {!busy && <ArrowRight size={18} aria-hidden='true' />}
            </button>
          </form>

          <p className={styles.modeSwitch}>
            {isRegister ? 'Already have an account?' : 'Don’t have an account?'}{' '}
            <button type='button' onClick={switchMode} disabled={busy}>
              {isRegister ? 'Log in' : 'Sign up'}
            </button>
          </p>
          <div className={styles.privacyNote}>
            <LockKeyhole size={15} strokeWidth={1.8} aria-hidden='true' />
            <span>Access your own saved chats, images, and research.</span>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Independent learning project · Not affiliated with OpenAI
      </footer>
    </div>
  );
}
