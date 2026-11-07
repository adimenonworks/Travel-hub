import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar, Button, Card, Select, LinkButton, ListGroup, ListItem, PageHeader, PageSection, ProfileCard as FigmaProfileCard, SegmentedControl, Sheet, StatStrip, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useMe, useMyTrips, usePlaces, useProfile } from '../../data/hooks';
import { countryName } from '../../lib/countries';
import { placeCategory } from '../../lib/places';
import { PlaceRow, PlaceSheet } from '../saves/Collections';
import { usePlaceMarks } from '../saves/placeMarks';
import { daysBetween, today, tripPhase } from '../../lib/dates';
import { shrinkPhoto } from '../../lib/image';
import { MAPS_APPS, getMapsApp, setMapsApp, type MapsApp } from '../../lib/prefs';
import { applyTheme, getTheme, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { CURRENCIES } from '../../lib/format';
import { useHomeCurrency } from '../shared/Price';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/Map';
import s from './Profile.module.css';

type Open = 'profile' | 'home' | 'maps' | 'appearance' | 'currency' | null;

/**
 * You tab (Figma "You tab — Profile"): the Profile Card, "Your travels" (a Stat strip of countries, cities and days
 * away on the bright brand surface, and the map of places you've been), "Favourite places" (Places you starred; See all
 * opens Favourites), Settings, and Sign out.
 * Each setting opens a Sheet.
 */
export function ProfilePage() {
  const me = useMe();
  const profile = useProfile(me.uid);
  const [theme, setTheme] = useState<ThemePref>(getTheme);
  const [maps, setMaps] = useState<MapsApp>(getMapsApp);
  const [open, setOpen] = useState<Open>(null);
  const toast = useToast();
  const trips = useMyTrips();
  const visited = profile?.visited ?? [];
  const been = (trips ?? []).filter((t) => tripPhase(t.startDate, t.endDate) !== 'upcoming');
  const pastPlaces = been.filter((t) => t.destination).map((t) => t.destination!);
  const { visited: beenTo } = usePlaceMarks();
  // Favourite places: the Places you've starred (from Collections, or an idea or event on a trip).
  const favourites = (usePlaces() ?? []).filter((p) => p.starredBy?.includes(me.uid)).sort((x, y) => y.createdAt - x.createdAt);
  const [openPlace, setOpenPlace] = useState<string | null>(null);

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
  const name = profile?.name || me.name;
  const home = useHomeCurrency();
  const themeLabel = { auto: 'Automatic', light: 'Light', dark: 'Dark' }[theme];

  return (
    <Content>
      <PageHeader title="You" fit />
      <FigmaProfileCard name={name} photo={profile ? profile.photo : me.photo}
        email={[me.email, store.mode === 'demo' ? 'Demo account' : 'Google'].filter(Boolean).join(' · ')}
        onClick={() => setOpen('profile')} label={`${name}: edit your name and photo`} />

      <PageSection title="Your travels">
        <StatStrip stats={[
          { value: countries, label: countries === 1 ? 'country' : 'countries' },
          { value: cities, label: cities === 1 ? 'city' : 'cities' },
          { value: daysAway, label: daysAway === 1 ? 'day away' : 'days away' },
        ]} />
        <div className={s.map}><MapView pins={pins} height={200} /></div>
      </PageSection>

      <PageSection title="Favourite places" meta="Places you've starred"
        action={favourites.length > 0 ? <LinkButton to="/profile/favourites" variant="ghost" size="regular" iconEnd="chevron-right">See all</LinkButton> : undefined}>
        {favourites.length === 0
          ? <ListGroup><ListItem icon="star" title="No favourites yet" meta="Star a saved place, or an idea or event on a trip, and it shows here." /></ListGroup>
          : (
            <ListGroup label="Favourite places">
              {favourites.slice(0, 3).map((p) => (
                <PlaceRow key={p.id} place={p} visited={beenTo.has(p.id)} starred onClick={() => setOpenPlace(p.id)}
                  meta={[placeCategory(p.category).one, p.city, p.countryCode ? countryName(p.countryCode) : null].filter(Boolean).join(' · ')} />
              ))}
            </ListGroup>
          )}
      </PageSection>
      <PlaceSheet place={openPlace ? favourites.find((p) => p.id === openPlace) ?? null : null} onClose={() => setOpenPlace(null)} />

      <PageSection title="Settings">
        <ListGroup label="Settings">
          <ListItem icon="home" title="Home city" meta={profile?.home?.name ?? 'Not set'} onClick={() => setOpen('home')} />
          <ListItem icon="wallet" title="Currency" meta={home} onClick={() => setOpen('currency')} />
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

      <Sheet open={open === 'currency'} title="Currency" subtitle="Prices show in the currency they were booked in, then converted to this one" onClose={() => setOpen(null)}>
        <Select label="Your currency" value={home} onChange={(e) => save({ currency: e.target.value }, 'Currency saved')}>
          {[...new Set([home, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <p className="t-body-small t-secondary"><a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a>. Updated once a day; conversions are a guide.</p>
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
