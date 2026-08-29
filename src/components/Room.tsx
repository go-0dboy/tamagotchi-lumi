/* ============================================================
 * Комната питомца: окно с реальной погодой и временем суток,
 * кровать, гирлянда, картина, мебель, амбиентные частицы.
 * Геометрия окна привязана к высоте сцены (clamp) — на любых
 * пропорциях экрана окно остаётся на стене, а не на полу.
 * ============================================================ */
import { useMemo } from 'react';
import { ROOM_THEMES } from '../game/content';
import { mulberry32 } from '../game/dna';

interface Props {
  themeId: string;
  furniture: string[];
  phase: 'morning' | 'day' | 'evening' | 'night';
  weather: { kind: string; label: string };
  sleeping?: boolean;
  cleanliness?: number;
  children?: React.ReactNode;
}

const SKY: Record<string, string> = {
  morning: 'linear-gradient(180deg, #ffd9a8 0%, #ffe9c9 40%, #bfe3f2 100%)',
  day: 'linear-gradient(180deg, #9fd8f0 0%, #c8ecfa 70%, #eaf7fd 100%)',
  evening: 'linear-gradient(180deg, #ff9e7d 0%, #e8847f 45%, #6d5a8f 100%)',
  night: 'linear-gradient(180deg, #0d1530 0%, #1c2a52 60%, #33406b 100%)',
};

