import { useEffect, useState } from 'react';
import type { Idea, Activity, Price, Trip } from '../data/types';
import { money } from './format';

/**
 * Currency conversion for prices, with the free ExchangeRate-API "open access" endpoint (no key; daily rates).
 * Rates are cached on the device for 24 hours. Settings shows the required "Rates by Exchange Rate API" credit.
 */
const API = 'https://open.er-api.com/v6/latest/';
const DAY = 24 * 60 * 60 * 1000;
type Rates = { at: number; rates: Record<string, number> };
const inFlight = new Map<string, Promise<Rates | null>>();

function cached(base: string): Rates | null {
  try { const r = JSON.parse(localStorage.getItem(`rates:${base}`) ?? 'null') as Rates | null; return r && Date.now() - r.at < DAY ? r : null; } catch { return null; }
}

/** Today's rates from one currency, from the 24-hour cache or the API. Null when offline with nothing cached. */
export function getRates(base: string): Promise<Rates | null> {
  const hit = cached(base);
  if (hit) return Promise.resolve(hit);
  if (!inFlight.has(base)) {
    inFlight.set(base, fetch(API + encodeURIComponent(base))
      .then((r) => r.json())
      .then((j: { result?: string; rates?: Record<string, number> }) => {
        if (j.result !== 'success' || !j.rates) return null;
        const r = { at: Date.now(), rates: j.rates };
        try { localStorage.setItem(`rates:${base}`, JSON.stringify(r)); } catch { /* storage full */ }
        return r;
      })
      .catch(() => null)
      .finally(() => inFlight.delete(base)));
  }
  return inFlight.get(base)!;
}

/** "€25", or "Free" for 0. */
export const priceText = (p: Price) => (p.amount === 0 ? 'Free' : money(p.amount, p.currency));

/** An item's price: its own, or (older items) the per-person cost they had, in the trip's currency. */
export function priceOf(item: Pick<Activity | Idea, 'price' | 'cost'>, trip: Pick<Trip, 'currency'>): Price | null {
  if (item.price) return item.price;
  return item.cost && item.cost > 0 ? { amount: item.cost, currency: trip.currency } : null;
}

/** The price in the home currency (e.g. "≈ A$41"), once the rates have loaded; null when it's the same currency or free. */
export function useConverted(price: Price | null, home: string | undefined) {
  const [out, setOut] = useState<string | null>(null);
  useEffect(() => {
    setOut(null);
    if (!price || !home || price.amount === 0 || price.currency === home) return;
    let live = true;
    getRates(price.currency).then((r) => {
      const rate = r?.rates[home];
      if (live && rate) setOut(`≈ ${money(Math.round(price.amount * rate * 100) / 100, home)}`);
    });
    return () => { live = false; };
  }, [price?.amount, price?.currency, home]); // eslint-disable-line react-hooks/exhaustive-deps
  return out;
}

/** The home currency to suggest before one is chosen: from the phone's region. */
export function defaultHomeCurrency() {
  const region = new Intl.Locale(navigator.language).maximize().region ?? 'US';
  const byRegion: Record<string, string> = { AU: 'AUD', GB: 'GBP', NZ: 'NZD', CA: 'CAD', IN: 'INR', JP: 'JPY', SG: 'SGD', CH: 'CHF', US: 'USD', MX: 'MXN', ZA: 'ZAR', BR: 'BRL', KR: 'KRW', TH: 'THB', AE: 'AED' };
  const euro = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];
  return byRegion[region] ?? (euro.includes(region) ? 'EUR' : 'USD');
}
