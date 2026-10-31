import type { SVGProps } from 'react';
import { FILLED, LINE } from './icons';

export type IconName = keyof typeof LINE;
/** Figma ".Icon styles" State: Default is the line icon, Filled the solid one (brand-coloured unless a colour is set). */
export type IconState = 'default' | 'filled';

/** Every icon in the set, in Figma order (for the design page). */
export const ICON_NAMES = Object.keys(LINE) as IconName[];

type Props = Omit<SVGProps<SVGSVGElement>, 'fill'> & { name: IconName; size?: number; state?: IconState; title?: string };

/** Uicons Rounded, 24px (Large) or 16px (Small) like Figma. Colour comes from `color` (currentColor). */
export function Icon({ name, size = 24, state = 'default', title, style, ...rest }: Props) {
  const line = LINE[name];
  const d = state === 'filled' ? FILLED[name] : line.d;
  const fitted = state !== 'filled' && 'fit' in line;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      // Filled icons are brand-coloured by default (Figma: icon/brand)
      style={state === 'filled' ? { color: 'var(--icon-brand)', ...style } : style}
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={d} transform={fitted ? undefined : 'translate(3 3) scale(0.75)'} />
    </svg>
  );
}
