/* ============================================================
 * Болталка: чат с памятью, дыхательная практика 4-2-6,
 * фокус-таймер и аффирмации.
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import { engine } from '../game/engine';
import { AFFIRMATIONS } from '../game/content';
import { sfx } from '../game/sound';
import Icon from './icons';

export default function ChatPanel({ state }: { state: GameState }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chat' | 'calm'>('chat');
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [cycles, setCycles] = useState(0);
  const [focusMin, setFocusMin] = useState<number | null>(null);
  const [focusLeft, setFocusLeft] = useState('');
  const [affirmation, setAffirmation] = useState(AFFIRMATIONS[0]);
  const logRef = useRef<HTMLDivElement>(null);

  const pet = state.pet!;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.chat.length]);

  /* дыхательная практика: вдох 4 — задержка 2 — выдох 6, 4 круга */
  useEffect(() => {
    if (!breathing) return;
    const order: { ph: 'in' | 'hold' | 'out'; ms: number }[] = [
      { ph: 'in', ms: 4000 }, { ph: 'hold', ms: 2000 }, { ph: 'out', ms: 6000 },
    ];
    let oi = 0, c = 0, timer: ReturnType<typeof setTimeout>;
    setBreathPhase('in'); setCycles(0); sfx.chime();
    const loopFn = () => {
      timer = setTimeout(() => {
        oi++;
        if (oi >= order.length) {
          oi = 0; c++;
          setCycles(c);
          if (c >= 4) {
            setBreathing(false);
            engine.setBubble('Вот это спокойствие! Я чуть не уснул от умиротворения.');
            engine.save();
            return;
          }
        }
        setBreathPhase(order[oi].ph);
        sfx.bubble();
        loopFn();
      }, order[oi].ms);
    };
    loopFn();
    return () => clearTimeout(timer);
  }, [breathing]);

  /* фокус-таймер */
  useEffect(() => {
    if (state.focusEndsAt == null) { setFocusMin(null); setFocusLeft(''); return; }
    setFocusMin(state.focusMinutes);
    const iv = setInterval(() => {
      const left = (state.focusEndsAt ?? Date.now()) - Date.now();
      if (left <= 0) { setFocusMin(null); setFocusLeft(''); return; }
      const m = Math.floor(left / 60000); const s = Math.floor((left % 60000) / 1000);
      setFocusLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }, 500);
    return () => clearInterval(iv);
  }, [state.focusEndsAt, state.focusMinutes]);

  /* «печатает…»: включаем при отправке, гасим, когда пришёл ответ питомца */
  const [typing, setTyping] = useState(false);
  const sentLen = useRef(state.chat.length);
  useEffect(() => {
    if (typing && state.chat.length > sentLen.current && state.chat[state.chat.length - 1].from === 'pet') {
      setTyping(false);
    }
  }, [state.chat, typing]);
  /* страховка: даже если ответ потерялся, точки гаснут максимум через 8 с */
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), 8000);
    return () => clearTimeout(t);
  }, [typing, state.chat.length]);

  const send = (raw?: string) => {
    const t = (raw ?? text).trim();
    if (!t) return;
    sentLen.current = state.chat.length;
    setTyping(true);
    engine.sendChat(t);
    setText('');
    sfx.tap();
  };

  const PHASE_LABEL = { in: 'Вдох… 4 счёта', hold: 'Задержите… 2 счёта', out: 'Выдох… 6 счётов' };

  return (
    <div className="card p-3.5 sm:p-4 anim-fade-up">
      {/* дыхательный оверлей */}
      {breathing && (
        <div className="fixed inset-0 z-50 bg-night-950/90 flex flex-col items-center justify-center anim-fade p-4" onClick={() => setBreathing(false)}>
          <p className="font-display text-lg sm:text-xl font-bold text-butter mb-6 sm:mb-10 text-glow text-center">{PHASE_LABEL[breathPhase]}</p>
          <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-full border-4 border-mint/30 flex items-center justify-center shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-mint/25 border border-mint/50"
              style={{ animation: `breatheCircle ${breathPhase === 'in' ? 4 : breathPhase === 'hold' ? 2 : 6}s ease-in-out both`, boxShadow: '0 0 60px rgba(159,232,201,0.35)' }} />
          </div>
          <p className="mt-6 sm:mt-10 text-xs sm:text-sm font-bold text-cream/50 text-center">круг {Math.min(cycles + 1, 4)} из 4 · коснитесь, чтобы выйти</p>
        </div>
      )}

      <div className="flex gap-1 mb-3 bg-night-900/50 rounded-2xl p-1 sm:p-1.5">
        <button onClick={() => setMode('chat')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${mode === 'chat' ? 'bg-night-700 text-butter' : 'text-cream/50'}`}>
          <Icon name="chat" className="w-4 h-4" />Болталка
        </button>
        <button onClick={() => setMode('calm')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${mode === 'calm' ? 'bg-night-700 text-mint' : 'text-cream/50'}`}>
          <Icon name="moon" className="w-4 h-4" />Тишина
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          <div ref={logRef} className="h-[38vh] overflow-y-auto no-scrollbar space-y-2 pr-1 mb-3">
            {state.chat.length === 0 && (
              <div className="card-soft p-4 text-center">
                <p className="text-[12.5px] font-bold text-cream/55 leading-relaxed">
                  {pet.name} умеет запоминать! Скажите:<br />
                  <span className="text-butter">«меня зовут …»</span> · <span className="text-mint">«я люблю …»</span> · <span className="text-sky">«запомни: …»</span>
                </p>
              </div>
            )}
            {state.chat.map(m => (
              <div key={m.id} className={`flex ${m.from === 'owner' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3.5 py-2.5 text-[12.5px] font-bold leading-snug anim-fade-up
                  ${m.from === 'owner' ? 'bg-sky/15 border border-sky/25 text-cream rounded-2xl rounded-br-md' : 'bg-night-700/80 border border-sky/10 text-cream/90 rounded-2xl rounded-bl-md'}`}>
                  {m.from === 'pet' && <span className="block text-[10px] font-black text-butter mb-0.5">{pet.name}</span>}
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-night-700/80 border border-sky/10 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center anim-fade-up">
                  <span className="w-2 h-2 rounded-full bg-butter anim-blink" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-butter anim-blink" style={{ animationDelay: '0.18s' }} />
                  <span className="w-2 h-2 rounded-full bg-butter anim-blink" style={{ animationDelay: '0.36s' }} />
                </div>
              </div>
            )}
          </div>

          {/* быстрые подсказки-вопросы */}
          {!pet.sleeping && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              {['Привет!', 'Как дела?', 'Что делал сегодня?', 'Кто ты?', 'Расскажи факт'].map(q => (
                <button key={q} onClick={() => send(q)}
                  className="chip !text-[10.5px] !py-1.5 hover:border-butter/50 hover:text-butter transition-all active:scale-95">
                  {q}
                </button>
              ))}
            </div>
          )}

          {pet.sleeping ? (
            <div className="flex items-center gap-2.5 card-soft px-3.5 py-3 text-sky/80">
              <Icon name="sleep" className="w-5 h-5 shrink-0" />
              <span className="text-[12.5px] font-bold leading-snug">
                {pet.name} спит и видит сны… Разбудите его, чтобы поболтать.
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className="input-soft flex-1 min-w-0" placeholder={`Напишите ${pet.name}…`} value={text}
                onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} maxLength={140} />
              <button className="btn btn-butter !px-4" onClick={() => send()} aria-label="Отправить"><Icon name="chat" className="w-5 h-5" /></button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <button onClick={() => { setBreathing(true); sfx.pop(); }}
            className="w-full card-soft p-4 text-left flex items-center gap-3 hover:border-mint/50 active:scale-[0.98] transition-all group">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-mint shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(159,232,201,0.1)' }}>
              <Icon name="moon" className="w-5.5 h-5.5" />
            </span>
            <span>
              <span className="font-display font-bold text-[13.5px] block">Подышать вместе</span>
              <span className="text-[10.5px] font-bold text-cream/45">4 круга: вдох 4 · задержка 2 · выдох 6</span>
            </span>
          </button>

          <div className="card-soft p-4">
            <div className="font-display font-bold text-[13.5px] mb-2 flex items-center gap-2"><Icon name="timer" className="w-4.5 h-4.5 text-sky" />Фокус-таймер</div>
            {focusMin != null ? (
              <div className="text-center py-2">
                <div className="font-display font-bold text-3xl text-butter tabular-nums text-glow">{focusLeft || '…'}</div>
                <p className="text-[11px] font-bold text-cream/45 mt-1">{pet.name} сидит тихо и занимается вместе с вами</p>
              </div>
            ) : (
              <div className="flex gap-2">
                {[5, 15, 25].map(m => (
                  <button key={m} className="btn btn-sky flex-1 !py-2 !text-xs" onClick={() => { engine.startFocus(m); sfx.pop(); }}>{m} мин</button>
                ))}
              </div>
            )}
          </div>

          <div className="card-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-display font-bold text-[13.5px] flex items-center gap-2"><Icon name="spark" className="w-4.5 h-4.5 text-butter" />Тёплые слова</div>
              <button className="btn btn-ghost !py-1.5 !px-3 !text-[10.5px]" onClick={() => { setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]); sfx.bubble(); }}>Ещё</button>
            </div>
            <p className="text-[13px] font-bold text-cream/80 leading-relaxed italic">«{affirmation}»</p>
          </div>
        </div>
      )}
    </div>
  );
}
