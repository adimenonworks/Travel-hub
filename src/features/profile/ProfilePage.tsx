import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, Button, Card, IconButton, LinkButton, ListGroup, ListItem, PageHeader, PageSection, ProfileCard as FigmaProfileCard, SegmentedControl, Sheet, StatStrip, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useActivitiesFor, useMe, useMyTrips, useProfile } from '../../data/hooks';
import type { Place } from '../../data/types';
import { daysBetween, today, tripPhase } from '../../lib/dates';
import { categoryInfo } from '../../lib/categories';
import { shrinkPhoto } from '../../lib/image';
import { MAPS_APPS, getMapsApp, setMapsApp, type MapsApp } from '../../lib/prefs';
import { applyTheme, getTheme, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { plannedTrips } from '../../lib/saves';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/Map';
import s from './Profile.module.css';

type Open = 'profile' | 'home' | 'places' | 'maps' | 'appearance' | null;

/**
 * You tab (Figma "You tab — Profile"): the Profile Card, "Your travels" (a Stat strip of countries, cities and days
 * away, and the map of places you've been), "Favourite places" (events you starred), Settings, and Sign out.
 * Each setting opens a Sheet.
 */
export function ProfilePage() {
  const me = useMe();
  const profile = useProfile(me.uid);
  const [theme, setTheme] = useState<ThemePref>(getTheme);
  const [maps, setMaps] = useState<MapsApp>(getMapsApp);
  const [adding, setAdding] = useState<Place | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [open, setOpen] = useState<Open>(null);
  const toast = useToast();
  const myTrips = useMyTrips();
  // Saved places (no dates yet) don't count as travels.
  const trips = myTrips === null ? null : plannedTrips(myTrips);
  const visited = profile?.visited ?? [];
  const been = (trips ?? []).filter((t) => tripPhase(t.startDate, t.endDate) !== 'upcoming');
  const pastPlaces = been.filter((t) => t.destination).map((t) => t.destination!);
  const byTrip = useActivitiesFor((trips ?? []).map((t) => t.id));
  const tripOf: Record<string, string> = {};
  const all = (trips ?? []).flatMap((t) => (byTrip[t.id] ?? []).map((a) => { tripOf[a.id] = t.id; return a; }));
  const favourites = all.filter((a) => a.starredBy?.includes(me.uid)).sort((x, y) => y.date.localeCompare(x.date));
  const tripName = (id: string) => (trips ?? []).find((t) => t.id === id)?.name ?? '';

  // Your travels: places from trips that have started, plus the places you added yourself.
  const places = [...pastPlaces, ...visited];
  const countries = new Set(places.map((p) => p.countryCode ?? p.country ?? p.name.split(',').pop()!.trim())).size;
  const cities = new Set(places.map((p) => p.name.split(',')[0].trim().toLowerCase())).size;
  const t0 = today();
  const daysAway = been.reduce((n, t) => n + daysBetween(t.startDate, t.endDate < t0 ? t.endDate : t0) + 1, 0);
  const pins = [
    ...(profile?.home ? [{ lat: profile.home.lat, lng: profile.home.lng, label: `Home · ${profile.home.name}`, kind: 'home' as const }] : []),
    ...visited.map((v) => ({ lat: v.lat, lng: v.lng, label: v.name })),
    ...pastPlaces.filter((p) => !visited.some((v) => v.name === p.name)).map((p) => ({ lat: p.lat, lng: p.lng, label: p.name })),
  ];

  const save = async (data: Parameters<typeof store.saveProfile>[1], label: string) => {
    try { await store.saveProfile(me.uid, data); toast({ icon: 'check', label }); }
    catch { toast({ tone: 'error', label: "Couldn't save. Check your connection" }); }
  };
  const addPlace = async () => {
    if (!adding) return;
    await save({ visited: [...visited.filter((v) => v.name !== adding.name), adding] }, `${adding.name.split(',')[0]} added`);
    setAdding(null);
    setPickerKey((k) => k + 1);
  };
  const name = profile?.name || me.name;
  const themeLabel = { auto: 'Automatic', light: 'Light', dark: 'Dark' }[theme];

  return (
    <Content>
      <PageHeader title="You" fit />
      <FigmaProfileCard name={name} photo={profile ? profile.photo : me.photo}
        email={[me.email, store.mode === 'demo' ? 'Demo account' : 'Google'].filter(Boolean).join(' · ')}
        onClick={() => setOpen('profile')} label={`${name}: edit your name and photo`} />

      <PageSection title="Your travels" action={<Button variant="ghost" size="regular" iconEnd="chevron-right" onClick={() => setOpen('places')}>Places</Button>}>
        <StatStrip stats={[
          { value: countries, label: countries === 1 ? 'country' : 'countries' },
          { value: cities, label: cities === 1 ? 'city' : 'cities' },
          { value: daysAway, label: daysAway === 1 ? 'day away' : 'days away' },
        ]} />
        <div className={s.map}><MapView pins={pins} height={200} /></div>
      </PageSection>

      <PageSection title="Favourite places" meta="Starred from your trips"
        action={favourites.length > 3 ? <LinkButton to="/profile/collections/favourites" variant="ghost" size="regular" iconEnd="chevron-right">{`See all ${favourites.length}`}</LinkButton> : undefined}>
        {favourites.length === 0
          ? <ListGroup><ListItem icon="star" title="No favourites yet" meta="Star an event on its page and it shows here." /></ListGroup>
          : (
            <ListGroup label="Favourite places">
              {favourites.slice(0, 3).map((a) => (
                <ListItem key={a.id} icon={categoryInfo(a.category).icon} title={a.title}
                  meta={[a.locationText || a.location?.name?.split(',')[0], tripName(tripOf[a.id])].filter(Boolean).join(' · ')}
                  to={`/trip/${tripOf[a.id]}/plan/${a.id}`} />
              ))}
            </ListGroup>
          )}
      </PageSection>

      <PageSection title="Settings">
        <ListGroup label="Settings">
          <ListItem icon="home" title="Home city" meta={profile?.home?.name ?? 'Not set'} onClick={() => setOpen('home')} />
          <ListItem icon="map" title="Maps app" meta={MAPS_APPS.find((m) => m.value === maps)?.label} onClick={() => setOpen('maps')} />
          <ListItem icon="sun" title="Appearance" meta={themeLabel} onClick={() => setOpen('appearance')} />
        </ListGroup>
      </PageSection>

      <Button variant="destructive" block iconEnd="signout" onClick={() => store.signOut()}>Sign out</Button>

      <Sheet open={open === 'profile'} title="Your profile" subtitle="What people on your trips see" onClose={() => setOpen(null)}>
        <ProfileEditor uid={me.uid} name={name} photo={profile ? profile.photo : me.photo} />
      </Sheet>

      <Sheet open={open === 'home'} title="Home city" subtitle="It appears on your map with a home pin" onClose={() => setOpen(null)}>
        <CityPicker key={profile?.home?.name ?? 'none'} label="Home city" placeholder="Melbourne" value={profile?.home ?? null}
          onChange={(p) => p && save({ home: p, homeCity: p.name }, 'Home city saved')} />
        {profile?.home && <Button variant="destructive" icon="trash" onClick={() => save({ home: null, homeCity: '' }, 'Home city removed')}>Remove home city</Button>}
      </Sheet>

      <Sheet open={open === 'places'} title="Places I’ve been" subtitle="Your map shows these, your home city and past trips" onClose={() => setOpen(null)}>
        <div className={s.add}>
          <div className={s.addField}><CityPicker key={pickerKey} label="Add a place" placeholder="Tokyo" value={adding} onChange={setAdding} /></div>
          <Button icon="plus" onClick={addPlace} disabled={!adding}>Add</Button>
        </div>
        {visited.length > 0 && (
          <ListGroup label="Places you added">
            {visited.map((v) => (
              <ListItem key={v.name} icon="pin" title={v.name.split(',')[0]} meta={v.name.split(',').slice(1).join(',').trim() || undefined}
                trailing={<IconButton icon="trash" label={`Remove ${v.name}`} onClick={() => save({ visited: visited.filter((x) => x.name !== v.name) }, `${v.name.split(',')[0]} removed`)} />} />
            ))}
          </ListGroup>
        )}
      </Sheet>

      <Sheet open={open === 'maps'} title="Maps app" subtitle="Events open their location in this app. Saved on this device." onClose={() => setOpen(null)}>
        <SegmentedControl block label="Maps app" value={maps} onChange={(m) => { setMaps(m); setMapsApp(m); }} options={MAPS_APPS} />
      </Sheet>

      <Sheet open={open === 'appearance'} title="Appearance" subtitle="Saved on this device" onClose={() => setOpen(null)}>
        <SegmentedControl block label="Appearance" value={theme} onChange={(t) => { setTheme(t); applyTheme(t); }}
          options={[{ value: 'auto', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Sheet>
    </Content>
  );
}

/** Your picture (tap it to change it), name and email, then your nickname: the Profile Card's sheet. */
function ProfileEditor({ uid, name, photo, email }: { uid: string; name: string; photo: string | null; email?: string | null }) {
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
        {/* Tap your picture to add or change it */}
        <button type="button" className={s.avatarButton} onClick={() => input.current?.click()} disabled={busy}
          aria-label={busy ? 'Preparing photo…' : photo ? 'Change your photo' : 'Add a photo'}>
          <Avatar name={name} photo={photo} seed={uid} size={40} />
        </button>
        <div className={s.whoText}>
          <h2 className="t-heading-2">{name}</h2>
          {email && <div className="t-body-small t-secondary">{email}</div>}
          <div className="t-body-small t-secondary">{store.mode === 'demo' ? 'Demo account' : 'Signed in with Google'}</div>
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="visually-hidden" tabIndex={-1} aria-hidden="true"
        onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="t-label-small t-danger" role="alert">{error}</p>}
      <form className={s.nameRow} onSubmit={saveName}>
        <div className={s.addField}>
          <TextField label="Nickname" value={draft} maxLength={40} autoComplete="nickname" aria-describedby="nickname-hint"
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }} />
        </div>
        <Button type="submit" iconEnd="check" aria-label="Save nickname" title="Save nickname" disabled={!trimmed || trimmed === name} />
      </form>
      <p id="nickname-hint" className="t-label-small t-secondary" role="status">{saved && draft === name ? 'Saved.' : 'What people on your trips see.'}</p>
    </Card>
  );
}
