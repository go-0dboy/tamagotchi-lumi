/* Мини-игры: память, светлячки, эхо, виселица, пятнашки, судоку. */
import { useEffect, useRef, useState } from 'react';
import { engine } from '../game/engine';
import { WORDS } from '../game/speech';
import { sfx } from '../game/core';
import Icon from './icons';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const Result = ({ title, reward, petName, onAgain, onExit }: { title: string; reward: number; petName: string; onAgain: () => void; onExit: () => void }) => (
  <div className="card-soft p-5 text-center anim-pop mt-3">
    <div className="font-display font-bold text-butter text-lg">{title}</div>
    <p className="text-[12px] font-bold text-cream/60 mt-1">Награда: +{reward} искр. {petName} в восторге!</p>
    <div className="flex gap-2 mt-3 justify-center">
      <button className="btn btn-butter !py-2 !text-xs" onClick={onAgain}>Ещё раз</button>
      <button className="btn btn-ghost !py-2 !text-xs" onClick={onExit}>Выйти</button>
    </div>
  </div>
);
const Head = ({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-3 gap-2">
    <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={onBack}>Назад</button>
    {right}
  </div>
);

export default function Minigame({ game, petName, onExit }: { game: string; petName: string; onExit: () => void }) {
  if (game === 'memory') return <div className="card p-4 anim-fade-up"><Memory petName={petName} onExit={onExit} /></div>;
  if (game === 'firefly') return <div className="card p-4 anim-fade-up"><Firefly petName={petName} onExit={onExit} /></div>;
  if (game === 'echo') return <div className="card p-4 anim-fade-up"><Echo petName={petName} onExit={onExit} /></div>;
  if (game === 'hangman') return <div className="card p-4 anim-fade-up"><Hangman petName={petName} onExit={onExit} /></div>;
  if (game === 'puzzle') return <div className="card p-4 anim-fade-up"><Puzzle petName={petName} onExit={onExit} /></div>;
  if (game === 'sudoku') return <div className="card p-4 anim-fade-up"><Sudoku petName={petName} onExit={onExit} /></div>;
  return null;
}

/* ---------- память ---------- */
const SYMBOLS = ['star', 'moon', 'heart', 'drop', 'bolt', 'flower'];
function Memory({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [cards, setCards] = useState(() => shuffle([...SYMBOLS, ...SYMBOLS].map((sym, i) => ({ id: i, sym, flipped: false, matched: false }))));
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const first = useRef<number | null>(null);

  const flip = (id: number) => {
    if (lock || result !== null) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    sfx.tap();
    const next = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(next);
    if (first.current === null) { first.current = id; return; }
    const fid = first.current; first.current = null;
    setMoves(m => m + 1);
    const a = next.find(c => c.id === fid)!;
    setLock(true);
    setTimeout(() => {
      setCards(cs => {
        const upd = cs.map(c => {
          if (c.id === id || c.id === fid) return a.sym === card.sym ? { ...c, matched: true } : { ...c, flipped: false };
          return c;
        });
        if (a.sym === card.sym) sfx.sparkle(); else sfx.sad();
        if (upd.every(c => c.matched)) setTimeout(() => setResult(engine.finishMinigame('memory', Math.max(8, 34 - (moves + 1) * 2))), 400);
        return upd;
      });
      setLock(false);
    }, 700);
  };
  return (
    <div>
      <Head onBack={onExit} right={<><span className="chip">ходы: {moves}</span><span className="chip text-lilac">{cards.filter(c => c.matched).length / 2}/6</span></>} />
      <div className="grid grid-cols-4 gap-2">
        {cards.map(c => (
          <button key={c.id} onClick={() => flip(c.id)}
            className={`aspect-square rounded-2xl flex items-center justify-center border-2 transition-all ${c.matched ? 'border-mint/60 bg-mint/10 text-mint' : c.flipped ? 'border-lilac/70 bg-night-700 text-butter' : 'border-sky/15 bg-night-800 text-transparent hover:border-sky/40'}`}>
            <Icon name={c.sym} className="w-7 h-7" />
          </button>
        ))}
      </div>
      {result !== null && <Result title="Все пары найдены!" reward={result} petName={petName} onAgain={() => { setCards(shuffle([...SYMBOLS, ...SYMBOLS].map((sym, i) => ({ id: i, sym, flipped: false, matched: false })))); setMoves(0); setResult(null); }} onExit={onExit} />}
    </div>
  );
}

/* ---------- светлячки ---------- */
function Firefly({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [flies, setFlies] = useState<{ id: number; x: number; y: number }[]>([]);
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
    const tick = setInterval(() => setLeft(l => { if (l <= 0.1) { setPlaying(false); return 0; } return l - 0.1; }), 100);
    return () => { clearInterval(spawn); clearInterval(tick); };
  }, [playing]);
  useEffect(() => {
    if (!playing && left === 0 && result === null && idRef.current > 0) setResult(engine.finishMinigame('firefly', Math.max(8, score * 2)));
  }, [playing, left]); // eslint-disable-line

  const start = () => { setScore(0); setLeft(25); setFlies([]); setResult(null); idRef.current = 0; setPlaying(true); sfx.pop(); };
  return (
    <div>
      <Head onBack={onExit} right={<><span className="chip text-butter">поймано: {score}</span><span className="chip tabular-nums">{playing ? `${Math.ceil(left)} с` : '25 с'}</span></>} />
      <div className="relative h-64 rounded-2xl overflow-hidden border border-sky/15" style={{ background: 'radial-gradient(ellipse at 50% 120%, #1c2a52 0%, #0c1220 70%)' }}>
        {!playing && result === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-[13px] font-bold text-cream/60 text-center px-6">Ловите светлячков, пока они светятся!</p>
            <button className="btn btn-butter" onClick={start}><Icon name="spark" className="w-5 h-5" />Начать</button>
          </div>
        )}
        {playing && flies.map(f => (
          <button key={f.id} onPointerDown={() => { setFlies(fs => fs.filter(x => x.id !== f.id)); setScore(s => s + 1); sfx.sparkle(); }}
            className="absolute w-10 h-10 -ml-5 -mt-5" style={{ left: `${f.x}%`, top: `${f.y}%` }} aria-label="Светлячок">
            <span className="absolute inset-1.5 rounded-full" style={{ background: '#ffd98e', boxShadow: '0 0 18px 6px rgba(255,217,142,0.6)', animation: 'pulseSoft 0.9s ease-in-out infinite' }} />
          </button>
        ))}
        {result !== null && <div className="absolute inset-0 flex items-center justify-center bg-night-950/70 anim-fade"><div className="w-full px-4"><Result title={`Поймано: ${score}!`} reward={result} petName={petName} onAgain={start} onExit={onExit} /></div></div>}
      </div>
    </div>
  );
}

