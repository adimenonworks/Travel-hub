import { useState } from 'react';
import { Avatar, IconButton } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Comment, Profile } from '../../data/types';
import s from './shared.module.css';

export function Comments({ tripId, targetId, comments, profiles }: { tripId: string; targetId: string; comments: Comment[]; profiles: Record<string, Profile> }) {
  const me = useMe();
  const [text, setText] = useState('');
  const mine = comments.filter((c) => c.targetId === targetId).sort((a, b) => a.createdAt - b.createdAt);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await store.addSub(tripId, 'comments', { targetId, text: t, authorId: me.uid });
  };

  return (
    <div className={s.comments}>
      {mine.map((c) => (
        <div key={c.id} className={s.comment}>
          <Avatar name={personName(profiles, c.authorId)} photo={profiles[c.authorId]?.photo} seed={c.authorId} size={28} />
          <div className={s.bubble}>
            <div className={s.bubbleMeta}>{personName(profiles, c.authorId)} · {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            {c.text}
          </div>
          {c.authorId === me.uid && <IconButton icon="x" size="small" label="Delete comment" onClick={() => store.deleteSub(tripId, 'comments', c.id)} />}
        </div>
      ))}
      <div className={s.commentForm}>
        <input
          className={s.commentInput}
          placeholder="Add a comment"
          aria-label="Add a comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
        />
        <IconButton icon="chat" label="Send comment" variant="secondary" size="small" onClick={send} disabled={!text.trim()} />
      </div>
    </div>
  );
}
