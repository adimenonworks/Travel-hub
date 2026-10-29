import s from './Illustration.module.css';

export type IllustrationName = 'memories';

/**
 * Small decorative scenes for empty states. Drawn with semantic tokens so they
 * follow light and dark mode. Always decorative: hidden from screen readers.
 */
export function Illustration({ name, size = 96 }: { name: IllustrationName; size?: number }) {
  if (name === 'memories')
    return (
      <svg className={s.art} width={size} height={size * 0.8} viewBox="0 0 120 96" aria-hidden="true">
        {/* Back polaroid */}
        <g transform="rotate(-10 42 50)">
          <rect className={s.frame} x="14" y="16" width="52" height="62" rx="6" />
          <rect className={s.photo} x="20" y="22" width="40" height="38" rx="3" />
          <path className={s.hill} d="M20 52l11-11 9 8 7-6 13 12v5H20z" />
        </g>
        {/* Front polaroid */}
        <g transform="rotate(8 78 48)">
          <rect className={s.frame} x="52" y="12" width="52" height="62" rx="6" />
          <rect className={s.photo} x="58" y="18" width="40" height="38" rx="3" />
          <circle className={s.sun} cx="88" cy="28" r="6" />
          <path className={s.hill} d="M58 50l12-12 8 7 6-5 14 13v3H58z" />
          <rect className={s.line} x="62" y="62" width="22" height="4" rx="2" />
        </g>
        {/* Sparkles */}
        <path className={s.spark} d="M108 76v8M104 80h8M10 10v6M7 13h6" />
      </svg>
    );
  return null;
}
