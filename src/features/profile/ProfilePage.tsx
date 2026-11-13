import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, IconButton, Select, LinkButton, ListGroup, ListItem, PageHeader, PageSection, ProfileCard as FigmaProfileCard, SegmentControl, Sheet, StatStrip, TextField, useToast } from '../../design/components';
import { store } from '../../data';
import { useMe, useMyTrips, usePlaces, useProfile } from '../../data/hooks';
import { countryName } from '../../lib/countries';
import { placeCategory } from '../../lib/places';
import { PlaceRow, PlaceSheet } from '../saves/Collections';
import { usePlaceMarks } from '../saves/placeMarks';
import { daysBetween, today, tripPhase } from '../../lib/dates';
import { shrinkPhoto } from '../../lib/image';
import { MAPS_APPS, getMapsApp, setMapsApp, type MapsApp } from '../../lib/prefs';
import { appVersion } from '../../lib/native';
import { applyTheme, getTheme, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { CURRENCIES } from '../../lib/format';
import { useHomeCurrency } from '../shared/Price';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/Map';
import s from './Profile.module.css';

/** "Australian dollar" for AUD, as Figma's Currency row shows it. */
const currencyName = (code: string) => { try { const n = new Intl.DisplayNames(undefined, { type: 'currency' }).of(code); return n ? n[0].toUpperCase() + n.slice(1) : code; } catch { return code; } };

type Open = 'profile' | 'home' | 'maps' | 'appearance' | 'currency' | 'delete' | null;

/**
 * You tab (Figma "You tab — Profile"): the Profile card, "Your travels" (a Stat strip of countries, cities and days
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
    catch { toast({ tone: 'danger', label: "Couldn't save. Check your connection" }); }
  };
  const name = profile?.name || me.name;
  const home = useHomeCurrency();
  const [version, setVersion] = useState('');
  useEffect(() => { appVersion().then(setVersion); }, []);
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

      <PageSection title="Favourite places" meta="Starred from your trips"
        action={favourites.length > 0 ? <LinkButton to="/profile/favourites" tone="ghost" size="regular" iconEnd="chevron-right">See more</LinkButton> : undefined}>
        {favourites.length === 0
          ? <ListGroup><ListItem icon="star" title="No favourites yet" meta="Star a saved place, or an idea or event on a trip, and it shows here." /></ListGroup>
          : (
            <ListGroup label="Favourite places">
              {favourites.slice(0, 3).map((p) => (
                <PlaceRow key={p.id} place={p} visited={beenTo.has(p.id)} starred onClick={() => setOpenPlace(p.id)}
                  meta={[p.city, p.countryCode ? countryName(p.countryCode) : null].filter(Boolean).join(' · ') || placeCategory(p.category).one} />
              ))}
            </ListGroup>
          )}
      </PageSection>
      <PlaceSheet place={openPlace ? favourites.find((p) => p.id === openPlace) ?? null : null} onClose={() => setOpenPlace(null)} />

      <PageSection title="Settings">
        <ListGroup label="Settings">
          <ListItem icon="home" title="Home city" meta={profile?.home?.name ?? 'Not set'} onClick={() => setOpen('home')} />
          <ListItem icon="wallet" title="Currency" meta={home ? `${currencyName(home)} (${home})` : undefined} onClick={() => setOpen('currency')} />
          <ListItem icon="map" title="Maps app" meta={MAPS_APPS.find((m) => m.value === maps)?.label} onClick={() => setOpen('maps')} />
          <ListItem icon="sun" title="Appearance" meta={themeLabel} onClick={() => setOpen('appearance')} />
          <ListItem icon="trash" title="Recently deleted" meta="Trips, events and places, kept for 30 days" to="/profile/deleted" />
        </ListGroup>
      </PageSection>

      <div className={s.account}>
        <Button tone="neutral" block iconEnd="signout" onClick={() => store.signOut()}>Sign out</Button>
        <Button tone="destructive" block iconEnd="trash" onClick={() => setOpen('delete')}>Delete account</Button>
      </div>
      <p className={['t-body-small t-secondary', s.version].join(' ')}>
        {version}{version && ' · '}<Link to="/privacy" className={s.privacy}>Privacy policy</Link>
      </p>

      <DeleteAccount open={open === 'delete'} uid={me.uid} onClose={() => setOpen(null)} />

      <Sheet open={open === 'profile'} title="Your profile" subtitle="What people on your trips see" onClose={() => setOpen(null)}>
        <ProfileEditor uid={me.uid} name={name} photo={profile ? profile.photo : me.photo} />
      </Sheet>

      <Sheet open={open === 'home'} title="Home city" subtitle="It appears on your map with a home pin" onClose={() => setOpen(null)}>
        <CityPicker key={profile?.home?.name ?? 'none'} label="Home city" placeholder="Melbourne" value={profile?.home ?? null}
          onChange={(p) => p && save({ home: p, homeCity: p.name }, 'Home city saved')} />
        {profile?.home && <Button tone="destructive" icon="trash" onClick={() => save({ home: null, homeCity: '' }, 'Home city removed')}>Remove home city</Button>}
      </Sheet>

      <Sheet open={open === 'currency'} title="Currency" subtitle="Idea prices show in their own currency, with a conversion to this one." onClose={() => setOpen(null)}>
        <Select label="Your currency" value={home} onChange={(e) => save({ currency: e.target.value }, 'Currency saved')}>
          {[...new Set([home, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <p className="t-body-small t-secondary"><a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a>. Updated once a day; conversions are a guide.</p>
      </Sheet>

      <Sheet open={open === 'maps'} title="Maps app" subtitle="Events open their location in this app. Saved on this device." onClose={() => setOpen(null)}>
        <SegmentControl block label="Maps app" value={maps} onChange={(m) => { setMaps(m); setMapsApp(m); }} options={MAPS_APPS} />
      </Sheet>

      <Sheet open={open === 'appearance'} title="Appearance" subtitle="Saved on this device" onClose={() => setOpen(null)}>
        <SegmentControl block label="Appearance" value={theme} onChange={(t) => { setTheme(t); applyTheme(t); }}
          options={[{ value: 'auto', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      </Sheet>
    </Content>
  );
}

/** Your picture (tap it to change it), name and email, then your nickname: the Profile card's sheet. */
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

  const toast = useToast();
  const saveName = async () => {
    const next = draft.trim();
    if (!next || next === name) return;
    try { await store.saveProfile(uid, { name: next }); setSaved(true); toast({ icon: 'check', label: 'Nickname saved' }); }
    catch { toast({ tone: 'danger', label: "Couldn't save your nickname. Check your connection" }); }
  };

  const trimmed = draft.trim();
  return (
    <Card className={s.head}>
      <div className={s.who}>
        {/* Tap your picture to add or change it */}
        <button type="button" className={s.avatarButton} onClick={() => input.current?.click()} disabled={busy}
          aria-label={busy ? 'Preparing photo…' : photo ? 'Change your photo' : 'Add a photo'}>
          <Avatar name={name} photo={photo} seed={uid} size="large" />
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
      {/* Not a <form>: this sits inside the Sheet's form, and a form inside a form can submit the outer one (a page reload in the app) */}
      <div className={s.nameRow}>
        <div className={s.addField}>
          <TextField label="Nickname" value={draft} maxLength={40} autoComplete="nickname" aria-describedby="nickname-hint" enterKeyHint="done"
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveName(); } }} />
        </div>
        <IconButton icon="check" tone="primary" label="Save nickname" title="Save nickname" disabled={!trimmed || trimmed === name} onClick={saveName} />
      </div>
      <p id="nickname-hint" className="t-label-small t-secondary" role="status">{saved && draft === name ? 'Saved.' : 'What people on your trips see.'}</p>
    </Card>
  );
}

