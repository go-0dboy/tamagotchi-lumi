/* ============================================================
 * Учёба: викторины по 4 наукам (настоящие знания, навыки,
 * искры) + «Случайный факт» широкой карточкой.
 * ============================================================ */
import { useMemo, useState } from 'react';
import { engine } from '../game/engine';
import { QUESTIONS, SUBJECTS, type Question } from '../game/knowledge';
import { sfx } from '../game/sound';
import Icon from './icons';

type Step = 'subjects' | 'quiz' | 'result';

export default function Learning({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('subjects');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [totalReward, setTotalReward] = useState(0);
  const [fact, setFact] = useState<{ title: string; text: string } | null>(null);

  const petName = engine.state.pet?.name ?? 'питомец';

  const start = (sub: string) => {
    const pool = QUESTIONS.filter(q => q.subject === sub);
    const chosen = useMemoShuffle(pool).slice(0, 5);
    setSubject(sub);
    setQuestions(chosen);
    setIdx(0); setCorrect(0); setPicked(null); setTotalReward(0);
    setStep('quiz');
    sfx.pop();
  };

  const answer = (optIdx: number) => {
    if (picked !== null) return;
    setPicked(optIdx);
    const q = questions[idx];
    const ok = optIdx === q.a;
    if (ok) sfx.sparkle(); else sfx.sad();
    const { reward } = engine.answerStudy(ok, q.subject);
    if (ok) setCorrect(c => c + 1);
    setTotalReward(r => r + reward);
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setStep('result');
      } else {
        setIdx(i => i + 1);
        setPicked(null);
      }
    }, 900);
  };

  const subDef = SUBJECTS.find(s => s.id === subject);

  return (
    <div className="fixed inset-0 z-50 flex p-4 bg-night-950/90 anim-fade overflow-y-auto" onClick={step === 'result' ? onClose : undefined}>
      {step === 'subjects' && (
        <div className="card max-w-lg w-full m-auto p-4 sm:p-5 anim-pop space-y-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-butter">Чему научимся?</h3>
            <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
          </div>
          <p className="text-[12px] font-bold text-cream/50 -mt-1">{petName} занимается вместе с вами: за правильные ответы — искры и интеллект.</p>

          <div className="grid grid-cols-2 gap-2.5">
            {SUBJECTS.map(s => (
              <button key={s.id} onClick={() => start(s.id)}
                className="card-soft p-3.5 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all group">
                <span className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
                  style={{ background: `${s.color}1f`, color: s.color }}>
                  <Icon name={s.icon} className="w-5 h-5" />
                </span>
                <div className="font-display font-bold text-[12.5px] leading-tight">{s.label}</div>
                <div className="text-[10px] font-bold text-cream/40 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>

          <button onClick={() => { const f = engine.randomFact(); engine.learnFact(f); setFact(f); sfx.sparkle(); }}
            className="w-full card-soft p-3.5 text-left flex items-center gap-3 hover:border-butter/50 active:scale-[0.98] transition-all group">
            <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-butter shrink-0 group-hover:scale-110 transition-transform"
              style={{ background: 'rgba(255,217,142,0.12)' }}>
              <Icon name="spark" className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="font-display font-bold text-[13px] block">Случайный факт</span>
              <span className="text-[10.5px] font-bold text-cream/45">Маленькое открытие — {petName} запомнит и расскажет потом</span>
            </span>
            <Icon name="chat" className="w-4 h-4 text-cream/30 group-hover:text-butter transition-colors" />
          </button>

          {fact && (
            <div className="card-soft p-3.5 anim-fade-up">
              <div className="text-[11px] font-black text-butter uppercase tracking-wider mb-1">{fact.title}</div>
              <p className="text-[12.5px] font-bold text-cream/80 leading-relaxed">{fact.text}</p>
              <p className="text-[10.5px] font-bold text-cream/40 mt-1.5">«{fact.title}» — теперь и моё любимое знание! — {petName}</p>
            </div>
          )}
        </div>
      )}

      {step === 'quiz' && questions[idx] && (
        <div className="card max-w-md w-full m-auto p-4 sm:p-5 anim-pop" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <span className="chip" style={{ color: subDef?.color }}>{subDef?.label}</span>
            <span className="chip text-cream/50">{idx + 1} / {questions.length}</span>
            <span className="chip text-mint">верно: {correct}</span>
          </div>
          <div className="bar-track !h-1.5 mb-4">
            <div className="bar-fill" style={{ width: `${(idx / questions.length) * 100}%`, background: subDef?.color }} />
          </div>
          <p className="font-display font-bold text-[15px] leading-snug mb-4">{questions[idx].q}</p>
          <div className="space-y-2">
            {questions[idx].opts.map((opt, i) => {
              const isRight = i === questions[idx].a;
              const cls = picked === null ? 'card-soft hover:border-sky/50'
                : isRight ? '!border-mint bg-mint/15 text-mint'
                : picked === i ? '!border-ember bg-ember/10 text-ember'
                : 'card-soft opacity-40';
              return (
                <button key={i} onClick={() => answer(i)}
                  className={`w-full p-3 rounded-2xl border text-left text-[13px] font-extrabold transition-all active:scale-[0.98] ${cls}`}>
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className={`text-[12px] font-bold mt-3 anim-fade-up ${picked === questions[idx].a ? 'text-mint' : 'text-ember'}`}>
              {picked === questions[idx].a
                ? `Верно! ${petName} подпрыгнул от радости и записал это в знания.`
                : `Не совсем… ${petName} шепчет: правильный ответ подсвечен зелёным. Запомнили!`}
            </p>
          )}
        </div>
      )}

      {step === 'result' && (
        <div className="card max-w-md w-full m-auto p-5 anim-pop text-center" onClick={e => e.stopPropagation()}>
          <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center text-butter mb-3"
            style={{ background: 'rgba(255,217,142,0.12)', animation: 'pulseSoft 2.5s ease-in-out infinite' }}>
            <Icon name="book" className="w-8 h-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-butter">{correct} из {questions.length} — {correct >= 4 ? 'блестяще!' : correct >= 2 ? 'хорошо!' : 'начало положено!'}</h3>
          <p className="text-[13px] font-bold text-cream/70 leading-relaxed mt-2">
            {petName} стал чуть умнее: +интеллект{totalReward > 0 && `, +${totalReward} искр`}.
            {correct === questions.length ? ' Ни одной ошибки! Я горжусь нами.' : ' Ошибки — это ступеньки. Пойдём ещё?'}
          </p>
          <div className="flex gap-2 mt-4 justify-center">
            <button className="btn btn-butter !py-2 !text-xs" onClick={() => start(subject)}>Ещё раз</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={onClose}>Готово</button>
          </div>
        </div>
      )}
    </div>
  );
}

function useMemoShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
