import type { SVGProps } from 'react';
import { FILLED, LINE } from './icons';

export type IconName = keyof typeof LINE;
/** Figma ".Icon styles" State: Default is the line icon, Filled the solid one (brand-coloured unless a colour is set). */
export type IconState = 'default' | 'filled';

/** Every icon in the set, in Figma order (for the design page). */
export const ICON_NAMES = Object.keys(LINE) as IconName[];

type Props = Omit<SVGProps<SVGSVGElement>, 'fill'> & { name: IconName; size?: number; state?: IconState; title?: string };

/** Uicons Rounded, 24px (Large) or 16px (Small) like Figma. Colour comes from `color` (currentColor). */
/**
 * How big the glyph is drawn inside its box (Figma "Icon" component): Small (16px box) shows a 12px glyph,
 * Large (24px box, and anything bigger) a glyph two thirds of the box, 16px. Glyphs sit on a 24-unit grid;
 * `fitted` ones are already inset to 18 units, the rest fill all 24.
 */
function glyph(size: number, fitted: boolean) {
  const g = size >= 20 ? 16 : 18; // glyph size in grid units
  if (fitted) return g === 18 ? undefined : `translate(12 12) scale(${g / 18}) translate(-12 -12)`;
  const k = g / 24, o = (24 - g) / 2;
  return `translate(${o} ${o}) scale(${k})`;
}

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
      <path d={d} transform={glyph(size, fitted)} />
    </svg>
  );
}
