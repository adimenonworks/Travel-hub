import type { ReactNode } from 'react';
import s from './Banner.module.css';

export type BannerTone = 'brand' | 'orange' | 'yellow' | 'green' | 'pink';

/**
 * Figma "Banner": a big centred promo card on a bright surface. Display tiny label (upper case), a Body small line,
 * a media slot (an illustration, flags, faces…) and one full-width button.
 * Brand sits on emerald and uses the Inverse button; the accents use the Tertiary (outlined) button.
 */
export function Banner({ tone = 'brand', label, subtext, media, action }: {
  tone?: BannerTone; label: ReactNode; subtext?: ReactNode; media?: ReactNode; action?: ReactNode;
}) {
  return (
    <section className={[s.banner, s[tone]].join(' ')}>
      <div className={s.text}>
        <h2 className={s.label}>{label}</h2>
        {subtext && <p className={s.subtext}>{subtext}</p>}
      </div>
      {media && <div className={s.media}>{media}</div>}
      {action && <div className={s.action}>{action}</div>}
    </section>
  );
}
