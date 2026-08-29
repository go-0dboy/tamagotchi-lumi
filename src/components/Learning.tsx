/* ============================================================
 * Учёба: викторины по наукам (география, физика, биология,
 * обществознание) и случайный факт из Википедии — из интернета.
 * ============================================================ */
import { useEffect, useMemo, useState } from 'react';
import { engine } from '../game/engine';
import { QUESTIONS, SUBJECTS, fetchWikiFact, FALLBACK_FACTS, type Question } from '../game/knowledge';
import Icon from './icons';
import { sfx } from '../game/sound';

type Step = 'hub' | 'quiz' | 'fact';

export default function Learning({ petName, onClose }: { petName: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>('hub');
  const [subject, setSubject] = useState<string>('geo');

  const openQuiz = (s: string) => { setSubject(s); setStep('quiz'); sfx.pop(); };

  return (
    <div className="fixed inset-0 z-50 flex safe-p-4 bg-night-950/85 anim-fade overflow-y-auto" onClick={onClose}>
      <div className="card max-w-lg w-full m-auto p-4 sm:p-5 anim-pop" onClick={e => e.stopPropagation()}>
        {step === 'hub' && <Hub petName={petName} onClose={onClose} onQuiz={openQuiz} onFact={() => setStep('fact')} />}
        {step === 'quiz' && <Quiz subject={subject} petName={petName} onBack={() => setStep('hub')} />}
        {step === 'fact' && <Fact petName={petName} onBack={() => setStep('hub')} />}
      </div>
    </div>
  );
}

function Hub({ petName, onClose, onQuiz, onFact }: { petName: string; onClose: () => void; onQuiz: (s: string) => void; onFact: () => void }) {
  const known = engine.state.pet?.knowledge.length ?? 0;
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-lg font-bold text-butter">Учимся вместе</h3>
        <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
      </div>
      <p className="text-[12px] font-bold text-cream/50 mb-4">
        {petName} отвечает на вопросы и умнеет на глазах. Изучено: <span className="text-mint">{known}</span>. Наука качает интеллект и даёт искры.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {SUBJECTS.map(s => (
          <button key={s.id} onClick={() => onQuiz(s.id)}
            className="card-soft p-2.5 sm:p-3.5 flex flex-col items-center text-center sm:items-start sm:text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all group min-w-0">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform shrink-0"
              style={{ background: `${s.color}1f`, color: s.color }}>
              <Icon name={s.icon} className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </span>
            <div className="font-display font-bold text-[10.5px] sm:text-[13px] leading-tight break-words w-full">{s.label}</div>
            <div className="text-[9px] sm:text-[10.5px] font-bold text-cream/45 mt-0.5 leading-tight">{s.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onFact}
        className="w-full mt-3 card-soft p-3.5 text-left flex items-center gap-3 hover:border-sky/50 active:scale-[0.98] transition-all group">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-sky shrink-0 group-hover:scale-110 transition-transform"
          style={{ background: 'rgba(142,202,230,0.1)' }}>
          <Icon name="star" className="w-5 h-5" />
        </span>
        <span>
          <span className="font-display font-bold text-[13px] block">Случайный факт</span>
          <span className="text-[10.5px] font-bold text-cream/45">Из Википедии — каждый раз новый, прямо из интернета</span>
        </span>
      </button>
    </>
  );
}

function Quiz({ subject, petName, onBack }: { subject: string; petName: string; onBack: () => void }) {
  const meta = SUBJECTS.find(s => s.id === subject)!;
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState<{ coins: number; xp: number } | null>(null);
  const topicIds = useMemo(() => [] as string[], []);

  useEffect(() => {
    const known = new Set(engine.state.pet?.knowledge ?? []);
    const pool = QUESTIONS.filter(q => q.subject === subject);
    const fresh = pool.filter(q => !known.has(q.id));
    const base = fresh.length >= 5 ? fresh : [...fresh, ...pool];
    const shuffled = [...base].sort(() => Math.random() - 0.5);
    setQs(shuffled.slice(0, Math.min(5, shuffled.length)));
    setIdx(0); setCorrect(0); setPicked(null); setDone(null);
  }, [subject]);

  const q = qs[idx];

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    const isRight = i === q.a;
    if (isRight) { setCorrect(c => c + 1); sfx.sparkle(); } else sfx.sad();
    topicIds.push(q.id);
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= qs.length) {
        const finalCorrect = correct + (isRight ? 1 : 0);
        setDone(engine.finishStudy(finalCorrect, qs.length, topicIds, meta.label));
      } else setIdx(v => v + 1);
    }, 900);
  };

  if (!q) return null;

  if (done) {
    return (
      <div className="text-center py-4 anim-pop">
        <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center text-butter mb-3"
          style={{ background: 'rgba(255,217,142,0.12)', animation: 'pulseSoft 2.5s ease-in-out infinite' }}>
          <Icon name={correct >= 3 ? 'star' : 'book'} className="w-8 h-8" />
        </div>
        <h3 className="font-display text-xl font-bold text-butter">{correct} из {qs.length} верно!</h3>
        <p className="text-[13px] font-bold text-cream/60 mt-2 leading-relaxed">
          +{done.coins} искр, +{done.xp} опыта.<br />
          {petName} стал на {correct} вопрос(а) умнее по теме «{meta.label}».
        </p>
        <button className="btn btn-primary !py-2.5 mt-4" onClick={onBack}>Выбрать науку</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip" style={{ color: meta.color }}>{meta.label}</span>
        <span className="chip">{idx + 1} / {qs.length}</span>
      </div>
      <div className="flex gap-1 mb-4">
        {qs.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < idx ? 'bg-mint' : i === idx ? 'bg-butter' : 'bg-night-600'}`} />
        ))}
      </div>
      <p className="font-display font-bold text-[16px] leading-snug text-cream/90 mb-4">{q.q}</p>
      <div className="grid grid-cols-1 gap-2">
        {q.opts.map((o, i) => {
          const show = picked !== null;
          const cls = !show ? 'card-soft hover:border-sky/50'
            : i === q.a ? '!border-mint bg-mint/15 text-mint'
            : i === picked ? '!border-ember bg-ember/10 text-ember'
            : 'card-soft opacity-40';
          return (
            <button key={o} onClick={() => answer(i)}
              className={`px-3.5 py-3 rounded-2xl text-left text-[13.5px] font-extrabold border transition-all active:scale-[0.98] ${cls}`}>
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`text-center text-[12px] font-bold mt-3 ${picked === q.a ? 'text-mint' : 'text-ember'}`}>
          {picked === q.a ? 'Верно! Так держать!' : `Правильный ответ: ${q.opts[q.a]}`}
        </p>
      )}
    </>
  );
}

function Fact({ petName, onBack }: { petName: string; onBack: () => void }) {
  const [fact, setFact] = useState<{ title: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true); setSaved(false);
    const f = await fetchWikiFact();
    setFact(f ?? FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip text-sky"><Icon name="star" className="w-3.5 h-3.5" />Факт из Википедии</span>
        <button className="btn btn-sky !py-2 !px-3 !text-xs" onClick={() => void load()}>Ещё</button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto w-10 h-10 rounded-full border-4 border-sky/20 border-t-sky animate-spin mb-3" />
          <p className="text-[13px] font-bold text-cream/50">{petName} листает большую книгу знаний…</p>
        </div>
      ) : fact ? (
        <div className="card-soft p-4 anim-fade-up">
          <div className="font-display font-bold text-[16px] text-butter mb-2">{fact.title}</div>
          <p className="text-[13.5px] font-bold leading-relaxed text-cream/85">{fact.text}</p>
        </div>
      ) : null}

      {!loading && fact && (
        <button className="btn btn-primary w-full !py-2.5 mt-4" disabled={saved}
          onClick={() => { engine.rememberFact(fact.title, fact.text); setSaved(true); sfx.sparkle(); }}>
          <Icon name="brain" className="w-5 h-5" />{saved ? 'Запомнил!' : 'Запомнить'}
        </button>
      )}
    </>
  );
}
