import { memo, type CSSProperties, type ReactNode } from 'react';
import { ROOM_THEMES } from '../game/content';
import { mulberry32 } from '../game/dna';

interface Props {
  themeId: string;
  furniture: string[];
  phase: 'morning' | 'day' | 'evening' | 'night';
  weatherKind: string;
  sleeping?: boolean;
  cleanliness?: number;
  children?: ReactNode;
}

const SKY = {
  morning: { sky: 'linear-gradient(#ffbe91, #ffebbe 58%, #c9dacc)', far: '#8baaa6', near: '#477579' },
  day: { sky: 'linear-gradient(#7fb4df, #c9e9ec 62%, #e9edcc)', far: '#7eacb1', near: '#3d7780' },
  evening: { sky: 'linear-gradient(#66538c, #e27e86 65%, #ffc094)', far: '#6c638f', near: '#393b67' },
  night: { sky: 'linear-gradient(#122244, #253762 65%, #4d5a83)', far: '#485579', near: '#202d4e' },
};

const random = mulberry32(197);
const stars = Array.from({ length: 10 }, () => ({ x: 8 + random() * 143, y: 7 + random() * 90, r: 0.8 + random() * 1.1 }));
const precipitation = Array.from({ length: 12 }, () => ({ x: 4 + random() * 92, delay: random() * 4 }));
const motes = Array.from({ length: 5 }, () => ({ x: 10 + random() * 80, y: 22 + random() * 58, delay: random() * 6 }));
const grime = Array.from({ length: 8 }, () => ({ x: 8 + random() * 84, y: 7 + random() * 26, rx: 1 + random() * 2.6, ry: 0.8 + random() }));

export default function RoomScene({ children, cleanliness = 100, ...backdrop }: Props) {
  const dirt = cleanliness < 32 ? 2 : cleanliness < 55 ? 1 : 0;
  return (
    <div className="absolute inset-0 isolate overflow-hidden">
      <RoomBackdrop {...backdrop} dirt={dirt} />
      {children}
    </div>
  );
}

