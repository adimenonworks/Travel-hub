import type { SVGProps } from 'react';

// SF Symbols-style line icons (24px grid, 1.8 stroke). Add new glyphs here.
const paths = {
  plus: 'M12 5v14M5 12h14',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  calendar: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 10h16M8 3v4M16 3v4',
  lightbulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-9a1 1 0 00-1-1H5a2 2 0 01-2-2zM16 13.5h.01',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  people: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M16 3.5a4 4 0 010 7M22 21v-1a6 6 0 00-4-5.6',
  person: 'M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 21v-1a7 7 0 0114 0v1',
  home: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5',
  pin: 'M12 21s-7-6.1-7-11.5a7 7 0 0114 0C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  doc: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  'thumbs-up': 'M7 11v10H4V11h3zM7 11l4-8a2 2 0 012 2v4h5.5a2 2 0 012 2.3l-1.2 7A2 2 0 0117.3 21H7',
  chat: 'M4 5h16v11H9l-5 4V5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cloud: 'M7 18a4 4 0 01-.6-8A6 6 0 0118 9a4.5 4.5 0 01-1 9H7z',
  rain: 'M7 15a4 4 0 01-.6-8A6 6 0 0118 6a4.5 4.5 0 01-1 9H7zM8 18l-1 3M12 18l-1 3M16 18l-1 3',
  snow: 'M7 14a4 4 0 01-.6-8A6 6 0 0118 5a4.5 4.5 0 01-1 9H7zM8 18h.01M12 20h.01M16 18h.01M10 22h.01M14 22h.01',
  bolt: 'M13 2L5 13h6l-1 9 8-11h-6l1-9z',
  news: 'M5 4h12v15a2 2 0 002 2H6a2 2 0 01-2-2V5a1 1 0 011-1zM17 9h3v10a2 2 0 01-2 2M8 8h6M8 12h6M8 16h4',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  swatch: 'M12 21a9 9 0 110-18c5 0 9 3.6 9 8 0 2.8-2.2 4-4 4h-2a2 2 0 00-1.4 3.4A1.5 1.5 0 0112 21zM7.5 11h.01M10 7h.01M14 7h.01M16.5 11h.01',
  share: 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
  ellipsis: 'M6 12h.01M12 12h.01M18 12h.01',
  'arrow-up-right': 'M7 17L17 7M8 7h9v9',
  signout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 8l-4 4 4 4M6 12h10',
  copy: 'M9 9h10v12H9zM5 15V3h10',
  plane: 'M10.5 20l1.5-6.5L5 11l.5-2 7 1.5L16 4c.6-.6 1.8-.6 2.2 0 .5.5.4 1.6-.2 2.2L14.5 10l1.5 7-2 .5-2.5-6.5L5.5 13',
} as const;

export type IconName = keyof typeof paths;

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number; title?: string };

export function Icon({ name, size = 22, title, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={paths[name]} />
    </svg>
  );
}
