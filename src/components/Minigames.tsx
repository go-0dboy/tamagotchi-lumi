/* ============================================================
 * Мини-игры: «Звёздная память» (пары) и «Лови светлячков»
 * (реакция). Награды: искры, опыт, рост навыков.
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { engine } from '../game/engine';
import { sfx } from '../game/sound';
import Icon from './icons';

const SYMBOLS = ['star', 'moon', 'heart', 'drop', 'bolt', 'flower'];

export default function Minigames({ petName }: { petName: string }) {
  const [game, setGame] = useState<'hub' | 'memory' | 'firefly'>('hub');

  if (game === 'memory') return <MemoryGame onBack={() => setGame('hub')} petName={petName} />;
  if (game === 'firefly') return <FireflyGame onBack={() => setGame('hub')} petName={petName} />;

  return (
    <div className="card p-4 anim-fade-up space-y-3">
      <h3 className="font-display font-bold text-lg text-butter">Игровая поляна</h3>
      <p className="text-[12px] font-bold text-cream/50 -mt-1">Игры развивают навыки {petName} и приносят искры.</p>

      <button onClick={() => { setGame('memory'); sfx.pop(); }} className="w-full card-soft p-4 text-left hover:border-lilac/50 hover:-translate-y-0.5 transition-all active:scale-[0.98] group">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-lilac shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(200,182,255,0.12)' }}>
            <Icon name="brain" className="w-6 h-6" />
          </span>
          <div>
            <div className="font-display font-bold text-[15px]">Звёздная память</div>
            <div className="text-[11.5px] font-bold text-cream/45">Найдите 6 пар созвездий. Меньше ходов — больше искр. Качает интеллект.</div>
          </div>
        </div>
      </button>

      <button onClick={() => { setGame('firefly'); sfx.pop(); }} className="w-full card-soft p-4 text-left hover:border-butter/50 hover:-translate-y-0.5 transition-all active:scale-[0.98] group">
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-butter shrink-0 group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,217,142,0.12)' }}>
            <Icon name="spark" className="w-6 h-6" />
          </span>
          <div>
            <div className="font-display font-bold text-[15px]">Лови светлячков</div>
            <div className="text-[11.5px] font-bold text-cream/45">25 секунд, светлячки вспыхивают и гаснут. Качает спорт и реакцию.</div>
          </div>
        </div>
      </button>

      <div className="card-soft p-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-sky shrink-0" style={{ background: 'rgba(142,202,230,0.1)' }}>
          <Icon name="timer" className="w-5 h-5" />
        </span>
        <p className="text-[11.5px] font-bold text-cream/55 leading-snug">Тихие занятия — во вкладке «Болталка»: дыхательная практика и фокус-таймер для совместной учёбы.</p>
      </div>
    </div>
  );
}

/* ================= ЗВЁЗДНАЯ ПАМЯТЬ ================= */
interface Card { id: number; sym: string; flipped: boolean; matched: boolean; }

function MemoryGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const firstPick = useRef<number | null>(null);

  const reset = () => {
    const deck = [...SYMBOLS, ...SYMBOLS]
      .map((sym, i) => ({ id: i, sym, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(deck); setMoves(0); setResult(null); firstPick.current = null;
  };
  useEffect(reset, []);

  const flip = (id: number) => {
    if (lock || result !== null) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    sfx.tap();
    const next = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(next);

    if (firstPick.current === null) { firstPick.current = id; return; }
    const firstId = firstPick.current;
    firstPick.current = null;
    setMoves(m => m + 1);
    const a = next.find(c => c.id === firstId)!;
    setLock(true);
    setTimeout(() => {
      setCards(cs => {
        const upd = cs.map(c => {
          if (c.id === id || c.id === firstId) {
            if (a.sym === card.sym) return { ...c, matched: true };
            return { ...c, flipped: false };
          }
          return c;
        });
        if (a.sym === card.sym) sfx.sparkle(); else sfx.sad();
        if (upd.every(c => c.matched)) {
          const score = Math.max(8, 34 - (moves + 1) * 2);
          const reward = engine.finishMinigame('memory', score);
          setTimeout(() => setResult(reward), 400);
        }
        return upd;
      });
      setLock(false);
    }, 700);
  };

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip">ходы: {moves}</span>
        <span className="chip text-lilac">{cards.filter(c => c.matched).length / 2}/6</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(c => (
          <button key={c.id} onClick={() => flip(c.id)}
            className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-300 active:scale-90 ${c.matched ? 'border-mint/60 bg-mint/10 text-mint scale-95' : c.flipped ? 'border-lilac/70 bg-night-700 text-butter' : 'border-sky/15 bg-night-800 text-transparent hover:border-sky/40'}`}>
            <Icon name={c.sym} className={`w-7 h-7 ${c.flipped || c.matched ? 'anim-pop' : ''}`} />
          </button>
        ))}
      </div>
      {result !== null && (
        <div className="mt-4 card-soft p-4 text-center anim-pop">
          <div className="font-display font-bold text-butter text-lg">Все пары найдены!</div>
          <p className="text-[12px] font-bold text-cream/60 mt-1">{petName} в восторге! Награда: +{result} искр, +интеллект.</p>
          <div className="flex gap-2 mt-3 justify-center">
            <button className="btn btn-lilac !py-2 !text-xs" onClick={reset}>Ещё раз</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= ЛОВИ СВЕТЛЯЧКОВ ================= */
interface Fly { id: number; x: number; y: number; }

function FireflyGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [playing, setPlaying] = useState(false);
  const [flies, setFlies] = useState<Fly[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(25);
  const [result, setResult] = useState<number | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const spawn = setInterval(() => {
      const id = ++idRef.current;
      setFlies(fs => [...fs.slice(-5), { id, x: 8 + Math.random() * 80, y: 12 + Math.random() * 68 }]);
      setTimeout(() => setFlies(fs => fs.filter(f => f.id !== id)), 1250);
    }, 640);
    const tick = setInterval(() => {
      setLeft(l => {
        if (l <= 0.1) {
          setPlaying(false);
          return 0;
        }
        return l - 0.1;
      });
    }, 100);
    return () => { clearInterval(spawn); clearInterval(tick); };
  }, [playing]);

  useEffect(() => {
    if (!playing && left === 0 && result === null && score >= 0 && idRef.current > 0) {
      const reward = engine.finishMinigame('firefly', Math.max(8, score * 2));
      setResult(reward);
    }
  }, [playing, left]); // eslint-disable-line

  const catchFly = (id: number) => {
    setFlies(fs => fs.filter(f => f.id !== id));
    setScore(s => s + 1);
    sfx.sparkle();
  };

  const start = () => { setScore(0); setLeft(25); setFlies([]); setResult(null); idRef.current = 0; setPlaying(true); sfx.pop(); };

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip text-butter">поймано: {score}</span>
        <span className="chip tabular-nums">{playing ? `${Math.ceil(left)} с` : '25 с'}</span>
      </div>

      <div className="relative h-72 rounded-2xl overflow-hidden border border-sky/15" style={{ background: 'radial-gradient(ellipse at 50% 120%, #1c2a52 0%, #0c1220 70%)' }}>
        {!playing && result === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-[13px] font-bold text-cream/60 text-center px-6">Ловите светлячков, пока они светятся!<br />{petName} будет болеть за вас.</p>
            <button className="btn btn-butter" onClick={start}><Icon name="spark" className="w-5 h-5" />Начать</button>
          </div>
        )}
        {playing && flies.map(f => (
          <button key={f.id} onPointerDown={() => catchFly(f.id)}
            className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full anim-pop"
            style={{ left: `${f.x}%`, top: `${f.y}%` }} aria-label="Светлячок">
            <span className="absolute inset-1.5 rounded-full" style={{ background: '#ffd98e', boxShadow: '0 0 18px 6px rgba(255,217,142,0.6)', animation: 'pulseSoft 0.9s ease-in-out infinite' }} />
          </button>
        ))}
        {result !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-night-950/70 anim-fade">
            <div className="card p-5 text-center max-w-[260px] anim-pop">
              <div className="font-display font-bold text-butter text-lg">Поймано: {score}!</div>
              <p className="text-[12px] font-bold text-cream/60 mt-1">Награда: +{result} искр, +спорт. {petName} прыгает от радости.</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button className="btn btn-butter !py-2 !text-xs" onClick={start}>Ещё раз</button>
                <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
