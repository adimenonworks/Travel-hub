import type { Place } from '../data/types';
import { cached } from './cache';
import { addDays, daysBetween, today } from './dates';
import type { IconName } from '../design/components';

export type DayWeather = { date: string; max: number; min: number; code: number; rain: number };
export type WeatherResult = { kind: 'forecast' | 'typical'; days: DayWeather[] };

type Daily = { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; precipitation_probability_max?: number[]; precipitation_sum?: number[] };

const toDays = (d: Daily, shiftYears = 0): DayWeather[] =>
  d.time.map((t, i) => ({
    date: shiftYears ? `${Number(t.slice(0, 4)) + shiftYears}${t.slice(4)}` : t,
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    code: d.weather_code[i],
    rain: d.precipitation_probability_max?.[i] ?? d.precipitation_sum?.[i] ?? 0,
  }));

/**
 * Real forecast when the trip is within Open-Meteo's 16-day window; otherwise
 * last year's actual weather for the same dates as a "typical" guide.
 */
export async function tripWeather(place: Place, start: string, end: string, unit: 'celsius' | 'fahrenheit'): Promise<WeatherResult> {
  const now = today();
  const horizon = addDays(now, 15);
  const base = `latitude=${place.lat}&longitude=${place.lng}&timezone=auto&temperature_unit=${unit}`;
  return cached(`wx:${place.lat},${place.lng}:${start}:${end}:${unit}`, 30 * 60_000, async () => {
    if (end >= now && start <= horizon) {
      const from = start < now ? now : start;
      const to = end > horizon ? horizon : end;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${base}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&start_date=${from}&end_date=${to}`);
      if (!res.ok) throw new Error('Forecast unavailable');
      return { kind: 'forecast', days: toDays((await res.json()).daily) };
    }
    // Shift to the most recent year whose dates are fully in the past.
    let shift = 1;
    while (daysBetween(addYears(end, -shift), now) < 6) shift++;
    const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${base}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum&start_date=${addYears(start, -shift)}&end_date=${addYears(end, -shift)}`);
    if (!res.ok) throw new Error('Historical weather unavailable');
    return { kind: 'typical', days: toDays((await res.json()).daily, shift) };
  });
}

function addYears(d: string, n: number) {
  return `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;
}

/** WMO weather code → label and icon. */
export function describeWeather(code: number): { label: string; icon: IconName } {
  if (code === 0) return { label: 'Clear', icon: 'sun' };
  if (code <= 3) return { label: code === 1 ? 'Mostly clear' : code === 2 ? 'Partly cloudy' : 'Cloudy', icon: 'cloud' };
  if (code <= 48) return { label: 'Fog', icon: 'cloud' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: code < 60 ? 'Drizzle' : 'Rain', icon: 'rain' };
  if (code <= 77 || code === 85 || code === 86) return { label: 'Snow', icon: 'snow' };
  return { label: 'Thunderstorms', icon: 'bolt' };
}

export function defaultUnit(): 'celsius' | 'fahrenheit' {
  return /^en-US|^en-LR|^my/.test(navigator.language) ? 'fahrenheit' : 'celsius';
}
