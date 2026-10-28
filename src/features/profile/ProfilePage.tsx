import { useState } from 'react';
import { Avatar, Button, Card, ColorPicker, IconButton, List, ListRow, PageHeader, SegmentedControl, Section } from '../../design/components';
import { store } from '../../data';
import { useMe, useProfile } from '../../data/hooks';
import type { Place } from '../../data/types';
import { ACCENTS, applyAccent, applyTheme, getAccent, getTheme, type Accent, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/MapView';
import s from './Profile.module.css';

export function ProfilePage() {
  const me = useMe();
  const profile = useProfile(me.uid);
  const [theme, setTheme] = useState<ThemePref>(getTheme);
  const [accent, setAccent] = useState<Accent>(getAccent);
  const [adding, setAdding] = useState<Place | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const visited = profile?.visited ?? [];

  const addPlace = async () => {
    if (!adding) return;
    await store.saveProfile(me.uid, { visited: [...visited.filter((v) => v.name !== adding.name), adding] });
    setAdding(null);
    setPickerKey((k) => k + 1);
  };

  return (
    <>
      <Content>
        <PageHeader title="Profile" />
        <Card className={s.head}>
          <Avatar name={me.name} photo={me.photo} seed={me.uid} size={72} />
          <div>
            <h2 className="t-title2">{me.name}</h2>
            {me.email && <div className="t-subhead t-secondary">{me.email}</div>}
            <div className="t-subhead t-secondary">{store.mode === 'demo' ? 'Demo account' : 'Signed in with Google'}</div>
          </div>
        </Card>

        <Section title="Home" footer="Start typing and pick your city from the list. It appears on your maps with a home pin.">
          <Card className={s.add}>
            <div className={s.addField}>
              <CityPicker key={profile?.home?.name ?? 'none'} label="Home city" placeholder="Melbourne" value={profile?.home ?? null}
                onChange={(p) => p && store.saveProfile(me.uid, { home: p, homeCity: p.name })} />
            </div>
            {profile?.home && <IconButton icon="trash" label="Remove home city" onClick={() => store.saveProfile(me.uid, { home: null, homeCity: '' })} />}
          </Card>
        </Section>

        <Section title="Places I've been" footer="These show on your Trips map, along with the destinations of past trips.">
          <MapView pins={[
            ...(profile?.home ? [{ lat: profile.home.lat, lng: profile.home.lng, label: `Home · ${profile.home.name}`, kind: 'home' as const }] : []),
            ...visited.map((v) => ({ lat: v.lat, lng: v.lng, label: v.name })),
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

        <Section title="Appearance" footer="Saved on this device. Every accent keeps text readable in light and dark mode.">
          <Card className={s.appearance}>
            <div className={s.appearanceRow}>
              <div className="t-subhead t-bold">Mode</div>
              <SegmentedControl block label="Mode" value={theme} onChange={(t) => { setTheme(t); applyTheme(t); }}
                options={[{ value: 'auto', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
            </div>
            <ColorPicker label="Accent colour" options={ACCENTS} value={accent} onChange={(a) => { setAccent(a); applyAccent(a, true); }} />
          </Card>
        </Section>

        <div><Button variant="destructive" icon="signout" onClick={() => store.signOut()}>Sign out</Button></div>
      </Content>
    </>
  );
}
