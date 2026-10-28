import { useState } from 'react';
import { Avatar, Button, Card, IconButton, List, ListRow, PageHeader, SegmentedControl, Section, TabBar, TextField } from '../../design/components';
import { store } from '../../data';
import { useMe, useProfile } from '../../data/hooks';
import type { Place } from '../../data/types';
import { applyTheme, getTheme, type ThemePref } from '../../lib/theme';
import { Content } from '../../app/Shell';
import { CityPicker } from '../shared/CityPicker';
import { MapView } from '../shared/MapView';
import { globalTabs } from '../home/Home';
import s from './Profile.module.css';

export function ProfilePage() {
  const me = useMe();
  const profile = useProfile(me.uid);
  const [theme, setTheme] = useState<ThemePref>(getTheme);
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
      <PageHeader title="Profile" />
      <Content>
        <Card className={s.head}>
          <Avatar name={me.name} photo={me.photo} seed={me.uid} size={72} />
          <div>
            <div className="t-title2">{me.name}</div>
            {me.email && <div className="t-subhead t-secondary">{me.email}</div>}
            <div className="t-subhead t-secondary">{store.mode === 'demo' ? 'Demo account' : 'Signed in with Google'}</div>
          </div>
        </Card>

        <Section title="Home">
          <Card>
            <TextField label="Home city" placeholder="Where you usually start from" defaultValue={profile?.homeCity ?? ''} key={profile?.homeCity}
              onBlur={(e) => e.target.value !== (profile?.homeCity ?? '') && store.saveProfile(me.uid, { homeCity: e.target.value.trim() })} />
          </Card>
        </Section>

        <Section title="Places I've been" footer="These show on your Trips map, along with the destinations of past trips.">
          <MapView pins={visited.map((v) => ({ lat: v.lat, lng: v.lng, label: v.name }))} height={240} />
          <Card className={s.add}>
            <div className={s.addField}><CityPicker key={pickerKey} label="Add a place" placeholder="Tokyo" value={adding} onChange={setAdding} /></div>
            <Button icon="plus" onClick={addPlace} disabled={!adding}>Add</Button>
          </Card>
          {visited.length > 0 && (
            <List>
              {visited.map((v) => (
                <ListRow key={v.name} icon="pin" iconColor="var(--color-success)" title={v.name}
                  trailing={<IconButton icon="trash" size="small" label={`Remove ${v.name}`} onClick={() => store.saveProfile(me.uid, { visited: visited.filter((x) => x.name !== v.name) })} />} />
              ))}
            </List>
          )}
        </Section>

        <Section title="Appearance">
          <Card>
            <SegmentedControl block label="Appearance" value={theme} onChange={(t) => { setTheme(t); applyTheme(t); }}
              options={[{ value: 'auto', label: 'Automatic' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </Card>
        </Section>

        <Button variant="destructive" icon="signout" onClick={() => store.signOut()}>Sign out</Button>
      </Content>
      <TabBar items={globalTabs} />
    </>
  );
}
