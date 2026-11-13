import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, LinkButton, Logo } from '../../design/components';
import { APP_STORE_URL, appLink, knownToHaveApp, rememberHasApp } from '../../lib/site';
import s from './SignIn.module.css';

/**
 * The website's only page besides joining (it's join-only): Rove lives in the iPhone app. After accepting an invite
 * (?path=/join/abc&joined=Alex's Portugal collection) it says you're in. "Open in Rove" opens the app at that page; if
 * that worked on this device before, it's tried straight away. "Get Rove" goes to the App Store once Rove is listed.
 */
export function GetApp() {
  const [params] = useSearchParams();
  const path = params.get('path') ?? '/';
  const joined = params.get('joined');
  const link = appLink(path);
  const tried = useRef(false);

  // Leaving the page soon after "Open in Rove" means the app opened: remember it for next time
  const open = () => {
    location.href = link;
    const left = () => { if (document.hidden) rememberHasApp(); };
    document.addEventListener('visibilitychange', left, { once: true });
    setTimeout(() => document.removeEventListener('visibilitychange', left), 2500);
  };
  useEffect(() => {
    if (tried.current || !knownToHaveApp()) return;
    tried.current = true;
    location.href = link;
  }, [link]);

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <span className={s.mark}><Logo size={88} /></span>
        <h1 className="t-display">{joined ? 'You’re in!' : 'Rove lives on your iPhone'}</h1>
        <p className="t-body t-secondary">{joined
          ? `${joined} is waiting for you in the Rove app.`
          : 'Plan trips together, save places you find and keep your travels in one place.'}</p>
      </div>
      <Card className={s.card}>
        <Button size="large" block onClick={open}>Open in Rove</Button>
        {APP_STORE_URL
          ? <LinkButton href={APP_STORE_URL} tone="neutral" size="large" block>Get Rove on the App Store</LinkButton>
          : <p className="t-body-small t-secondary">Don’t have Rove yet? It’s coming to the App Store soon. Ask whoever invited you how to get it.</p>}
      </Card>
    </div>
  );
}
