import { useEffect, useState } from 'react';
import { Button, Card, EmptyState, Icon, IconButton, LinkButton, Sheet, TextField } from '../../design/components';
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
      <div className={s.dayHead}>
        <div>
          <h2 className="t-title1">Photos</h2>
          <div className={s.dayBudget}>Shared albums for this trip. Anyone on the trip can add one.</div>
        </div>
        <Button icon="plus" onClick={() => setEditing('new')}>Add album</Button>
      </div>
      {sorted.length === 0 ? (
        <Card>
          <EmptyState illustration="memories" title="No albums yet"
            message="Make a shared album in Google Photos or Apple Photos, then add its link here so everyone can find the pictures."
            action={<Button variant="tinted" icon="plus" onClick={() => setEditing('new')}>Add album</Button>} />
        </Card>
      ) : (
        <div className={s.albumGrid}>
          {sorted.map((a) => <AlbumCard key={a.id} album={a} ctx={ctx} onEdit={() => setEditing(a)} />)}
        </div>
      )}
      <AlbumForm open={!!editing} tripId={trip.id} album={editing === 'new' ? undefined : editing ?? undefined}
        canDelete={!!editing && editing !== 'new' && (ctx.canManage || editing.createdBy === me.uid)} onClose={() => setEditing(null)} />
    </>
  );
}

function AlbumCard({ album, ctx, onEdit }: { album: Album; ctx: TripCtx; onEdit: () => void }) {
  const me = useMe();
  const provider = albumProvider(album.url);
  const canEdit = ctx.canManage || album.createdBy === me.uid;
  return (
    <Card flush className={s.album}>
      <div className={s.albumCover} >
        <Icon name="photo" size={40} />
      </div>
      <div className={s.albumBody}>
        <h3 className="t-title3">{album.title}</h3>
        <div className="t-subhead t-secondary">{providerName[provider]} · added by {album.createdBy === me.uid ? 'you' : personName(ctx.profiles, album.createdBy)}</div>
        <div className={s.albumActions}>
          <LinkButton href={album.url} icon="arrow-up-right">Open album</LinkButton>
          {canEdit && <IconButton icon="pencil" variant="gray" label={`Edit ${album.title}`} onClick={onEdit} />}
        </div>
      </div>
    </Card>
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
    if (!album || !confirm(`Remove "${album.title}" from this trip? The album itself isn't deleted.`)) return;
    await store.deleteSub(tripId, 'albums', album.id);
    onClose();
  };

  return (
    <Sheet open={open} title={album ? 'Edit album' : 'Add album'} onClose={onClose} onSubmit={submit} submitLabel={album ? 'Save' : 'Add'} submitDisabled={!valid}>
      <TextField label="Album name" placeholder="Lisbon 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextField label="Share link" placeholder="https://photos.app.goo.gl/…" inputMode="url" autoComplete="off" value={url}
        onChange={(e) => setUrl(e.target.value)} onBlur={() => setUrl(clean)}
        hint={unknown ? "This doesn't look like a Google Photos or iCloud link, but you can still add it." : undefined} />
      <div className={s.albumHelp}>
        <p><b>Google Photos:</b> open the album, tap <b>Share</b>, then <b>Create link</b> (or <b>Copy link</b>).</p>
        <p><b>Apple Photos:</b> open a Shared Album, tap the people icon, turn on <b>Public Website</b>, then tap <b>Share Link</b>.</p>
        <p>Anyone with the link can see the album, so only share it with people you trust.</p>
      </div>
      {album && canDelete && <Button variant="destructive" icon="trash" block onClick={remove}>Remove album</Button>}
    </Sheet>
  );
}
