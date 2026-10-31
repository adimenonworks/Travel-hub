import { useEffect, useState } from 'react';
import { Notification, Button, Card, Icon, TextField } from '../../design/components';
import { store } from '../../data';
import { describeAuthError, isInAppBrowser } from '../../lib/authErrors';
import s from './SignIn.module.css';

export function SignIn({ message }: { message?: string }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inApp = isInAppBrowser();

  useEffect(() => {
    store.takeAuthError?.().then((e) => e && setError(describeAuthError(e) ?? ''));
  }, []);

  const go = async () => {
    setBusy(true);
    setError('');
    try {
      await store.signIn(name);
    } catch (e) {
      setError(describeAuthError(e) ?? '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <span className={s.mark}><Icon name="plane" size={40} /></span>
        <h1 className="t-display">Plan trips… together</h1>
        <p className="t-body t-secondary">Whether you’re going solo or with people, plan your trips, know where’s next and keep your travels saved.</p>
      </div>
      <Card className={s.card}>
        {message && <p className="t-body-small">{message}</p>}
        {store.mode === 'firebase' && inApp && (
          <Notification state="warning">You're in an app's built-in browser, where Google sign-in is blocked. Tap the menu (⋯ or ↗) and choose <b>Open in Safari</b> or <b>Open in Chrome</b>.</Notification>
        )}
        {store.mode === 'firebase' ? (
          <Button size="regular" block onClick={go} disabled={busy}>Continue with Google</Button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); go(); }} className={s.form}>
            <TextField label="Your name" placeholder="Alex" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              hint="Demo mode: no account needed. Open another tab with a different name to try collaborating." />
            <Button size="regular" block type="submit" disabled={busy || !name.trim()}>Start planning</Button>
          </form>
        )}
        {error && <p className="t-label-small t-danger">{error}</p>}
      </Card>
    </div>
  );
}
