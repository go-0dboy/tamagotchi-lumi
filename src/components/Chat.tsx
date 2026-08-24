/* ============================================================
 * Болталка: чат с компаньоном (правиловой ИИ + память),
 * дыхательная практика, фокус-таймер, проверка настроения.
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import { engine } from '../game/engine';
import { AFFIRMATIONS } from '../game/content';
import Icon from './icons';

export default function ChatPanel({ state }: { state: GameState }) {
  const [input, setInput] = useState('');
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [cycles, setCycles] = useState(0);
  const [affirm, setAffirm] = useState(AFFIRMATIONS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusLeft = state.focusEndsAt ? Math.max(0, state.focusEndsAt - Date.now()) : 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.chat.length]);

  useEffect(() => {
    if (!breathing) return;
    let c = 0;
    const seq = [
      { p: 'in' as const, d: 4000 }, { p: 'hold' as const, d: 2000 }, { p: 'out' as const, d: 6000 },
    ];
    let i = 0; let t: ReturnType<typeof setTimeout>;
    const step = () => {
      setBreathPhase(seq[i % 3].p);
      if (i % 3 === 0 && i > 0) { c++; setCycles(c); if (c >= 4) { setBreathing(false); engine.setBubble('Мы подышали вместе. Чувствуешь, как стало тише?'); return; } }
      t = setTimeout(() => { i++; step(); }, seq[i % 3].d);
    };
    step();
    return () => clearTimeout(t);
  }, [breathing]);

  const send = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    engine.sendChat(msg);
    setInput('');
  };

  const PHASE_LABEL = { in: 'Вдох… 4 счёта', hold: 'Задержите… мягко', out: 'Выдох… 6 счётов' };

  return (
    <div className="card p-4 anim-fade-up space-y-3">
      {/* самочувствие */}
      <div className="flex gap-2 flex-wrap">
        <button className="chip !py-2 hover:border-rose/50 transition-all active:scale-95" onClick={() => send('мне грустно')}>мне грустно</button>
        <button className="chip !py-2 hover:border-sky/50 transition-all active:scale-95" onClick={() => send('я устал')}>я устал</button>
        <button className="chip !py-2 hover:border-mint/50 transition-all active:scale-95" onClick={() => send('у меня всё отлично!')}>всё отлично</button>
        <button className="chip !py-2 hover:border-butter/50 transition-all active:scale-95" onClick={() => send('расскажи шутку')}>шутку!</button>
      </div>

      {/* лента чата */}
      <div ref={scrollRef} className="h-64 overflow-y-auto space-y-2 pr-1">
        {state.chat.length === 0 && (
          <div className="text-center py-8">
            <Icon name="chat" className="w-9 h-9 mx-auto text-cream/20 mb-2" />
            <p className="text-[13px] font-bold text-cream/45 leading-relaxed px-4">
              {state.pet!.name} умеет болтать! Расскажите о себе:<br />
              <span className="text-butter">«меня зовут …»</span>, <span className="text-mint">«я люблю …»</span>, <span className="text-lilac">«запомни: …»</span> — и он будет помнить всегда.
            </p>
          </div>
        )}
        {state.chat.map(m => (
          <div key={m.id} className={`flex ${m.from === 'owner' ? 'justify-end' : 'justify-start'} anim-fade`}>
            <div className={`max-w-[85%] px-3.5 py-2 text-[13px] font-bold leading-relaxed rounded-2xl ${m.from === 'owner' ? 'bg-peach text-[#3a1d16] rounded-br-md' : 'bg-night-700 text-cream/90 rounded-bl-md border border-sky/10'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* ввод */}
      <div className="flex gap-2">
        <input className="input-soft !py-2.5" placeholder={`Написать ${state.pet!.name}…`} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="btn btn-primary !px-4" onClick={() => send()} aria-label="Отправить">
          <Icon name="chat" className="w-5 h-5" />
        </button>
      </div>

      {/* забота о хозяине */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card-soft p-3">
          <div className="flex items-center gap-2 mb-1.5 text-mint"><Icon name="wind" className="w-4 h-4" /><span className="text-[11px] font-black uppercase tracking-wider">Дыхание</span></div>
          <p className="text-[11px] font-bold text-cream/50 mb-2 leading-snug">Подышите вместе 4 круга: вдох 4 — пауза 2 — выдох 6.</p>
          <button className="btn btn-mint w-full !py-2 !text-xs" onClick={() => { setBreathing(true); setCycles(0); }}>{breathing ? 'дышим…' : 'Начать'}</button>
        </div>
        <div className="card-soft p-3">
          <div className="flex items-center gap-2 mb-1.5 text-sky"><Icon name="timer" className="w-4 h-4" /><span className="text-[11px] font-black uppercase tracking-wider">Фокус</span></div>
          {focusLeft > 0 ? (
            <p className="text-lg font-display font-bold text-sky tabular-nums">{Math.floor(focusLeft / 60000)}:{String(Math.floor((focusLeft % 60000) / 1000)).padStart(2, '0')}</p>
          ) : (
            <div className="flex gap-1.5">
              {[5, 15, 25].map(m => (
                <button key={m} className="btn btn-sky !py-1.5 !px-2.5 !text-[11px] flex-1" onClick={() => engine.startFocus(m)}>{m}м</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* аффирмация */}
      <div className="card-soft p-3 flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-butter shrink-0 active:scale-90 transition-transform" style={{ background: 'rgba(255,217,142,0.1)' }}
          onClick={() => setAffirm(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)])} aria-label="Новая аффирмация">
          <Icon name="star" className="w-5 h-5" />
        </button>
        <p className="text-[12.5px] font-bold text-cream/75 italic leading-snug">«{affirm}»</p>
      </div>

      {/* дыхательный оверлей */}
      {breathing && (
        <div className="fixed inset-0 z-50 bg-night-950/90 flex flex-col items-center justify-center anim-fade" onClick={() => setBreathing(false)}>
          <p className="font-display text-xl font-bold text-butter mb-10 text-glow">{PHASE_LABEL[breathPhase]}</p>
          <div className="w-52 h-52 rounded-full border-4 border-mint/30 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full bg-mint/25 border border-mint/50"
              style={{ animation: `breatheCircle ${breathPhase === 'in' ? 4 : breathPhase === 'hold' ? 2 : 6}s ease-in-out both`, boxShadow: '0 0 60px rgba(159,232,201,0.35)' }} />
          </div>
          <p className="mt-10 text-sm font-bold text-cream/50">круг {Math.min(cycles + 1, 4)} из 4 · коснитесь, чтобы выйти</p>
        </div>
      )}
    </div>
  );
}
