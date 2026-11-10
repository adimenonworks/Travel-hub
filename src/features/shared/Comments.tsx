import { useState } from 'react';
import { Avatar, IconButton, useToast } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Comment, Profile } from '../../data/types';
import { timeAgo } from '../../lib/dates';
import s from './shared.module.css';

/**
 * Figma "Comments", styled like Messages in Rove's colours: your comments sit on the right in deep green bubbles,
 * everyone else's on the left in grey ones with their avatar lined up with the top of the bubble. Only the message
 * is in the bubble; who and when sit above it. You can delete your own (a small ghost button).
 * While you type, the box to write in is fixed on top of the keyboard (--keyboard-height), so you always see what you write.
 */
export function Comments({ tripId, targetId, comments, profiles }: { tripId: string; targetId: string; comments: Comment[]; profiles: Record<string, Profile> }) {
  const me = useMe();
  const toast = useToast();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const list = comments.filter((c) => c.targetId === targetId).sort((a, b) => a.createdAt - b.createdAt);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try { await store.addSub(tripId, 'comments', { targetId, text: t, authorId: me.uid }); }
    catch { setText(t); toast({ tone: 'error', label: "Couldn't send. Check your connection" }); }
  };
  const remove = async (c: Comment) => {
    try { await store.deleteSub(tripId, 'comments', c.id); toast({ icon: 'trash', label: 'Comment deleted' }); }
    catch { toast({ tone: 'error', label: "Couldn't delete. Check your connection" }); }
  };

  return (
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
      {typing && <div className={s.composerSpacer} aria-hidden="true" />}
      <div className={`${s.composer}${typing ? ` ${s.composerTyping}` : ''}`}>
        <input className={s.commentInput} placeholder="Add a comment" aria-label="Add a comment" value={text} enterKeyHint="send"
          onFocus={() => { setTyping(true); setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 350); }} onBlur={() => setTyping(false)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} />
        <IconButton icon="send" tone="brand" label="Send comment" onClick={send} disabled={!text.trim()} />
      </div>
    </div>
  );
}
