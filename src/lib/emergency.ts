/**
 * Emergency phone numbers by country (ISO 3166 code, lower case), for the country chip's quick-info modal.
 * Only countries we're sure of are listed; everywhere else the modal says to check locally.
 * 112 is the common emergency number across the EU (and works from mobiles in many other countries).
 */
export type Emergency = { general?: string; police?: string; ambulance?: string; fire?: string; note?: string };

const EU112: Emergency = { general: '112' };
const eu = ['at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de', 'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se'];

const NUMBERS: Record<string, Emergency> = {
  ...Object.fromEntries(eu.map((c) => [c, EU112])),
  is: { general: '112' },
  no: { police: '112', ambulance: '113', fire: '110' },
  ch: { general: '112', police: '117', ambulance: '144', fire: '118' },
  gb: { general: '999', note: '112 also works.' },
  tr: { general: '112' },
  us: { general: '911' },
  ca: { general: '911' },
  mx: { general: '911' },
  au: { general: '000', note: '112 also works from mobiles.' },
  nz: { general: '111' },
  jp: { police: '110', ambulance: '119', fire: '119' },
  kr: { police: '112', ambulance: '119', fire: '119' },
  cn: { police: '110', ambulance: '120', fire: '119' },
  tw: { police: '110', ambulance: '119', fire: '119' },
  hk: { general: '999' },
  sg: { police: '999', ambulance: '995', fire: '995' },
  my: { general: '999' },
  ph: { general: '911' },
  in: { general: '112' },
  th: { police: '191', ambulance: '1669', fire: '199', note: 'Tourist police: 1155.' },
  vn: { police: '113', ambulance: '115', fire: '114' },
  id: { general: '112' },
  ae: { police: '999', ambulance: '998', fire: '997' },
  il: { police: '100', ambulance: '101', fire: '102' },
  eg: { police: '122', ambulance: '123', fire: '180' },
  za: { police: '10111', ambulance: '10177', note: '112 works from mobiles.' },
  br: { police: '190', ambulance: '192', fire: '193' },
  cl: { police: '133', ambulance: '131', fire: '132' },
  co: { general: '123' },
};

export const emergencyFor = (code: string): Emergency | undefined => NUMBERS[code.toLowerCase()];

/** Entry rules depend on the traveller's passport, so we point to an official, passport-aware source. */
export const ENTRY_INFO_URL = 'https://www.iatatravelcentre.com/';
