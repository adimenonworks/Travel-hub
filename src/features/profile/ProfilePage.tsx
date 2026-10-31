import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, Button, Card, IconButton, List, ListRow, PageHeader, SegmentedControl, Section, TextField } from '../../design/components';
import { store } from '../../data';
import { useMe, useMyTrips, useProfile } from '../../data/hooks';
import type { Place } from '../../data/types';
import { tripPhase } from '../../lib/dates';
import { shrinkPhoto } from '../../lib/image';
import { MAPS_APPS, getMapsApp, setMapsApp, type MapsApp } from '../../lib/prefs';
import { applyTheme, getTheme, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/MapView';
import { TravelStats } from './TravelStats';
import s from './Profile.module.css';

export function ProfilePage() {
  const me = useMe();
  const profile = useProfile(me.uid);
  const [theme, setTheme] = useState<ThemePref>(getTheme);
  const [maps, setMaps] = useState<MapsApp>(getMapsApp);
  const [adding, setAdding] = useState<Place | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const trips = useMyTrips();
  const visited = profile?.visited ?? [];
  const pastPlaces = (trips ?? []).filter((t) => t.destination && tripPhase(t.startDate, t.endDate) === 'past').map((t) => t.destination!);

  const addPlace = async () => {
    if (!adding) return;
    await store.saveProfile(me.uid, { visited: [...visited.filter((v) => v.name !== adding.name), adding] });
    setAdding(null);
    setPickerKey((k) => k + 1);
  };

  return (
    <>
      <Content>
        <PageHeader title="Profile" back={{ to: '/', label: 'Trips' }} />
        <ProfileCard uid={me.uid} name={profile?.name || me.name} photo={profile ? profile.photo : me.photo} email={me.email} />

        {trips && <TravelStats trips={trips.filter((t) => tripPhase(t.startDate, t.endDate) !== 'upcoming')} home={profile?.home ?? null} visited={visited} meId={me.uid} />}

        <Section title="Home" footer="Start typing and pick your city from the list. It appears on your maps with a home pin.">
          <Card className={s.add}>
            <div className={s.addField}>
              <CityPicker key={profile?.home?.name ?? 'none'} label="Home city" placeholder="Melbourne" value={profile?.home ?? null}
                onChange={(p) => p && store.saveProfile(me.uid, { home: p, homeCity: p.name })} />
            </div>
            {profile?.home && <IconButton icon="trash" label="Remove home city" onClick={() => store.saveProfile(me.uid, { home: null, homeCity: '' })} />}
          </Card>
        </Section>

        <Section title="Places I've been" footer="The map shows these, your home city and the destinations of past trips.">
          <MapView pins={[
            ...(profile?.home ? [{ lat: profile.home.lat, lng: profile.home.lng, label: `Home · ${profile.home.name}`, kind: 'home' as const }] : []),
            ...visited.map((v) => ({ lat: v.lat, lng: v.lng, label: v.name })),
            ...pastPlaces.filter((p) => !visited.some((v) => v.name === p.name)).map((p) => ({ lat: p.lat, lng: p.lng, label: p.name })),
          ]} height={240} />
          <Card className={s.add}>
            <div className={s.addField}><CityPicker key={pickerKey} label="Add a place" placeholder="Tokyo" value={adding} onChange={setAdding} /></div>
            <Button icon="plus" onClick={addPlace} disabled={!adding}>Add</Button>
          </Card>
          {visited.length > 0 && (
            <List>
              {visited.map((v) => (
                <ListRow key={v.name} icon="pin" title={v.name}
                  trailing={<IconButton icon="trash" size="small" label={`Remove ${v.name}`} onClick={() => store.saveProfile(me.uid, { visited: visited.filter((x) => x.name !== v.name) })} />} />
              ))}
            </List>
          )}
        </Section>

        <Section title="Directions" footer="Plans open their location in this app. Saved on this device.">
          <Card className={s.appearance}>
            <div className={s.appearanceRow}>
              <div className="t-body-small t-bold">Maps app</div>
              <SegmentedControl block label="Maps app" value={maps} onChange={(m) => { setMaps(m); setMapsApp(m); }} options={MAPS_APPS} />
            </div>
          </Card>
        </Section>

        <Section title="Appearance" footer="Saved on this device.">
          <Card className={s.appearance}>
            <div className={s.appearanceRow}>
              <div className="t-body-small t-bold">Mode</div>
              <SegmentedControl block label="Mode" value={theme} onChange={(t) => { setTheme(t); applyTheme(t); }}
                options={[{ value: 'auto', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </div>
          </Card>
        </Section>

        <div><Button variant="destructive" icon="signout" onClick={() => store.signOut()}>Sign out</Button></div>
      </Content>
    </>
  );
}

/** Your photo and nickname. They're what other people on your trips see. */
function ProfileCard({ uid, name, photo, email }: { uid: string; name: string; photo: string | null; email?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(name), [name]);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await shrinkPhoto(file, 256, 256);
      await store.saveProfile(uid, { photo: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be used.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    if (!next || next === name) return;
    await store.saveProfile(uid, { name: next });
    setSaved(true);
  };

  const trimmed = draft.trim();
  return (
    <Card className={s.head}>
      <div className={s.who}>
        <Avatar name={name} photo={photo} seed={uid} size={72} />
        <div className={s.whoText}>
          <h2 className="t-heading-2">{name}</h2>
          {email && <div className="t-body-small t-secondary">{email}</div>}
          <div className="t-body-small t-secondary">{store.mode === 'demo' ? 'Demo account' : 'Signed in with Google'}</div>
        </div>
      </div>
      <div className={s.photoButtons}>
        <Button variant="secondary" size="small" icon="photo" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Preparing photo…' : photo ? 'Change photo' : 'Add photo'}
        </Button>
        {photo && <Button variant="ghost" size="small" onClick={() => store.saveProfile(uid, { photo: null })}>Remove photo</Button>}
      </div>
      <input ref={input} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="t-label-small t-danger" role="alert">{error}</p>}
      <form className={s.nameRow} onSubmit={saveName}>
        <div className={s.addField}>
          <TextField label="Nickname" value={draft} maxLength={40} autoComplete="nickname" aria-describedby="nickname-hint"
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }} />
        </div>
        <Button type="submit" disabled={!trimmed || trimmed === name}>Save</Button>
      </form>
      <p id="nickname-hint" className="t-label-small t-secondary" role="status">{saved && draft === name ? 'Saved.' : 'What people on your trips see.'}</p>
    </Card>
  );
}
