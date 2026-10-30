import s from './Illustration.module.css';

export type IllustrationName =
  | 'memories' | 'ideas' | 'calendar' | 'map' | 'ticket' | 'suitcase' | 'compass' | 'globe'
  | 'cover-hills' | 'cover-coast' | 'cover-city';

/** Scenes used as a trip's cover when it has no photo; each trip always gets the same one. */
export const COVER_ILLUSTRATIONS = ['cover-hills', 'cover-coast', 'cover-city'] as const;

/**
 * Small decorative scenes in one hand-drawn style: white frames with a bold outline and a slight tilt,
 * emerald land on a light emerald scene, a warm sun, grey detail bars and sparkle crosses.
 * Drawn with semantic tokens (Illustration.module.css) so they follow light and dark mode.
 * Always decorative: hidden from screen readers; the text beside them carries the meaning.
 *
 * Spot illustrations (empty states, cards) draw in a 120×96 box. Covers ('cover-*') fill their container.
 */
export function Illustration({ name, size = 96 }: { name: IllustrationName; size?: number }) {
  if (name.startsWith('cover-'))
    return (
      <svg className={s.cover} viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {covers[name as (typeof COVER_ILLUSTRATIONS)[number]]}
      </svg>
    );
  return (
    <svg className={s.art} width={size} height={size * 0.8} viewBox="0 0 120 96" aria-hidden="true">
      {spots[name as Exclude<IllustrationName, (typeof COVER_ILLUSTRATIONS)[number]>]}
    </svg>
  );
}

const spots = {
  memories: (
    <>
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
      <path className={s.spark} d="M108 76v8M104 80h8M10 10v6M7 13h6" />
    </>
  ),
  ideas: (
    <>
      {/* A sticky note with a few lines, and a lit bulb in front */}
      <g transform="rotate(-9 40 50)">
        <rect className={s.frame} x="14" y="22" width="50" height="54" rx="6" />
        <rect className={s.photo} x="20" y="28" width="38" height="10" rx="3" />
        <rect className={s.line} x="20" y="45" width="34" height="4" rx="2" />
        <rect className={s.line} x="20" y="54" width="26" height="4" rx="2" />
        <rect className={s.line} x="20" y="63" width="30" height="4" rx="2" />
      </g>
      <g transform="rotate(6 80 46)">
        <circle className={s.frame} cx="80" cy="38" r="20" />
        <circle className={s.sun} cx="80" cy="38" r="9" />
        <path className={s.hill} d="M72 56h16v6a4 4 0 01-4 4h-8a4 4 0 01-4-4z" />
        <rect className={s.frame} x="73" y="66" width="14" height="6" rx="3" />
      </g>
      <path className={s.spark} d="M106 14v8M102 18h8M100 70v6M97 73h6M10 84v6M7 87h6" />
    </>
  ),
  calendar: (
    <>
      {/* A calendar page with one day circled */}
      <g transform="rotate(-6 60 50)">
        <rect className={s.frame} x="22" y="18" width="76" height="66" rx="8" />
        <path className={s.hill} d="M22 26a8 8 0 018-8h60a8 8 0 018 8v8H22z" />
        <rect className={s.frame} x="38" y="12" width="6" height="14" rx="3" />
        <rect className={s.frame} x="76" y="12" width="6" height="14" rx="3" />
        {[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => (
          <rect key={`${c}-${r}`} className={s.line} x={32 + c * 16} y={44 + r * 12} width="8" height="6" rx="2" />
        )))}
        <circle className={s.sun} cx="68" cy="59" r="7" />
      </g>
      <path className={s.spark} d="M108 22v8M104 26h8M12 74v6M9 77h6" />
    </>
  ),
  map: (
    <>
      {/* A folded map with a dotted route and a pin */}
      <g transform="rotate(-4 60 52)">
        <path className={s.frame} d="M14 28l28-8 30 8 30-8v56l-30 8-30-8-28 8z" />
        <path className={s.photo} d="M42 20l30 8v56l-30-8z" />
        <path className={s.route} d="M24 66c10-4 14-18 26-20s16 10 28 6 12-14 16-18" />
      </g>
      <g transform="translate(80 18)">
        <path className={s.hill} d="M12 0a12 12 0 0112 12c0 9-12 22-12 22S0 21 0 12A12 12 0 0112 0z" />
        <circle className={s.frame} cx="12" cy="12" r="5" />
      </g>
      <path className={s.spark} d="M10 10v6M7 13h6M108 80v8M104 84h8" />
    </>
  ),
  ticket: (
    <>
      {/* A ticket with its stub torn off and drifting away */}
      <g transform="rotate(-8 50 50)">
        <path className={s.frame} d="M14 30h56v14a6 6 0 000 12v14H14V56a6 6 0 000-12z" />
        <rect className={s.photo} x="22" y="38" width="30" height="24" rx="3" />
        <path className={s.hill} d="M22 58l8-8 6 5 5-4 11 9v2H22z" />
        <circle className={s.sun} cx="45" cy="45" r="3.5" />
        <rect className={s.line} x="58" y="40" width="4" height="20" rx="2" />
      </g>
      <g transform="rotate(14 92 52)">
        <path className={s.frame} d="M80 34h22v32H80V56a6 6 0 000-12z" />
        <rect className={s.line} x="88" y="42" width="8" height="4" rx="2" />
        <rect className={s.line} x="88" y="52" width="8" height="4" rx="2" />
      </g>
      <path className={s.spark} d="M106 14v8M102 18h8M12 80v6M9 83h6" />
    </>
  ),
  suitcase: (
    <>
      {/* A packed suitcase with straps and a sticker */}
      <g transform="rotate(-5 60 54)">
        <path className={s.strap} d="M48 32v-8a4 4 0 014-4h16a4 4 0 014 4v8" />
        <rect className={s.frame} x="22" y="32" width="76" height="48" rx="8" />
        <rect className={s.hill} x="36" y="32" width="8" height="48" />
        <rect className={s.hill} x="76" y="32" width="8" height="48" />
        <circle className={s.sun} cx="60" cy="50" r="7" />
        <rect className={s.line} x="50" y="64" width="20" height="4" rx="2" />
        <rect className={s.frame} x="22" y="32" width="76" height="48" rx="8" fillOpacity="0" />
      </g>
      <path className={s.spark} d="M106 18v8M102 22h8M12 22v6M9 25h6" />
    </>
  ),
  compass: (
    <>
      {/* A compass, needle pointing the way */}
      <g transform="rotate(-8 60 48)">
        <circle className={s.frame} cx="60" cy="48" r="32" />
        <circle className={s.photo} cx="60" cy="48" r="25" />
        <rect className={s.line} x="58" y="18" width="4" height="7" rx="2" />
        <rect className={s.line} x="58" y="71" width="4" height="7" rx="2" />
        <rect className={s.line} x="30" y="46" width="7" height="4" rx="2" />
        <rect className={s.line} x="83" y="46" width="7" height="4" rx="2" />
        <path className={s.hill} d="M60 26l7 22H53z" />
        <path className={s.needle} d="M60 70l-7-22h14z" />
        <circle className={s.frame} cx="60" cy="48" r="4" />
      </g>
      <path className={s.spark} d="M106 12v8M102 16h8M14 78v6M11 81h6" />
    </>
  ),
  globe: (
    <>
      {/* A globe with a little plane circling it */}
      <circle className={s.frame} cx="56" cy="50" r="32" />
      <circle className={s.photo} cx="56" cy="50" r="26" />
      <path className={s.hill} d="M38 36c6-4 12 0 14 6s-4 10 0 14-2 10-8 8-10-8-10-14 0-11 4-14zM62 30c8-2 14 4 16 10s-2 8-6 8-6 6-10 4-4-8-2-12-4-8 2-10zM64 64c4-2 10 0 10 4s-6 8-10 6-2-8 0-10z" />
      <ellipse className={s.route} cx="56" cy="50" rx="46" ry="14" transform="rotate(-18 56 50)" />
      {/* A paper plane on the orbit */}
      <g transform="translate(88 14) rotate(-8)">
        <path className={s.frame} d="M0 9L24 0 17 22 11 14z" />
        <path className={s.frame} d="M24 0L11 14 9 21z" />
      </g>
      <circle className={s.sun} cx="100" cy="74" r="5" />
      <path className={s.spark} d="M14 12v8M10 16h8" />
    </>
  ),
};

