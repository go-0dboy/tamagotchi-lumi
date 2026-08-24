/* ============================================================
 * PetSprite — процедурный SVG-питомец из ДНК.
 * Дышит, моргает, следит глазами за курсором, реагирует
 * на поглаживания сердечками, носит одежду и черты эволюции.
 * ============================================================ */
import { useId, useRef, useState } from 'react';
import type { Pet } from '../game/types';
import { stageForAge, stageScale } from '../game/content';

const BODIES = [
  { cx: 120, cy: 140, rx: 62, ry: 56, eyeY: 126 },
  { cx: 120, cy: 144, rx: 70, ry: 52, eyeY: 130 },
  { cx: 120, cy: 134, rx: 54, ry: 66, eyeY: 118 },
  { cx: 120, cy: 142, rx: 66, ry: 58, eyeY: 128 },
];
const RARITY_AURA_OP: Record<string, number> = { 'обычный': 0.16, 'необычный': 0.24, 'редкий': 0.32, 'эпический': 0.4, 'мифический': 0.5 };

interface Heart { id: number; x: number; y: number; dx: number; }

interface Props {
  pet: Pet;
  size?: number | string;
  interactive?: boolean;
  onStroke?: () => void;
}

export default function PetSprite({ pet, size = 240, interactive = true, onStroke }: Props) {
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [hearts, setHearts] = useState<Heart[]>([]);
  const heartId = useRef(0);

  const { dna, stats, outfit, evolutionTraits, sleeping } = pet;
  const B = BODIES[dna.body % 4];
  const ageDays = (Date.now() - pet.growth.bornAt) / 86400000;
  const scale = stageScale(stageForAge(ageDays).key);

  const moodWord = sleeping ? 'sleep' : stats.mood > 72 ? 'happy' : stats.mood < 32 ? 'sad' : stats.energy < 25 ? 'sleepy' : 'normal';
  const animClass = sleeping ? '' : moodWord === 'happy' ? 'anim-hop' : moodWord === 'sad' ? 'anim-droop' : moodWord === 'sleepy' ? 'anim-sway' : dna.idle;
  const dusty = stats.cleanliness < 25;

  const eyeL = { x: B.cx - 22, y: B.eyeY };
  const eyeR = { x: B.cx + 22, y: B.eyeY };
  const eyeRy = [12, 10, 14][dna.eyeStyle % 3];
  const c1 = dna.colorPrimary, c2 = dna.colorSecondary, c3 = dna.colorAccent;

  const onMove = (e: React.PointerEvent) => {
    if (!interactive || sleeping || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setGaze({ x: Math.max(-1, Math.min(1, px * 2)) * 4.5, y: Math.max(-1, Math.min(1, py * 2)) * 3.5 });
  };
  const onTap = (e: React.PointerEvent) => {
    if (!interactive || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const id = ++heartId.current;
    const h: Heart = { id, x: e.clientX - r.left, y: e.clientY - r.top, dx: (Math.random() - 0.5) * 60 };
    setHearts(hs => [...hs.slice(-8), h]);
    setTimeout(() => setHearts(hs => hs.filter(x => x.id !== id)), 950);
    onStroke?.();
  };

  const trait = (t: string) => evolutionTraits.includes(t);
  const showGlasses = outfit.glasses === 'glasses_round' || trait('очки мудрости');
  const hasWings = outfit.wings === 'wings_moth';
  const hasScarf = outfit.scarf === 'scarf_cozy';

  return (
    <div
      ref={wrapRef}
      className="relative select-none touch-none"
      style={{ width: size, height: size, cursor: interactive ? 'pointer' : 'default' }}
      onPointerMove={onMove}
      onPointerDown={onTap}
      role="button"
      aria-label={`Погладить ${pet.name}`}
    >
      {/* сердечки от поглаживаний */}
      {hearts.map(h => (
        <svg key={h.id} className="absolute pointer-events-none" style={{ left: h.x - 10, top: h.y - 26, animation: 'heartRise 0.9s ease-out forwards', ['--dx' as string]: `${h.dx}px` }} width="22" height="20" viewBox="0 0 22 20">
          <path d="M11 18 C4 12 1 8.5 1 5.5 C1 3 3 1 5.5 1 C7.5 1 9.5 2.2 11 4 C12.5 2.2 14.5 1 16.5 1 C19 1 21 3 21 5.5 C21 8.5 18 12 11 18 Z" fill="#ff8fb3" />
        </svg>
      ))}

      <div className={`w-full h-full ${animClass}`}>
        <svg viewBox="0 0 240 240" width="100%" height="100%" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id={`aura${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={dna.aura} stopOpacity="0.9" />
              <stop offset="70%" stopColor={dna.aura} stopOpacity="0.25" />
              <stop offset="100%" stopColor={dna.aura} stopOpacity="0" />
            </radialGradient>
            <clipPath id={`bodyclip${uid}`}>
              <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} />
            </clipPath>
            <linearGradient id={`bodyg${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={shade(c1, -14)} />
            </linearGradient>
          </defs>

          <g transform={`translate(${120 - 120 * scale} ${132 - 132 * scale}) scale(${scale})`}>
            {/* аура */}
            <circle cx={B.cx} cy={B.cy} r={B.rx + 26} fill={`url(#aura${uid})`} opacity={RARITY_AURA_OP[dna.rarity] ?? 0.2} style={{ animation: 'pulseSoft 4s ease-in-out infinite' }} />
            {(dna.rarity === 'мифический' || dna.rarity === 'эпический') && (
              <circle cx={B.cx} cy={B.cy} r={B.rx + 18} fill="none" stroke={dna.aura} strokeWidth="1.5" strokeDasharray="3 10" opacity="0.6" style={{ animation: 'auraSpin 18s linear infinite', transformOrigin: `${B.cx}px ${B.cy}px` }} />
            )}

            {/* хвост */}
            <Tail type={dna.tail} B={B} c1={c1} c3={c3} />

            {/* крылья */}
            {hasWings && (
              <>
                <ellipse className="wing-l" cx={B.cx - B.rx - 14} cy={B.cy - 18} rx={26} ry={15} fill={c3} opacity="0.75" transform={`rotate(-24 ${B.cx - B.rx - 14} ${B.cy - 18})`} />
                <ellipse className="wing-r" cx={B.cx + B.rx + 14} cy={B.cy - 18} rx={26} ry={15} fill={c3} opacity="0.75" transform={`rotate(24 ${B.cx + B.rx + 14} ${B.cy - 18})`} />
              </>
            )}

            {/* рюкзачок искателя (черта) */}
            {trait('рюкзачок искателя') && (
              <rect x={B.cx + B.rx - 16} y={B.cy - 8} width={22} height={26} rx={9} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" />
            )}

            {/* уши */}
            <Ears type={dna.ears} B={B} c1={c1} c2={c2} c3={c3} />

            {/* тело с дыханием */}
            <g className="anim-breathe">
              <ellipse cx={B.cx} cy={B.cy} rx={B.rx} ry={B.ry} fill={`url(#bodyg${uid})`} stroke={shade(c1, -25)} strokeWidth="2.5" />
              <Pattern pattern={dna.pattern} B={B} c2={c2} c3={c3} uid={uid} />

              {/* мордочка */}
              {sleeping ? (
                <>
                  <path d={`M${eyeL.x - 9} ${eyeL.y} q9 7 18 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <path d={`M${eyeR.x - 9} ${eyeR.y} q9 7 18 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <Eye x={eyeL.x} y={eyeL.y} ry={eyeRy} gaze={gaze} mood={moodWord} uid={uid} c1={c1} />
                  <Eye x={eyeR.x} y={eyeR.y} ry={eyeRy} gaze={gaze} mood={moodWord} uid={uid} c1={c1} />
                </>
              )}

              {/* румянец */}
              {(moodWord === 'happy' || pet.bond > 75) && !sleeping && (
                <>
                  <ellipse cx={eyeL.x - 12} cy={eyeL.y + 14} rx={8} ry={5} fill="#ff8fb3" opacity="0.5" />
                  <ellipse cx={eyeR.x + 12} cy={eyeR.y + 14} rx={8} ry={5} fill="#ff8fb3" opacity="0.5" />
                </>
              )}

              {/* рот */}
              {!sleeping && (
                moodWord === 'happy'
                  ? <path d={`M${B.cx - 11} ${eyeL.y + 19} q11 12 22 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  : moodWord === 'sad'
                    ? <path d={`M${B.cx - 9} ${eyeL.y + 26} q9 -8 18 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    : <path d={`M${B.cx - 8} ${eyeL.y + 21} q8 6 16 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              )}

              {/* шарф */}
              {hasScarf && (
                <>
                  <rect x={B.cx - B.rx * 0.55} y={B.cy + B.ry * 0.42} width={B.rx * 1.1} height={16} rx={8} fill="#ff8f7d" stroke="#e06a58" strokeWidth="2" />
                  <rect x={B.cx + B.rx * 0.2} y={B.cy + B.ry * 0.42 + 10} width={14} height={24} rx={7} fill="#ff8f7d" stroke="#e06a58" strokeWidth="2" />
                </>
              )}

              {/* очки */}
              {showGlasses && (
                <g stroke="#3a2f52" strokeWidth="3" fill="rgba(255,255,255,0.25)">
                  <circle cx={eyeL.x} cy={eyeL.y} r={13} />
                  <circle cx={eyeR.x} cy={eyeR.y} r={13} />
                  <line x1={eyeL.x + 13} y1={eyeL.y} x2={eyeR.x - 13} y2={eyeR.y} />
                </g>
              )}

              {/* повязка спортсмена */}
              {trait('спортивная повязка') && (
                <path d={`M${B.cx - B.rx * 0.62} ${B.cy - B.ry * 0.62} q${B.rx * 0.62} ${-B.ry * 0.28} ${B.rx * 1.24} 0`} stroke="#9fe8c9" strokeWidth="9" fill="none" strokeLinecap="round" />
              )}
              {/* берет художника */}
              {trait('берет художника') && (
                <>
                  <ellipse cx={B.cx - 8} cy={B.cy - B.ry - 2} rx={26} ry={12} fill="#ffd98e" stroke="#e0a94e" strokeWidth="2" transform={`rotate(-12 ${B.cx} ${B.cy - B.ry})`} />
                  <circle cx={B.cx - 14} cy={B.cy - B.ry - 12} r={4} fill="#e0a94e" />
                </>
              )}
            </g>

            {/* шляпы (поверх ушей) */}
            {outfit.hat === 'hat_star' && (
              <g>
                <path d={`M${B.cx - 20} ${B.cy - B.ry + 8} L${B.cx} ${B.cy - B.ry - 34} L${B.cx + 20} ${B.cy - B.ry + 8} Z`} fill="#c8b6ff" stroke="#a992f0" strokeWidth="2.5" />
                <Star x={B.cx} y={B.cy - B.ry - 30} r={7} fill="#ffd98e" />
              </g>
            )}
            {outfit.hat === 'hat_leaf' && (
              <ellipse cx={B.cx + 4} cy={B.cy - B.ry + 2} rx={28} ry={13} fill="#9fe8c9" stroke="#7fd4ae" strokeWidth="2.5" transform={`rotate(-8 ${B.cx} ${B.cy - B.ry})`} />
            )}

            {/* сияющая связь */}
            {trait('сияющая связь') && (
              <g style={{ animation: 'bob 2.6s ease-in-out infinite' }}>
                <path d={`M${B.cx} ${B.cy - B.ry - 26} c-5 -7 -14 -3 -12 4 c1.5 5 12 10 12 10 c0 0 10.5 -5 12 -10 c2 -7 -7 -11 -12 -4 Z`} fill="#ff8fb3" opacity="0.9" />
              </g>
            )}

            {/* искры магии */}
            {(trait('мерцающие искры') || dna.rarity === 'мифический') && (
              <>
                {[[-1, -1.15], [1.05, -0.9], [-1.2, 0.1], [1.25, 0.3]].map(([dx, dy], i) => (
                  <g key={i} style={{ animation: `sparkle ${2 + i * 0.4}s ease-in-out infinite`, transformOrigin: `${B.cx + dx * (B.rx + 14)}px ${B.cy + dy * (B.ry + 10)}px` }}>
                    <Star x={B.cx + dx * (B.rx + 14)} y={B.cy + dy * (B.ry + 10)} r={5 + i} fill={dna.aura} />
                  </g>
                ))}
              </>
            )}

            {/* сон */}
            {sleeping && (
              <>
                <text x={B.cx + B.rx - 6} y={B.cy - B.ry} fontSize="22" fill="#8ecae6" fontWeight="900" style={{ animation: 'zzz 2.4s ease-out infinite' }}>z</text>
                <text x={B.cx + B.rx + 10} y={B.cy - B.ry - 14} fontSize="15" fill="#8ecae6" fontWeight="900" style={{ animation: 'zzz 2.4s ease-out infinite 0.6s' }}>z</text>
              </>
            )}

            {/* пыль при запущенности */}
            {dusty && !sleeping && (
              <g fill="#8a92ad" opacity="0.55">
                <circle cx={B.cx - B.rx - 8} cy={B.cy + 18} r={3} />
                <circle cx={B.cx + B.rx + 10} cy={B.cy + 6} r={2.5} />
                <circle cx={B.cx + B.rx - 4} cy={B.cy + 26} r={2} />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ---------- вспомогательные отрисовщики ---------- */
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${x + rad * Math.cos(a)},${y + rad * Math.sin(a)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} />;
}

function Eye({ x, y, ry, gaze, mood, uid, c1 }: { x: number; y: number; ry: number; gaze: { x: number; y: number }; mood: string; uid: string; c1: string }) {
  const droopy = mood === 'sleepy' || mood === 'sad';
  return (
    <g>
      <ellipse cx={x} cy={y} rx={10.5} ry={ry} fill="#fffdf6" stroke="#2b1d33" strokeWidth="2" />
      <circle cx={x + gaze.x} cy={y + gaze.y + (droopy ? 1.5 : 0)} r={5.2} fill="#2b1d33" />
      <circle cx={x + gaze.x + 2} cy={y + gaze.y - 2} r={1.8} fill="#fff" />
      {/* веко для моргания */}
      <rect x={x - 12} y={y - ry - 1} width={24} height={(ry + 1) * 2 + 2} rx={10} fill={c1} className="blink-lid" style={{ opacity: droopy ? 0.55 : undefined }} />
    </g>
  );
}

function Ears({ type, B, c1, c2, c3 }: { type: string; B: typeof BODIES[0]; c1: string; c2: string; c3: string }) {
  const lx = B.cx - B.rx * 0.45, rx2 = B.cx + B.rx * 0.45, topY = B.cy - B.ry + 4;
  switch (type) {
    case 'round': return (<g><circle cx={lx} cy={topY - 8} r={15} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><circle cx={lx} cy={topY - 8} r={7} fill={c2} /><circle cx={rx2} cy={topY - 8} r={15} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><circle cx={rx2} cy={topY - 8} r={7} fill={c2} /></g>);
    case 'long': return (<g><ellipse cx={lx - 4} cy={topY - 24} rx={11} ry={28} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><ellipse cx={lx - 4} cy={topY - 22} rx={5} ry={18} fill={c2} /><ellipse cx={rx2 + 4} cy={topY - 24} rx={11} ry={28} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><ellipse cx={rx2 + 4} cy={topY - 22} rx={5} ry={18} fill={c2} /></g>);
    case 'pointy': return (<g><path d={`M${lx - 14} ${topY + 4} L${lx - 2} ${topY - 26} L${lx + 12} ${topY + 2} Z`} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><path d={`M${rx2 + 14} ${topY + 4} L${rx2 + 2} ${topY - 26} L${rx2 - 12} ${topY + 2} Z`} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /></g>);
    case 'leaf': return (<g><ellipse cx={lx} cy={topY - 16} rx={9} ry={20} fill="#9fe8c9" stroke="#7fd4ae" strokeWidth="2.5" transform={`rotate(-18 ${lx} ${topY - 16})`} /><ellipse cx={rx2} cy={topY - 16} rx={9} ry={20} fill="#9fe8c9" stroke="#7fd4ae" strokeWidth="2.5" transform={`rotate(18 ${rx2} ${topY - 16})`} /></g>);
    case 'horn': return (<g><path d={`M${lx - 8} ${topY} L${lx} ${topY - 22} L${lx + 10} ${topY - 2} Z`} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" /><path d={`M${rx2 + 8} ${topY} L${rx2} ${topY - 22} L${rx2 - 10} ${topY - 2} Z`} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" /></g>);
    case 'antenna': return (<g><line x1={B.cx - 8} y1={topY} x2={B.cx - 16} y2={topY - 26} stroke={shade(c1, -20)} strokeWidth="3" /><circle cx={B.cx - 16} cy={topY - 30} r={6} fill={c3} style={{ animation: 'twinkle 2.2s ease-in-out infinite' }} /><line x1={B.cx + 8} y1={topY} x2={B.cx + 16} y2={topY - 26} stroke={shade(c1, -20)} strokeWidth="3" /><circle cx={B.cx + 16} cy={topY - 30} r={6} fill={c3} style={{ animation: 'twinkle 2.2s ease-in-out infinite 0.7s' }} /></g>);
    case 'fin': return (<g><path d={`M${lx - 16} ${topY + 6} Q${lx - 26} ${topY - 18} ${lx + 2} ${topY - 8} Z`} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" /><path d={`M${rx2 + 16} ${topY + 6} Q${rx2 + 26} ${topY - 18} ${rx2 - 2} ${topY - 8} Z`} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" /></g>);
    default: return null;
  }
}

function Tail({ type, B, c1, c3 }: { type: string; B: typeof BODIES[0]; c1: string; c3: string }) {
  const tx = B.cx + B.rx - 6, ty = B.cy + 10;
  switch (type) {
    case 'fluffy': return (<g><circle cx={tx + 16} cy={ty} r={17} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" /><circle cx={tx + 26} cy={ty - 10} r={11} fill={c3} opacity="0.8" /></g>);
    case 'curl': return <path d={`M${tx} ${ty} q26 2 22 -18 q-4 -16 -18 -10`} fill="none" stroke={c1} strokeWidth="10" strokeLinecap="round" />;
    case 'wisp': return (<g><path d={`M${tx} ${ty} q24 -4 20 -24 q10 10 4 24 q-4 10 -24 8 Z`} fill={c3} opacity="0.7" style={{ animation: 'sway 3s ease-in-out infinite', transformOrigin: `${tx}px ${ty}px` }} /></g>);
    case 'spike': return <path d={`M${tx} ${ty} l14 -6 l-4 10 l16 -2 l-8 10 l14 4 l-30 6 Z`} fill={c3} stroke={shade(c3, -20)} strokeWidth="2" />;
    case 'star': return (<g><line x1={tx} y1={ty} x2={tx + 26} y2={ty - 20} stroke={shade(c1, -20)} strokeWidth="4" /><Star x={tx + 30} y={ty - 26} r={9} fill={c3} /></g>);
    case 'comet': return (<g><path d={`M${tx} ${ty} L${tx + 34} ${ty - 8} L${tx + 4} ${ty + 12} Z`} fill={c3} opacity="0.85" /><circle cx={tx + 2} cy={ty + 2} r={8} fill={c3} /></g>);
    case 'puff': return <circle cx={tx + 14} cy={ty + 4} r={13} fill={c1} stroke={shade(c1, -25)} strokeWidth="2.5" />;
    case 'leaf': return <ellipse cx={tx + 18} cy={ty - 4} rx={14} ry={8} fill="#9fe8c9" stroke="#7fd4ae" strokeWidth="2" transform={`rotate(-20 ${tx + 18} ${ty - 4})`} />;
    default: return null;
  }
}

function Pattern({ pattern, B, c2, c3, uid }: { pattern: string; B: typeof BODIES[0]; c2: string; c3: string; uid: string }) {
  const { cx, cy, rx, ry } = B;
  const inner = (children: React.ReactNode) => <g clipPath={`url(#bodyclip${uid})`}>{children}</g>;
  switch (pattern) {
    case 'belly': return inner(<ellipse cx={cx} cy={cy + ry * 0.35} rx={rx * 0.55} ry={ry * 0.42} fill={c2} opacity="0.9" />);
    case 'spots': return inner(<g fill={c3} opacity="0.55"><circle cx={cx - rx * 0.5} cy={cy - ry * 0.3} r={9} /><circle cx={cx + rx * 0.45} cy={cy - ry * 0.45} r={6} /><circle cx={cx + rx * 0.55} cy={cy + ry * 0.2} r={8} /><circle cx={cx - rx * 0.3} cy={cy + ry * 0.5} r={5} /></g>);
    case 'stripes': return inner(<g stroke={c3} strokeWidth="7" opacity="0.4" fill="none" strokeLinecap="round"><path d={`M${cx - rx * 0.7} ${cy - ry * 0.4} q${rx * 0.3} ${ry * 0.2} 0 ${ry * 0.7}`} /><path d={`M${cx - rx * 0.35} ${cy - ry * 0.6} q${rx * 0.3} ${ry * 0.25} 0 ${ry * 0.9}`} /><path d={`M${cx} ${cy - ry * 0.7} q${rx * 0.3} ${ry * 0.25} 0 ${ry}`} /></g>);
    case 'stars': return inner(<g opacity="0.8"><Star x={cx - rx * 0.45} y={cy - ry * 0.35} r={6} fill={c2} /><Star x={cx + rx * 0.4} y={cy - ry * 0.2} r={4.5} fill={c2} /><Star x={cx + rx * 0.2} y={cy + ry * 0.45} r={5} fill={c2} /><Star x={cx - rx * 0.25} y={cy + ry * 0.3} r={3.5} fill={c2} /></g>);
    case 'glowdots': return inner(<g fill="#fffdf6" opacity="0.7"><circle cx={cx - rx * 0.4} cy={cy - ry * 0.2} r={3.5} style={{ animation: 'twinkle 3s ease-in-out infinite' }} /><circle cx={cx + rx * 0.45} cy={cy - ry * 0.4} r={2.5} style={{ animation: 'twinkle 3s ease-in-out infinite 0.8s' }} /><circle cx={cx + rx * 0.3} cy={cy + ry * 0.35} r={3} style={{ animation: 'twinkle 3s ease-in-out infinite 1.4s' }} /><circle cx={cx - rx * 0.5} cy={cy + ry * 0.35} r={2.5} style={{ animation: 'twinkle 3s ease-in-out infinite 2s' }} /></g>);
    case 'bubbles': return inner(<g fill="none" stroke={c2} strokeWidth="2.5" opacity="0.7"><circle cx={cx - rx * 0.4} cy={cy - ry * 0.2} r={8} /><circle cx={cx + rx * 0.45} cy={cy - ry * 0.45} r={5} /><circle cx={cx + rx * 0.35} cy={cy + ry * 0.4} r={7} /></g>);
    case 'scales': return inner(<g fill="none" stroke={c3} strokeWidth="3" opacity="0.45"><path d={`M${cx - rx * 0.5} ${cy - ry * 0.1} q10 10 20 0 q10 10 20 0 q10 10 20 0`} /><path d={`M${cx - rx * 0.4} ${cy + ry * 0.25} q10 10 20 0 q10 10 20 0 q10 10 20 0`} /></g>);
    case 'circuit': return inner(<g stroke={c2} strokeWidth="2.5" opacity="0.6" fill="none"><path d={`M${cx - rx * 0.5} ${cy - ry * 0.2} h14 v16 h16`} /><path d={`M${cx + rx * 0.5} ${cy + ry * 0.1} h-12 v-14`} /><circle cx={cx - rx * 0.5 + 30} cy={cy - ry * 0.2 + 16} r={3} fill={c2} /><circle cx={cx + rx * 0.5 - 12} cy={cy + ry * 0.1 - 14} r={3} fill={c2} /></g>);
    default: return null;
  }
}