/* ---------- эхо (Simon) ---------- */
const PAD_COLORS = ['#ff8f7d', '#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9', '#f4c266', '#a992f0'];
function Echo({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'over'>('idle');
  const [active, setActive] = useState(-1);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const seq = useRef<number[]>([]);
  const idx = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const playSeq = (s: number[]) => {
    setPhase('show');
    s.forEach((n, i) => {
      timers.current.push(setTimeout(() => { setActive(n); sfx.note(n); timers.current.push(setTimeout(() => setActive(-1), 330)); }, 500 + i * 620));
    });
    timers.current.push(setTimeout(() => { setPhase('input'); idx.current = 0; }, 500 + s.length * 620));
  };
  const start = () => { timers.current.forEach(clearTimeout); timers.current = []; seq.current = []; setScore(0); setResult(null); sfx.pop(); seq.current = [Math.floor(Math.random() * 8)]; playSeq(seq.current); };
  const press = (n: number) => {
    if (phase !== 'input') return;
    sfx.note(n); setActive(n); timers.current.push(setTimeout(() => setActive(-1), 200));
    if (n === seq.current[idx.current]) {
      idx.current++;
      if (idx.current === seq.current.length) {
        setScore(s => s + seq.current.length);
        timers.current.push(setTimeout(() => { seq.current = [...seq.current, Math.floor(Math.random() * 8)]; playSeq(seq.current); }, 800));
      }
    } else {
      setPhase('over'); sfx.sad();
      const sc = score;
      timers.current.push(setTimeout(() => setResult(engine.finishMinigame('echo', Math.max(8, sc * 2))), 500));
    }
  };
  return (
    <div>
      <Head onBack={onExit} right={<><span className="chip text-mint">нот: {score}</span><span className="chip">{phase === 'show' ? 'слушайте…' : phase === 'input' ? 'ваш ход!' : '—'}</span></>} />
      <div className="relative">
        <div className="grid grid-cols-4 gap-2.5">
          {PAD_COLORS.map((col, i) => (
            <button key={i} onPointerDown={() => press(i)} className="aspect-square rounded-2xl border-2 transition-all"
              style={{ background: active === i ? col : `${col}26`, borderColor: active === i ? col : `${col}55`, boxShadow: active === i ? `0 0 22px ${col}99` : 'none', transform: active === i ? 'scale(1.06)' : undefined }} aria-label={`Нота ${i + 1}`} />
          ))}
        </div>
        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-night-950/80 anim-fade">
            <p className="text-[13px] font-bold text-cream/65 text-center px-8">Питомец напевает — повторите по нотам!</p>
            <button className="btn btn-mint" onClick={start}><Icon name="musicbox" className="w-5 h-5" />Начать</button>
          </div>
        )}
        {result !== null && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-night-950/80 anim-fade"><div className="w-full px-4"><Result title={`Мелодия на ${score} нот!`} reward={result} petName={petName} onAgain={start} onExit={onExit} /></div></div>}
      </div>
    </div>
  );
}