const RoomBackdrop = memo(function RoomBackdrop({
  themeId, furniture, phase, weatherKind, sleeping, dirt,
}: Omit<Props, 'children' | 'cleanliness'> & { dirt: number }) {
  const theme = ROOM_THEMES.find(t => t.id === themeId) ?? ROOM_THEMES[0];
  const has = (id: string) => furniture.includes(id);
  const sky = SKY[phase];
  const night = phase === 'night';
  const wet = weatherKind === 'rain' || weatherKind === 'snow';
  const cloudy = wet || weatherKind === 'clouds' || weatherKind === 'wind';

  return (
    <div className="room-backdrop absolute inset-0 pointer-events-none" data-phase={phase} data-sleeping={sleeping || undefined}
      aria-hidden="true" style={{ '--wall': theme.wall, '--wall-deep': theme.wallDeep, '--floor': theme.floor, '--floor-deep': theme.floorDeep } as CSSProperties}>
      <div className="room-wall" />
      <svg className="room-floor" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d="M0 5H100 M0 12H100 M0 23H100 M0 39H100 M15 5L12 12 M38 12L34 23 M67 5L70 12 M82 12L93 23 M19 23L10 39 M56 23L59 39"
          fill="none" stroke="#0c101b" strokeWidth=".4" opacity=".38" />
        <path d="M0 5.5H100 M0 12.5H100 M0 23.5H100" fill="none" stroke="#ffdfb9" strokeWidth=".18" opacity=".15" />
        {dirt > 0 && grime.slice(0, dirt === 2 ? 8 : 4).map(({ x, y, rx, ry }, i) => (
          <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#1d1517" opacity={dirt === 2 ? '.62' : '.37'} />
        ))}
      </svg>
      <div className="room-window-light" />

      <div className="room-window">
        <div className="room-window-glass" style={{ background: sky.sky }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 182" preserveAspectRatio="xMidYMax slice">
            {night && !cloudy && <g fill="#fff1c7" opacity=".75">
              {stars.map(({ x, y, r }, i) => <circle key={i} cx={x} cy={y} r={r} />)}
            </g>}
            {!wet && (night
              ? <path d="M115 25a14 14 0 1 0 13 19 13 13 0 0 1-13-19Z" fill="#fff4cf" />
              : <circle cx="114" cy={phase === 'evening' ? 87 : 47} r="16" fill="#fff1c2" opacity={cloudy ? '.38' : '.92'} />)}
            {cloudy && <g fill={night ? '#9aabcf' : '#fff1e2'} opacity=".5">
              <path d="M0 61H75q-3-7-15-7-4-11-17-10-10 0-15 8-16-2-28 9Z" />
              <path d="M83 81h77V70q-10-7-19 0-9-8-18-2-11-4-15 6-14-1-25 7Z" />
            </g>}
            <path d="M0 129Q26 107 53 120T97 119Q126 99 160 120V182H0Z" fill={sky.far} />
            <path d="M0 149Q28 140 54 151T111 145Q132 132 160 139V182H0Z" fill={sky.near} />
            <g fill={sky.near}>
              {[[17, 138, 0.72], [31, 137, 1], [133, 133, 0.85], [145, 130, 1.1]].map(([x, y, size]) => (
                <path key={x} d="M0-28 8-13H5L11 0H-11L-5-13H-8Z" transform={`translate(${x} ${y}) scale(${size})`} />
              ))}
            </g>
            <path d="M13 168Q52 161 79 168T146 162" fill="none" stroke="#ffebc9" strokeWidth="1.4" opacity=".26" />
          </svg>
          {wet && precipitation.map(({ x, delay }, i) => (
            <i key={i} className={`room-precipitation room-${weatherKind}`}
              style={{ left: `${x}%`, top: `${(i * 29) % 90}%`, animationDelay: `-${delay}s` }} />
          ))}
          <span className="room-window-mullion" />
        </div>
        <span className="room-window-sill" />
      </div>

      <div className="room-picture" style={has('furn_bookshelf') ? { right: '32%' } : undefined}>
        <svg viewBox="0 0 100 83" className="w-full">
          <path d="M36 22 50 5 64 22" stroke="#b4979b" strokeWidth="1.2" fill="none" />
          <circle cx="50" cy="5" r="2" fill="#f2c78d" />
          <rect x="2" y="19" width="96" height="62" rx="6" fill="#382946" stroke="#9a7180" strokeWidth="2" />
          <rect x="8" y="25" width="84" height="50" rx="3" fill="#e5bc9a" />
          <rect x="13" y="30" width="74" height="40" rx="1" fill="#514c78" />
          <circle cx="65" cy="42" r="7" fill="#ffd894" />
          <path d="M13 66 34 46 48 58 57 53 77 70H13Z" fill="#79829b" />
          <path d="M13 70 36 60 52 65 71 56 87 63V70Z" fill="#3a4e67" />
        </svg>
      </div>

      <div className="room-console">
        <svg viewBox="0 0 176 93" className="w-full">
          <ellipse cx="90" cy="85" rx="79" ry="7" fill="#090c18" opacity=".34" />
          <path d="M22 59h13l-3 26H21zM145 59h13l-1 26h-11z" fill="#3a2b45" />
          <rect x="19" y="31" width="141" height="42" rx="6" fill="#51405a" />
          <rect x="13" y="28" width="153" height="10" rx="4" fill="#816176" />
          <rect x="28" y="43" width="122" height="22" rx="4" fill="#66516b" stroke="#92728a" strokeWidth="1" />
          <path d="M81 53h16" stroke="#d6ae8b" strokeWidth="3" strokeLinecap="round" />
          <rect x="34" y="20" width="42" height="8" rx="2" fill="#9b8fb9" />
          <rect x="40" y="14" width="31" height="6" rx="2" fill="#d7a67f" />
          <path d="M126 18q2-8 13-12M126 18q-5-9-15-8" stroke="#9fbf9b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M116 17h21l-4 11h-13z" fill="#d39a83" />
        </svg>
      </div>

      {has('furn_rug') && (
        <div className="room-rug">
          <svg viewBox="0 0 300 80" className="w-full">
            <ellipse cx="150" cy="48" rx="143" ry="28" fill="#141124" opacity=".55" />
            <ellipse cx="150" cy="41" rx="144" ry="29" fill="#5b4869" stroke="#9a7b94" strokeWidth="2" />
            <ellipse cx="150" cy="41" rx="127" ry="21" fill="#695476" stroke="#bd9aab" strokeWidth="1" strokeDasharray="3 4" opacity=".82" />
            <path d="M150 28 171 41 150 54 129 41Z M85 37 93 41 85 45 77 41Z M215 37 223 41 215 45 207 41Z"
              fill="none" stroke="#e7c7b5" strokeWidth="1.3" opacity=".56" />
          </svg>
        </div>
      )}

      {/* звёздная лампа */}
      {has('furn_starlamp') && (
        <div className="absolute pointer-events-none" style={{ right: '4.5%', bottom: '20%', width: '12%', minWidth: 56, maxWidth: 100 }}>
          <svg viewBox="0 0 80 140" className="w-full">
            <ellipse cx="40" cy="34" rx="26" ry="26" fill="#ffd98e" opacity="0.85" style={{ animation: 'lampGlow 4s ease-in-out infinite' }} />
            <ellipse cx="40" cy="34" rx="38" ry="38" fill="#ffd98e" opacity="0.22" style={{ animation: 'lampGlow 4s ease-in-out infinite' }} />
            <rect x="36" y="58" width="8" height="62" rx="4" fill="#4a3d66" />
            <ellipse cx="40" cy="124" rx="22" ry="8" fill="#3a2f52" />
            <path d="M40 14 l4 8 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1z" fill="#fff3e2" />
          </svg>
        </div>
      )}

      {/* аквариум */}
      {has('furn_aquarium') && (
        <div className="absolute pointer-events-none" style={{ left: '27%', bottom: '24%', width: '14%', minWidth: 62, maxWidth: 110 }}>
          <svg viewBox="0 0 100 100" className="w-full">
            <rect x="10" y="26" width="80" height="58" rx="10" fill="rgba(142,202,230,0.32)" stroke="#8ecae6" strokeWidth="2.5" />
            <circle cx="62" cy="46" r="9" fill="#fdf6d8" opacity="0.95" />
            <path d="M30 62 q6 -5 12 0 q6 5 12 0" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.6" />
            <ellipse cx="38" cy="74" rx="7" ry="3.5" fill="#ff9e7d" />
            <path d="M45 74 l7 -4 v8 z" fill="#ff9e7d" />
            <circle cx="38" cy="73" r="1.3" fill="#2b1d33" />
            <ellipse cx="50" cy="90" rx="44" ry="6" fill="#3a2f52" />
          </svg>
        </div>
      )}

      {/* книжная полка */}
      {has('furn_bookshelf') && (
        <div className="absolute pointer-events-none" style={{ right: '5%', top: '8%', width: '16%', minWidth: 76, maxWidth: 140 }}>
          <svg viewBox="0 0 120 90" className="w-full">
            <rect x="4" y="6" width="112" height="78" rx="8" fill="#4a3d66" />
            <rect x="10" y="12" width="100" height="30" rx="4" fill="#2b2140" />
            <rect x="10" y="48" width="100" height="30" rx="4" fill="#2b2140" />
            {[[14, '#ff8f7d'], [24, '#9fe8c9'], [34, '#ffd98e'], [46, '#8ecae6'], [56, '#c8b6ff']].map(([x, col], i) => (
              <rect key={i} x={x as number} y={16} width={7} height={26} rx={2} fill={col as string} />
            ))}
            {[[14, '#8ecae6'], [26, '#ffaec9'], [38, '#9fe8c9'], [50, '#ffd98e']].map(([x, col], i) => (
              <rect key={i} x={x as number} y={52} width={7} height={26} rx={2} fill={col as string} />
            ))}
            <rect x="76" y="52" width="26" height="26" rx="4" fill="#c8b6ff" opacity="0.8" />
          </svg>
        </div>
      )}

      {/* растение-светлячок */}
      {has('furn_plant') && (
        <div className="absolute pointer-events-none" style={{ left: '24%', bottom: '10%', width: '8%', minWidth: 40, maxWidth: 66 }}>
          <svg viewBox="0 0 60 90" className="w-full">
            <path d="M30 60 q-2 -26 -16 -34" stroke="#7fd4ae" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M30 60 q2 -30 18 -40" stroke="#7fd4ae" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="14" cy="24" r="7" fill="#9fe8c9" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
            <circle cx="48" cy="18" r="6" fill="#ffd98e" style={{ animation: 'twinkle 3s ease-in-out infinite 1s' }} />
            <path d="M18 60 h24 l-3 22 h-18 z" fill="#d98e73" />
            <rect x="16" y="56" width="28" height="8" rx="3" fill="#c07a5f" />
          </svg>
        </div>
      )}

      {/* музыкальная шкатулка */}
      {has('furn_musicbox') && (
        <div className="absolute pointer-events-none" style={{ left: '5%', bottom: '7.5%', width: '8%', minWidth: 40, maxWidth: 60 }}>
          <svg viewBox="0 0 70 60" className="w-full">
            <rect x="8" y="18" width="54" height="34" rx="6" fill="#c8b6ff" stroke="#a992f0" strokeWidth="2.5" />
            <path d="M8 18 L14 8 H56 L62 18 Z" fill="#a992f0" />
            <circle cx="35" cy="35" r="8" fill="#fff3e2" />
            <circle cx="35" cy="35" r="3" fill="#a992f0" />
            <text x="44" y="15" fontSize="12" fill="#ffd98e" style={{ animation: 'bob 2.4s ease-in-out infinite' }}>♪</text>
          </svg>
        </div>
      )}

      {motes.map(({ x, y, delay }, i) => (
        <i key={i} className="room-mote" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `-${delay}s` }} />
      ))}
      <div className="room-shade" />
    </div>
  );
});
