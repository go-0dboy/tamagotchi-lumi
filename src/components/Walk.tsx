/* ============================================================
 * Прогулка: выбор места → анимированная дорога, у каждого места
 * СВОЯ сцена (парк, пекарня, библиотека, набережная, город) →
 * возвращение домой с историей, искрами и сувениром.
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { engine, timePhase } from '../game/engine';
import { WALK_LOCATIONS, type WalkLoc } from '../game/content';
import PetSprite from './PetSprite';
import Icon from './icons';
import { sfx } from '../game/sound';

type Step = 'pick' | 'walk' | 'result';

export default function Walk({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [loc, setLoc] = useState<WalkLoc | null>(null);
  const [story, setStory] = useState('');
  const [result, setResult] = useState<{ coins: number; souvenir?: string } | null>(null);
  const started = useRef(false);

  const go = (l: WalkLoc) => {
    setLoc(l);
    setStep('walk');
    sfx.pop();
  };

  useEffect(() => {
    if (step !== 'walk' || !loc || started.current) return;
    started.current = true;
    const s = loc.stories[Math.floor(Math.random() * loc.stories.length)];
    setStory(s);
    const t = setTimeout(() => {
      const r = engine.walkVisit(loc.name, s);
      if (r.ok) setResult({ coins: r.coins, souvenir: r.souvenir });
      setStep('result');
    }, 4600);
    return () => { clearTimeout(t); started.current = false; };
  }, [step, loc]);

  const city = engine.state.owner.city?.trim();
  const locs: WalkLoc[] = city
    ? [...WALK_LOCATIONS, {
        id: 'city', icon: 'star', name: `Улицы ${city}`,
        stories: [
          `Мы гуляли по улицам ${city}! Я запомнил дорогу домой, на всякий случай. Вдруг ты забудешь, а я — нет.`,
          `В ${city} сегодня особенно красиво пахло вечером. Мы обошли три квартала и помахали всем знакомым фонарям.`,
          `Мы нашли в ${city} уютный дворик, где коты греются на подоконниках. Теперь у меня там есть друзья по переписке взглядами.`,
        ],
      }]
    : [...WALK_LOCATIONS];

  return (
    <div className="fixed inset-0 z-50 flex p-4 bg-night-950/90 anim-fade overflow-y-auto" onClick={step === 'result' ? onClose : undefined}>
      {step === 'pick' && (
        <div className="card max-w-lg w-full m-auto p-4 sm:p-5 anim-pop" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-lg font-bold text-butter">Куда пойдём?</h3>
            <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
          </div>
          <p className="text-[12px] font-bold text-cream/50 mb-4">У каждого места — своя дорога и своя история. Нужна энергия (12+).</p>
          <div className="grid grid-cols-2 gap-2.5">
            {locs.map(l => (
              <button key={l.id} onClick={() => go(l)}
                className="card-soft p-3.5 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all group">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 text-peach group-hover:scale-110 transition-transform"
                  style={{ background: 'rgba(255,180,155,0.12)' }}>
                  <Icon name={l.icon} className="w-5 h-5" />
                </span>
                <div className="font-display font-bold text-[12.5px] leading-tight">{l.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'walk' && loc && <WalkScene loc={loc} />}

      {step === 'result' && loc && (
        <div className="card max-w-md w-full m-auto p-5 anim-pop text-center" onClick={e => e.stopPropagation()}>
          <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center text-peach mb-3"
            style={{ background: 'rgba(255,180,155,0.12)', animation: 'pulseSoft 2.5s ease-in-out infinite' }}>
            <Icon name={loc.icon} className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-butter">Вернулись из: {loc.name}</h3>
          <p className="text-[13px] font-bold text-cream/75 leading-relaxed mt-2">«{story}»</p>
          {result && (
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <span className="chip text-butter"><Icon name="spark" className="w-3.5 h-3.5" />+{result.coins} искр</span>
              {result.souvenir && <span className="chip text-lilac"><Icon name="gift" className="w-3.5 h-3.5" />сувенир в рюкзаке!</span>}
            </div>
          )}
          <button className="btn btn-primary w-full mt-4" onClick={onClose}>
            <Icon name="home" className="w-5 h-5" />Домой
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- сцена прогулки: дорога + место + питомец ---------- */
const TINTS: Record<string, string> = {
  park: 'linear-gradient(180deg, rgba(127,212,174,0.10), rgba(127,212,174,0.02))',
  bakery: 'linear-gradient(180deg, rgba(255,190,130,0.14), rgba(255,190,130,0.03))',
  lib: 'linear-gradient(180deg, rgba(200,182,255,0.12), rgba(200,182,255,0.02))',
  river: 'linear-gradient(180deg, rgba(142,202,230,0.12), rgba(142,202,230,0.03))',
  city: 'linear-gradient(180deg, rgba(142,202,230,0.07), rgba(12,18,32,0.1))',
};

