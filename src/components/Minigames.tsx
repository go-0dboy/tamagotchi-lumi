/* ============================================================
 * Мини-игры (6 штук):
 *  1. «Звёздная память» — пары (интеллект)
 *  2. «Лови светлячков» — реакция (спорт)
 *  3. «Эхо-мелодия» — Simon с нотами (творчество)
 *  4. «Виселица» — классическое отгадывание по буквам
 *  5. «Звёздные пятнашки» — головоломка
 *  6. «Судоку» — 4 сложности, единственное решение
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { engine } from '../game/engine';
import { sfx } from '../game/sound';
import { WORDS } from '../game/speech';
import Icon from './icons';

type GameKey = 'hub' | 'memory' | 'firefly' | 'echo' | 'hangman' | 'puzzle' | 'sudoku';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function Minigames({ petName }: { petName: string }) {
  const [game, setGame] = useState<GameKey>('hub');
  const back = () => setGame('hub');

  if (game === 'memory') return <MemoryGame onBack={back} petName={petName} />;
  if (game === 'firefly') return <FireflyGame onBack={back} petName={petName} />;
  if (game === 'echo') return <EchoGame onBack={back} petName={petName} />;
  if (game === 'hangman') return <HangmanGame onBack={back} petName={petName} />;
  if (game === 'puzzle') return <PuzzleGame onBack={back} petName={petName} />;
  if (game === 'sudoku') return <SudokuGame onBack={back} petName={petName} />;

  const CARDS: { key: GameKey; icon: string; color: string; title: string; desc: string }[] = [
    { key: 'memory', icon: 'brain', color: '#c8b6ff', title: 'Звёздная память', desc: '6 пар созвездий. Качает интеллект.' },
    { key: 'firefly', icon: 'spark', color: '#ffd98e', title: 'Лови светлячков', desc: '25 секунд чистой реакции. Спорт.' },
    { key: 'echo', icon: 'musicbox', color: '#9fe8c9', title: 'Эхо-мелодия', desc: 'Повторите песенку. Творчество.' },
    { key: 'hangman', icon: 'book', color: '#8ecae6', title: 'Виселица', desc: 'Отгадайте слово по буквам. 48 слов.' },
    { key: 'puzzle', icon: 'grid', color: '#ffaec9', title: 'Звёздные пятнашки', desc: 'Соберите небо по кусочкам.' },
    { key: 'sudoku', icon: 'diary', color: '#ffb49b', title: 'Судоку', desc: '4 сложности, всегда одно решение.' },
  ];

  return (
    <div className="card p-4 anim-fade-up space-y-3">
      <h3 className="font-display font-bold text-lg text-butter">Игровая поляна</h3>
      <p className="text-[12px] font-bold text-cream/50 -mt-1">Игры развивают навыки {petName} и приносят искры.</p>

      <div className="grid grid-cols-2 gap-2.5">
        {CARDS.map(c => (
          <button key={c.key} onClick={() => { setGame(c.key); sfx.pop(); }}
            className="card-soft p-3.5 text-left hover:-translate-y-0.5 transition-all active:scale-[0.97] group">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mb-2 group-hover:scale-110 transition-transform"
              style={{ background: `${c.color}1f`, color: c.color }}>
              <Icon name={c.icon} className="w-5.5 h-5.5" />
            </span>
            <div className="font-display font-bold text-[13.5px] leading-tight">{c.title}</div>
            <div className="text-[10.5px] font-bold text-cream/45 leading-snug mt-0.5">{c.desc}</div>
          </button>
        ))}
      </div>

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
const SYMBOLS = ['star', 'moon', 'heart', 'drop', 'bolt', 'flower'];
interface MCard { id: number; sym: string; flipped: boolean; matched: boolean; }

function MemoryGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [cards, setCards] = useState<MCard[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const firstPick = useRef<number | null>(null);

  const reset = () => {
    const deck = shuffle([...SYMBOLS, ...SYMBOLS]).map((sym, i) => ({ id: i, sym, flipped: false, matched: false }));
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
        if (l <= 0.1) { setPlaying(false); return 0; }
        return l - 0.1;
      });
    }, 100);
    return () => { clearInterval(spawn); clearInterval(tick); };
  }, [playing]);

  useEffect(() => {
    if (!playing && left === 0 && result === null && idRef.current > 0) {
      setResult(engine.finishMinigame('firefly', Math.max(8, score * 2)));
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

/* ================= ЭХО-МЕЛОДИЯ (Simon) ================= */
const PAD_COLORS = ['#ff8f7d', '#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9', '#f4c266', '#a992f0'];

function EchoGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'over'>('idle');
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<number | null>(null);
  const seq = useRef<number[]>([]);
  const inputIdx = useRef(0);
  const scoreRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const playSeq = (s: number[]) => {
    setPhase('show');
    s.forEach((n, i) => {
      timers.current.push(setTimeout(() => {
        setActive(n); sfx.note(n);
        timers.current.push(setTimeout(() => setActive(-1), 330));
      }, 500 + i * 620));
    });
    timers.current.push(setTimeout(() => { setPhase('input'); inputIdx.current = 0; }, 500 + s.length * 620));
  };

  const nextRound = () => {
    seq.current = [...seq.current, Math.floor(Math.random() * 8)];
    playSeq(seq.current);
  };

  const start = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    seq.current = []; scoreRef.current = 0; setResult(null); sfx.pop();
    nextRound();
  };

  const press = (n: number) => {
    if (phase !== 'input') return;
    sfx.note(n); setActive(n);
    timers.current.push(setTimeout(() => setActive(-1), 200));
    if (n === seq.current[inputIdx.current]) {
      inputIdx.current++;
      if (inputIdx.current === seq.current.length) {
        scoreRef.current += seq.current.length;
        timers.current.push(setTimeout(nextRound, 800));
      }
    } else {
      setPhase('over');
      sfx.sad();
      timers.current.push(setTimeout(() => setResult(engine.finishMinigame('echo', Math.max(8, scoreRef.current * 2))), 500));
    }
  };

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip text-mint">нот сыграно: {scoreRef.current}</span>
        <span className="chip">{phase === 'show' ? 'слушайте…' : phase === 'input' ? 'ваш ход!' : '—'}</span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 gap-2.5">
          {PAD_COLORS.map((col, i) => (
            <button key={i} onPointerDown={() => press(i)}
              className="aspect-square rounded-2xl border-2 transition-all duration-150 active:scale-90"
              style={{
                background: active === i ? col : `${col}26`,
                borderColor: active === i ? col : `${col}55`,
                boxShadow: active === i ? `0 0 22px ${col}99` : 'none',
                transform: active === i ? 'scale(1.06)' : undefined,
              }}
              aria-label={`Нота ${i + 1}`} />
          ))}
        </div>

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-night-950/80 anim-fade">
            <p className="text-[13px] font-bold text-cream/65 text-center px-8">Питомец напевает мелодию — повторите её по нотам. С каждым кругом длиннее!</p>
            <button className="btn btn-mint" onClick={start}><Icon name="musicbox" className="w-5 h-5" />Начать</button>
          </div>
        )}
        {result !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-night-950/80 anim-fade">
            <div className="card p-5 text-center max-w-[270px] anim-pop">
              <div className="font-display font-bold text-butter text-lg">Мелодия на {scoreRef.current} нот!</div>
              <p className="text-[12px] font-bold text-cream/60 mt-1">Награда: +{result} искр, +творчество. {petName} подпевает.</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button className="btn btn-mint !py-2 !text-xs" onClick={start}>Ещё раз</button>
                <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= ВИСЕЛЬНИК (классика) ================= */
const ALPHABET = 'абвгдежзиклмнопрстуфхцчшщъыьэюя'.split('');
const MAX_ERRORS = 7;

function HangmanGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [reward, setReward] = useState(0);

  const newGame = () => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuessed(new Set()); setErrors(0); setResult(null); setReward(0);
  };

  const guess = (ch: string) => {
    if (result || guessed.has(ch)) return;
    const g = new Set(guessed); g.add(ch);
    setGuessed(g);
    if (word.includes(ch)) {
      sfx.tap();
      const won = word.split('').every(c => g.has(c));
      if (won) {
        sfx.levelup();
        const sc = Math.max(10, (MAX_ERRORS - errors) * 6 + word.length * 2);
        setReward(engine.finishMinigame('hangman', sc));
        setResult('win');
      }
    } else {
      sfx.sad();
      const e = errors + 1;
      setErrors(e);
      if (e >= MAX_ERRORS) {
        setResult('lose');
        engine.setBubble(`Ох… это было слово «${word}». Запомнил! В следующий раз отгадаем вместе.`);
        engine.save();
      }
    }
  };

  /* рисунок виселицы: появляется по частям */
  const parts = [
    <line key="p1" x1="20" y1="150" x2="90" y2="150" />,
    <line key="p2" x1="40" y1="150" x2="40" y2="20" />,
    <line key="p3" x1="40" y1="20" x2="105" y2="20" />,
    <line key="p4" x1="105" y1="20" x2="105" y2="38" />,
    <circle key="p5" cx="105" cy="50" r="12" />,
    <g key="p6"><line x1="105" y1="62" x2="105" y2="98" /><line x1="105" y1="70" x2="90" y2="84" /><line x1="105" y1="70" x2="120" y2="84" /></g>,
    <g key="p7"><line x1="105" y1="98" x2="92" y2="118" /><line x1="105" y1="98" x2="118" y2="118" /></g>,
  ];

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip">{petName} загадал слово</span>
        <span className={`chip ${errors >= 5 ? 'text-ember' : 'text-mint'}`}>ошибки: {errors}/{MAX_ERRORS}</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <svg viewBox="0 0 140 160" className="w-24 sm:w-32 shrink-0" fill="none" stroke="#8ecae6" strokeWidth="4" strokeLinecap="round">
          {parts.slice(0, errors)}
          {result === 'lose' && (
            <g stroke="#ffaec9" strokeWidth="3">
              <path d="M99 46 l4 4 M103 46 l-4 4" /><path d="M107 46 l4 4 M111 46 l-4 4" />
            </g>
          )}
          {result === 'win' && (
            <g stroke="#9fe8c9" strokeWidth="3" fill="none">
              <path d="M98 48 q3 3 6 0" /><path d="M106 48 q3 3 6 0" />
            </g>
          )}
        </svg>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
            {word.split('').map((ch, i) => (
              <span key={i}
                className={`w-7 h-9 sm:w-8 sm:h-10 rounded-lg border-b-4 flex items-center justify-center font-display font-bold text-lg
                ${guessed.has(ch) || result === 'lose' ? 'border-mint/60 text-cream' : 'border-sky/25 text-transparent'}`}>
                {guessed.has(ch) || result === 'lose' ? ch : '_'}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-bold text-cream/40 mt-2 text-center sm:text-left">
            {result === 'lose' ? `Это было «${word}». Ничего, в словаре ${petName} теперь на одно слово больше!`
              : `${MAX_ERRORS - errors} жизней у ${petName}. Он верит в вас!`}
          </p>
        </div>
      </div>

      {!result && (
        <div className="grid grid-cols-8 sm:grid-cols-11 gap-1 mt-4">
          {ALPHABET.map(ch => {
            const used = guessed.has(ch);
            const hit = used && word.includes(ch);
            return (
              <button key={ch} onClick={() => guess(ch)} disabled={used}
                className={`aspect-square rounded-lg text-[13px] font-extrabold uppercase border transition-all active:scale-90
                ${used ? (hit ? 'border-mint/50 bg-mint/15 text-mint' : 'border-ember/30 bg-ember/10 text-ember/60') : 'card-soft hover:border-sky/50 text-cream/85'}`}>
                {ch}
              </button>
            );
          })}
        </div>
      )}

      {result && (
        <div className="card-soft p-4 mt-4 text-center anim-pop">
          <div className={`font-display font-bold text-lg ${result === 'win' ? 'text-mint' : 'text-ember'}`}>
            {result === 'win' ? `Отгадано: «${word}»!` : `Не угадали… «${word}»`}
          </div>
          <p className="text-[12px] font-bold text-cream/60 mt-1">
            {result === 'win' ? `Награда: +${reward} искр, +интеллект. ${petName} хлопает лапками!` : `${petName} записал слово в блокнотик. Попробуем ещё?`}
          </p>
          <div className="flex gap-2 mt-3 justify-center">
            <button className="btn btn-sky !py-2 !text-xs" onClick={newGame}>Новое слово</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= ЗВЁЗДНЫЕ ПЯТНАШКИ ================= */
const TILE_COLORS = ['#ff8f7d', '#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9'];

function PuzzleGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [tiles, setTiles] = useState<number[]>(() => scramble());
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  function scramble(): number[] {
    const t = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
    let empty = 15;
    for (let i = 0; i < 200; i++) {
      const neighbors = [empty - 1, empty + 1, empty - 4, empty + 4].filter(n =>
        n >= 0 && n < 16 && !(empty % 4 === 0 && n === empty - 1) && !(empty % 4 === 3 && n === empty + 1));
      const n = neighbors[Math.floor(Math.random() * neighbors.length)];
      [t[empty], t[n]] = [t[n], t[empty]];
      empty = n;
    }
    return t;
  }

  const click = (i: number) => {
    if (result !== null) return;
    const e = tiles.indexOf(0);
    const adjacent = (Math.abs(i - e) === 1 && Math.floor(i / 4) === Math.floor(e / 4)) || Math.abs(i - e) === 4;
    if (!adjacent) return;
    sfx.tap();
    const next = [...tiles];
    [next[i], next[e]] = [next[e], next[i]];
    setTiles(next);
    setMoves(m => m + 1);
    if (next.every((v, k) => v === (k + 1) % 16)) {
      sfx.levelup();
      setResult(engine.finishMinigame('puzzle', Math.max(10, 60 - moves)));
    }
  };

  const reset = () => { setTiles(scramble()); setMoves(0); setResult(null); };

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <span className="chip">ходы: {moves}</span>
        <button className="btn btn-lilac !py-2 !px-3 !text-xs" onClick={reset}>Заново</button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-w-[320px] mx-auto">
        {tiles.map((v, i) => (
          <button key={i} onClick={() => click(i)} disabled={v === 0}
            className={`aspect-square rounded-xl font-display font-bold text-xl transition-all active:scale-90 ${v === 0 ? 'bg-transparent' : 'border border-sky/15 hover:-translate-y-0.5'}`}
            style={v === 0 ? undefined : { background: 'rgba(26,37,68,0.8)', color: TILE_COLORS[(v - 1) % TILE_COLORS.length] }}>
            {v === 0 ? '' : v}
          </button>
        ))}
      </div>
      {result !== null && (
        <div className="mt-4 card-soft p-4 text-center anim-pop">
          <div className="font-display font-bold text-butter text-lg">Небо собрано за {moves} ходов!</div>
          <p className="text-[12px] font-bold text-cream/60 mt-1">Награда: +{result} искр, +интеллект. {petName} аплодирует лапками.</p>
          <div className="flex gap-2 mt-3 justify-center">
            <button className="btn btn-lilac !py-2 !text-xs" onClick={reset}>Ещё раз</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= СУДОКУ (единственное решение) ================= */
const DIFFS = [
  { id: 'easy', label: 'Лёгкий', holes: 30, reward: 40 },
  { id: 'medium', label: 'Средний', holes: 40, reward: 30 },
  { id: 'hard', label: 'Сложный', holes: 48, reward: 22 },
  { id: 'expert', label: 'Эксперт', holes: 54, reward: 16 },
];

function rowOf(i: number) { return Math.floor(i / 9); }
function colOf(i: number) { return i % 9; }
function boxOf(i: number) { return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3); }

function validPos(grid: number[], i: number, n: number): boolean {
  for (let k = 0; k < 9; k++) {
    if (grid[rowOf(i) * 9 + k] === n) return false;
    if (grid[k * 9 + colOf(i)] === n) return false;
  }
  const br = Math.floor(rowOf(i) / 3) * 3, bc = Math.floor(colOf(i) / 3) * 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (grid[(br + r) * 9 + bc + c] === n) return false;
  }
  return true;
}

function fillGrid(grid: number[], pos: number): boolean {
  if (pos === 81) return true;
  if (grid[pos] !== 0) return fillGrid(grid, pos + 1);
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const n of nums) {
    if (validPos(grid, pos, n)) {
      grid[pos] = n;
      if (fillGrid(grid, pos + 1)) return true;
      grid[pos] = 0;
    }
  }
  return false;
}

function countSolutions(grid: number[]): number {
  const i = grid.indexOf(0);
  if (i === -1) return 1;
  let total = 0;
  for (let n = 1; n <= 9; n++) {
    if (validPos(grid, i, n)) {
      grid[i] = n;
      total += countSolutions(grid);
      grid[i] = 0;
      if (total >= 2) return total;
    }
  }
  return total;
}

function generateSudoku(holes: number): { puzzle: number[]; solution: number[] } {
  const solution = new Array(81).fill(0);
  fillGrid(solution, 0);
  const puzzle = [...solution];
  let made = 0;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (made >= holes) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions([...puzzle]) !== 1) puzzle[i] = backup;
    else made++;
  }
  return { puzzle, solution };
}

function SudokuGame({ onBack, petName }: { onBack: () => void; petName: string }) {
  const [diff, setDiff] = useState(DIFFS[1]);
  const [gen, setGen] = useState(() => generateSudoku(DIFFS[1].holes));
  const [cells, setCells] = useState<number[]>(() => [...gen.puzzle]);
  const [sel, setSel] = useState<number | null>(null);
  const [hints, setHints] = useState(3);
  const [result, setResult] = useState<number | null>(null);
  const givens = gen.puzzle.map(v => v !== 0);

  const newGame = (d = diff) => {
    const g = generateSudoku(d.holes);
    setDiff(d); setGen(g); setCells([...g.puzzle]); setSel(null); setHints(3); setResult(null);
    sfx.pop();
  };

  const conflict = (i: number): boolean => {
    const v = cells[i];
    if (!v) return false;
    for (let k = 0; k < 81; k++) {
      if (k !== i && cells[k] === v && (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i))) return true;
    }
    return false;
  };

  const setValue = (v: number) => {
    if (sel === null || givens[sel] || result !== null) return;
    const next = [...cells];
    next[sel] = v;
    setCells(next);
    sfx.tap();
    if (v !== 0 && next.every(x => x !== 0) && !next.some((_, k) => conflict(k))) {
      sfx.levelup();
      setResult(engine.finishMinigame('sudoku', diff.reward));
    }
  };

  const hint = () => {
    if (hints <= 0 || sel === null || givens[sel] || result !== null) return;
    const next = [...cells];
    next[sel] = gen.solution[sel];
    setCells(next);
    setHints(h => h - 1);
    sfx.sparkle();
    if (next.every(x => x !== 0) && !next.some((_, k) => conflict(k))) {
      sfx.levelup();
      setResult(engine.finishMinigame('sudoku', Math.round(diff.reward / 2)));
    }
  };

  return (
    <div className="card p-3.5 sm:p-4 anim-fade-up">
      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
        <div className="flex gap-1 flex-wrap">
          {DIFFS.map(d => (
            <button key={d.id} onClick={() => newGame(d)}
              className={`chip !text-[10px] !py-1.5 transition-all ${d.id === diff.id ? '!border-peach/60 text-peach' : 'hover:border-sky/40'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-9 gap-0 max-w-[340px] mx-auto rounded-xl overflow-hidden border-2 border-sky/30">
          {cells.map((v, i) => {
            const r = rowOf(i), c = colOf(i);
            const given = givens[i];
            const bad = !given && conflict(i);
            const isSel = sel === i;
            const sameValue = sel !== null && v !== 0 && v === cells[sel];
            return (
              <button key={i} onClick={() => { setSel(i); sfx.tap(); }}
                className={`aspect-square text-[13px] sm:text-[15px] font-display font-bold transition-colors
                  ${isSel ? 'bg-lilac/30' : sameValue ? 'bg-sky/15' : 'bg-night-800/80'}
                  ${bad ? 'text-ember bg-ember/10' : given ? 'text-butter' : 'text-cream/90'}`}
                style={{
                  borderRight: c === 8 ? 'none' : c % 3 === 2 ? '1.5px solid rgba(142,202,230,0.4)' : '1px solid rgba(142,202,230,0.12)',
                  borderBottom: r === 8 ? 'none' : r % 3 === 2 ? '1.5px solid rgba(142,202,230,0.4)' : '1px solid rgba(142,202,230,0.12)',
                }}>
                {v || ''}
              </button>
            );
          })}
        </div>

        {result !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-night-950/85 anim-fade">
            <div className="card p-5 text-center max-w-[270px] anim-pop">
              <div className="font-display font-bold text-butter text-lg">Решено! {diff.label}</div>
              <p className="text-[12px] font-bold text-cream/60 mt-1">Награда: +{result} искр, +интеллект. {petName} в восхищении!</p>
              <div className="flex gap-2 mt-3 justify-center">
                <button className="btn btn-butter !py-2 !text-xs" onClick={() => newGame()}>Новое поле</button>
                <button className="btn btn-ghost !py-2 !text-xs" onClick={onBack}>Выйти</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-10 gap-1 max-w-[340px] mx-auto mt-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => setValue(n)}
            className="aspect-square rounded-lg card-soft font-display font-bold text-[15px] text-sky hover:border-sky/50 transition-all active:scale-90">
            {n}
          </button>
        ))}
        <button onClick={() => setValue(0)} aria-label="Стереть"
          className="aspect-square rounded-lg card-soft flex items-center justify-center text-cream/60 hover:border-ember/50 transition-all active:scale-90">
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3">
        <button className="btn btn-lilac !py-2 !px-3 !text-xs" onClick={hint} disabled={hints <= 0}>
          <Icon name="spark" className="w-3.5 h-3.5" />Подсказка ({hints})
        </button>
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={() => newGame()}>Новое поле</button>
      </div>
      <p className="text-[10.5px] font-bold text-cream/35 text-center mt-2">Каждое поле генерируется случайно и имеет ровно одно решение.</p>
    </div>
  );
}