/**
 * "Are you sure?" before deleting the account: what happens to trips, messages, places and the profile, then
 * Keep account (Neutral) and Delete account (Destructive) side by side.
 */
function DeleteAccount({ open, uid, onClose }: { open: boolean; uid: string; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await store.deleteAccount(uid);
      toast({ icon: 'check', label: 'Your account is deleted' });
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setBusy(false);
      if (code.includes('cancel') || code.includes('canceled')) return;
      toast({ tone: 'danger', label: code === 'app/wrong-account' ? 'That was a different Google account. Nothing was deleted' : "Couldn't delete your account. Try again" });
    }
  };
  return (
    <Sheet open={open} title="Delete your account?" subtitle="This can't be undone." onClose={busy ? () => {} : onClose}
      secondary={<>
        <Button tone="neutral" block onClick={onClose} disabled={busy}>Keep account</Button>
        <Button tone="destructive" block loading={busy} disabled={busy} onClick={go}>Delete</Button>
      </>}>
      <ListGroup label="What deleting does">
        <ListItem icon="plane" title="Trips you made" meta="Go to another person on the trip. Trips with only you are deleted." />
        <ListItem icon="people" title="Trips you joined" meta="You leave them. Events and ideas you added stay for everyone else." />
        <ListItem icon="chat" title="Your messages" meta="Deleted from every trip." />
        <ListItem icon="star" title="Saved places" meta="Deleted, except places a trip still uses: those go to someone on that trip." />
        <ListItem icon="person" title="Your profile and settings" meta="Name, photo, home city, places you've been and favourites are deleted." />
      </ListGroup>
      <p className="t-body-small t-secondary">Google may ask you to sign in again to confirm it's you.</p>
    </Sheet>
  );
}

