import { FieldRow, Select, TextField } from '../../design/components';
import { useMe, useProfile } from '../../data/hooks';
import type { Price } from '../../data/types';
import { defaultHomeCurrency, priceText, useConverted } from '../../lib/currency';
import { CURRENCIES } from '../../lib/format';

export type PriceDraft = { amount: string; currency: string };
export const toPriceDraft = (p: Price | null | undefined, currency: string): PriceDraft => ({ amount: p ? String(p.amount) : '', currency: p?.currency ?? currency });
/** The draft as a Price, or null when no amount was entered (prices are never required). */
export const fromPriceDraft = (d: PriceDraft): Price | null => (d.amount.trim() === '' || !(Number(d.amount) >= 0) ? null : { amount: Number(d.amount), currency: d.currency });

/** The optional Price field: an amount and the currency it was booked in. 0 means free. */
export function PriceField({ value, onChange, label = 'Price (optional)', hint = 'Leave it empty if you don’t know. 0 means free.' }: { value: PriceDraft; onChange: (v: PriceDraft) => void; label?: string; hint?: string }) {
  return (
    <FieldRow>
      <TextField label={label} type="number" inputMode="decimal" min={0} step="any" placeholder="—" value={value.amount}
        onChange={(e) => onChange({ ...value, amount: e.target.value })} hint={hint} />
      <Select label="Currency" value={value.currency} onChange={(e) => onChange({ ...value, currency: e.target.value })}>
        {[...new Set([value.currency, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
    </FieldRow>
  );
}

/** Your home currency (Settings → Currency), or one suggested from the phone's region until you pick one. */
export function useHomeCurrency() {
  const me = useMe();
  const profile = useProfile(me.uid);
  return profile?.currency || defaultHomeCurrency();
}

/** A price as on a detail page: the amount as entered, then its conversion to your home currency ("€25 · ≈ A$41"). */
export function PriceWithConversion({ price }: { price: Price }) {
  const home = useHomeCurrency();
  const converted = useConverted(price, home);
  return <>{priceText(price)}{converted && <span className="t-secondary">{` · ${converted}`}</span>}</>;
}
