/* ============================================================
 * Комната: стена, окно с небом по времени суток и погодой,
 * пол, мебель из лавки, светлячки/пылинки, грязь при низкой
 * чистоте, затемнение и облако снов во время сна.
 * ============================================================ */
import { useMemo } from 'react';
import { mulberry32 } from '../game/core';
import Icon from './icons';

const THEMES = [
  { id: 'dusk', wall: '#253258', wallDeep: '#1a2544', floor: '#3a2f52', floorDeep: '#2b2140' },
  { id: 'meadow', wall: '#2e4a43', wallDeep: '#22382f', floor: '#4a3f2e', floorDeep: '#372f22' },
  { id: 'rose', wall: '#4a2f45', wallDeep: '#372335', floor: '#3a2f52', floorDeep: '#2b2140' },
  { id: 'sea', wall: '#23435c', wallDeep: '#1a3246', floor: '#3c4a3a', floorDeep: '#2d382c' },
];

const SKY: Record<string, string> = {
  morning: 'linear-gradient(180deg,#ffd9a0 0%,#ffb49b 55%,#c8b6ff 100%)',
  day: 'linear-gradient(180deg,#8ecae6 0%,#bfe3f5 100%)',
  evening: 'linear-gradient(180deg,#5a3a6e 0%,#ff8f7d 60%,#ffd98e 100%)',
  night: 'linear-gradient(180deg,#0c1220 0%,#253258 100%)',
};

interface Props {
  themeId: string;
  furniture: string[];
  phase: 'morning' | 'day' | 'evening' | 'night';
  weather: { kind: string; label: string };
  sleeping?: boolean;
  cleanliness?: number;
  children?: React.ReactNode;
}

