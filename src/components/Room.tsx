/* ============================================================
 * Комната питомца: окно с небом по времени суток и реальной
 * погодой, мебель, гирлянда, пылинки/светлячки, грязь при
 * низкой чистоте, сонное затемнение и облако снов.
 * ============================================================ */
import { useMemo, type ReactNode } from 'react';
import { ROOM_THEMES } from '../game/content';
import { mulberry32 } from '../game/dna';
import Icon from './icons';

interface Props {
  themeId: string;
  furniture: string[];
  phase: 'morning' | 'day' | 'evening' | 'night';
  weather: { kind: string; label: string };
  sleeping?: boolean;
  cleanliness?: number;
  /** питомец сейчас учится во сне (нейросеть читает Википедию) */
  dreamLearning?: boolean;
  children?: ReactNode;
}

const SKY: Record<string, string> = {
  morning: 'linear-gradient(180deg, #3a5a7a 0%, #c9a06a 130%)',
  day: 'linear-gradient(180deg, #4a7ab0 0%, #9cc2e8 120%)',
  evening: 'linear-gradient(180deg, #4a3a6a 0%, #d97a5a 140%)',
  night: 'linear-gradient(180deg, #0c1220 0%, #263252 130%)',
};

export default function RoomScene({ themeId, furniture, phase, weather, sleeping = false, cleanliness = 100, dreamLearning = false, children }: Props) {
  const theme = ROOM_THEMES.find(t => t.id === themeId) ?? ROOM_THEMES[0];
  const has = (id: string) => furniture.includes(id);
  const seed = useMemo(() => mulberry32(new Date().getDate() * 97 + new Date().getMonth() * 31), []);
  const night = phase === 'night';
  const dirty = cleanliness < 55;
  const grimy = cleanliness < 32;

  const motes = useMemo(() => Array.from({ length: 14 }, () => ({
    left: Math.round(seed() * 100), top: Math.round(seed() * 80), delay: seed() * 6, dur: 5 + seed() * 6,
  })), [seed]);
  const rainDrops = useMemo(() => Array.from({ length: 26 }, () => ({
    left: Math.round(seed() * 100), delay: seed() * 1.2, dur: 0.8 + seed() * 0.5,
  })), [seed]);
  const snow = useMemo(() => Array.from({ length: 22 }, () => ({
    left: Math.round(seed() * 100), delay: seed() * 4, dur: 4 + seed() * 4,
  })), [seed]);
  const stars = useMemo(() => Array.from({ length: 18 }, () => ({
    left: Math.round(seed() * 100), top: Math.round(seed() * 55), delay: seed() * 3,
  })), [seed]);
  /* пятна грязи на полу (детерминированные за день) */
  const grime = useMemo(() => Array.from({ length: 10 }, () => ({
    left: 8 + Math.round(seed() * 84), bottom: 4 + Math.round(seed() * 26),
    rx: 10 + seed() * 22, ry: 5 + seed() * 9, tilt: Math.round(seed() * 60 - 30),
  })), [seed]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, ${theme.wallDeep} 62%, ${theme.floor} 62%, ${theme.floorDeep} 100%)` }}>
      {/* плинтус */}
      <div className="absolute inset-x-0" style={{ top: '60.5%', height: '1.6%', background: 'rgba(12,18,32,0.5)' }} />

      {/* ===== окно ===== */}
      <div className="absolute" style={{ left: '9%', top: '9%', width: '27%', aspectRatio: '0.82', maxWidth: 300 }}>
        <div className="absolute inset-0 rounded-t-[46%] rounded-b-xl overflow-hidden border-[6px]"
          style={{ borderColor: '#5a4a3a', background: SKY[phase] }}>
          {/* солнце/луна */}
          {!night && <div className="absolute rounded-full" style={{ width: '26%', aspectRatio: '1', left: '14%', top: '16%', background: '#ffe9b0', boxShadow: '0 0 30px 10px rgba(255,233,176,0.5)' }} />}
          {night && (
            <>
              <div className="absolute rounded-full" style={{ width: '24%', aspectRatio: '1', left: '16%', top: '14%', background: '#f4ead0', boxShadow: '0 0 24px 8px rgba(244,234,208,0.35)' }} />
              {stars.map((s, i) => (
                <span key={i} className="absolute w-1 h-1 rounded-full bg-cream" style={{ left: `${s.left}%`, top: `${s.top}%`, animation: `twinkle ${2 + s.delay}s ease-in-out infinite ${s.delay}s` }} />
              ))}
            </>
          )}
          {/* дождь за стеклом */}
          {weather.kind === 'rain' && rainDrops.map((d, i) => (
            <span key={i} className="absolute w-[2px] rounded-full" style={{
              left: `${d.left}%`, top: '-8%', height: '16%',
              background: 'linear-gradient(180deg, transparent, rgba(142,202,230,0.8))',
              animation: `rainDrop ${d.dur}s linear infinite ${d.delay}s`,
            }} />
          ))}
          {/* снег */}
          {weather.kind === 'snow' && snow.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-cream" style={{
              left: `${s.left}%`, top: '-6%', width: i % 3 ? 4 : 6, height: i % 3 ? 4 : 6,
              animation: `snowDrop ${s.dur}s linear infinite ${s.delay}s`, opacity: 0.9,
            }} />
          ))}
          {/* облака */}
          {(weather.kind === 'clouds' || weather.kind === 'rain') && (
            <>
              <div className="absolute rounded-full anim-float" style={{ width: '46%', height: '16%', left: '8%', top: '30%', background: 'rgba(255,255,255,0.5)', filter: 'blur(2px)' }} />
              <div className="absolute rounded-full anim-float" style={{ width: '38%', height: '14%', left: '52%', top: '14%', background: 'rgba(255,255,255,0.42)', filter: 'blur(2px)', animationDelay: '1.4s' }} />
            </>
          )}
        </div>
        {/* рама */}
        <div className="absolute inset-0 rounded-t-[46%] rounded-b-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px rgba(12,18,32,0.25)' }}>
          <div className="absolute left-1/2 top-0 bottom-0 w-[5px] -translate-x-1/2" style={{ background: '#5a4a3a' }} />
          <div className="absolute top-1/2 left-0 right-0 h-[5px] -translate-y-1/2" style={{ background: '#5a4a3a' }} />
        </div>
        {/* подоконник */}
        <div className="absolute -bottom-[7%] -left-[8%] -right-[8%] h-[8%] rounded-md" style={{ background: '#6b5a48' }} />
      </div>

      {/* ===== гирлянда ===== */}
      <svg className="absolute pointer-events-none" style={{ left: '40%', top: '2.5%', width: '56%', height: '13%' }} viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M0 8 Q75 42 150 20 Q225 0 300 30" stroke="#3a3050" strokeWidth="2.5" fill="none" />
        {[[30, 22], [75, 34], [120, 26], [165, 18], [210, 12], [255, 20], [290, 28]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y + 6} r="4.5"
            fill={['#ffd98e', '#ffaec9', '#9fe8c9', '#8ecae6', '#c8b6ff'][i % 5]}
            style={{ animation: `twinkle ${1.6 + (i % 3) * 0.7}s ease-in-out infinite ${i * 0.25}s` }} />
        ))}
      </svg>

      {/* ===== картина ===== */}
      <div className="absolute rounded-lg border-4 overflow-hidden" style={{ right: '7%', top: '12%', width: '15%', aspectRatio: '0.8', borderColor: '#8a7355', background: 'linear-gradient(160deg,#263252,#3a2f52)' }}>
        <div className="absolute rounded-full" style={{ width: '34%', aspectRatio: '1', right: '18%', top: '16%', background: '#f4ead0', opacity: 0.9 }} />
        <div className="absolute" style={{ left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(180deg,#2e4a43,#22382f)' }} />
        <div className="absolute" style={{ left: '12%', bottom: '34%', width: '2px', height: '30%', background: '#3a2f2e' }} />
      </div>

      {/* ===== мебель ===== */}
      {has('furn_starlamp') && (
        <div className="absolute pointer-events-none" style={{ right: '12%', bottom: '10%', width: '9%', minWidth: 44, maxWidth: 70 }}>
          <div className="mx-auto w-[58%] aspect-square rounded-full" style={{ background: '#ffd98e', boxShadow: '0 0 34px 14px rgba(255,217,142,0.4)', animation: 'lampGlow 3.4s ease-in-out infinite' }} />
          <div className="mx-auto w-[10%] h-[60%] min-h-[38px]" style={{ background: '#5a4a3a' }} />
          <div className="mx-auto w-[64%] h-[7%] min-h-[6px] rounded-full" style={{ background: '#5a4a3a' }} />
        </div>
      )}
      {has('furn_bookshelf') && (
        <div className="absolute pointer-events-none flex flex-col justify-end gap-[6%] p-[6%]" style={{ left: '2.5%', bottom: '12%', width: '13%', height: '34%', background: '#4a3d30', borderRadius: 6 }}>
          {[0, 1, 2].map(r => (
            <div key={r} className="flex items-end gap-[5%] h-[24%]">
              {[0, 1, 2, 3].map(b => (
                <div key={b} style={{ width: '20%', height: `${64 + ((r * 4 + b) % 3) * 14}%`, background: ['#8ecae6', '#ffaec9', '#9fe8c9', '#c8b6ff', '#ffd98e'][(r + b) % 5], borderRadius: 2 }} />
              ))}
            </div>
          ))}
        </div>
      )}
      {has('furn_aquarium') && (
        <div className="absolute pointer-events-none overflow-hidden rounded-xl border-2" style={{ right: '26%', bottom: '9%', width: '14%', aspectRatio: '1.5', borderColor: '#3a4a5a', background: 'linear-gradient(180deg, rgba(35,67,92,0.75), rgba(26,50,70,0.9))' }}>
          <div className="absolute rounded-full anim-float" style={{ width: '18%', aspectRatio: '1', left: '30%', top: '26%', background: '#f4ead0', boxShadow: '0 0 14px 6px rgba(244,234,208,0.3)' }} />
          <div className="absolute rounded-full" style={{ width: '10%', aspectRatio: '1', left: '62%', top: '46%', background: '#ffd98e', animation: 'firefly 5s ease-in-out infinite' }} />
          <div className="absolute rounded-full" style={{ width: '8%', aspectRatio: '1', left: '18%', top: '60%', background: '#ffaec9', animation: 'firefly 6s ease-in-out infinite 1s' }} />
          <div className="absolute inset-x-0 bottom-0 h-[12%]" style={{ background: '#d9c9a0' }} />
        </div>
      )}
      {has('furn_plant') && (
        <div className="absolute pointer-events-none" style={{ left: '38%', bottom: '8%', width: '7%', minWidth: 34, maxWidth: 52 }}>
          <div className="relative mx-auto w-full" style={{ aspectRatio: '1' }}>
            <div className="absolute rounded-full anim-float" style={{ width: '40%', aspectRatio: '1', left: '6%', top: '4%', background: '#9fe8c9', opacity: 0.85 }} />
            <div className="absolute rounded-full anim-float" style={{ width: '46%', aspectRatio: '1', right: '2%', top: '12%', background: '#7fd4ae', opacity: 0.9, animationDelay: '1.2s' }} />
            <div className="absolute rounded-full anim-float" style={{ width: '42%', aspectRatio: '1', left: '26%', bottom: '8%', background: '#8fca7f', animationDelay: '2s' }} />
            <span className="absolute" style={{ left: '20%', top: '0', animation: 'twinkle 2.4s ease-in-out infinite' }}>
              <Icon name="spark" className="w-3 h-3 text-butter" />
            </span>
          </div>
          <div className="mx-auto w-[64%] h-[40%] min-h-[22px] rounded-b-xl rounded-t-sm" style={{ background: '#b0684a' }} />
        </div>
      )}
      {has('furn_musicbox') && (
        <div className="absolute pointer-events-none" style={{ left: '5%', bottom: '7.5%', width: '8%', minWidth: 40, maxWidth: 60 }}>
          <div className="w-full rounded-lg border" style={{ aspectRatio: '1.4', background: 'linear-gradient(160deg,#8a6a4a,#6b4f36)', borderColor: '#5a4028' }}>
            <div className="mx-auto mt-[18%] w-[56%] h-[10%] rounded-full" style={{ background: '#ffd98e', opacity: 0.8 }} />
          </div>
          <div className="absolute -top-[18%] left-1/2 -translate-x-1/2">
            <Icon name="moon" className="w-3.5 h-3.5 text-butter" />
          </div>
        </div>
      )}

      {/* ===== коврик ===== */}
      <div className="absolute rounded-[50%] pointer-events-none" style={{ left: '30%', bottom: '2.5%', width: '40%', height: '13%', background: 'radial-gradient(ellipse at center, rgba(200,182,255,0.28) 0%, rgba(200,182,255,0.1) 60%, transparent 100%)' }} />

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

      {/* ===== атмосферные частицы ===== */}
      {night ? motes.slice(0, 8).map((m, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none" style={{
          left: `${m.left}%`, top: `${m.top}%`, width: 4, height: 4, background: '#ffd98e',
          boxShadow: '0 0 8px 2px rgba(255,217,142,0.5)',
          animation: `firefly ${m.dur}s ease-in-out infinite ${m.delay}s`,
        }} />
      )) : motes.map((m, i) => (
        <span key={i} className="absolute rounded-full pointer-events-none" style={{
          left: `${m.left}%`, top: `${m.top}%`, width: 3, height: 3, background: 'rgba(255,243,226,0.4)',
          animation: `floatSlow ${m.dur + 4}s ease-in-out infinite ${m.delay}s`,
        }} />
      ))}

      {/* ночное затемнение комнаты */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ background: 'rgba(8,12,28,0.42)', opacity: night ? 1 : 0 }} />
      {/* сонное приглушение света */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ background: 'rgba(8,12,28,0.3)', opacity: sleeping ? 1 : 0 }} />
      {/* тёплое свечение вокруг спящего питомца */}
      <div className="absolute pointer-events-none transition-opacity duration-1000 rounded-full"
        style={{ left: '50%', bottom: '6%', width: '52%', maxWidth: 440, aspectRatio: '2.4', transform: 'translateX(-50%)', background: 'radial-gradient(ellipse at center, rgba(255,217,142,0.14) 0%, transparent 70%)', opacity: sleeping ? 1 : 0 }} />
      {sleeping && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none anim-float" style={{ bottom: '58%', zIndex: 15 }}>
          <DreamCloud learning={dreamLearning} />
        </div>
      )}

      {/* виньетка */}
      <div className="absolute inset-0 pointer-events-none room-vignette" />

      {children}
    </div>
  );
}

/* облачко, в котором по очереди проявляются образы сна.
   Когда learning=true — нейросеть читает Википедию: в облачке
   пульсирует значок мозга, показывая, что питомец учится во сне. */
function DreamCloud({ learning }: { learning: boolean }) {
  return (
    <div className="relative w-[120px] h-[64px]">
      <svg viewBox="0 0 120 64" className="absolute inset-0 w-full h-full drop-shadow-lg">
        <ellipse cx="34" cy="42" rx="26" ry="17" fill="rgba(255,243,226,0.92)" />
        <ellipse cx="66" cy="34" rx="30" ry="20" fill="rgba(255,243,226,0.96)" />
        <ellipse cx="94" cy="44" rx="22" ry="14" fill="rgba(255,243,226,0.9)" />
        <ellipse cx="20" cy="54" rx="8" ry="5" fill="rgba(255,243,226,0.5)" />
        <ellipse cx="12" cy="62" rx="5" ry="3.5" fill="rgba(255,243,226,0.35)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-butter" style={{ paddingBottom: 8 }}>
        {learning ? (
          <span className="flex items-center gap-1.5">
            <span style={{ animation: 'pulseSoft 1.6s ease-in-out infinite' }}><Icon name="brain" className="w-6 h-6 text-lilac" /></span>
            <span className="dream-icon" style={{ animationDelay: '0s' }}><Icon name="star" className="w-4 h-4" /></span>
          </span>
        ) : (
          <>
            <span className="dream-icon" style={{ animationDelay: '0s' }}><Icon name="star" className="w-5 h-5" /></span>
            <span className="dream-icon absolute" style={{ animationDelay: '2s' }}><Icon name="moon" className="w-5 h-5" /></span>
            <span className="dream-icon absolute" style={{ animationDelay: '4s' }}><Icon name="spark" className="w-5 h-5" /></span>
          </>
        )}
      </div>
      {learning && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap"
          style={{ animation: 'fadeIn 0.6s ease both' }}>
          <span className="text-[9px] font-black text-lilac tracking-wide" style={{ textShadow: '0 0 8px rgba(200,182,255,0.5)' }}>
            учится во сне…
          </span>
        </div>
      )}
    </div>
  );
}
