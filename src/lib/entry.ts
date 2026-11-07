/**
 * Entry requirements and a few facts per country, for the Country sheet (handover v2 A4, A7).
 *
 * Entry requirements always open the destination's OFFICIAL government site (a ministry, immigration department or
 * the official e-visa portal), never a visa agency or other third party. This table is hand-kept: add a country only
 * once its URL has been checked by hand. Anywhere else, the sheet falls back to the traveller's own government's
 * advice for that destination (Smartraveller for Australian users, GOV.UK for British users, and so on).
 */
const OFFICIAL_ENTRY: Record<string, string> = {
  au: 'https://immi.homeaffairs.gov.au/',
  ca: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada.html',
  ch: 'https://www.sem.admin.ch/sem/en/home.html',
  de: 'https://www.auswaertiges-amt.de/en/visa-service',
  es: 'https://www.exteriores.gob.es/',
  fr: 'https://france-visas.gouv.fr/',
  gb: 'https://www.gov.uk/check-uk-visa',
  id: 'https://evisa.imigrasi.go.id/',
  ie: 'https://www.irishimmigration.ie/',
  in: 'https://indianvisaonline.gov.in/',
  it: 'https://vistoperitalia.esteri.it/',
  jp: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
  kr: 'https://www.k-eta.go.kr/',
  my: 'https://www.imi.gov.my/',
  mx: 'https://www.inm.gob.mx/',
  nl: 'https://www.netherlandsworldwide.nl/',
  nz: 'https://www.immigration.govt.nz/',
  pe: 'https://www.gob.pe/migraciones',
  ph: 'https://immigration.gov.ph/',
  pt: 'https://vistos.mne.gov.pt/',
  sg: 'https://www.ica.gov.sg/enter-transit-depart',
  th: 'https://www.thaievisa.go.th/',
  tr: 'https://www.evisa.gov.tr/',
  us: 'https://travel.state.gov/content/travel/en/us-visas.html',
  vn: 'https://evisa.gov.vn/',
  za: 'https://www.dha.gov.za/',
};

/** The traveller's own government's travel advice, by their home country; Smartraveller when we don't know it. */
const OWN_GOVERNMENT_ADVICE: Record<string, { url: string; name: string }> = {
  au: { url: 'https://www.smartraveller.gov.au/destinations', name: 'Smartraveller' },
  gb: { url: 'https://www.gov.uk/foreign-travel-advice', name: 'GOV.UK travel advice' },
  nz: { url: 'https://www.safetravel.govt.nz/destinations', name: 'SafeTravel' },
  ca: { url: 'https://travel.gc.ca/travelling/advisories', name: 'Travel.gc.ca' },
  us: { url: 'https://travel.state.gov/content/travel/en/international-travel.html', name: 'travel.state.gov' },
  ie: { url: 'https://www.ireland.ie/en/dfa/overseas-travel/advice/', name: 'Ireland travel advice' },
};

/** Where to check entry rules for `code`, as someone whose home country is `home`. */
export function entryRules(code: string, home?: string): { url: string; official: boolean; label: string } {
  const official = OFFICIAL_ENTRY[code.toLowerCase()];
  if (official) return { url: official, official: true, label: 'Official government site' };
  const own = OWN_GOVERNMENT_ADVICE[(home ?? '').toLowerCase()] ?? OWN_GOVERNMENT_ADVICE.au;
  return { url: own.url, official: false, label: `Your government's advice (${own.name})` };
}

/** Each country's currency (ISO 4217), for the Country sheet's "Currency" row. */
const CURRENCY: Record<string, string> = {
  ...Object.fromEntries(['at', 'be', 'cy', 'de', 'ee', 'es', 'fi', 'fr', 'gr', 'hr', 'ie', 'it', 'lt', 'lu', 'lv', 'mt', 'nl', 'pt', 'si', 'sk', 'mc', 'me', 'ad', 'sm', 'va'].map((c) => [c, 'EUR'])),
  ae: 'AED', ar: 'ARS', au: 'AUD', bg: 'BGN', br: 'BRL', ca: 'CAD', ch: 'CHF', cl: 'CLP', cn: 'CNY', co: 'COP', cr: 'CRC', cz: 'CZK',
  dk: 'DKK', eg: 'EGP', fj: 'FJD', gb: 'GBP', hk: 'HKD', hu: 'HUF', id: 'IDR', il: 'ILS', in: 'INR', is: 'ISK', jo: 'JOD', jp: 'JPY',
  ke: 'KES', kh: 'KHR', kr: 'KRW', la: 'LAK', lk: 'LKR', ma: 'MAD', mv: 'MVR', mx: 'MXN', my: 'MYR', no: 'NOK', np: 'NPR', nz: 'NZD',
  pe: 'PEN', ph: 'PHP', pl: 'PLN', qa: 'QAR', ro: 'RON', rs: 'RSD', sa: 'SAR', se: 'SEK', sg: 'SGD', th: 'THB', tr: 'TRY', tw: 'TWD',
  tz: 'TZS', us: 'USD', uy: 'UYU', vn: 'VND', za: 'ZAR',
};

/** "Euro (€)", or undefined when we don't know the country's currency. */
export function currencyLabel(code: string): string | undefined {
  const cur = CURRENCY[code.toLowerCase()];
  if (!cur) return undefined;
  const name = new Intl.DisplayNames(undefined, { type: 'currency' }).of(cur) ?? cur;
  const symbol = new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value;
  return symbol && symbol !== cur ? `${name} (${symbol})` : `${name} (${cur})`;
}

const offsets = new Map<string, Promise<number | null>>();
/** A place's offset from UTC in seconds, from Open-Meteo (free, no key; it works the time zone out from the spot). */
export function utcOffset(lat: number, lng: number): Promise<number | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (!offsets.has(key)) {
    offsets.set(key, fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto&forecast_days=1&current=temperature_2m`)
      .then((r) => r.json()).then((j: { utc_offset_seconds?: number }) => (typeof j.utc_offset_seconds === 'number' ? j.utc_offset_seconds : null))
      .catch(() => null));
  }
  return offsets.get(key)!;
}

/** "11 hrs behind", "2 hrs ahead of", "the same time as" — how a place's clock compares with home. */
export function timeDifference(there: number, home: number): { text: string; same: boolean } {
  const h = (there - home) / 3600;
  if (h === 0) return { text: 'Same time as', same: true };
  const n = Math.abs(h);
  const amount = Number.isInteger(n) ? `${n} hr${n === 1 ? '' : 's'}` : `${Math.floor(n)} hr${Math.floor(n) === 1 ? '' : 's'} ${Math.round((n % 1) * 60)} min`;
  return { text: `${amount} ${h < 0 ? 'behind' : 'ahead of'}`, same: false };
}
