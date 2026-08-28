/* Учёба (викторины по наукам + случайный факт) и Прогулка
 * (локации + «Улицы города»). Кнопка «Улицы» растягивается
 * точно так же, как «Случайный факт» — через общий WideCardButton. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { engine, timePhase } from '../game/engine';
import { SUBJECTS, QUESTIONS, FALLBACK_FACTS } from '../game/speech';
import { WALK_LOCATIONS, type WalkLoc } from '../game/content-data';
import { sfx } from '../game/core';
import PetSprite from './PetSprite';
import Icon from './icons';

/* ---------- общая широкая карточка-кнопка ---------- */
export function WideCardButton({ icon, tint, title, subtitle, onClick }: {
  icon: string; tint: string; title: string; subtitle: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="w-full card-soft p-4 text-left flex items-center gap-3.5 transition-all hover:-translate-y-0.5 active:scale-[0.98] group">
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
        style={{ background: `${tint}1f`, color: tint }}>
        <Icon name={icon} className="w-6 h-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display font-bold text-[14px] block leading-tight">{title}</span>
        <span className="text-[11px] font-bold text-cream/45 block leading-snug mt-0.5">{subtitle}</span>
      </span>
      <Icon name="walk" className="w-5 h-5 text-cream/30 group-hover:text-cream/60 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

/* ================= УЧЁБА ================= */
export function Learning({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState(0);
  const [fact, setFact] = useState<{ title: string; text: string } | null>(null);

  const questions = useMemo(
    () => (subject ? QUESTIONS.filter(q => q.subject === subject).sort(() => Math.random() - 0.5).slice(0, 5) : []),
    [subject],
  );
  const q = questions[qIdx];

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = i === q.a;
    if (correct) setScore(s => s + 1);
    const r = engine.answerStudy(subject!, correct);
    setReward(w => w + r);
    setTimeout(() => {
      setPicked(null);
      if (qIdx + 1 >= questions.length) setDone(true);
      else setQIdx(x => x + 1);
    }, 900);
  };

  const restart = () => { setSubject(null); setQIdx(0); setScore(0); setReward(0); setDone(false); setPicked(null); };

  return (
    <div className="fixed inset-0 z-50 flex p-4 bg-night-950/90 anim-fade overflow-y-auto" onClick={onClose}>
      <div className="card max-w-lg w-full m-auto p-4 sm:p-5 anim-pop" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-butter">Учимся вместе</h3>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
        </div>

        {!subject && !done && (
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-cream/50">Выберите науку — {engine.state.pet?.name} будет отвечать вместе с вами.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {SUBJECTS.map(s => (
                <button key={s.id} onClick={() => { setSubject(s.id); sfx.pop(); }}
                  className="card-soft p-3.5 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all group">
                  <span className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ background: `${s.color}1f`, color: s.color }}><Icon name={s.icon} className="w-5 h-5" /></span>
                  <div className="font-display font-bold text-[13px] leading-tight">{s.label}</div>
                  <div className="text-[10.5px] font-bold text-cream/45 leading-snug mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
            {/* случайный факт — широкая карточка */}
            <WideCardButton icon="spark" tint="#ffd98e" title="Случайный факт"
              subtitle="Маленькое открытие из энциклопедии — расскажу хозяину"
              onClick={() => { setFact(engine.randomFact()); sfx.sparkle(); }} />
            {fact && (
              <div className="card-soft p-3.5 anim-fade-up">
                <div className="text-[12px] font-black text-butter mb-1">{fact.title}</div>
                <p className="text-[12px] font-bold text-cream/70 leading-relaxed">{fact.text}</p>
              </div>
            )}
          </div>
        )}

        {subject && q && !done && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="chip !text-[10.5px] text-sky">{SUBJECTS.find(s => s.id === subject)?.label}</span>
              <span className="chip !text-[10.5px]">вопрос {qIdx + 1}/{questions.length}</span>
            </div>
            <p className="font-display font-bold text-[15px] leading-snug mb-3">{q.q}</p>
            <div className="space-y-2">
              {q.opts.map((o, i) => {
                const isRight = picked !== null && i === q.a;
                const isWrongPick = picked === i && i !== q.a;
                return (
                  <button key={i} onClick={() => answer(i)} disabled={picked !== null}
                    className={`w-full card-soft p-3 text-left text-[13px] font-extrabold transition-all active:scale-[0.98]
                      ${isRight ? '!border-mint/70 text-mint bg-mint/10' : isWrongPick ? '!border-ember/70 text-ember bg-ember/10' : picked !== null ? 'opacity-40' : 'hover:border-sky/50'}`}>
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {done && (
          <div className="text-center py-4">
            <div className="font-display font-bold text-2xl text-butter text-glow">{score}/{questions.length}</div>
            <p className="text-[13px] font-bold text-cream/60 mt-2">Правильных ответов! Награда: <span className="text-butter">+{reward} искр</span>, +интеллект.</p>
            <div className="flex gap-2 mt-4 justify-center">
              <button className="btn btn-butter !py-2 !text-xs" onClick={restart}>Ещё</button>
              <button className="btn btn-ghost !py-2 !text-xs" onClick={onClose}>Готово</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= ПРОГУЛКА ================= */
export function Walk({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'pick' | 'walk' | 'result'>('pick');
  const [loc, setLoc] = useState<WalkLoc | null>(null);
  const [story, setStory] = useState('');
  const [result, setResult] = useState<{ coins: number; souvenir?: string } | null>(null);
  const started = useRef(false);
  const city = engine.state.owner.city?.trim();

  const go = (l: WalkLoc) => { setLoc(l); setStep('walk'); sfx.pop(); };

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
            {WALK_LOCATIONS.map(l => (
              <button key={l.id} onClick={() => go(l)}
                className="card-soft p-3.5 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all group">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ background: `${l.tint}1f`, color: l.tint }}><Icon name={l.icon} className="w-5 h-5" /></span>
                <div className="font-display font-bold text-[12.5px] leading-tight">{l.name}</div>
              </button>
            ))}
          </div>
          {/* «Улицы города» — растягивается на всю ширину, как «Случайный факт» в учёбе */}
          <div className="mt-2.5">
            <WideCardButton icon="star" tint="#ffaec9"
              title={city ? `Улицы ${city}` : 'Улицы города'}
              subtitle={city ? `Прогуляемся по твоему городу — ${city}` : 'Укажите город в настройках — и пойдём по его улицам'}
              onClick={() => go({
                id: 'city', icon: 'star', tint: '#ffaec9',
                name: city ? `Улицы ${city}` : 'Улицы города',
                stories: city ? [
                  `Мы гуляли по улицам ${city}! Я запомнил дорогу домой, на всякий случай.`,
                  `В ${city} сегодня особенно красиво пахло вечером. Обошли три квартала.`,
                  `Нашли в ${city} уютный дворик, где коты греются на подоконниках.`,
                ] : [
                  'Мы гуляли по незнакомым улицам и придумывали им имена.',
                  'Город шумел, а мы нашли самый тихий переулок.',
                ],
              })} />
          </div>
        </div>
      )}

      {step === 'walk' && loc && <WalkScene locName={loc.name} />}

      {step === 'result' && loc && (
        <div className="card max-w-md w-full m-auto p-5 anim-pop text-center" onClick={e => e.stopPropagation()}>
          <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-3" style={{ background: `${loc.tint}1f`, color: loc.tint, animation: 'pulseSoft 2.5s ease-in-out infinite' }}>
            <Icon name={loc.icon} className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-butter">Вернулись: {loc.name}</h3>
          <p className="text-[13px] font-bold text-cream/75 leading-relaxed mt-2">«{story}»</p>
          {result && (
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <span className="chip text-butter"><Icon name="spark" className="w-3.5 h-3.5" />+{result.coins} искр</span>
              {result.souvenir && <span className="chip text-lilac"><Icon name="gift" className="w-3.5 h-3.5" />сувенир в рюкзаке!</span>}
            </div>
          )}
          <button className="btn btn-primary w-full mt-4" onClick={onClose}><Icon name="home" className="w-5 h-5" />Домой</button>
        </div>
      )}
    </div>
  );
}

/* ---------- анимация дороги ---------- */
function WalkScene({ locName }: { locName: string }) {
  const pet = engine.state.pet!;
  const phase = timePhase();
  const sky = phase === 'night' ? 'linear-gradient(180deg,#0c1220,#1c2a52)'
    : phase === 'evening' ? 'linear-gradient(180deg,#2a2547,#5a3a52)'
    : 'linear-gradient(180deg,#3a5a8c,#7fa8d0)';
  return (
    <div className="relative w-full max-w-2xl m-auto rounded-[28px] overflow-hidden border border-sky/15 anim-fade"
      style={{ height: 'min(62vh, 420px)', background: sky }}>
      <div className="absolute inset-x-0 bottom-[38%] h-[42%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '14s' }}>
        <div className="w-1/2 h-full"><FarLayer /></div><div className="w-1/2 h-full"><FarLayer /></div>
      </div>
      <div className="absolute inset-x-0 bottom-[14%] h-[46%] anim-walk-strip flex" style={{ width: '200%', animationDuration: '6s' }}>
        <div className="w-1/2 h-full"><NearLayer /></div><div className="w-1/2 h-full"><NearLayer /></div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[16%]" style={{ background: 'linear-gradient(180deg,#3a3050,#2b2140)' }}>
        <div className="absolute inset-x-0 top-1/2 h-1 anim-walk-strip" style={{ width: '200%', animationDuration: '2.5s', backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,217,142,0.5) 0 26px, transparent 26px 60px)' }} />
      </div>
      <div className="absolute left-[18%] bottom-[8%] w-[26%] anim-walker"><PetSprite pet={pet} size="100%" /></div>
      <div className="absolute top-4 inset-x-0 flex justify-center">
        <span className="chip !text-[12px] backdrop-blur-sm bg-night-900/70"><Icon name="walk" className="w-4 h-4 text-peach" />Идём: {locName}…</span>
      </div>
      <div className="absolute left-[22%] bottom-[6%] w-3 h-3 rounded-full bg-butter/70" style={{ animation: 'dustPuff 0.8s ease-out infinite' }} />
    </div>
  );
}

function FarLayer() {
  return (
    <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
      {Array.from({ length: 8 }, (_, i) => {
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
  return (
    <svg className="w-full h-full" viewBox="0 0 1200 220" preserveAspectRatio="none">
      {Array.from({ length: 6 }, (_, i) => {
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