function WalkScene({ loc }: { loc: WalkLoc }) {
  const pet = engine.state.pet!;
  const phase = timePhase();
  const sky = phase === 'night' ? 'linear-gradient(180deg,#0c1220,#1c2a52)'
    : phase === 'evening' ? 'linear-gradient(180deg,#2a2547,#5a3a52)'
    : phase === 'morning' ? 'linear-gradient(180deg,#3a5a7a,#c9a06a 130%)'
    : 'linear-gradient(180deg,#3a5a8c,#7fa8d0)';

  const sceneId = ['park', 'bakery', 'lib', 'river', 'city'].includes(loc.id) ? loc.id : 'city';

  return (
    <div className="relative w-full max-w-2xl m-auto rounded-[28px] overflow-hidden border border-sky/15 anim-fade"
      style={{ height: 'min(62vh, 420px)', background: sky }}>
      {/* дальний слой */}
      <div className="absolute inset-x-0 bottom-[16%] h-[52%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '16s' }}>
        <div className="w-1/2 h-full"><SceneFar id={sceneId} /></div>
        <div className="w-1/2 h-full"><SceneFar id={sceneId} /></div>
      </div>
      {/* ближний слой */}
      <div className="absolute inset-x-0 bottom-[13%] h-[55%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '7s' }}>
        <div className="w-1/2 h-full"><SceneNear id={sceneId} /></div>
        <div className="w-1/2 h-full"><SceneNear id={sceneId} /></div>
      </div>

      {/* цветовая атмосфера места */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: TINTS[sceneId] }} />

      {/* дорога */}
      <div className="absolute inset-x-0 bottom-0 h-[15%]" style={{ background: 'linear-gradient(180deg,#3a3050,#2b2140)' }}>
        <div className="absolute inset-x-0 top-1/2 h-1 anim-walk-strip" style={{ width: '200%', animationDuration: '2.5s',
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,217,142,0.5) 0 26px, transparent 26px 60px)' }} />
      </div>

      {/* питомец идёт */}
      <div className="absolute left-[18%] bottom-[7%] w-[26%] anim-walker z-10">
        <PetSprite pet={pet} size="100%" />
      </div>

      <div className="absolute top-4 inset-x-0 flex justify-center z-10">
        <span className="chip !text-[12px] backdrop-blur-sm bg-night-900/70"><Icon name={loc.icon} className="w-4 h-4 text-peach" />Идём: {loc.name}…</span>
      </div>
      {/* шаги-пылинка */}
      <div className="absolute left-[22%] bottom-[5%] w-3 h-3 rounded-full bg-butter/70 z-10" style={{ animation: 'dustPuff 0.8s ease-out infinite' }} />
    </div>
  );
}

