import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, LinkButton } from './Button';
import { Icon } from './Icon';
import { emergencyFor, ENTRY_INFO_URL } from '../../lib/emergency';
import { countryName, flagUrl } from '../../lib/countries';
import s from './Modal.module.css';

/**
 * Quick info about a country, opened from its Chip on the Hero Card (Figma "Modal"): emergency numbers you can tap to call,
 * and where to check entry requirements (they depend on your passport, so we link to an official checker).
 */
export function CountryModal({ code, onClose }: { code: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!code) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [code, onClose]);
  if (!code) return null;
  const name = countryName(code);
  const e = emergencyFor(code);
  const rows: [string, string | undefined][] = e
    ? [['Emergency', e.general], ['Police', e.police], ['Ambulance', e.ambulance], ['Fire', e.fire]]
    : [];
  return createPortal(
    <div className={s.backdrop} onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className={[s.modal, s.info].join(' ')} role="dialog" aria-modal="true" aria-labelledby="country-title">
        <div className={s.text}>
          {flagUrl(code) && <img src={flagUrl(code)} alt="" className={s.flag} />}
          <h2 id="country-title" className={s.title}>{name}</h2>
          <div className={s.body}>Good to know before you go</div>
        </div>
        <section className={s.group} aria-label="Emergency numbers">
          <h3 className={s.groupTitle}><Icon name="info" size={16} />Emergency numbers</h3>
          {e ? (
            <ul className={s.numbers}>
              {rows.filter(([, n]) => n).map(([label, n]) => (
                <li key={label}><span>{label}</span><a href={`tel:${n}`} className={s.number}>{n}</a></li>
              ))}
            </ul>
          ) : <p className={s.body}>We don’t have {name}’s numbers yet. In many countries 112 works from a mobile, but check locally when you arrive.</p>}
          {e?.note && <p className={s.body}>{e.note}</p>}
        </section>
        <section className={s.group} aria-label="Entry requirements">
          <h3 className={s.groupTitle}><Icon name="doc" size={16} />Entry requirements</h3>
          <p className={s.body}>Visas and entry rules depend on your passport. Check before you book.</p>
          <LinkButton href={ENTRY_INFO_URL} size="regular" variant="secondary" iconEnd="arrow-up-right">Check entry requirements</LinkButton>
        </section>
        <div className={s.single}><Button size="regular" block onClick={onClose}>Done</Button></div>
      </div>
    </div>,
    document.body,
  );
}
