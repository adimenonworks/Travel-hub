import { useEffect, useState } from 'react';
import { Card, EmptyState, Icon, List, ListRow, SegmentedControl, Section, Spinner } from '../../design/components';
import { formatDay } from '../../lib/dates';
import { localNews, newsSearchUrl, type Article } from '../../lib/news';
import { defaultUnit, describeWeather, tripWeather, type WeatherResult } from '../../lib/weather';
import { categoryInfo } from '../../lib/categories';
import { MapView } from '../shared/MapView';
import type { TripCtx } from './TripPage';
import s from './trip.module.css';

type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error' };

export function Info({ trip, activities }: TripCtx) {
  const dest = trip.destination;
  if (!dest) {
    return (
      <Card>
        <EmptyState icon="pin" title="Add a destination" message="Edit the trip and pick a city to see weather, news and a map here." />
      </Card>
    );
  }
  const pins = activities
    .filter((a) => a.location)
    .map((a) => ({ lat: a.location!.lat, lng: a.location!.lng, label: a.title, color: categoryInfo(a.category).color }));

  return (
    <div className={s.infoGrid}>
      <Weather trip={trip} />
      <Section title="Map" footer={activities.some((a) => a.location) ? 'Pins show itinerary plans that have a location.' : 'Add a location to a plan to pin it here.'}>
        <MapView pins={pins} center={dest} zoom={12} height={340} />
      </Section>
      <News place={dest.name} />
    </div>
  );
}

function Weather({ trip }: { trip: TripCtx['trip'] }) {
  const [unit, setUnit] = useState<'celsius' | 'fahrenheit'>(defaultUnit);
  const [state, setState] = useState<Load<WeatherResult>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    tripWeather(trip.destination!, trip.startDate, trip.endDate, unit)
      .then((data) => live && setState({ status: 'ok', data }))
      .catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [trip.destination, trip.startDate, trip.endDate, unit]);

  const footer = state.status === 'ok' && state.data.kind === 'typical'
    ? 'Your dates are more than 16 days away, so this shows the actual weather on the same dates last year as a guide.'
    : 'Forecast from Open-Meteo.';

  return (
    <Section title="Weather" footer={footer}
      action={<SegmentedControl label="Temperature unit" value={unit} onChange={setUnit} options={[{ value: 'celsius', label: '°C' }, { value: 'fahrenheit', label: '°F' }]} />}>
      {state.status === 'loading' && <Card><Spinner center /></Card>}
      {state.status === 'error' && <Card><span className="t-subhead t-secondary">Weather is unavailable right now.</span></Card>}
      {state.status === 'ok' && (
        <div className={s.weather}>
          {state.data.days.map((d) => {
            const w = describeWeather(d.code);
            return (
              <div key={d.date} className={s.wx} title={w.label}>
                <span className="t-caption1 t-secondary">{formatDay(d.date, { weekday: 'short', day: 'numeric' })}</span>
                <Icon name={w.icon} size={26} />
                <span className={s.wxTemp}>{Math.round(d.max)}°<span className="t-secondary"> {Math.round(d.min)}°</span></span>
                <span className="t-caption2 t-secondary">{state.data.kind === 'forecast' ? `${Math.round(d.rain)}% rain` : `${d.rain.toFixed(1)} mm`}</span>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function News({ place }: { place: string }) {
  const [state, setState] = useState<Load<Article[]>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    localNews(place).then((data) => live && setState({ status: 'ok', data })).catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [place]);

  const more = <a href={newsSearchUrl(place)} target="_blank" rel="noreferrer" >More news</a>;
  return (
    <Section title="Local news" action={more} footer="Headlines from the past week, via GDELT.">
      {state.status === 'loading' && <Card><Spinner center /></Card>}
      {(state.status === 'error' || (state.status === 'ok' && state.data.length === 0)) && (
        <Card><span className="t-subhead t-secondary">No headlines could be loaded. Use “More news” to search Google News.</span></Card>
      )}
      {state.status === 'ok' && state.data.length > 0 && (
        <List>
          {state.data.map((a) => (
            <ListRow key={a.url} href={a.url} title={a.title} subtitle={`${a.source} · ${formatDay(a.date, { month: 'short', day: 'numeric' })}`}
              trailing={a.image ? <img src={a.image} alt="" className={s.newsThumb} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} /> : undefined} />
          ))}
        </List>
      )}
    </Section>
  );
}