export default function RoomScene({ themeId, furniture, phase, weather, sleeping = false, cleanliness = 100, children }: Props) {
  const theme = ROOM_THEMES.find(t => t.id === themeId) ?? ROOM_THEMES[0];
  const has = (id: string) => furniture.includes(id);
  const seed = useMemo(() => mulberry32(new Date().getDate() * 97 + new Date().getMonth() * 31), []);
  const fireflies = useMemo(() => Array.from({ length: 10 }, () => ({ left: seed() * 92 + 4, top: seed() * 70 + 18, delay: seed() * 4, dur: 5 + seed() * 4 })), [seed]);
  const motes = useMemo(() => Array.from({ length: 8 }, () => ({ left: seed() * 92 + 4, top: seed() * 60 + 10, delay: seed() * 6, dur: 8 + seed() * 6 })), [seed]);
  const stars = useMemo(() => Array.from({ length: 14 }, () => ({ left: seed() * 88 + 6, top: seed() * 70 + 6, delay: seed() * 3, r: 1 + seed() * 1.6 })), [seed]);
  const rainDrops = useMemo(() => Array.from({ length: 16 }, () => ({ left: seed() * 96 + 2, delay: seed() * 1.4, dur: 0.8 + seed() * 0.6 })), [seed]);
  const snow = useMemo(() => Array.from({ length: 18 }, () => ({ left: seed() * 96 + 2, delay: seed() * 4, dur: 2.6 + seed() * 2 })), [seed]);
  /* пятна грязи на полу — чем ниже чистота, тем заметнее */
  const grime = useMemo(() => Array.from({ length: 10 }, () => ({ left: seed() * 88 + 6, bottom: seed() * 22 + 4, rx: 10 + seed() * 16, ry: 3.5 + seed() * 4, tilt: seed() * 40 - 20 })), [seed]);

  const nightish = phase === 'night' || phase === 'evening';
  const dirty = cleanliness < 55;
  const grimy = cleanliness < 32;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wallDeep} 62%, ${theme.floor} 62%, ${theme.floorDeep} 100%)` }}>
      {/* обои: мягкий горошек */}
      <svg className="absolute inset-x-0 top-0 w-full opacity-[0.12] pointer-events-none" height="62%" preserveAspectRatio="none" viewBox="0 0 100 62">
        {[8, 26, 44, 62, 80].map(x => <circle key={`a${x}`} cx={x} cy={12} r={2.6} fill="#fff3e2" />)}
        {[17, 35, 53, 71, 89].map(x => <circle key={`b${x}`} cx={x} cy={30} r={2} fill="#fff3e2" />)}
        {[8, 26, 44, 62, 80].map(x => <circle key={`c${x}`} cx={x} cy={48} r={2.2} fill="#fff3e2" />)}
      </svg>

      {/* окно: высота ограничена — всегда на стене */}
      <div className="absolute" style={{ left: '7.5%', top: '7%', height: 'clamp(104px, 34%, 196px)', aspectRatio: '0.8', maxWidth: '32%' }}>
        <div className="absolute inset-0 rounded-t-[46%] rounded-b-[8px] overflow-hidden border-[6px]" style={{ borderColor: '#3a2f52', background: SKY[phase], boxShadow: nightish ? '0 0 30px rgba(255,217,142,0.12)' : '0 0 40px rgba(255,244,214,0.2)' }}>
          {phase === 'night' && stars.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-cream" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.r, height: s.r, animation: `twinkle ${2 + s.delay}s ease-in-out infinite ${s.delay}s` }} />
          ))}
          {phase !== 'night' ? (
            <div className="absolute rounded-full" style={{ right: '16%', top: '14%', width: '22%', aspectRatio: 1, background: phase === 'evening' ? '#ffd28e' : '#fff4c9', boxShadow: '0 0 26px 8px rgba(255,236,180,0.7)' }} />
          ) : (
            <div className="absolute rounded-full overflow-hidden" style={{ right: '16%', top: '12%', width: '20%', aspectRatio: 1, background: '#fdf6d8', boxShadow: '0 0 22px 6px rgba(253,246,216,0.45)' }} />
          )}
          {(weather.kind === 'clouds' || weather.kind === 'rain' || weather.kind === 'wind') && (
            <>
              <div className="absolute rounded-full bg-white/70" style={{ left: '8%', top: '24%', width: '46%', height: '13%', animation: 'floatSlow 9s ease-in-out infinite' }} />
              <div className="absolute rounded-full bg-white/50" style={{ left: '40%', top: '42%', width: '52%', height: '12%', animation: 'floatSlow 11s ease-in-out infinite 1.2s' }} />
            </>
          )}
          {weather.kind === 'rain' && rainDrops.map((d, i) => (
            <div key={i} className="absolute w-[2px] rounded-full bg-sky/70" style={{ left: `${d.left}%`, top: '-12%', height: 12, animation: `rainDrop ${d.dur}s linear infinite ${d.delay}s` }} />
          ))}
          {weather.kind === 'snow' && snow.map((s, i) => (
            <div key={i} className="absolute rounded-full bg-white/85" style={{ left: `${s.left}%`, top: '-8%', width: 4.5, height: 4.5, animation: `snowDrop ${s.dur}s linear infinite ${s.delay}s` }} />
          ))}
        </div>
        <div className="absolute -bottom-2.5 -left-1.5 -right-1.5 h-2.5 rounded-[5px]" style={{ background: '#4a3d66' }} />
      </div>

      {/* гирлянда под потолком — всегда */}
      <svg className="absolute inset-x-0 top-0 w-full pointer-events-none" height="46" viewBox="0 0 400 46" preserveAspectRatio="none">
        <path d="M0 8 Q100 30 200 14 T400 10" stroke="#3a2f52" strokeWidth="2" fill="none" />
        {[40, 90, 140, 190, 240, 290, 340].map((x, i) => (
          <circle key={x} cx={x} cy={[18, 24, 20, 16, 20, 24, 18][i]} r="4.5"
            fill={['#ffd98e', '#ffaec9', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffb49b', '#ffd98e'][i]}
            style={{ animation: `twinkle ${2.4 + i * 0.3}s ease-in-out infinite ${i * 0.35}s`, filter: 'drop-shadow(0 0 6px currentColor)' }} />
        ))}
      </svg>

      {/* картина на стене — всегда */}
      <div className="absolute pointer-events-none" style={{ right: '26%', top: '9%', width: '11%', minWidth: 54, maxWidth: 92 }}>
        <svg viewBox="0 0 90 74" className="w-full drop-shadow-lg">
          <rect x="2" y="2" width="86" height="70" rx="6" fill="#4a3d66" />
          <rect x="9" y="9" width="72" height="56" rx="3" fill="#1c2a52" />
          <circle cx="60" cy="26" r="9" fill="#ffd98e" opacity="0.9" />
          <path d="M9 55 l20 -18 14 12 12 -9 24 15 z" fill="#2e4a43" />
          <path d="M9 65 h72 v-6 l-24 -12 -12 8 -14 -10 -22 14 z" fill="#3a5248" opacity="0.85" />
        </svg>
      </div>

      {/* коврик-облако */}
      {has('furn_rug') && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ bottom: '5.5%', width: '44%', maxWidth: 380 }}>
          <svg viewBox="0 0 200 60" className="w-full opacity-90">
            <ellipse cx="100" cy="34" rx="96" ry="24" fill="#fff3e2" opacity="0.14" />
            <ellipse cx="100" cy="30" rx="76" ry="17" fill="#fff3e2" opacity="0.18" />
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

      {/* пол: доски */}
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-[0.16] pointer-events-none" style={{ height: '38%' }} preserveAspectRatio="none" viewBox="0 0 100 38">
        {[6, 13, 20, 27, 34].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#0c1220" strokeWidth="0.5" />)}
      </svg>

      {/* грязь, если давно не убирали */}
      {dirty && (
        <svg className="absolute inset-x-0 bottom-0 w-full pointer-events-none" style={{ height: '34%' }} preserveAspectRatio="none" viewBox="0 0 100 34">
          {grime.slice(0, grimy ? 10 : 5).map((g, i) => (
            <ellipse key={i} cx={g.left} cy={34 - g.bottom} rx={g.rx / 4} ry={g.ry / 3}
              fill="#241a12" opacity={grimy ? 0.5 : 0.3}
              transform={`rotate(${g.tilt} ${g.left} ${34 - g.bottom})`} />
          ))}
          {grimy && [20, 45, 70].map((x, i) => (
            <path key={`cr${i}`} d={`M${x} ${10 + i * 6} q3 -2 6 0 q2 1.5 5 0`} stroke="#241a12" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.5" />
          ))}
        </svg>
      )}

      {/* амбиент: светлячки ночью, пылинки днём */}
      {nightish ? fireflies.map((f, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{ left: `${f.left}%`, top: `${f.top}%`, width: 5, height: 5, background: '#ffd98e', boxShadow: '0 0 10px 3px rgba(255,217,142,0.5)', animation: `firefly ${f.dur}s ease-in-out infinite ${f.delay}s` }} />
      )) : motes.map((m, i) => (
        <div key={i} className="absolute rounded-full bg-cream/40 pointer-events-none" style={{ left: `${m.left}%`, top: `${m.top}%`, width: 3, height: 3, animation: `firefly ${m.dur}s ease-in-out infinite ${m.delay}s` }} />
      ))}

      {/* ночное затемнение + виньетка */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ background: 'linear-gradient(180deg, rgba(8,12,28,0.42), rgba(8,12,28,0.18) 55%, rgba(8,12,28,0.45))', opacity: phase === 'night' ? 1 : phase === 'evening' ? 0.55 : phase === 'morning' ? 0.25 : 0.1 }} />
      <div className="absolute inset-0 pointer-events-none room-vignette" />

      {/* сон: приглушённый свет + мягкое свечение у питомца
          (само облако снов рендерится в App.tsx — привязано к голове питомца) */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ background: 'radial-gradient(ellipse at 50% 78%, rgba(10,15,34,0.15) 0%, rgba(8,12,28,0.62) 100%)', opacity: sleeping ? 1 : 0 }} />
      <div className="absolute pointer-events-none transition-opacity duration-1000"
        style={{ left: '50%', bottom: '6%', width: '52%', maxWidth: 440, aspectRatio: '2.4', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse at center, rgba(255,217,142,0.14) 0%, transparent 70%)', opacity: sleeping ? 1 : 0 }} />

      {children}
    </div>
  );
}
