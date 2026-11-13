import { useEffect, useState } from 'react';
import { confirmAction } from '../../lib/native';
import { Button, COVER_ILLUSTRATIONS, IconButton, Illustration, SectionHeader, Sheet, TextField, Card } from '../../design/components';
import { store } from '../../data';
import { personName, useMe } from '../../data/hooks';
import type { Album } from '../../data/types';
import { normalizeUrl } from '../../lib/format';
import { albumProvider, providerName } from '../../lib/photos';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';


/**
 * Shared photo albums. Google Photos and iCloud don't allow their albums to be
 * embedded in other sites, so each album is a card that opens the real one.
 */
export function Photos(ctx: TripCtx) {
  const { trip, albums } = ctx;
  const me = useMe();
  const [editing, setEditing] = useState<Album | 'new' | null>(null);
  const sorted = albums.slice().sort((a, b) => b.createdAt - a.createdAt);

  return (
    <>
      <SectionHeader title="Shared albums" meta="Anyone on the trip can add one"
        action={ctx.canContribute ? <Button size="regular" icon="camera" onClick={() => setEditing("new")}>Add photos</Button> : undefined} />
      {sorted.length === 0 ? (
        <Card layout="centre" media={<Illustration name="memories" size={120} />} title="No albums yet"
          body="Make a shared album in Google Photos or Apple Photos, then add its link here so everyone can find the pictures." />
      ) : (
        <div className={s.albumGrid}>
          {sorted.map((a, i) => <AlbumCard key={a.id} album={a} ctx={ctx} index={i} onEdit={() => setEditing(a)} />)}
        </div>
      )}
      <AlbumForm open={!!editing} tripId={trip.id} album={editing === 'new' ? undefined : editing ?? undefined}
        canDelete={!!editing && editing !== 'new' && (ctx.canManage || editing.createdBy === me.uid)} onClose={() => setEditing(null)} />
    </>
  );
}

/** An album as a Figma "Card" with a cover scene on top: the whole card opens the album; the pencil edits it. */
function AlbumCard({ album, ctx, index, onEdit }: { album: Album; ctx: TripCtx; index: number; onEdit: () => void }) {
  const me = useMe();
  const provider = albumProvider(album.url);
  const canEdit = ctx.canManage || album.createdBy === me.uid;
  return (
    <article className={s.album}>
      <div className={s.albumCover} aria-hidden="true"><Illustration name={COVER_ILLUSTRATIONS[index % COVER_ILLUSTRATIONS.length]} /></div>
      <div className={s.albumBody}>
        <div className={s.albumText}>
          <h3 className={s.albumTitle}><a href={album.url} target="_blank" rel="noreferrer" className={s.albumLink}>{album.title}<span className="visually-hidden"> (opens {providerName[provider]})</span></a></h3>
          <div className="t-body-small t-secondary">{providerName[provider]} · added by {album.createdBy === me.uid ? 'you' : personName(ctx.profiles, album.createdBy)}</div>
        </div>
        {canEdit && <IconButton icon="pencil" label={`Edit ${album.title}`} onClick={onEdit} className={s.albumEdit} />}
      </div>
    </article>
  );
}

const isWebUrl = (u: string) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

function AlbumForm({ open, tripId, album, canDelete, onClose }: { open: boolean; tripId: string; album?: Album; canDelete: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (open) { setTitle(album?.title ?? ''); setUrl(album?.url ?? ''); }
  }, [open, album]);

  const clean = normalizeUrl(url.trim());
  const valid = title.trim() && isWebUrl(clean);
  const unknown = isWebUrl(clean) && albumProvider(clean) === 'other';

  const submit = async () => {
    const data = { title: title.trim(), url: clean };
    if (album) await store.updateSub(tripId, 'albums', album.id, data);
    else await store.addSub(tripId, 'albums', data);
    onClose();
  };
  const remove = async () => {
    if (!album || !confirmAction(`Remove "${album.title}" from this trip? The album itself isn't deleted.`)) return;
    await store.deleteSub(tripId, 'albums', album.id);
    onClose();
  };

  return (
    <Sheet open={open} mode={album ? 'edit' : 'default'} title={album ? 'Edit album' : 'Add album'} onClose={onClose} onSubmit={submit} submitLabel={album ? 'Save' : 'Add'} submitDisabled={!valid}
      secondary={album && canDelete ? <Button tone="destructive" size="large" onClick={remove}>Remove</Button> : undefined}>
      <TextField label="Album name" placeholder="Lisbon 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label="Share link" placeholder="https://photos.app.goo.gl/…" inputMode="url" autoComplete="off" value={url}
        onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrl(clean)}
        hint={unknown ? "This doesn't look like a Google Photos or iCloud link, but you can still add it." : undefined} />
      <div className={s.albumHelp}>
        <p><b>Google Photos:</b> open the album, tap <b>Share</b>, then <b>Create link</b> (or <b>Copy link</b>).</p>
        <p><b>Apple Photos:</b> open a Shared Album, tap the people icon, turn on <b>Public Website</b>, then tap <b>Share Link</b>.</p>
        <p>Anyone with the link can see the album, so only share it with people you trust.</p>
      </div>
    </Sheet>
  );
}
