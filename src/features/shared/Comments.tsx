import { useEffect, useRef, useState } from 'react';
import { haptic } from '../../lib/native';
import { Avatar, ContextMenu, IconButton, Banner, Message, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Comment, Profile } from '../../data/types';
import { timeAgo } from '../../lib/dates';
import s from './shared.module.css';

/**
 * Figma "Comments", styled like Messages in Rove's colours: your comments sit on the right in deep green bubbles,
 * everyone else's on the left in white ones. Messages from one person within 5 minutes of each other, with nobody in
 * between, form a stack: one line above it with who and when (left for theirs, right for yours), the bubbles close
 * together, and their avatar once, top-aligned with the most recent bubble. Press and hold one of your own bubbles
 * for Edit and Delete (a Context menu, like iOS).
 * The box to write in stays in the grey section. While you type, the whole page scrolls so the grey section sits just
 * above the keyboard (16px), like Messages; sending adds the bubble, the grey section grows and the box stays where it is.
 */
/** Messages are short: 150 characters at most (the database rules refuse longer ones too). */
export const MAX_MESSAGE = 150;

export function Comments({ tripId, targetId, comments, profiles }: { tripId: string; targetId: string; comments: Comment[]; profiles: Record<string, Profile> }) {
  const me = useMe();
  const toast = useToast();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState<string | null>(null); // the comment whose long-press menu is open
  const [editing, setEditing] = useState<Comment | null>(null);
  const list = comments.filter((c) => c.targetId === targetId).sort((a, b) => a.createdAt - b.createdAt);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Scroll the page (not the box) so the grey section's bottom sits 16px above the keyboard, the box inside it. The keyboard's height comes from
  // the app (rove:keyboard, also --keyboard-height); in a browser it's 0 and the box just comes into view.
  const keyboardHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;
  const lift = () => {
    const el = box.current?.parentElement; // the grey section
    if (!el || document.activeElement !== input.current) return;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-500')) || 16;
    const by = el.getBoundingClientRect().bottom - (window.innerHeight - keyboardHeight() - gap);
    if (Math.abs(by) > 1) window.scrollBy({ top: by, behavior: 'smooth' });
  };
  useEffect(() => {
    if (!typing) return;
    const onKeyboard = () => requestAnimationFrame(lift);
    window.addEventListener('rove:keyboard', onKeyboard);
    const t = window.setTimeout(lift, 60); // the browser, or a keyboard that was already up
    return () => { window.removeEventListener('rove:keyboard', onKeyboard); window.clearTimeout(t); };
  }, [typing]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new message makes the grey section taller: keep the box just above the keyboard
  useEffect(() => { if (typing) requestAnimationFrame(lift); }, [list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const over = text.trim().length - MAX_MESSAGE;
  const send = async () => {
    const t = text.trim();
    if (!t || t.length > MAX_MESSAGE) return;
    const was = editing;
    setText(''); setEditing(null);
    input.current?.blur(); // one tap sends and closes the keyboard
    try {
      if (was) { if (t !== was.text) await store.updateSub(tripId, 'comments', was.id, { text: t, editedAt: Date.now() }); }
      else await store.addSub(tripId, 'comments', { targetId, text: t, authorId: me.uid });
    } catch { setText(t); setEditing(was); toast({ tone: 'danger', label: was ? "Couldn't save. Check your connection" : "Couldn't send. Check your connection" }); }
  };
  const remove = async (c: Comment) => {
    try { await store.deleteSub(tripId, 'comments', c.id); toast({ icon: 'trash', label: 'Comment deleted' }); }
    catch { toast({ tone: 'danger', label: "Couldn't delete. Check your connection" }); }
  };
  const edit = (c: Comment) => { setEditing(c); setText(c.text); requestAnimationFrame(() => input.current?.focus()); };

  // Press and hold your own bubble (about half a second, a light tap of haptics) to open its menu
  const hold = useRef<{ id: string; x: number; y: number; t: number } | null>(null);
  const pressStart = (c: Comment) => (e: React.PointerEvent) => {
    const id = c.id, x = e.clientX, y = e.clientY;
    hold.current = { id, x, y, t: window.setTimeout(() => { hold.current = null; haptic('light'); setMenu(id); }, 450) };
  };
  const pressMove = (e: React.PointerEvent) => {
    const h = hold.current;
    if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 10) { window.clearTimeout(h.t); hold.current = null; } // scrolling, not holding
  };
  const pressEnd = () => { if (hold.current) { window.clearTimeout(hold.current.t); hold.current = null; } };

  // Stacks: the same person, each message within 5 minutes of the one before, nobody else in between
  const stacks: Comment[][] = [];
  for (const c of list) {
    const last = stacks[stacks.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && prev.authorId === c.authorId && c.createdAt - prev.createdAt <= 5 * 60e3) last.push(c); else stacks.push([c]);
  }

  return (
    <>
    <div className={s.comments}>
      {stacks.length > 0 && (
        <ol className={s.thread} aria-label="Comments">
          {stacks.map((stack) => {
            const first = stack[0], mine = first.authorId === me.uid;
            const name = personName(profiles, first.authorId);
            const when = timeAgo(first.createdAt);
            return (
              <li key={first.id} className={s.stack}>
                {stack.map((c, i) => (
                  <Message key={c.id} layout={mine ? 'mine' : 'theirs'} edited={!!c.editedAt}
                    meta={i === 0 ? (mine ? when : `${name.split(' ')[0]} · ${when}`) : undefined}
                    avatar={!mine && i === stack.length - 1 ? <Avatar name={name} photo={profiles[c.authorId]?.photo} seed={c.authorId} size="medium" /> : undefined}
                    bubbleProps={mine ? {
                      onPointerDown: pressStart(c), onPointerMove: pressMove, onPointerUp: pressEnd, onPointerCancel: pressEnd, onPointerLeave: pressEnd,
                      onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setMenu(c.id); },
                      tabIndex: 0, role: 'button', 'aria-haspopup': 'menu' as const, 'aria-label': `${c.text}. Press and hold for Edit and Delete`,
                      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMenu(c.id); } },
                    } : undefined}
                    wrapBubble={menu === c.id ? (bubble) => (
                      <ContextMenu label="Message" align="end" onClose={() => setMenu(null)} items={[
                        { label: 'Edit', icon: 'pencil', onClick: () => edit(c) },
                        { label: 'Delete', icon: 'trash', tone: 'danger', onClick: () => remove(c) },
                      ]}>{bubble}</ContextMenu>
                    ) : undefined}>{c.text}</Message>
                ))}
              </li>
            );
          })}
        </ol>
      )}
      <div ref={box} className={s.composer}>
        {editing && (
          <div className={s.editingLine}>
            <span>Editing message</span>
            <button type="button" className={s.editingCancel} onPointerDown={(e) => e.preventDefault()} onClick={() => { setEditing(null); setText(''); }}>Cancel</button>
          </div>
        )}
        {/* Over the limit: a Warning Banner above the box, and Send is disabled */}
        {over > 0 && (
          <div className={s.composerWarning} id="comment-limit">
            <Banner tone="warning">{`Messages can be up to ${MAX_MESSAGE} characters. Remove ${over} to send.`}</Banner>
          </div>
        )}
        <input ref={input} aria-describedby={over > 0 ? 'comment-limit' : undefined} aria-invalid={over > 0 || undefined} className={s.commentInput} placeholder="Add a comment" aria-label={editing ? 'Edit your comment' : 'Add a comment'} value={text} enterKeyHint="send"
          onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} />
        {text.trim().length >= MAX_MESSAGE - 20 && (
          <span className={[s.commentCount, over > 0 && s.commentCountOver].filter(Boolean).join(' ')} aria-live="polite">{`${text.trim().length}/${MAX_MESSAGE}`}</span>
        )}
        {/* The box keeps focus while Send is pressed, so one tap sends (the keyboard then closes) */}
        <span className={s.sendWrap} onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
          <IconButton icon="send" tone="primary" label={editing ? 'Save comment' : 'Send comment'} onClick={send} disabled={!text.trim() || over > 0} />
        </span>
      </div>
    </div>
    {typing && <div className={s.composerSpacer} aria-hidden="true" />}
    </>
  );
}
