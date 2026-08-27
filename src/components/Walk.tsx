/* ============================================================
 * Прогулка: выбор места (включая улицы города игрока) →
 * анимированная дорога с параллаксом → возвращение домой
 * с историей, искрами и сувениром.
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
    }, 4200);
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
          <p className="text-[12px] font-bold text-cream/50 mb-4">Прогулка бодрит, приносит искры и впечатления. Нужна энергия (12+).</p>
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

      {step === 'walk' && loc && <WalkScene locName={loc.name} />}

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

/* ---------- анимация дороги с параллаксом ---------- */
function WalkScene({ locName }: { locName: string }) {
  const pet = engine.state.pet!;
  const phase = timePhase();
  const sky = phase === 'night' ? 'linear-gradient(180deg,#0c1220,#1c2a52)'
    : phase === 'evening' ? 'linear-gradient(180deg,#2a2547,#5a3a52)'
    : 'linear-gradient(180deg,#3a5a8c,#7fa8d0)';
  return (
    <div className="relative w-full max-w-2xl m-auto rounded-[28px] overflow-hidden border border-sky/15 anim-fade"
      style={{ height: 'min(62vh, 420px)', background: sky }}>
      {/* дальний слой: дома (два кадра — бесшовный цикл) */}
      <div className="absolute inset-x-0 bottom-[38%] h-[42%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '14s' }}>
        <div className="w-1/2 h-full"><FarLayer /></div>
        <div className="w-1/2 h-full"><FarLayer /></div>
      </div>
      {/* ближний слой: деревья и фонари */}
      <div className="absolute inset-x-0 bottom-[14%] h-[46%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '6s' }}>
        <div className="w-1/2 h-full"><NearLayer /></div>
        <div className="w-1/2 h-full"><NearLayer /></div>
      </div>
      {/* дорога */}
      <div className="absolute inset-x-0 bottom-0 h-[16%]" style={{ background: 'linear-gradient(180deg,#3a3050,#2b2140)' }}>
        <div className="absolute inset-x-0 top-1/2 h-1 anim-walk-strip" style={{ width: '200%', animationDuration: '2.5s',
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,217,142,0.5) 0 26px, transparent 26px 60px)' }} />
      </div>
      {/* питомец идёт */}
      <div className="absolute left-[18%] bottom-[8%] w-[26%] anim-walker">
        <PetSprite pet={pet} size="100%" />
      </div>
      <div className="absolute top-4 inset-x-0 flex justify-center">
        <span className="chip !text-[12px] backdrop-blur-sm bg-night-900/70"><Icon name="walk" className="w-4 h-4 text-peach" />Идём: {locName}…</span>
      </div>
      {/* шаги-пылинка */}
      <div className="absolute left-[22%] bottom-[6%] w-3 h-3 rounded-full bg-butter/70" style={{ animation: 'dustPuff 0.8s ease-out infinite' }} />
    </div>
  );
}

function FarLayer() {
  const houses = Array.from({ length: 8 });
  return (
    <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
      {houses.map((_, i) => {
        const x = (i % 4) * 300 + (i >= 4 ? 150 : 0);
        return (
          <g key={i} opacity="0.5">
            <rect x={x + 40} y={90} width="70" height="110" fill="#241d3a" />
            <path d={`M${x + 30} 90 L${x + 75} 40 L${x + 120} 90 Z`} fill="#2e2447" />
            <rect x={x + 60} y={120} width="14" height="18" fill="#ffd98e" opacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

function NearLayer() {
  const trees = Array.from({ length: 6 });
  return (
    <svg className="w-full h-full" viewBox="0 0 1200 220" preserveAspectRatio="none">
      {trees.map((_, i) => {
        const x = i * 200 + 40;
        return (
          <g key={i}>
            <rect x={x + 26} y={120} width="12" height="100" fill="#3a2f2e" />
            <ellipse cx={x + 32} cy={90} rx="42" ry="52" fill={i % 2 ? '#2e4a43' : '#3a5248'} />
            <ellipse cx={x + 32} cy={70} rx="26" ry="30" fill={i % 2 ? '#3a5a4e' : '#46604f'} opacity="0.9" />
            {i % 2 === 0 && (
              <g>
                <rect x={x + 130} y={90} width="6" height="130" fill="#4a4a5a" />
                <circle cx={x + 133} cy={82} r="11" fill="#ffd98e" opacity="0.9" />
                <circle cx={x + 133} cy={82} r="22" fill="#ffd98e" opacity="0.18" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
