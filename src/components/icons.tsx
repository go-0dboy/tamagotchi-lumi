/* Библиотека SVG-иконок (stroke: currentColor) */
import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  spark: <><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  star: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.7-5.2 2.7 1-5.9L3.5 9.2l5.9-.9z" />,
  moon: <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />,
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" /></>,
  cloud: <path d="M6.5 18a4.5 4.5 0 01-.4-9A6 6 0 0118 10.5 3.8 3.8 0 0117.5 18z" />,
  rain: <><path d="M6.5 14a4.5 4.5 0 01-.4-9A6 6 0 0118 6.5 3.8 3.8 0 0117.5 14z" /><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" /></>,
  snowflake: <><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" strokeWidth="1.6" /><circle cx="12" cy="12" r="2" /></>,
  wind: <path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h7a2.5 2.5 0 11-2.5 2.5" />,
  heart: <path d="M12 21C5.5 15.5 2 12 2 8.5 2 5.7 4.2 3.5 7 3.5c1.9 0 3.7 1 5 2.7 1.3-1.7 3.1-2.7 5-2.7 2.8 0 5 2.2 5 5 0 3.5-3.5 7-10 12.5z" />,
  berry: <><circle cx="8.5" cy="15" r="4.5" /><circle cx="15.5" cy="15" r="4.5" /><path d="M12 10.5c0-3 1.5-5 4-6M12 10.5C9 9 7 9 5.5 9.5" /></>,
  honey: <><path d="M9 3h6l1 3H8z" /><path d="M8 6h8l1 4c0 5-2.5 9-5 11-2.5-2-5-6-5-11z" /><path d="M10 12h4" /></>,
  soup: <><path d="M4 11h16v2a8 8 0 01-16 0z" /><path d="M8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" /><path d="M2 21h20" /></>,
  cookie: <><circle cx="12" cy="12" r="9" /><circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="14.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.5" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="10" cy="15" r="1.2" fill="currentColor" stroke="none" /></>,
  tea: <><path d="M4 9h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5z" /><path d="M17 10h2a2.5 2.5 0 010 5h-2.5" /><path d="M8 5c0-1.2.8-1.2.8-2.4M12 5c0-1.2.8-1.2.8-2.4" /></>,
  cake: <><path d="M4 13h16v7H4z" /><path d="M4 13c2-2 3 1.5 5-.5s3 1.5 5-.5 3 1.5 5-.5" /><path d="M12 9V6M12 4.5v.01" /><path d="M6 20v-4M18 20v-4" /></>,
  broom: <><path d="M19 3l-7.5 8.5" /><path d="M11.5 11.5l-6 1.5-2 8 8-2 1.5-6z" /><path d="M7 16l2 2" /></>,
  sleep: <><path d="M4 6h6l-6 7h6" /><path d="M14 12h4l-4 5h4" /><path d="M12 3c4.5 0 8 3.6 8 8" opacity="0.5" /></>,
  book: <><path d="M4 5a2 2 0 012-2h14v18H6a2 2 0 00-2 2z" /><path d="M4 19a2 2 0 012-2h14" /><path d="M9 7h6" /></>,
  walk: <><circle cx="13" cy="4.5" r="2" /><path d="M13 7l-2.5 5 2.5 3-1 6" /><path d="M10.5 12L8 14l-1.5 5.5" /><path d="M13 15l3 2 1.5 4.5" /><path d="M10.5 9.5L7 11M13.5 10l3.5 1.5" /></>,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  brain: <><path d="M9.5 3A3.5 3.5 0 006 6.5c-2 .5-3 2-3 4 0 1.5.7 2.7 1.8 3.4A3.6 3.6 0 008.5 21c1.6 0 2.7-.8 3.5-2 .8 1.2 1.9 2 3.5 2a3.6 3.6 0 003.7-7.1c1.1-.7 1.8-1.9 1.8-3.4 0-2-1-3.5-3-4A3.5 3.5 0 0014.5 3c-1 0-1.9.4-2.5 1.1A3.4 3.4 0 009.5 3z" /><path d="M12 4.5v14" /></>,
  flower: <><circle cx="12" cy="9" r="2.5" /><path d="M12 6.5a3 3 0 113-3M12 6.5a3 3 0 10-3-3M14.5 9a3 3 0 113 3M9.5 9a3 3 0 10-3 3" /><path d="M12 12v9M12 17c-2 0-3.5-1-4-3M12 19c2 0 3.5-1 4-3" /></>,
  feather: <><path d="M20 4c-6 0-12 4-13 11l-3 5 5-3c7-1 11-7 11-13z" /><path d="M7 17L18 6" /></>,
  shell: <><path d="M12 21C6 21 3 16 3 11a9 9 0 0118 0c0 5-3 10-9 10z" /><path d="M12 21V4M12 21L5.5 8M12 21l6.5-13M12 21L3.5 13.5M12 21l8.5-7.5" /></>,
  stone: <path d="M7 19c-2.5-1-4-3-4-6 0-4 4-8 9-8s9 4 9 8c0 3-1.5 5-4 6-3 1.3-7 1.3-10 0z" />,
  drawing: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 16l3-4 2.5 2.5L16 10l3 6z" /><circle cx="9" cy="8.5" r="1.2" /></>,
  hat: <><path d="M7 15L12 4l5 11z" /><path d="M4 15h16v3H4z" /><circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" /></>,
  leafhat: <><path d="M5 16q0-9 7-11 7 2 7 11z" /><path d="M3 16h18v2.5H3z" /><path d="M12 5q3.5-2.5 6-.5" /></>,
  scarf: <><path d="M5 8c0-2 3-3.5 7-3.5S19 6 19 8v3c0 2-3 3.5-7 3.5S5 13 5 11z" /><path d="M14 14.5V20l-2 2-2-2v-5.5" /></>,
  glasses: <><circle cx="7.5" cy="13" r="3.5" /><circle cx="16.5" cy="13" r="3.5" /><path d="M11 13h2M4 12l-2-1M20 12l2-1" /></>,
  wings: <><path d="M12 12C10 7 5 5 2 6c0 5 4 9 10 9" /><path d="M12 12c2-5 7-7 10-6 0 5-4 9-10 9" /><path d="M12 15v5" /></>,
  lamp: <><path d="M8 3h8l3 7H5z" /><path d="M12 10v8" /><path d="M8 21h8M12 18v3" /></>,
  aquarium: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="1.2" /><path d="M13 13q2-2 4 0M6 16h12" /></>,
  bookshelf: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18M7 12V6M11 12V6M8 18v-3M12 18v-3M16 18v-3" /></>,
  plant: <><path d="M12 21v-8" /><path d="M12 13c0-4-2.5-6-6-6 0 4 2.5 6 6 6zM12 13c0-4 2.5-6 6-6 0 4-2.5 6-6 6z" /><path d="M8 21h8" /></>,
  rug: <><ellipse cx="12" cy="12" rx="9" ry="5" /><ellipse cx="12" cy="12" rx="5" ry="2.5" /></>,
  musicbox: <><rect x="3" y="9" width="18" height="11" rx="2" /><path d="M3 9l3-5h12l3 5" /><path d="M10 13.5v4M10 13.5l4-1v4" /><circle cx="9" cy="17.5" r="1.2" /><circle cx="13" cy="16.5" r="1.2" /></>,
  kite: <><path d="M12 2l7 8-7 10-7-10z" /><path d="M12 2v18M5 10h14" /><path d="M12 20c1 1.5 0 2 1 3" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8v13" /><path d="M12 8C10 8 7.5 7 7.5 5S10 3 12 8c2-5 4.5-5 4.5-3S14 8 12 8z" /></>,
  diary: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v18M12 8h5M12 12h5" /></>,
  care: <><path d="M12 21C5.5 15.5 2 12 2 8.5 2 5.7 4.2 3.5 7 3.5c1.9 0 3.7 1 5 2.7 1.3-1.7 3.1-2.7 5-2.7 2.8 0 5 2.2 5 5 0 3.5-3.5 7-10 12.5z" /><path d="M9 11h2v-2h2v2h2v2h-2v2h-2v-2H9z" /></>,
  game: <><rect x="2" y="7" width="20" height="11" rx="5" /><path d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" /><circle cx="18.5" cy="13.5" r="1" fill="currentColor" stroke="none" /></>,
  chat: <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19" /></>,
  soundOn: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></>,
  soundOff: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  export: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M4 13v6a2 2 0 002 2h12a2 2 0 002-2v-6" /></>,
  import: <><path d="M12 15V3M8 11l4 4 4-4" /><path d="M4 13v6a2 2 0 002 2h12a2 2 0 002-2v-6" /></>,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 13V8M9 2h6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  brush: <><path d="M14 3l7 7-8.5 8.5a3.5 3.5 0 01-5-5z" /><path d="M8 14a3 3 0 00-4 4c1.5 0 4 .5 4-4z" /></>,
  tree: <><path d="M12 21v-7" /><path d="M12 14c-4 0-6-2.5-6-6 2-2 4-2 6 0 2-2 4-2 6 0 0 3.5-2 6-6 6z" /><path d="M12 8a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" opacity="0.7" /></>,
};

export default function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name] ?? paths.spark}
    </svg>
  );
}