const covers = {
  'cover-hills': (
    <>
      <rect className={s.photo} width="320" height="160" />
      <circle className={s.sun} cx="246" cy="52" r="20" />
      <path className={s.cloud} d="M150 46a12 12 0 0124-2 10 10 0 0118 8h-50a8 8 0 018-6z" />
      <path className={s.hill} d="M0 118l52-42 40 30 36-26 60 52 46-34 86 54v8H0z" />
      <path className={s.hillDeep} d="M0 136l70-30 60 26 70-34 120 44v18H0z" />
      <path className={s.spark} d="M110 34v10M105 39h10M212 84v8M208 88h8" />
    </>
  ),
  'cover-coast': (
    <>
      <rect className={s.photo} width="320" height="160" />
      <circle className={s.sun} cx="88" cy="56" r="22" />
      <path className={s.hill} d="M0 104h320v56H0z" />
      <path className={s.wave} d="M24 122c10-6 20-6 30 0s20 6 30 0M150 132c10-6 20-6 30 0s20 6 30 0M240 116c10-6 20-6 30 0" />
      <g transform="translate(212 64)">
        <path className={s.frame} d="M20 0v40H0z" />
        <path className={s.frame} d="M24 8l18 32H24z" />
        <path className={s.hillDeep} d="M-4 44h52l-8 10H4z" />
      </g>
      <path className={s.spark} d="M150 30v10M145 35h10M250 40v8M246 44h8" />
    </>
  ),
  'cover-city': (
    <>
      <rect className={s.photo} width="320" height="160" />
      <circle className={s.sun} cx="268" cy="46" r="18" />
      <path className={s.cloud} d="M196 36a12 12 0 0124-2 10 10 0 0118 8h-50a8 8 0 018-6z" />
      {[[30, 70, 34], [70, 52, 40], [116, 82, 30], [150, 40, 36], [192, 66, 34], [232, 58, 30]].map(([x, top, w]) => (
        <g key={x}>
          <rect className={s.frame} x={x} y={top} width={w} height={160 - top} rx="4" />
          {[0, 1, 2, 3].map((r) => <rect key={r} className={s.line} x={x + 8} y={top + 12 + r * 16} width={w - 16} height="5" rx="2" />)}
        </g>
      ))}
      <path className={s.hillDeep} d="M0 140c60-10 110-6 160 0s110 8 160-2v22H0z" />
      <path className={s.spark} d="M120 30v10M115 35h10M276 96v8M272 100h8" />
    </>
  ),
};
