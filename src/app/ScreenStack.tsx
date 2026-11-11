import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavigationType, UNSAFE_LocationContext, useLocation, useNavigationType, type Location } from 'react-router-dom';
import { peekTransition, screenKey, useScreenTransition } from './navigation';
import s from './Shell.module.css';

type Kind = 'push' | 'back' | 'tab';
type Screen = { key: string; location: Location };
type Leaving = Screen & { top: number; kind: Kind };

/** How long each change takes (matches Shell.module.css). */
const DURATION: Record<Kind, number> = { push: 420, back: 420, tab: 220 };

/**
 * Screen changes the iPhone way: both screens move together. Opening something slides the new screen in from the
 * right over the old one, which drifts 30% left and dims; Back is the mirror (the current screen slides off to the
 * right, the previous one comes in from the left and brightens); the Bottom Nav cross-fades, the old tab fading out
 * over the new one, so there's never a blank frame.
 *
 * The change is noticed while rendering, so the leaving screen never leaves the React tree: it keeps its key and
 * position, so nothing is rebuilt, and is pinned where it was on screen in a fixed layer while the new screen takes
 * the page and its own scroll position. Only transform and opacity animate. Each screen renders the routes for its
 * own location, so the leaving one keeps showing what it showed. A swipe back or a redirect ('none') has no layer.
 */
export function ScreenStack({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const key = screenKey(location.pathname);
  const els = useRef(new Map<string, HTMLDivElement>());
  const [st, setSt] = useState<{ cur: Screen; leaving: Leaving | null }>({ cur: { key, location }, leaving: null });
  if (st.cur.key !== key) {
    const kind = peekTransition(navType);
    const el = els.current.get(st.cur.key);
    // Measured before anything moves: where the old screen sits on screen right now
    const top = el ? el.getBoundingClientRect().top : 0;
    setSt({ cur: { key, location }, leaving: kind === 'none' || !el ? null : { ...st.cur, top, kind } });
  } else if (st.cur.location !== location) setSt({ ...st, cur: { key, location } });
  useScreenTransition(); // scroll memory and the transition request

  const leaving = st.leaving;
  // Hold the animation on its first frame until the new screen has been drawn (two animation frames), so the
  // moment React spends building it never eats the start of the slide. Then it runs on the graphics chip.
  const [running, setRunning] = useState<Leaving | null>(null);
  useEffect(() => {
    if (!leaving) return;
    let t = 0;
    const a = requestAnimationFrame(() => { t = requestAnimationFrame(() => setRunning(leaving)); });
    const end = window.setTimeout(() => setSt((x) => (x.leaving === leaving ? { ...x, leaving: null } : x)), DURATION[leaving.kind] + 40);
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(t); window.clearTimeout(end); };
  }, [leaving]);
  const paused = !!leaving && running !== leaving;

  const screens: (Screen & { out?: Leaving })[] = [...(leaving ? [{ ...leaving, out: leaving }] : []), { key, location }];
  return (
    <>
      {screens.map((sc) => (
        <div key={sc.key} ref={(el) => { if (el) els.current.set(sc.key, el); else els.current.delete(sc.key); }}
          className={(sc.out ? [s.leaving, s[`out-${sc.out.kind}`]] : [s.screen, leaving && s[`in-${leaving.kind}`]]).concat(paused ? s.paused : '').filter(Boolean).join(' ')}
          style={sc.out ? { top: sc.out.top } : undefined} aria-hidden={sc.out ? true : undefined} inert={sc.out ? true : undefined}>
          <UNSAFE_LocationContext.Provider value={{ location: sc.location, navigationType: sc.out ? NavigationType.Pop : navType }}>
            {children}
          </UNSAFE_LocationContext.Provider>
        </div>
      ))}
    </>
  );
}