export default function RoomScene({ themeId, furniture, phase, weather, sleeping = false, cleanliness = 100, children }: Props) {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
  const has = (id: string) => furniture.includes(id);
  const seed = useMemo(() => mulberry32(new Date().getDate() * 97 + new Date().getMonth() * 31), []);
  const night = phase === 'night';
  const dirty = cleanliness < 55;
  const grimy = cleanliness < 32;
  const grime = useMemo(() => Array.from({ length: 10 }, () => ({
    left: 8 + seed() * 84, bottom: 3 + seed() * 26, rx: 6 + seed() * 14, ry: 3 + seed() * 6, tilt: seed() * 40 - 20,
  })), [seed]);

  const drops = useMemo(() => Array.from({ length: weather.kind === 'rain' ? 40 : weather.kind === 'snow' ? 30 : 0 }, () => ({
    left: Math.random() * 100, delay: Math.random() * 3, dur: weather.kind === 'rain' ? 0.9 + Math.random() * 0.6 : 4 + Math.random() * 4, size: weather.kind === 'rain' ? 2 : 3 + Math.random() * 3,
  })), [weather.kind]);

  const fireflies = useMemo(() => Array.from({ length: night ? 12 : 0 }, () => ({
    left: 5 + Math.random() * 90, top: 15 + Math.random() * 60, delay: Math.random() * 4, dur: 4 + Math.random() * 5,
  })), [night]);

  const dust = useMemo(() => Array.from({ length: night ? 0 : 14 }, () => ({
    left: Math.random() * 100, top: 10 + Math.random() * 70, delay: Math.random() * 6, dur: 8 + Math.random() * 8,
  })), [night]);

  const stars = useMemo(() => Array.from({ length: night ? 14 : 0 }, () => ({
    left: 8 + seed() * 84, top: 8 + seed() * 55, s: 1.5 + seed() * 2.5, delay: seed() * 3,
  })), [night, seed]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wallDeep} 62%, ${theme.floor} 62%, ${theme.floorDeep} 100%)` }}>
      {/* стена: обои в горошек */}
      <svg className="absolute inset-x-0 top-0 w-full opacity-[0.08] pointer-events-none" style={{ height: '62%' }} preserveAspectRatio="none" viewBox="0 0 100 62">
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 13) % 100} cy={(i * 17) % 62} r="1.2" fill="#fff3e2" />)}
      </svg>

      {/* окно */}
      <div className="absolute pointer-events-none" style={{ left: '50%', top: '9%', transform: 'translateX(-50%)', width: 'clamp(120px, 32%, 210px)', aspectRatio: '1 / 1.15' }}>
        <div className="absolute inset-0 rounded-t-[46%] rounded-b-xl overflow-hidden border-[6px]" style={{ background: SKY[phase], borderColor: '#5a4a3a', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
          {/* солнце/луна */}
          {night ? (
            <div className="absolute rounded-full" style={{ width: '26%', aspectRatio: '1', right: '14%', top: '14%', background: '#fff3e2', boxShadow: '0 0 20px rgba(255,243,226,0.7)' }} />
          ) : (
            <div className="absolute rounded-full" style={{ width: '24%', aspectRatio: '1', right: '16%', top: '16%', background: '#ffd98e', boxShadow: '0 0 24px rgba(255,217,142,0.8)' }} />
          )}
          {/* звёзды ночью */}
          {stars.map((st, i) => (
            <span key={i} className="absolute rounded-full bg-cream" style={{ left: `${st.left}%`, top: `${st.top}%`, width: st.s, height: st.s, animation: `twinkle ${2 + st.delay}s ease-in-out infinite` }} />
          ))}
          {/* холмы */}
          <div className="absolute bottom-0 inset-x-0" style={{ height: '30%', background: night ? '#1a2440' : '#4a6a4a', borderRadius: '60% 60% 0 0 / 100% 100% 0 0' }} />
          {/* осадки */}
          {drops.map((d, i) => (
            <span key={i} className="absolute rounded-full" style={{
              left: `${d.left}%`, top: '-5%',
              width: weather.kind === 'rain' ? 1.5 : d.size, height: weather.kind === 'rain' ? 10 : d.size,
              background: weather.kind === 'rain' ? 'rgba(142,202,230,0.7)' : '#fff3e2',
              animation: `${weather.kind === 'rain' ? 'rainDrop' : 'snowDrop'} ${d.dur}s linear infinite`, animationDelay: `${d.delay}s`,
            }} />
          ))}
          {/* перекладины */}
          <div className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2" style={{ background: '#5a4a3a' }} />
          <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2" style={{ background: '#5a4a3a' }} />
        </div>
        {/* подоконник */}
        <div className="absolute -bottom-2 -inset-x-2 h-3 rounded-md" style={{ background: '#6b5a48' }} />
      </div>

      {/* гирлянда */}
      <svg className="absolute top-0 inset-x-0 w-full pointer-events-none" style={{ height: '14%' }} viewBox="0 0 100 14" preserveAspectRatio="none">
        <path d="M0 2 Q25 8 50 4 T100 3" stroke="#8a7a5a" strokeWidth="0.5" fill="none" />
        {[8, 22, 36, 50, 64, 78, 92].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 6 : 5} r="1.4" fill={['#ffd98e', '#ffaec9', '#9fe8c9', '#8ecae6'][i % 4]} style={{ animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite` }} />
        ))}
      </svg>

      {/* пол: доски */}
      <svg className="absolute inset-x-0 bottom-0 w-full opacity-[0.16] pointer-events-none" style={{ height: '38%' }} preserveAspectRatio="none" viewBox="0 0 100 38">
        {[6, 13, 20, 27, 34].map(y => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#0c1220" strokeWidth="0.5" />)}
      </svg>

      {/* грязь, если давно не убирали */}
      {dirty && (
        <svg className="absolute inset-x-0 bottom-0 w-full pointer-events-none" style={{ height: '34%' }} preserveAspectRatio="none" viewBox="0 0 100 34">
          {grime.slice(0, grimy ? 10 : 5).map((g, i) => (
            <ellipse key={i} cx={g.left} cy={34 - g.bottom} rx={g.rx / 4} ry={g.ry / 3} fill="#241a12" opacity={grimy ? 0.5 : 0.3} transform={`rotate(${g.tilt} ${g.left} ${34 - g.bottom})`} />
          ))}
        </svg>
      )}

      {/* мебель */}
      {has('furn_starlamp') && (
        <div className="absolute pointer-events-none" style={{ right: '7%', bottom: '12%', width: '9%', minWidth: 44, maxWidth: 66 }}>
          <div className="relative">
            <div className="w-full rounded-t-full rounded-b-lg" style={{ aspectRatio: '1/1.3', background: 'linear-gradient(180deg,#ffd98e,#f4c266)', boxShadow: `0 0 ${night ? 40 : 18}px rgba(255,217,142,${night ? 0.6 : 0.3})`, animation: 'lampGlow 3s ease-in-out infinite' }} />
            <div className="mx-auto w-[14%] bg-[#6b5a48]" style={{ height: 26 }} />
            <div className="mx-auto w-[60%] h-2 rounded-full bg-[#6b5a48]" />
          </div>
        </div>
      )}
      {has('furn_aquarium') && (
        <div className="absolute pointer-events-none" style={{ left: '8%', bottom: '13%', width: '13%', minWidth: 60, maxWidth: 90 }}>
          <div className="relative rounded-lg overflow-hidden border-2 border-sky/30" style={{ aspectRatio: '1.4/1', background: 'linear-gradient(180deg,rgba(142,202,230,0.25),rgba(111,180,216,0.4))' }}>
            <div className="absolute rounded-full bg-butter anim-float" style={{ width: '22%', aspectRatio: '1', left: '20%', top: '25%' }} />
            <div className="absolute bottom-0 inset-x-0 h-[18%]" style={{ background: '#d9b87a' }} />
          </div>
          <div className="h-3 bg-[#5a4a3a] rounded-b" />
        </div>
      )}
      {has('furn_bookshelf') && (
        <div className="absolute pointer-events-none" style={{ left: '3%', top: '20%', width: '11%', minWidth: 54, maxWidth: 80 }}>
          <div className="border-2 border-[#6b5a48] rounded-md bg-[#3a2f28] p-1 space-y-1" style={{ aspectRatio: '1/1.4' }}>
            {[0, 1, 2].map(r => (
              <div key={r} className="flex gap-[2px] items-end" style={{ height: '28%' }}>
                {[0, 1, 2, 3].map(b => <div key={b} className="flex-1 rounded-[1px]" style={{ height: `${60 + ((r * 4 + b) % 4) * 10}%`, background: ['#ff8f7d', '#9fe8c9', '#8ecae6', '#ffd98e', '#c8b6ff'][(r + b) % 5] }} />)}
              </div>
            ))}
          </div>
        </div>
      )}
      {has('furn_plant') && (
        <div className="absolute pointer-events-none" style={{ right: '16%', bottom: '11%', width: '7%', minWidth: 36, maxWidth: 52 }}>
          <div className="relative flex flex-col items-center">
            <svg viewBox="0 0 60 70" className="w-full">
              <path d="M30 40 C20 20 22 8 30 2 C38 8 40 20 30 40 Z" fill="#8fca7f" />
              <path d="M30 40 C14 34 8 24 8 14 C20 16 28 26 30 40 Z" fill="#7fb96f" />
              <path d="M30 40 C46 34 52 24 52 14 C40 16 32 26 30 40 Z" fill="#9fda8f" />
              <path d="M22 40 h16 l-2 22 h-12 z" fill="#c07a5f" />
            </svg>
            {night && <span className="absolute top-1 right-0 w-2 h-2 rounded-full bg-butter" style={{ animation: 'twinkle 2s ease-in-out infinite' }} />}
          </div>
        </div>
      )}
      {has('furn_musicbox') && (
        <div className="absolute pointer-events-none" style={{ left: '24%', bottom: '10%', width: '8%', minWidth: 40, maxWidth: 58 }}>
          <div className="rounded-md border border-butter/30 bg-[#6b4a3a] relative" style={{ aspectRatio: '1.3/1' }}>
            <div className="absolute top-1 inset-x-1 h-1.5 rounded bg-butter/40" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-butter"><Icon name="musicbox" className="w-3 h-3" /></div>
          </div>
        </div>
      )}

      {/* пылинки днём */}
      {dust.map((d, i) => (
        <span key={i} className="absolute rounded-full bg-cream/30 pointer-events-none" style={{ left: `${d.left}%`, top: `${d.top}%`, width: 2.5, height: 2.5, animation: `firefly ${d.dur}s ease-in-out infinite`, animationDelay: `${d.delay}s` }} />
      ))}
      {/* светлячки ночью */}
      {fireflies.map((f, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none" style={{ left: `${f.left}%`, top: `${f.top}%`, width: 4, height: 4, background: '#ffd98e', boxShadow: '0 0 10px 3px rgba(255,217,142,0.5)', animation: `firefly ${f.dur}s ease-in-out infinite`, animationDelay: `${f.delay}s` }} />
      ))}

      {/* коврик */}
      <div className="absolute pointer-events-none" style={{ left: '50%', bottom: '4%', transform: 'translateX(-50%)', width: '46%', height: '9%' }}>
        <div className="w-full h-full rounded-[50%] border-4" style={{ background: 'rgba(200,182,255,0.14)', borderColor: 'rgba(200,182,255,0.28)' }} />
      </div>

      {/* виньетка + ночное затемнение */}
      <div className="absolute inset-0 room-vignette pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ background: 'rgba(8,10,24,0.55)', opacity: sleeping ? 1 : night ? 0.45 : 0 }} />

      {/* мягкий свет и облако снов во сне */}
      {sleeping && (
        <>
          <div className="absolute pointer-events-none" style={{ left: '50%', bottom: '20%', transform: 'translateX(-50%)', width: '55%', aspectRatio: '1', background: 'radial-gradient(circle, rgba(255,217,142,0.14) 0%, transparent 65%)', animation: 'pulseSoft 4s ease-in-out infinite' }} />
          <div className="absolute pointer-events-none anim-float" style={{ left: '50%', bottom: '64%', transform: 'translateX(-30%)' }}>
            <div className="relative w-24 h-14">
              <div className="absolute inset-0 rounded-full bg-night-800/80 border border-sky/25" style={{ filter: 'blur(1px)' }} />
              <span className="absolute left-3 top-3 text-butter" style={{ animation: 'twinkle 2.4s ease-in-out infinite' }}><Icon name="star" className="w-4 h-4" /></span>
              <span className="absolute left-10 top-2 text-lilac" style={{ animation: 'twinkle 2.4s ease-in-out infinite 0.8s' }}><Icon name="moon" className="w-4 h-4" /></span>
              <span className="absolute left-16 top-5 text-mint" style={{ animation: 'twinkle 2.4s ease-in-out infinite 1.6s' }}><Icon name="spark" className="w-3 h-3" /></span>
            </div>
          </div>
        </>
      )}

      {children}
    </div>
  );
}
