import type { ReactNode } from 'react';
import { Banner } from '../design/components';
import { store } from '../data';
import s from './Shell.module.css';

/**
 * App frame. There is no top bar: each page's header carries its own navigation
 * (Home links to your profile, other pages have a back link).
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <main id="main" className={s.main}>
        {store.mode === 'demo' && (
          <div className={s.demo}>
            <Banner>Demo mode: data is saved only in this browser. Connect Firebase to share trips with friends (see README).</Banner>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function Content({ children }: { children: ReactNode }) {
  return <div className={s.content}>{children}</div>;
}