/* ================= дальние планы ================= */
function SceneFar({ id }: { id: string }) {
  if (id === 'park') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      <path d="M0 120 Q75 78 150 108 T300 98 T450 116 T600 104 L600 220 L0 220 Z" fill="#2e4a43" opacity="0.85" />
      <path d="M0 152 Q100 122 200 146 T400 140 T600 152 L600 220 L0 220 Z" fill="#22382f" />
      {[[90, 100], [250, 92], [420, 104], [540, 96]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3} y={y} width="6" height="26" fill="#2b2120" />
          <ellipse cx={x} cy={y - 8} rx="17" ry="20" fill="#2e4a43" />
        </g>
      ))}
    </svg>
  );
  if (id === 'bakery') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      {[[30, 70, 60], [120, 95, 46], [210, 60, 70], [330, 85, 54], [430, 66, 66], [530, 92, 48]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={220 - y} fill={i % 2 ? '#241d3a' : '#2a2144'} />
      ))}
      {[[52, 92], [238, 84], [458, 88]].map(([x, y], i) => (
        <rect key={`w${i}`} x={x} y={y} width="10" height="12" fill="#ffd98e" opacity="0.5" style={{ animation: `twinkle ${3 + i}s ease-in-out infinite` }} />
      ))}
    </svg>
  );
  if (id === 'lib') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      <rect x="0" y="90" width="600" height="130" fill="#2b2850" />
      <path d="M0 90 L60 60 L120 90 Z" fill="#332f5e" />
      <path d="M240 90 L300 56 L360 90 Z" fill="#332f5e" />
      <path d="M480 90 L540 60 L600 90 Z" fill="#332f5e" />
      {[[80, 110], [200, 110], [320, 110], [440, 110], [560, 110]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="16" height="60" rx="8" fill="#c8b6ff" opacity="0.3" />
      ))}
    </svg>
  );
  if (id === 'river') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      <path d="M0 130 Q150 114 300 128 T600 122 L600 220 L0 220 Z" fill="#2e4a43" />
      {[[70, 112], [230, 106], [380, 114]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="20" ry="14" fill="#22382f" />
      ))}
      {/* маяк */}
      <g>
        <rect x="470" y="58" width="24" height="72" fill="#e8d8c0" />
        <rect x="470" y="76" width="24" height="10" fill="#ff8f7d" />
        <rect x="470" y="100" width="24" height="10" fill="#ff8f7d" />
        <rect x="464" y="44" width="36" height="16" rx="3" fill="#3a2f52" />
        <path d="M464 44 L482 30 L500 44 Z" fill="#3a2f52" />
        <circle cx="482" cy="52" r="7" fill="#ffd98e" style={{ animation: 'pulseSoft 2.4s ease-in-out infinite' }} />
        <circle cx="482" cy="52" r="14" fill="#ffd98e" opacity="0.2" style={{ animation: 'pulseSoft 2.4s ease-in-out infinite' }} />
      </g>
    </svg>
  );
  /* city */
  return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      {[[20, 80, 70, 140, '#241d3a'], [110, 120, 52, 100, '#2e2447'], [182, 48, 82, 172, '#241d3a'], [292, 100, 58, 120, '#2e2447'], [372, 68, 92, 152, '#241d3a'], [486, 108, 70, 112, '#2e2447']].map(([x, y, w, h, col], i) => (
        <rect key={i} x={x as number} y={y as number} width={w as number} height={h as number} fill={col as string} />
      ))}
      {/* окна в двух высоких домах */}
      {[[196, 64], [222, 64], [196, 90], [222, 90], [196, 116], [222, 116], [388, 84], [414, 84], [440, 84], [388, 110], [414, 110], [440, 110]].map(([x, y], i) => (
        <rect key={`w${i}`} x={x} y={y} width="9" height="11" fill="#ffd98e" opacity="0.75"
          style={i % 3 === 0 ? { animation: `twinkle ${2.5 + (i % 4)}s ease-in-out infinite` } : undefined} />
      ))}
    </svg>
  );
}

