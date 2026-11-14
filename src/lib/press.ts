/**
 * The pressed look, like iOS (people and sharing, review R1). Every tappable thing (links, buttons, tabs, menu items) gets
 * `data-pressed` while it's pressed, and the CSS styles `[data-pressed]` instead of `:active`, because the browser keeps
 * `:active` on whatever a scroll started on, so a card you scrolled past stayed looking pressed.
 *
 * - The pressed look appears after a short delay (90 ms) on touch, so a scroll that starts on a card never lights it up;
 *   a quick tap still flashes it. With a mouse it's immediate.
 * - It's cancelled as soon as the finger moves more than 10px, the page (or any scrolling area) scrolls, or the browser
 *   cancels the touch (`pointercancel`).
 * - A cancelled press never fires the tap: the click that follows it is swallowed.
 */
const DELAY_MS = 90;
const SLOP_PX = 10;
const FLASH_MS = 100;
const PRESSABLE = 'a[href], button, [role="button"], [role="tab"], [role="radio"], [role="menuitem"], [role="menuitemradio"], [role="option"], label, summary';

type Press = { el: Element; id: number; x: number; y: number; timer?: number; shown: boolean };
let cur: Press | null = null;
let blockClick = false;

const show = (p: Press) => { p.shown = true; p.el.setAttribute('data-pressed', ''); };
const clear = (p: Press) => { window.clearTimeout(p.timer); p.el.removeAttribute('data-pressed'); };

/** The press is off: the finger moved, something scrolled or the touch was cancelled. Its tap won't happen. */
function cancel() {
  if (!cur) return;
  clear(cur);
  cur = null;
  blockClick = true;
}

export function setupPress() {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', (e) => {
    blockClick = false;
    if (cur) clear(cur);
    cur = null;
    if (e.button !== 0) return;
    const el = (e.target as Element | null)?.closest?.(PRESSABLE);
    if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
    const p: Press = { el, id: e.pointerId, x: e.clientX, y: e.clientY, shown: false };
    cur = p;
    if (e.pointerType === 'mouse') show(p);
    else p.timer = window.setTimeout(() => { if (cur === p) show(p); }, DELAY_MS);
  }, { capture: true, passive: true });

  document.addEventListener('pointermove', (e) => {
    if (cur && e.pointerId === cur.id && Math.hypot(e.clientX - cur.x, e.clientY - cur.y) > SLOP_PX) cancel();
  }, { capture: true, passive: true });

  document.addEventListener('pointerup', (e) => {
    const p = cur;
    if (!p || e.pointerId !== p.id) return;
    cur = null;
    window.clearTimeout(p.timer);
    // A quick tap: show the pressed look briefly, so every tap still answers
    if (!p.shown) { show(p); window.setTimeout(() => clear(p), FLASH_MS); } else clear(p);
  }, { capture: true, passive: true });

  document.addEventListener('pointercancel', cancel, { capture: true, passive: true });
  // Scroll events don't bubble, but they reach a capturing listener on the document from any scrolling area
  document.addEventListener('scroll', cancel, { capture: true, passive: true });

  // A keyboard press is never a cancelled touch
  document.addEventListener('keydown', () => { blockClick = false; }, { capture: true, passive: true });

  // The tap of a cancelled press (the finger moved or scrolled) is swallowed before anything sees it
  document.addEventListener('click', (e) => {
    if (!blockClick) return;
    blockClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true });
}
