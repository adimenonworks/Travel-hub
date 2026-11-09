import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NavigationType, UNSAFE_LocationContext, useLocation, useNavigate, type Location } from 'react-router-dom';
import { nextTransition, previousScreen, rememberLocation } from './navigation';
import s from './Shell.module.css';

type Drag = { prev: Location; scrollY: number; dx: number; settling?: 'back' | 'stay' };

/**
 * Swipe back, the iPhone way: a drag that starts at the screen's left edge pulls the current screen to the right and
 * shows the real previous screen underneath (drawn from the same routes, at the scroll position it was left at), so
 * the swipe never reveals an empty page. Let go past a third of the way, or with a flick, and it goes back; otherwise
 * it springs back. The web view's own swipe is turned off in the iPhone app (RoveViewController) so only this one runs.
 * `routes` renders the app's routes for whatever location is in context.
 */
export function SwipeBack({ routes, children }: { routes: ReactNode; children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<{ x: number; y: number; t: number; dir: 'x' | 'y' | null; prev: Location; scrollY: number } | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;

  // Keep the history of screens so the previous one can be drawn; a finished navigation ends any drag
  useLayoutEffect(() => { rememberLocation(location); setDrag(null); }, [location]);

  useEffect(() => {
    const W = () => window.innerWidth;
    const start = (e: TouchEvent) => {
      const p = e.touches[0];
      if (e.touches.length !== 1 || p.clientX > 24 || dragRef.current) return;
      // Not over a sheet, a full-screen flow or anything else that floats above the page
      if (document.querySelector('[role=dialog][aria-modal=true], [data-flow]')) return;
      const prev = previousScreen();
      if (!prev) return;
      live.current = { x: p.clientX, y: p.clientY, t: Date.now(), dir: null, prev: prev.location, scrollY: prev.scrollY };
    };
    const move = (e: TouchEvent) => {
      const l = live.current;
      if (!l) return;
      const p = e.touches[0], mx = p.clientX - l.x, my = p.clientY - l.y;
      if (!l.dir) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        l.dir = mx > 0 && Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
        if (l.dir === 'y') { live.current = null; return; }
      }
      e.preventDefault(); // the page doesn't scroll while it's being dragged away
      setDrag({ prev: l.prev, scrollY: l.scrollY, dx: Math.max(0, Math.min(W(), mx)) });
    };
    const end = (e: TouchEvent) => {
      const l = live.current;
      live.current = null;
      const d = dragRef.current;
      if (!l || !d || l.dir !== 'x') return;
      const dx = e.changedTouches[0].clientX - l.x, speed = dx / Math.max(1, Date.now() - l.t);
      const back = dx > W() / 3 || speed > 0.5;
      setDrag({ ...d, dx: back ? W() : 0, settling: back ? 'back' : 'stay' });
      window.setTimeout(() => {
        if (back) { nextTransition('none'); navigate(-1); }
        else setDrag(null);
      }, 220);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: true });
    window.addEventListener('touchcancel', end, { passive: true });
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [navigate]);

  const progress = drag ? drag.dx / window.innerWidth : 0;
  return (
    <>
      {drag && (
        <div className={s.under} aria-hidden="true" inert>
          <div className={`${s.underPage}${drag.settling ? ` ${s.settling}` : ''}`}
            style={{ transform: `translate(${(progress - 1) * 30}%, ${-drag.scrollY}px)` }}>
            <UNSAFE_LocationContext.Provider value={{ location: drag.prev, navigationType: NavigationType.Pop }}>
              {routes}
            </UNSAFE_LocationContext.Provider>
          </div>
          <div className={`${s.underDim}${drag.settling ? ` ${s.settling}` : ''}`} style={{ opacity: 1 - progress }} />
        </div>
      )}
      <div className={`${s.front}${drag ? ` ${s.dragged}` : ''}${drag?.settling ? ` ${s.settling}` : ''}`}
        style={drag ? { transform: `translateX(${drag.dx}px)` } : undefined}>
        {children}
      </div>
    </>
  );
}
