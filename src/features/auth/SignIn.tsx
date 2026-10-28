import { useEffect, useState } from 'react';
import { Banner, Button, Card, Icon, TextField } from '../../design/components';
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
        <h1 className="t-large-title">Trip Hub</h1>
        <p className="t-body t-secondary">Plan trips together: a day-by-day itinerary, an ideas board, a shared budget and local weather.</p>
      </div>
      <Card className={s.card}>
        {message && <p className="t-subhead">{message}</p>}
        {store.mode === 'firebase' && inApp && (
          <Banner>You're in an app's built-in browser, where Google sign-in is blocked. Tap the menu (⋯ or ↗) and choose <b>Open in Safari</b> or <b>Open in Chrome</b>.</Banner>
        )}
        {store.mode === 'firebase' ? (
          <Button size="large" block onClick={go} disabled={busy}>Continue with Google</Button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); go(); }} className={s.form}>
            <TextField label="Your name" placeholder="Alex" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              hint="Demo mode: no account needed. Open another tab with a different name to try collaborating." />
            <Button size="large" block type="submit" disabled={busy || !name.trim()}>Start planning</Button>
          </form>
        )}
        {error && <p className="t-footnote t-danger">{error}</p>}
      </Card>
    </div>
  );
}
