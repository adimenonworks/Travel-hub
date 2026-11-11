import { useEffect, useRef, useState } from 'react';
import { Avatar, IconButton, Notification, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Comment, Profile } from '../../data/types';
import { timeAgo } from '../../lib/dates';
import s from './shared.module.css';

/**
 * Figma "Comments", styled like Messages in Rove's colours: your comments sit on the right in deep green bubbles,
 * everyone else's on the left in grey ones with their avatar lined up with the top of the bubble. Only the message
 * is in the bubble; who and when sit above it. You can delete your own (a small ghost button).
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
  const list = comments.filter((c) => c.targetId === targetId).sort((a, b) => a.createdAt - b.createdAt);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Scroll the page (not the box) so the grey section's bottom sits 16px above the keyboard, the box inside it. The keyboard's height comes from
  // the app (rove:keyboard, also --keyboard-height); in a browser it's 0 and the box just comes into view.
  const keyboardHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;
  const lift = () => {
    const el = box.current?.parentElement; // the grey section
    if (!el || document.activeElement !== input.current) return;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-default-500')) || 16;
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
    setText('');
    try { await store.addSub(tripId, 'comments', { targetId, text: t, authorId: me.uid }); }
    catch { setText(t); toast({ tone: 'error', label: "Couldn't send. Check your connection" }); }
  };
  const remove = async (c: Comment) => {
    try { await store.deleteSub(tripId, 'comments', c.id); toast({ icon: 'trash', label: 'Comment deleted' }); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };

  return (
    <>
    <div className={s.comments}>
      {list.length > 0 && (
        <ol className={s.thread} aria-label="Comments">
          {list.map((c) => {
            const mine = c.authorId === me.uid;
            const name = personName(profiles, c.authorId);
            const when = timeAgo(c.createdAt);
            return (
              <li key={c.id} className={`${s.message} ${mine ? s.mine : s.theirs}`}>
                {!mine && <Avatar name={name} photo={profiles[c.authorId]?.photo} seed={c.authorId} size={32} />}
                <div className={s.messageBody}>
                  <span className={s.messageMeta}>{mine ? when : `${name.split(' ')[0]} · ${when}`}</span>
                  <div className={s.messageRow}>
                    {mine && <IconButton icon="x" tone="ghost" small label="Delete your comment" onClick={() => remove(c)} />}
                    <p className={s.bubble}>{c.text}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div ref={box} className={s.composer}>
        {/* Over the limit: a Warning Notification above the box, and Send is disabled */}
        {over > 0 && (
          <div className={s.composerWarning} id="comment-limit">
            <Notification state="warning">{`Messages can be up to ${MAX_MESSAGE} characters. Remove ${over} to send.`}</Notification>
          </div>
        )}
        <input ref={input} aria-describedby={over > 0 ? 'comment-limit' : undefined} aria-invalid={over > 0 || undefined} className={s.commentInput} placeholder="Add a comment" aria-label="Add a comment" value={text} enterKeyHint="send"
          onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} />
        {text.trim().length >= MAX_MESSAGE - 20 && (
          <span className={[s.commentCount, over > 0 && s.commentCountOver].filter(Boolean).join(' ')} aria-live="polite">{`${text.trim().length}/${MAX_MESSAGE}`}</span>
        )}
        {/* Keeps the keyboard up: pressing Send doesn't take focus from the box */}
        <span onPointerDown={(e) => { if (typing) e.preventDefault(); }}>
          <IconButton icon="send" tone="primary" label="Send comment" onClick={send} disabled={!text.trim() || over > 0} />
        </span>
      </div>
    </div>
    {typing && <div className={s.composerSpacer} aria-hidden="true" />}
    </>
  );
}
