/* ============================================================
 * Комната питомца: окно с реальной погодой и временем суток,
 * мебель, амбиентные частицы (светлячки, пыль, дождь, снег).
 * ============================================================ */
import { useMemo } from 'react';
import { ROOM_THEMES } from '../game/content';
import { mulberry32 } from '../game/dna';

interface Props {
  themeId: string;
  furniture: string[];
  phase: 'morning' | 'day' | 'evening' | 'night';
  weather: { kind: string; label: string };
  children?: React.ReactNode;
}

const SKY: Record<string, string> = {
  morning: 'linear-gradient(180deg, #ffd9a8 0%, #ffe9c9 40%, #bfe3f2 100%)',
  day: 'linear-gradient(180deg, #9fd8f0 0%, #c8ecfa 70%, #eaf7fd 100%)',
  evening: 'linear-gradient(180deg, #ff9e7d 0%, #e8847f 45%, #6d5a8f 100%)',
  night: 'linear-gradient(180deg, #0d1530 0%, #1c2a52 60%, #33406b 100%)',
};

export default function RoomScene({ themeId, furniture, phase, weather, children }: Props) {
  const theme = ROOM_THEMES.find(t => t.id === themeId) ?? ROOM_THEMES[0];
  const has = (id: string) => furniture.includes(id);
  const seed = useMemo(() => mulberry32(new Date().getDate() * 97 + new Date().getMonth()), []);
  const fireflies = useMemo(() => Array.from({ length: 10 }, () => ({ left: seed() * 92 + 4, top: seed() * 70 + 18, delay: seed() * 4, dur: 5 + seed() * 4 })), [seed]);
  const motes = useMemo(() => Array.from({ length: 8 }, () => ({ left: seed() * 92 + 4, top: seed() * 60 + 10, delay: seed() * 6, dur: 8 + seed() * 6 })), [seed]);
  const stars = useMemo(() => Array.from({ length: 14 }, () => ({ left: seed() * 88 + 6, top: seed() * 70 + 6, delay: seed() * 3, r: 1 + seed() * 1.6 })), [seed]);
  const rainDrops = useMemo(() => Array.from({ length: 16 }, () => ({ left: seed() * 96 + 2, delay: seed() * 1.4, dur: 0.8 + seed() * 0.6 })), [seed]);
  const snow = useMemo(() => Array.from({ length: 18 }, () => ({ left: seed() * 96 + 2, delay: seed() * 4, dur: 2.6 + seed() * 2 })), [seed]);

  const nightish = phase === 'night' || phase === 'evening';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wallDeep} 62%, ${theme.floor} 62%, ${theme.floorDeep} 100%)` }}>
      {/* обои: мягкие дуги */}
      <svg className="absolute inset-x-0 top-0 w-full opacity-[0.14]" height="100%" preserveAspectRatio="none" viewBox="0 0 100 62">
        {[8, 26, 44, 62, 80].map(x => <circle key={x} cx={x} cy={10} r={3.2} fill="#fff3e2" />)}
        {[17, 35, 53, 71, 89].map(x => <circle key={x} cx={x} cy={26} r={2.4} fill="#fff3e2" />)}
      </svg>

      {/* окно */}
      <div className="absolute" style={{ left: '8%', top: '7%', width: '30%', aspectRatio: '0.82', maxWidth: 230 }}>
        <div className="absolute inset-0 rounded-t-[46%] rounded-b-[10px] overflow-hidden border-[7px]" style={{ borderColor: '#3a2f52', background: SKY[phase], boxShadow: nightish ? '0 0 34px rgba(255,217,142,0.12)' : '0 0 44px rgba(255,244,214,0.22)' }}>
          {/* звёзды ночью */}
          {phase === 'night' && stars.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-cream" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.r, height: s.r, animation: `twinkle ${2 + s.delay}s ease-in-out infinite ${s.delay}s` }} />
          ))}
          {/* солнце/луна */}
          {phase !== 'night' ? (
            <div className="absolute rounded-full" style={{ right: '16%', top: '14%', width: '22%', aspectRatio: 1, background: phase === 'evening' ? '#ffd28e' : '#fff4c9', boxShadow: '0 0 26px 8px rgba(255,236,180,0.7)' }} />
          ) : (
            <div className="absolute rounded-full" style={{ right: '16%', top: '12%', width: '20%', aspectRatio: 1, background: '#fdf6d8', boxShadow: '0 0 22px 6px rgba(253,246,216,0.45)' }}>
              <div className="absolute rounded-full" style={{ left: '18%', top: '10%', width: '62%', height: '62%', background: SKY.night, borderRadius: '50%' }} />
            </div>
          )}
          {/* облака */}
          {(weather.kind === 'clouds' || weather.kind === 'rain' || weather.kind === 'wind') && (
            <>
              <div className="absolute rounded-full bg-white/70" style={{ left: '8%', top: '22%', width: '46%', height: '13%', animation: 'floatSlow 9s ease-in-out infinite' }} />
              <div className="absolute rounded-full bg-white/50" style={{ left: '40%', top: '40%', width: '52%', height: '12%', animation: 'floatSlow 11s ease-in-out infinite 1.2s' }} />
            </>
          )}
          {/* дождь */}
          {weather.kind === 'rain' && rainDrops.map((d, i) => (
            <div key={i} className="absolute w-[2px] rounded-full bg-sky/70" style={{ left: `${d.left}%`, top: '-12%', height: 14, animation: `rainDrop ${d.dur}s linear infinite ${d.delay}s` }} />
          ))}
          {/* снег */}
          {weather.kind === 'snow' && snow.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white/85" style={{ left: `${s.left}%`, top: '-8%', width: 5, height: 5, animation: `snowDrop ${s.dur}s linear infinite ${s.delay}s` }} />
          ))}
        </div>
        {/* подоконник */}
        <div className="absolute -bottom-3 -left-2 -right-2 h-3 rounded-md" style={{ background: '#4a3d66' }} />
      </div>

      {/* коврик-облако */}
      {has('furn_rug') && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '6%', width: '46%' }}>
          <svg viewBox="0 0 200 60" className="w-full opacity-90">
            <ellipse cx="100" cy="34" rx="96" ry="24" fill="#fff3e2" opacity="0.16" />
            <ellipse cx="100" cy="30" rx="78" ry="18" fill="#fff3e2" opacity="0.2" />
          </svg>
        </div>
      )}

      {/* звёздная лампа */}
      {has('furn_starlamp') && (
        <div className="absolute" style={{ right: '5%', bottom: '26%', width: '13%', minWidth: 64 }}>
          <svg viewBox="0 0 80 140" className="w-full">
            <ellipse cx="40" cy="34" rx="26" ry="26" fill="#ffd98e" opacity="0.9" style={{ animation: 'lampGlow 4s ease-in-out infinite' }} />
            <ellipse cx="40" cy="34" rx="38" ry="38" fill="#ffd98e" opacity="0.25" style={{ animation: 'lampGlow 4s ease-in-out infinite' }} />
            <rect x="36" y="58" width="8" height="62" rx="4" fill="#4a3d66" />
            <ellipse cx="40" cy="124" rx="22" ry="8" fill="#3a2f52" />
            <path d="M40 14 l4 8 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1z" fill="#fff3e2" />
          </svg>
        </div>
      )}

      {/* аквариум */}
      {has('furn_aquarium') && (
        <div className="absolute" style={{ left: '4%', bottom: '24%', width: '15%', minWidth: 70 }}>
          <svg viewBox="0 0 100 100" className="w-full">
            <rect x="10" y="26" width="80" height="58" rx="10" fill="rgba(142,202,230,0.35)" stroke="#8ecae6" strokeWidth="2.5" />
            <circle cx="62" cy="46" r="9" fill="#fdf6d8" opacity="0.95" />
            <path d="M30 62 q6 -5 12 0 q6 5 12 0" stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.6" />
            <ellipse cx="38" cy="74" rx="7" ry="3.5" fill="#ff9e7d" />
            <path d="M45 74 l7 -4 v8 z" fill="#ff9e7d" />
            <circle cx="38" cy="73" r="1.3" fill="#2b1d33" />
            <ellipse cx="50" cy="90" rx="44" ry="6" fill="#3a2f52" />
          </svg>
        </div>
      )}

      {/* книжная полка */}
      {has('furn_bookshelf') && (
        <div className="absolute" style={{ right: '6%', top: '8%', width: '17%', minWidth: 84 }}>
          <svg viewBox="0 0 120 90" className="w-full">
            <rect x="4" y="6" width="112" height="78" rx="8" fill="#4a3d66" />
            <rect x="10" y="12" width="100" height="30" rx="4" fill="#2b2140" />
            <rect x="10" y="48" width="100" height="30" rx="4" fill="#2b2140" />
            {[[14, '#ff8f7d'], [24, '#9fe8c9'], [34, '#ffd98e'], [46, '#8ecae6'], [56, '#c8b6ff']].map(([x, c], i) => (
              <rect key={i} x={x as number} y={16} width={7} height={26} rx={2} fill={c as string} />
            ))}
            {[[14, '#8ecae6'], [26, '#ffaec9'], [38, '#9fe8c9'], [50, '#ffd98e']].map(([x, c], i) => (
              <rect key={i} x={x as number} y={52} width={7} height={26} rx={2} fill={c as string} />
            ))}
            <rect x="76" y="52" width="26" height="26" rx="4" fill="#c8b6ff" opacity="0.8" />
          </svg>
        </div>
      )}

      {/* растение-светлячок */}
      {has('furn_plant') && (
        <div className="absolute" style={{ left: '20%', bottom: '26%', width: '9%', minWidth: 46 }}>
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
        <div className="absolute" style={{ left: '5%', bottom: '8%', width: '10%', minWidth: 52 }}>
          <svg viewBox="0 0 70 60" className="w-full">
            <rect x="8" y="18" width="54" height="34" rx="6" fill="#c8b6ff" stroke="#a992f0" strokeWidth="2.5" />
            <path d="M8 18 L14 8 H56 L62 18 Z" fill="#a992f0" />
            <circle cx="35" cy="35" r="8" fill="#fff3e2" />
            <circle cx="35" cy="35" r="3" fill="#a992f0" />
            <text x="44" y="16" fontSize="12" fill="#ffd98e" style={{ animation: 'bob 2.4s ease-in-out infinite' }}>♪</text>
          </svg>
        </div>
      )}

      {/* пол: доски */}
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-[0.16]" style={{ height: '38%' }} preserveAspectRatio="none" viewBox="0 0 100 38">
        {[6, 13, 20, 27, 34].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#0c1220" strokeWidth="0.5" />)}
      </svg>

      {/* амбиент: светлячки ночью, пылинки днём */}
      {phase === 'night' || phase === 'evening' ? fireflies.map((f, i) => (
        <div key={i} className="absolute rounded-full" style={{ left: `${f.left}%`, top: `${f.top}%`, width: 5, height: 5, background: '#ffd98e', boxShadow: '0 0 10px 3px rgba(255,217,142,0.5)', animation: `firefly ${f.dur}s ease-in-out infinite ${f.delay}s` }} />
      )) : motes.map((m, i) => (
        <div key={i} className="absolute rounded-full bg-cream/40" style={{ left: `${m.left}%`, top: `${m.top}%`, width: 3, height: 3, animation: `firefly ${m.dur}s ease-in-out infinite ${m.delay}s` }} />
      ))}

      {/* ночное затемнение + виньетка */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ background: 'linear-gradient(180deg, rgba(8,12,28,0.42), rgba(8,12,28,0.18) 55%, rgba(8,12,28,0.45))', opacity: phase === 'night' ? 1 : phase === 'evening' ? 0.55 : phase === 'morning' ? 0.25 : 0.1 }} />
      <div className="absolute inset-0 pointer-events-none room-vignette" />

      {children}
    </div>
  );
}