/* ================= ближние планы ================= */
function SceneNear({ id }: { id: string }) {
  if (id === 'park') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      {[[80, '#3a5248'], [300, '#46604f'], [510, '#3a5248']].map(([x, col], i) => (
        <g key={i}>
          <rect x={(x as number) - 7} y="118" width="14" height="102" fill="#3a2f2e" />
          <ellipse cx={x as number} cy="92" rx="44" ry="50" fill={col as string} />
          <ellipse cx={x as number} cy="66" rx="27" ry="28" fill="#46604f" opacity="0.9" />
        </g>
      ))}
      <ellipse cx="180" cy="196" rx="32" ry="18" fill="#2e4a43" />
      <ellipse cx="410" cy="200" rx="27" ry="15" fill="#2e4a43" />
      {[[135, '#ffaec9'], [235, '#ffd98e'], [360, '#ffb49b'], [462, '#ffaec9']].map(([x, col], i) => (
        <g key={`f${i}`}>
          <path d={`M${x} 208 v-16`} stroke="#4a6a4f" strokeWidth="2.5" />
          <circle cx={x as number} cy="188" r="5" fill={col as string} />
          <circle cx={x as number} cy="188" r="2" fill="#fff3e2" />
        </g>
      ))}
      {[[150, 90], [330, 70], [480, 105]].map(([x, y], i) => (
        <circle key={`ff${i}`} cx={x} cy={y} r="3" fill="#ffd98e" style={{ animation: `twinkle ${2 + i * 0.7}s ease-in-out infinite` }} />
      ))}
    </svg>
  );

  if (id === 'bakery') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      <rect x="130" y="34" width="340" height="186" fill="#4a3d66" />
      <rect x="120" y="24" width="360" height="14" rx="6" fill="#3a2f52" />
      {/* труба и пар */}
      <rect x="396" y="0" width="20" height="26" fill="#3a2f52" />
      {[[402, -8, 0], [410, -16, 0.8], [398, -24, 1.6]].map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r={5 + i * 2} fill="#fff3e2" opacity="0.4"
          style={{ animation: `floatSlow ${3 + i}s ease-in-out infinite ${d}s` }} />
      ))}
      {/* вывеска */}
      <rect x="210" y="44" width="140" height="26" rx="9" fill="#2b2140" stroke="#ffd98e" strokeWidth="2" />
      {[[240, 57], [270, 57], [300, 57], [330, 57]].map(([x, y], i) => (
        <circle key={`b${i}`} cx={x} cy={y} r="6" fill="#f4c266" />
      ))}
      {/* маркиза в полоску */}
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={166 + i * 30} y="84" width="30" height="18" fill={i % 2 ? '#fff3e2' : '#ffb49b'} />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <circle key={`s${i}`} cx={181 + i * 30} cy="102" r="15" fill={i % 2 ? '#fff3e2' : '#ffb49b'}
          style={{ clipPath: 'inset(50% 0 0 0)' }} />
      ))}
      {/* витрина со светом */}
      <rect x="160" y="112" width="182" height="80" rx="10" fill="#ffd98e" opacity="0.2" />
      <rect x="168" y="118" width="166" height="68" rx="8" fill="#ffd98e" opacity="0.9" style={{ animation: 'lampGlow 4s ease-in-out infinite' }} />
      <path d="M251 118 v68 M168 152 h166" stroke="#4a3d66" strokeWidth="5" />
      {/* хлеб на витрине */}
      <ellipse cx="210" cy="172" rx="14" ry="8" fill="#d9a86a" />
      <path d="M272 176 q10 -12 22 -2 q-12 6 -22 2z" fill="#d9a86a" />
      {/* дверь */}
      <rect x="368" y="122" width="62" height="98" rx="8" fill="#3a2f52" />
      <circle cx="418" cy="172" r="3.5" fill="#ffd98e" />
      {/* гирлянда */}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={`g${i}`} cx={180 + i * 40} cy={112 + (i % 2) * 5} r="4"
          fill={['#ffd98e', '#ffaec9', '#9fe8c9'][i % 3]} style={{ animation: `twinkle ${1.8 + (i % 3) * 0.5}s ease-in-out infinite ${i * 0.2}s` }} />
      ))}
    </svg>
  );

  if (id === 'lib') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      <rect x="40" y="52" width="520" height="168" fill="#3a3560" />
      <path d="M40 52 L300 8 L560 52 Z" fill="#4a4470" />
      <circle cx="300" cy="36" r="8" fill="#c8b6ff" opacity="0.8" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
      {/* колонны */}
      {[[70], [160], [250], [340], [430], [520]].map(([x], i) => (
        <g key={i}>
          <rect x={x} y="70" width="20" height="130" fill="#2b2850" />
          <rect x={x - 4} y="64" width="28" height="8" rx="3" fill="#4a4470" />
          <rect x={x - 4} y="198" width="28" height="8" rx="3" fill="#4a4470" />
        </g>
      ))}
      {/* арочные окна */}
      {[[110, '#8ecae6'], [205, '#c8b6ff'], [395, '#8ecae6'], [485, '#c8b6ff']].map(([x, col], i) => (
        <g key={`w${i}`}>
          <rect x={x as number} y="96" width="44" height="84" rx="22" fill={col as string} opacity="0.4" style={{ animation: `lampGlow ${3.5 + i * 0.6}s ease-in-out infinite` }} />
          <path d={`M${(x as number) + 22} 96 v84`} stroke="#2b2850" strokeWidth="3" />
        </g>
      ))}
      {/* дверь */}
      <rect x="278" y="110" width="54" height="90" rx="8" fill="#2b2140" />
      <path d="M305 110 v90" stroke="#3a2f52" strokeWidth="3" />
      {/* парящие книги */}
      {[[120, 60, '#ffd98e', 0], [300, 44, '#ffaec9', 1], [470, 66, '#8ecae6', 2]].map(([x, y, col, d], i) => (
        <g key={`bk${i}`} style={{ animation: `floatSlow ${4 + i}s ease-in-out infinite ${d}s` }}>
          <rect x={x as number} y={y as number} width="22" height="14" rx="2.5" fill={col as string} transform={`rotate(${-8 + i * 9} ${x} ${y})`} />
          <path d={`M${(x as number) + 3} ${(y as number) + 4} h14`} stroke="#2b1d33" strokeWidth="1.6" opacity="0.5" transform={`rotate(${-8 + i * 9} ${x} ${y})`} />
        </g>
      ))}
    </svg>
  );

  if (id === 'river') return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      {/* перила */}
      <rect x="0" y="118" width="600" height="7" rx="3" fill="#4a4a5a" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={20 + i * 60} y="118" width="7" height="42" rx="3" fill="#4a4a5a" />
      ))}
      {/* вода */}
      <rect x="0" y="160" width="600" height="60" fill="#23435c" />
      <g style={{ animation: 'walkStrip 6s linear infinite', width: '200%' }}>
        <path d="M0 172 q25 -7 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#8ecae6" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M0 188 q25 -6 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#8ecae6" strokeWidth="2.5" fill="none" opacity="0.32" />
        <path d="M0 204 q25 -5 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#8ecae6" strokeWidth="2" fill="none" opacity="0.2" />
      </g>
      {/* лодочка */}
      <g style={{ animation: 'floatSlow 3.4s ease-in-out infinite' }}>
        <path d="M190 186 q30 14 60 0 l-8 12 h-44 z" fill="#d98e73" />
        <path d="M220 152 v32" stroke="#3a2f2e" strokeWidth="3" />
        <path d="M220 152 l22 26 h-22 z" fill="#fff3e2" opacity="0.9" />
      </g>
      {/* блики */}
      {[[100, 196], [330, 180], [470, 200], [540, 186]].map(([x, y], i) => (
        <circle key={`sp${i}`} cx={x} cy={y} r="2.5" fill="#fff3e2" opacity="0.7" style={{ animation: `twinkle ${2 + i * 0.6}s ease-in-out infinite` }} />
      ))}
    </svg>
  );

  /* city */
  return (
    <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
      {[[90], [300], [510]].map(([x], i) => (
        <g key={i}>
          <rect x={x - 3} y="100" width="6" height="120" fill="#4a4a5a" />
          <path d={`M${x - 3} 104 q-14 2 -16 12`} stroke="#4a4a5a" strokeWidth="5" fill="none" />
          <circle cx={x - 19} cy="118" r="8" fill="#ffd98e" />
          <circle cx={x - 19} cy="118" r="18" fill="#ffd98e" opacity="0.16" style={{ animation: `pulseSoft ${2.6 + i * 0.4}s ease-in-out infinite` }} />
        </g>
      ))}
      {/* скамейка */}
      <g>
        <rect x="352" y="176" width="76" height="8" rx="3" fill="#3a2f52" />
        <rect x="352" y="160" width="76" height="7" rx="3" fill="#3a2f52" />
        <rect x="358" y="184" width="6" height="24" fill="#2b2140" />
        <rect x="416" y="184" width="6" height="24" fill="#2b2140" />
      </g>
      {/* деревце */}
      <g>
        <rect x="192" y="140" width="10" height="72" fill="#3a2f2e" />
        <ellipse cx="197" cy="118" rx="34" ry="38" fill="#2e4a43" />
        <ellipse cx="197" cy="98" rx="21" ry="22" fill="#3a5248" opacity="0.9" />
      </g>
      {/* кот на скамейке — силуэт */}
      <g fill="#12101f">
        <ellipse cx="390" cy="152" rx="14" ry="9" />
        <circle cx="402" cy="143" r="6.5" />
        <path d="M397 138 l3 -5 3 4 M404 137 l3 -4 2 5" />
        <path d="M376 152 q-8 -2 -8 -10" stroke="#12101f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