/* ---------- виселица ---------- */
const RU = 'абвгдежзиклмнопрстуфхцчшщъыьэюя'.split('');
function Hangman({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [reward, setReward] = useState(0);
  const MAX = 7;

  const pickLetter = (l: string) => {
    if (result || guessed.has(l)) return;
    sfx.tap();
    const g = new Set(guessed); g.add(l); setGuessed(g);
    if (word.includes(l)) {
      sfx.sparkle();
      if ([...word].every(ch => g.has(ch))) {
        setResult('win');
        setReward(engine.finishMinigame('hangman', Math.max(10, 40 - wrong * 4)));
      }
    } else {
      sfx.sad();
      const w = wrong + 1; setWrong(w);
      if (w >= MAX) setResult('lose');
    }
  };
  const restart = () => { setWord(WORDS[Math.floor(Math.random() * WORDS.length)]); setGuessed(new Set()); setWrong(0); setResult(null); setReward(0); };

  return (
    <div>
      <Head onBack={onExit} right={<span className="chip text-rose">ошибки: {wrong}/{MAX}</span>} />
      {/* виселица */}
      <div className="flex justify-center mb-3">
        <svg viewBox="0 0 120 110" className="w-32 h-28">
          <g stroke="#8a7a5a" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M15 105 h70 M30 105 V15 M30 15 h45 M75 15 v12" />
          </g>
          <g stroke="#c8b6ff" strokeWidth="3.5" strokeLinecap="round" fill="none">
            {wrong > 0 && <circle cx="75" cy="36" r="9" />}
            {wrong > 1 && <path d="M75 45 v26" />}
            {wrong > 2 && <path d="M75 50 l-13 10" />}
            {wrong > 3 && <path d="M75 50 l13 10" />}
            {wrong > 4 && <path d="M75 71 l-12 18" />}
            {wrong > 5 && <path d="M75 71 l12 18" />}
            {wrong > 6 && <g><path d="M71 34 l3 3 M74 34 l-3 3 M78 34 l3 3 M81 34 l-3 3" strokeWidth="2" /></g>}
          </g>
        </svg>
      </div>
      <div className="flex justify-center gap-1.5 flex-wrap mb-4">
        {[...word].map((ch, i) => (
          <span key={i} className={`w-8 h-10 rounded-lg border-2 flex items-center justify-center font-display font-bold text-lg
            ${guessed.has(ch) ? 'border-mint/60 text-mint bg-mint/10' : result === 'lose' ? 'border-ember/50 text-ember' : 'border-sky/25 text-transparent'}`}>
            {guessed.has(ch) || result === 'lose' ? ch : '_'}
          </span>
        ))}
      </div>
      {!result && (
        <div className="grid grid-cols-7 sm:grid-cols-11 gap-1">
          {RU.map(l => {
            const used = guessed.has(l);
            const hit = used && word.includes(l);
            return (
              <button key={l} onClick={() => pickLetter(l)} disabled={used}
                className={`aspect-square rounded-lg text-[13px] font-extrabold transition-all active:scale-90
                  ${used ? (hit ? 'bg-mint/15 text-mint' : 'bg-ember/10 text-ember/60') : 'card-soft hover:border-butter/50 hover:text-butter'}`}>
                {l}
              </button>
            );
          })}
        </div>
      )}
      {result === 'win' && <Result title="Угадали!" reward={reward} petName={petName} onAgain={restart} onExit={onExit} />}
      {result === 'lose' && (
        <div className="card-soft p-5 text-center anim-pop mt-3">
          <div className="font-display font-bold text-ember text-lg">Не угадали…</div>
          <p className="text-[12px] font-bold text-cream/60 mt-1">Это было слово «{word}». {petName} говорит: «Попробуем ещё!»</p>
          <div className="flex gap-2 mt-3 justify-center">
            <button className="btn btn-butter !py-2 !text-xs" onClick={restart}>Ещё раз</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={onExit}>Выйти</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- пятнашки ---------- */
function Puzzle({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [tiles, setTiles] = useState<number[]>(() => scramble());
  const [moves, setMoves] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  function scramble(): number[] {
    const t = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
    let empty = 15;
    for (let i = 0; i < 200; i++) {
      const nb = [empty - 1, empty + 1, empty - 4, empty + 4].filter(n => n >= 0 && n < 16 && !(empty % 4 === 0 && n === empty - 1) && !(empty % 4 === 3 && n === empty + 1));
      const n = nb[Math.floor(Math.random() * nb.length)];
      [t[empty], t[n]] = [t[n], t[empty]]; empty = n;
    }
    return t;
  }
  const COLORS = ['#ff8f7d', '#ffd98e', '#9fe8c9', '#8ecae6', '#c8b6ff', '#ffaec9'];
  const click = (i: number) => {
    if (result !== null) return;
    const e = tiles.indexOf(0);
    if (!((Math.abs(i - e) === 1 && Math.floor(i / 4) === Math.floor(e / 4)) || Math.abs(i - e) === 4)) return;
    sfx.tap();
    const next = [...tiles];[next[i], next[e]] = [next[e], next[i]];
    setTiles(next); setMoves(m => m + 1);
    if (next.every((v, k) => v === (k + 1) % 16)) { sfx.levelup(); setResult(engine.finishMinigame('puzzle', Math.max(10, 60 - moves))); }
  };
  return (
    <div>
      <Head onBack={onExit} right={<><span className="chip">ходы: {moves}</span><button className="btn btn-lilac !py-2 !px-3 !text-xs" onClick={() => { setTiles(scramble()); setMoves(0); setResult(null); }}>Заново</button></>} />
      <div className="grid grid-cols-4 gap-1.5 max-w-[300px] mx-auto">
        {tiles.map((v, i) => (
          <button key={i} onClick={() => click(i)} disabled={v === 0}
            className={`aspect-square rounded-xl font-display font-bold text-xl transition-all ${v === 0 ? 'bg-transparent' : 'border border-sky/15 bg-night-800/80 hover:-translate-y-0.5 active:scale-95'}`}
            style={v === 0 ? undefined : { color: COLORS[(v - 1) % COLORS.length] }}>
            {v === 0 ? '' : v}
          </button>
        ))}
      </div>
      {result !== null && <Result title={`Собрано за ${moves} ходов!`} reward={result} petName={petName} onAgain={() => { setTiles(scramble()); setMoves(0); setResult(null); }} onExit={onExit} />}
    </div>
  );
}

/* ---------- судоку ---------- */
const DIFFS = [
  { id: 'easy', label: 'Лёгкий', holes: 30, reward: 40 },
  { id: 'medium', label: 'Средний', holes: 40, reward: 30 },
  { id: 'hard', label: 'Сложный', holes: 48, reward: 22 },
  { id: 'expert', label: 'Эксперт', holes: 54, reward: 16 },
];
const rowOf = (i: number) => Math.floor(i / 9), colOf = (i: number) => i % 9, boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
function validPos(g: number[], i: number, n: number) {
  for (let k = 0; k < 9; k++) { if (g[rowOf(i) * 9 + k] === n || g[k * 9 + colOf(i)] === n) return false; }
  const br = Math.floor(rowOf(i) / 3) * 3, bc = Math.floor(colOf(i) / 3) * 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (g[(br + r) * 9 + bc + c] === n) return false;
  return true;
}
function fillGrid(g: number[], pos: number): boolean {
  if (pos === 81) return true;
  if (g[pos] !== 0) return fillGrid(g, pos + 1);
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (validPos(g, pos, n)) { g[pos] = n; if (fillGrid(g, pos + 1)) return true; g[pos] = 0; }
  }
  return false;
}
function countSolutions(g: number[]): number {
  const i = g.indexOf(0);
  if (i === -1) return 1;
  let total = 0;
  for (let n = 1; n <= 9; n++) {
    if (validPos(g, i, n)) { g[i] = n; total += countSolutions(g); g[i] = 0; if (total >= 2) return total; }
  }
  return total;
}
function generateSudoku(holes: number) {
  const solution = new Array(81).fill(0);
  fillGrid(solution, 0);
  const puzzle = [...solution];
  let made = 0;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (made >= holes) break;
    const backup = puzzle[i]; puzzle[i] = 0;
    if (countSolutions([...puzzle]) !== 1) puzzle[i] = backup; else made++;
  }
  return { puzzle, solution };
}
function Sudoku({ petName, onExit }: { petName: string; onExit: () => void }) {
  const [diff, setDiff] = useState(DIFFS[1]);
  const [gen, setGen] = useState(() => generateSudoku(DIFFS[1].holes));
  const [cells, setCells] = useState<number[]>(() => [...gen.puzzle]);
  const [sel, setSel] = useState<number | null>(null);
  const [hints, setHints] = useState(3);
  const [result, setResult] = useState<number | null>(null);
  const givens = gen.puzzle.map(v => v !== 0);

  const newGame = (d = diff) => { const g = generateSudoku(d.holes); setDiff(d); setGen(g); setCells([...g.puzzle]); setSel(null); setHints(3); setResult(null); sfx.pop(); };
  const conflict = (i: number) => {
    const v = cells[i]; if (!v) return false;
    for (let k = 0; k < 81; k++) if (k !== i && cells[k] === v && (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i))) return true;
    return false;
  };
  const setValue = (v: number) => {
    if (sel === null || givens[sel] || result !== null) return;
    const next = [...cells]; next[sel] = v; setCells(next); sfx.tap();
    if (v !== 0 && next.every(x => x !== 0) && !next.some((_, k) => conflict(k))) { sfx.levelup(); setResult(engine.finishMinigame('sudoku', diff.reward)); }
  };
  const hint = () => {
    if (hints <= 0 || sel === null || givens[sel] || result !== null) return;
    const next = [...cells]; next[sel] = gen.solution[sel]; setCells(next); setHints(h => h - 1); sfx.sparkle();
    if (next.every(x => x !== 0) && !next.some((_, k) => conflict(k))) { sfx.levelup(); setResult(engine.finishMinigame('sudoku', Math.round(diff.reward / 2))); }
  };
  return (
    <div>
      <Head onBack={onExit} right={
        <div className="flex gap-1 flex-wrap justify-end">
          {DIFFS.map(d => (
            <button key={d.id} onClick={() => newGame(d)} className={`chip !text-[10px] !py-1.5 ${d.id === diff.id ? '!border-peach/60 text-peach' : 'hover:border-sky/40'}`}>{d.label}</button>
          ))}
        </div>
      } />
      <div className="relative">
        <div className="grid grid-cols-9 gap-0 max-w-[320px] mx-auto rounded-xl overflow-hidden border-2 border-sky/30">
          {cells.map((v, i) => {
            const given = givens[i];
            const bad = !given && conflict(i);
            return (
              <button key={i} onClick={() => { setSel(i); sfx.tap(); }}
                className={`aspect-square text-[13px] sm:text-[15px] font-display font-bold transition-colors
                  ${sel === i ? 'bg-lilac/30' : sel !== null && v !== 0 && v === cells[sel] ? 'bg-sky/15' : 'bg-night-800/80'}
                  ${bad ? 'text-ember bg-ember/10' : given ? 'text-butter' : 'text-cream/90'}`}
                style={{
                  borderRight: colOf(i) === 8 ? 'none' : colOf(i) % 3 === 2 ? '1.5px solid rgba(142,202,230,0.4)' : '1px solid rgba(142,202,230,0.12)',
                  borderBottom: rowOf(i) === 8 ? 'none' : rowOf(i) % 3 === 2 ? '1.5px solid rgba(142,202,230,0.4)' : '1px solid rgba(142,202,230,0.12)',
                }}>
                {v || ''}
              </button>
            );
          })}
        </div>
        {result !== null && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-night-950/85 anim-fade"><div className="w-full px-4"><Result title={`Решено! ${diff.label}`} reward={result} petName={petName} onAgain={() => newGame()} onExit={onExit} /></div></div>}
      </div>
      <div className="grid grid-cols-10 gap-1 max-w-[320px] mx-auto mt-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button key={n} onClick={() => setValue(n)} className="aspect-square rounded-lg card-soft font-display font-bold text-[15px] text-sky hover:border-sky/50 active:scale-90 transition-all">{n}</button>
        ))}
        <button onClick={() => setValue(0)} aria-label="Стереть" className="aspect-square rounded-lg card-soft flex items-center justify-center text-cream/60 hover:border-ember/50 active:scale-90 transition-all"><Icon name="close" className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center justify-center gap-2 mt-3">
        <button className="btn btn-lilac !py-2 !px-3 !text-xs" onClick={hint} disabled={hints <= 0}><Icon name="spark" className="w-3.5 h-3.5" />Подсказка ({hints})</button>
        <button className="btn btn-ghost !py-2 !px-3 !text-xs" onClick={() => newGame()}>Новое поле</button>
      </div>
      <p className="text-[10.5px] font-bold text-cream/35 text-center mt-2">Каждое поле генерируется случайно и имеет ровно одно решение.</p>
    </div>
  );
}
