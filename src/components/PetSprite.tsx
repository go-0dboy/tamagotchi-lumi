/* ============================================================
 * Спрайт питомца: процедурный SVG из ДНК.
 * Единая анатомия (тело, ножки, лапки, тень) + видовые детали:
 * мордочки, усы, клыки, зрачки; уши, хвосты, узоры, одежда,
 * черты эволюции. Моргание, дыхание, взгляд за курсором.
 * ============================================================ */
import { useEffect, useRef, useState } from 'react';
import type { Pet } from '../game/types';
import { stageForAge, stageScale } from '../game/content';

interface Props { pet: Pet; size?: string; onStroke?: () => void; }

const BODY: Record<number, string> = {
  0: 'M120 80 C158 80 182 108 182 148 C182 186 154 206 120 206 C86 206 58 186 58 148 C58 108 82 80 120 80 Z',
  1: 'M120 84 C162 84 188 112 186 150 C184 188 152 208 120 208 C88 208 56 188 54 150 C52 112 78 84 120 84 Z',
  2: 'M120 76 C150 76 170 106 170 150 C170 188 148 208 120 208 C92 208 70 188 70 150 C70 106 90 76 120 76 Z',
  3: 'M120 82 C160 78 184 110 182 148 C180 190 150 208 118 206 C86 204 58 188 58 150 C58 112 84 86 120 82 Z',
};

function Ears({ type, color, inner }: { type: string; color: string; inner: string }) {
  switch (type) {
    case 'round': return (
      <g>
        <circle cx="80" cy="92" r="17" fill={color} /><circle cx="160" cy="92" r="17" fill={color} />
        <circle cx="80" cy="94" r="8" fill={inner} /><circle cx="160" cy="94" r="8" fill={inner} />
      </g>);
    case 'long': return (
      <g>
        <ellipse cx="84" cy="66" rx="11" ry="28" fill={color} transform="rotate(-14 84 66)" />
        <ellipse cx="156" cy="66" rx="11" ry="28" fill={color} transform="rotate(14 156 66)" />
        <ellipse cx="84" cy="70" rx="5" ry="18" fill={inner} transform="rotate(-14 84 70)" />
        <ellipse cx="156" cy="70" rx="5" ry="18" fill={inner} transform="rotate(14 156 70)" />
      </g>);
    case 'pointy': return (
      <g>
        <path d="M74 104 L62 56 L108 82 Z" fill={color} />
        <path d="M166 104 L178 56 L132 82 Z" fill={color} />
        <path d="M78 98 L71 68 L100 84 Z" fill={inner} />
        <path d="M162 98 L169 68 L140 84 Z" fill={inner} />
      </g>);
    case 'floppy': return (
      <g>
        <path d="M76 94 C58 88 44 102 48 126 C52 142 68 142 78 128 Z" fill={color} />
        <path d="M164 94 C182 88 196 102 192 126 C188 142 172 142 162 128 Z" fill={color} />
        <path d="M74 100 C62 98 54 108 57 122 C60 132 70 131 75 122 Z" fill={inner} />
        <path d="M166 100 C178 98 186 108 183 122 C180 132 170 131 165 122 Z" fill={inner} />
      </g>);
    case 'leaf': return (
      <g>
        <path d="M82 96 C76 64 88 46 104 42 C106 66 98 88 86 98 Z" fill="#8fca7f" />
        <path d="M158 96 C164 64 152 46 136 42 C134 66 142 88 154 98 Z" fill="#8fca7f" />
        <path d="M88 92 C86 72 92 58 100 50" stroke={inner} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M152 92 C154 72 148 58 140 50" stroke={inner} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>);
    case 'antenna': return (
      <g>
        <path d="M100 86 C96 70 92 60 88 52" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M140 86 C144 70 148 60 152 52" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="87" cy="48" r="7" fill={inner} style={{ animation: 'pulseSoft 2.2s ease-in-out infinite' }} />
        <circle cx="153" cy="48" r="7" fill={inner} style={{ animation: 'pulseSoft 2.2s ease-in-out infinite 0.6s' }} />
      </g>);
    case 'fin': return (
      <g>
        <path d="M80 102 C62 88 58 66 68 50 C82 62 88 82 86 102 Z" fill={color} />
        <path d="M160 102 C178 88 182 66 172 50 C158 62 152 82 154 102 Z" fill={color} />
      </g>);
    case 'horn': return (
      <g>
        <path d="M86 92 C80 72 84 56 96 46 C100 62 98 78 94 92 Z" fill="#ffe9c9" />
        <path d="M154 92 C160 72 156 56 144 46 C140 62 142 78 146 92 Z" fill="#ffe9c9" />
        <path d="M88 80 C90 70 92 62 95 55" stroke="#f4c266" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M152 80 C150 70 148 62 145 55" stroke="#f4c266" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>);
    case 'tuft': return (
      <g>
        <path d="M76 104 L66 60 L108 84 Z" fill={color} />
        <path d="M164 104 L174 60 L132 84 Z" fill={color} />
        <path d="M66 60 L60 46 M66 60 L70 44 M66 60 L78 48" stroke={inner} strokeWidth="3" strokeLinecap="round" />
        <path d="M174 60 L180 46 M174 60 L170 44 M174 60 L162 48" stroke={inner} strokeWidth="3" strokeLinecap="round" />
      </g>);
    default: return null;
  }
}

function Tail({ type, color, inner, aura }: { type: string; color: string; inner: string; aura: string }) {
  switch (type) {
    case 'fluffy': return (
      <g><ellipse cx="188" cy="164" rx="22" ry="34" fill={color} transform="rotate(-24 188 164)" /><ellipse cx="192" cy="146" rx="12" ry="16" fill={inner} transform="rotate(-24 192 146)" /></g>);
    case 'curl': return <path d="M182 172 C210 168 218 146 206 130 C198 120 184 122 182 134" stroke={color} strokeWidth="12" fill="none" strokeLinecap="round" />;
    case 'wisp': return <path d="M184 176 C204 168 214 148 204 128 C198 146 188 156 178 160 Z" fill={aura} opacity="0.65" className="anim-float" />;
    case 'leaf': return (
      <g><ellipse cx="192" cy="152" rx="14" ry="26" fill="#8fca7f" transform="rotate(-30 192 152)" /><path d="M186 172 C190 158 194 144 200 132" stroke={inner} strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>);
    case 'spike': return (
      <g>
        <path d="M180 178 L206 168 L184 160 Z" fill={inner} />
        <path d="M184 158 L210 146 L186 140 Z" fill={inner} opacity="0.85" />
        <path d="M182 138 L204 124 L180 122 Z" fill={inner} opacity="0.7" />
      </g>);
    case 'star': return (
      <g>
        <path d="M182 172 C198 166 206 154 206 140" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M206 128 l3.4 6.8 7.6 1.1-5.5 5.3 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5-5.5-5.3 7.6-1.1z" fill={aura} style={{ animation: 'twinkle 2.4s ease-in-out infinite' }} />
      </g>);
    case 'comet': return (
      <g>
        <path d="M182 170 C202 164 214 150 216 132" stroke={aura} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
        <circle cx="216" cy="130" r="6" fill={aura} style={{ animation: 'pulseSoft 1.8s ease-in-out infinite' }} />
        <circle cx="222" cy="120" r="3" fill={aura} opacity="0.6" />
        <circle cx="226" cy="112" r="2" fill={aura} opacity="0.4" />
      </g>);
    case 'puff': return <circle cx="188" cy="168" r="16" fill={inner} />;
    case 'fox': return (
      <g>
        <path d="M178 180 C206 178 224 158 220 132 C204 130 188 140 180 156 C175 166 174 174 178 180 Z" fill={color} />
        <circle cx="214" cy="138" r="9" fill="#fff3e2" />
      </g>);
    case 'bun': return (
      <g><circle cx="186" cy="166" r="14" fill={inner} /><circle cx="186" cy="166" r="7" fill={color} opacity="0.5" /></g>);
    default: return null;
  }
}

function Pattern({ type, accent, aura }: { type: string; accent: string; aura: string }) {
  switch (type) {
    case 'spots': return (
      <g fill={accent} opacity="0.5">
        <circle cx="92" cy="116" r="5" /><circle cx="150" cy="110" r="4" /><circle cx="104" cy="180" r="4.5" /><circle cx="146" cy="178" r="3.5" /><circle cx="124" cy="192" r="3" />
      </g>);
    case 'stripes': return (
      <g stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M96 86 C104 92 106 100 104 108" /><path d="M120 82 C122 90 122 98 120 106" /><path d="M144 86 C138 92 136 100 138 108" />
      </g>);
    case 'glowdots': return (
      <g fill={aura}>
        <circle cx="94" cy="120" r="4" style={{ animation: 'twinkle 2.6s ease-in-out infinite' }} />
        <circle cx="148" cy="114" r="3.5" style={{ animation: 'twinkle 2.6s ease-in-out infinite 0.7s' }} />
        <circle cx="106" cy="182" r="3.5" style={{ animation: 'twinkle 2.6s ease-in-out infinite 1.2s' }} />
        <circle cx="140" cy="180" r="3" style={{ animation: 'twinkle 2.6s ease-in-out infinite 1.7s' }} />
      </g>);
    case 'stars': return (
      <g fill={aura}>
        <path d="M94 118 l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <path d="M148 112 l2 4.1 4.5.7-3.3 3.2.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.2 4.5-.7z" style={{ animation: 'twinkle 3s ease-in-out infinite 1s' }} />
        <circle cx="120" cy="186" r="3" style={{ animation: 'twinkle 3s ease-in-out infinite 2s' }} />
      </g>);
    case 'scales': return (
      <g stroke={accent} strokeWidth="2.5" fill="none" opacity="0.5">
        {[0, 1, 2].map(r => (
          <g key={r}>{[0, 1, 2, 3].map(c => (
            <path key={c} d={`M${86 + c * 20 + (r % 2) * 10} ${168 + r * 12} q10 8 20 0`} />
          ))}</g>
        ))}
      </g>);
    case 'bubbles': return (
      <g stroke={accent} strokeWidth="2.5" fill="none" opacity="0.6">
        <circle cx="96" cy="118" r="6" /><circle cx="146" cy="112" r="4.5" /><circle cx="108" cy="180" r="5" /><circle cx="142" cy="176" r="3.5" />
      </g>);
    case 'circuit': return (
      <g stroke={accent} strokeWidth="2" fill="none" opacity="0.65">
        <path d="M92 120 h14 v12 h10" /><circle cx="116" cy="132" r="2.5" fill={accent} />
        <path d="M148 116 h-10 v14" /><circle cx="138" cy="130" r="2.5" fill={accent} />
        <path d="M100 176 h16 v-10" /><circle cx="116" cy="166" r="2.5" fill={accent} />
      </g>);
    default: return null;
  }
}

function Outfit({ pet }: { pet: Pet }) {
  const o = pet.outfit;
  return (
    <g>
      {o.hat === 'hat_star' && (
        <g>
          <path d="M120 18 L146 80 L94 80 Z" fill="#c8b6ff" />
          <rect x="90" y="76" width="60" height="10" rx="5" fill="#a992f0" />
          <circle cx="120" cy="18" r="6" fill="#ffd98e" style={{ animation: 'twinkle 2s ease-in-out infinite' }} />
        </g>
      )}
      {o.hat === 'hat_leaf' && (
        <g>
          <path d="M94 82 C100 52 140 52 146 82 C130 74 110 74 94 82 Z" fill="#8fca7f" />
          <path d="M120 56 C122 48 128 44 134 42" stroke="#5d9e4c" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {o.scarf === 'scarf_cozy' && (
        <g>
          <path d="M84 192 C108 206 132 206 156 192 L158 204 C134 218 106 218 82 204 Z" fill="#ff8f7d" />
          <rect x="142" y="200" width="13" height="30" rx="6" fill="#ff8f7d" />
          <path d="M146 208 h6 M146 216 h6" stroke="#e86f58" strokeWidth="2" opacity="0.6" />
        </g>
      )}
      {o.glasses === 'glasses_round' && (
        <g stroke="#ffd98e" strokeWidth="3" fill="none">
          <circle cx="94" cy="134" r="14" /><circle cx="146" cy="134" r="14" />
          <path d="M108 134 h24 M80 130 L70 124 M160 130 L170 124" />
        </g>
      )}
    </g>
  );
}

function EvolutionMarks({ pet }: { pet: Pet }) {
  const t = pet.evolutionTraits;
  const noGlasses = pet.outfit.glasses !== 'glasses_round';
  return (
    <g>
      {t.includes('очки мудрости') && noGlasses && (
        <g stroke="#8ecae6" strokeWidth="3" fill="none">
          <circle cx="94" cy="134" r="13" /><circle cx="146" cy="134" r="13" /><path d="M107 134 h26" />
        </g>
      )}
      {t.includes('спортивная повязка') && <rect x="88" y="92" width="64" height="11" rx="5.5" fill="#ff8f7d" />}
      {t.includes('берет художника') && (
        <g><ellipse cx="122" cy="78" rx="28" ry="11" fill="#ffd98e" /><circle cx="122" cy="68" r="5" fill="#f4c266" /></g>
      )}
      {t.includes('рюкзачок искателя') && (
        <g><rect x="44" y="146" width="20" height="28" rx="9" fill="#f4c266" /><path d="M54 146 C60 138 72 136 78 142" stroke="#d9a86a" strokeWidth="3.5" fill="none" /></g>
      )}
    </g>
  );
}

export default function PetSprite({ pet, size = '220px', onStroke }: Props) {
  const { dna, stats, sleeping } = pet;
  const [look, setLook] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const ageDays = Math.max(0, (Date.now() - pet.growth.bornAt) / 86400000);
  const stage = stageForAge(ageDays);
  const scale = stageScale(stage.key);

  useEffect(() => {
    if (sleeping) { setLook({ x: 0, y: 0 }); return; }
    let raf = 0;
    const move = (e: PointerEvent) => {
      const el = wrapRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLook({ x: Math.max(-1, Math.min(1, dx * 2)), y: Math.max(-1, Math.min(1, dy * 2)) }));
    };
    window.addEventListener('pointermove', move);
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [sleeping]);

  const happy = stats.mood >= 65;
  const sad = stats.mood < 35;
  const c = { p: dna.colorPrimary, s: dna.colorSecondary, a: dna.colorAccent, aura: dna.aura };
  const gid = `grad${dna.seed}`;

  const muzzle = ['fox', 'cat', 'forest', 'dragon'].includes(dna.species);
  const whiskers = dna.species === 'fox' || dna.species === 'cat';
  const fangs = dna.species === 'dragon';
  const cheeks = dna.species === 'fluffy' || dna.species === 'blob';
  const freckles = dna.species === 'star' || dna.species === 'cosmic';
  const catEyes = dna.species === 'cat';
  const eyeR = dna.eyeStyle === 0 ? 8 : dna.eyeStyle === 1 ? 9.5 : 7;
  const ex = dna.eyeStyle === 2 ? 30 : 26;

  const eye = (cx: number, key: string) => sleeping ? (
    <path key={key} d={`M${cx - 9} 134 q9 7 18 0`} stroke="#2b1d33" strokeWidth="3.5" fill="none" strokeLinecap="round" />
  ) : sad ? (
    <g key={key}>
      {catEyes ? <circle cx={cx} cy={134} r={eyeR} fill="#f4c266" /> : <circle cx={cx} cy={134} r={eyeR} fill="#2b1d33" />}
      {catEyes && <ellipse cx={cx} cy={134} rx="2.6" ry={eyeR * 0.75} fill="#1a0f20" />}
      <circle cx={cx - eyeR * 0.3 + look.x * 2} cy={131 + look.y * 2} r="2.6" fill="#ffffff" />
      <path d={`M${cx - eyeR - 1} ${134 - eyeR - 2} q${eyeR} ${-4} ${eyeR * 2 + 2} 0`} fill={c.p} />
    </g>
  ) : (
    <g key={key}>
      {catEyes ? <circle cx={cx} cy={134} r={eyeR} fill="#f4c266" /> : <circle cx={cx} cy={134} r={eyeR} fill="#2b1d33" />}
      {catEyes && <ellipse cx={cx + look.x * 2} cy={134 + look.y * 2} rx="2.8" ry={eyeR * 0.8} fill="#1a0f20" />}
      <circle cx={cx - eyeR * 0.3 + look.x * 3} cy={131 + look.y * 3} r={dna.eyeStyle === 1 ? 3 : 2.4} fill="#ffffff" />
      {dna.eyeStyle === 1 && <circle cx={cx + eyeR * 0.35 + look.x * 3} cy={137 + look.y * 2} r="1.3" fill="#ffffff" opacity="0.8" />}
      <ellipse className={key === 'eyeL' ? 'blink-lid' : 'blink-lid2'} cx={cx} cy={134} rx={eyeR + 2} ry={eyeR + 2} fill={c.p} />
    </g>
  );

  const mouth = () => {
    const y = 160;
    if (sleeping) return <path d={`M112 ${y} q8 4 16 0`} stroke="#7a4a3a" strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (stats.hunger < 25) return <ellipse cx="120" cy={y + 2} rx="4.5" ry="5.5" fill="#7a4a3a" />;
    if (sad) return <path d={`M112 ${y + 5} q8 -7 16 0`} stroke="#7a4a3a" strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (dna.mouth === 1) return <path d={`M106 ${y - 2} q7 7 14 0 q7 7 14 0`} stroke="#7a4a3a" strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (dna.mouth === 2 && happy) return (
      <g>
        <path d={`M108 ${y - 3} q12 14 24 0 z`} fill="#7a4a3a" />
        <ellipse cx="120" cy={y + 4} rx="5" ry="3" fill="#f78fb3" />
      </g>
    );
    return <path d={`M110 ${y - 2} q10 9 20 0`} stroke="#7a4a3a" strokeWidth="3" fill="none" strokeLinecap="round" />;
  };

  const auraTraits = pet.evolutionTraits.some(t => ['мягкое свечение', 'мерцающие искры'].includes(t)) || dna.rarity === 'мифический';

  return (
    <div ref={wrapRef} className={`relative cursor-pointer select-none ${pet.dna.idle}`} style={{ width: size }}
      onPointerDown={onStroke} role="button" aria-label={`Погладить ${pet.name}`}>
      {/* всплывающие Z-z-z, когда спит */}
      {sleeping && (
        <>
          <span className="zzz" style={{ top: '6%', right: '4%', fontSize: '26px', animationDelay: '0s' }}>Z</span>
          <span className="zzz" style={{ top: '14%', right: '14%', fontSize: '19px', animationDelay: '1.1s' }}>z</span>
          <span className="zzz" style={{ top: '22%', right: '2%', fontSize: '14px', animationDelay: '2.2s' }}>z</span>
        </>
      )}
      {auraTraits && (
        <div className="absolute -inset-6 rounded-full pointer-events-none" style={{
          background: `radial-gradient(circle, ${dna.aura}30 0%, transparent 68%)`,
          animation: 'pulseSoft 3.2s ease-in-out infinite',
        }} />
      )}
      {pet.bond > 85 && !pet.transcended && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 anim-float pointer-events-none">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose"><path fill="currentColor" d="M12 21C5.5 15.5 2 12 2 8.5 2 5.7 4.2 3.5 7 3.5c1.9 0 3.7 1 5 2.7 1.3-1.7 3.1-2.7 5-2.7 2.8 0 5 2.2 5 5 0 3.5-3.5 7-10 12.5z" /></svg>
        </div>
      )}

      {/* дыхание — на обёртке, чтобы scale стадии не перезаписывался анимацией */}
      <div className={sleeping ? 'anim-breathe' : sad ? 'anim-droop' : ''} style={{ transformOrigin: '50% 92%' }}>
        <svg viewBox="0 0 240 240" className="w-full block"
          style={{ transform: `scale(${scale})`, transformOrigin: '50% 88%', overflow: 'visible' }}>
          <defs>
            <radialGradient id={gid} cx="38%" cy="30%" r="80%">
              <stop offset="0%" stopColor={c.s} />
              <stop offset="100%" stopColor={c.p} />
            </radialGradient>
          </defs>

          <ellipse cx="120" cy="218" rx="58" ry="11" fill="#0c1220" opacity="0.4" />

          <Tail type={dna.tail} color={c.p} inner={c.s} aura={c.aura} />
          <Ears type={dna.ears} color={c.p} inner={c.s} />

          {pet.outfit.wings === 'wings_moth' && (
            <g>
              <ellipse className="wing-l" cx="48" cy="130" rx="24" ry="38" fill={c.aura} opacity="0.5" transform="rotate(-16 48 130)" />
              <ellipse className="wing-r" cx="192" cy="130" rx="24" ry="38" fill={c.aura} opacity="0.5" transform="rotate(16 192 130)" />
            </g>
          )}

          <g>
            <ellipse cx="90" cy="206" rx="17" ry="11" fill={c.a} />
            <ellipse cx="150" cy="206" rx="17" ry="11" fill={c.a} />
            <g stroke={c.p} strokeWidth="2" strokeLinecap="round" opacity="0.7">
              <path d="M84 212 v-5 M90 213 v-6 M96 212 v-5" />
              <path d="M144 212 v-5 M150 213 v-6 M156 212 v-5" />
            </g>
          </g>

          <path d={BODY[dna.body] ?? BODY[0]} fill={`url(#${gid})`} stroke={c.a} strokeWidth="2.5" />
          <ellipse cx="120" cy="170" rx="34" ry="27" fill={c.s} opacity="0.85" />

          {dna.pattern === 'belly'
            ? <ellipse cx="120" cy="170" rx="30" ry="24" fill="none" stroke={c.a} strokeWidth="2" strokeDasharray="3 6" opacity="0.5" />
            : <Pattern type={dna.pattern} accent={c.a} aura={c.aura} />}

          <ellipse cx="80" cy="170" rx="10" ry="15" fill={c.p} stroke={c.a} strokeWidth="2" transform="rotate(16 80 170)" />
          <ellipse cx="160" cy="170" rx="10" ry="15" fill={c.p} stroke={c.a} strokeWidth="2" transform="rotate(-16 160 170)" />

          {/* грязь, если питомца давно не купали */}
          {stats.cleanliness < 55 && (
            <g fill="#5a4632">
              <ellipse cx="98" cy="120" rx="7" ry="5" opacity={stats.cleanliness < 32 ? 0.5 : 0.3} />
              <ellipse cx="148" cy="128" rx="6" ry="4.5" opacity={stats.cleanliness < 32 ? 0.45 : 0.26} />
              <ellipse cx="112" cy="186" rx="8" ry="5" opacity={stats.cleanliness < 32 ? 0.5 : 0.3} />
              <ellipse cx="86" cy="152" rx="5" ry="4" opacity={stats.cleanliness < 32 ? 0.4 : 0.22} />
              {stats.cleanliness < 32 && (
                <>
                  <ellipse cx="142" cy="180" rx="6" ry="4" opacity="0.45" />
                  <ellipse cx="128" cy="104" rx="5" ry="3.5" opacity="0.4" />
                  <path d="M104 100 q4 -3 8 0" stroke="#5a4632" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.45" />
                </>
              )}
            </g>
          )}

          {muzzle && <ellipse cx="120" cy="155" rx="17" ry="12" fill={c.s} opacity="0.95" />}
          {whiskers && (
            <g stroke="#fff3e2" strokeWidth="1.8" strokeLinecap="round" opacity="0.8">
              <path d="M98 152 L78 148 M98 158 L78 160" />
              <path d="M142 152 L162 148 M142 158 L162 160" />
            </g>
          )}
          {cheeks && (
            <g fill="#ffaec9" opacity="0.55">
              <ellipse cx="84" cy="150" rx="9" ry="5.5" /><ellipse cx="156" cy="150" rx="9" ry="5.5" />
            </g>
          )}
          {freckles && (
            <g fill={c.aura}>
              <circle cx="82" cy="146" r="1.6" /><circle cx="88" cy="152" r="1.3" /><circle cx="80" cy="155" r="1.2" />
              <circle cx="158" cy="146" r="1.6" /><circle cx="152" cy="152" r="1.3" /><circle cx="160" cy="155" r="1.2" />
            </g>
          )}

          {eye(120 - ex, 'eyeL')}
          {eye(120 + ex, 'eyeR')}

          {dna.species === 'fox' && <path d="M120 149 l-5 4.5 5 4 5 -4 z" fill="#d98e73" />}
          {dna.species === 'cat' && (
            <g>
              <path d="M117 149 h6 l-3 3.5 z" fill="#f78fb3" />
              <path d="M120 152.5 v4" stroke="#7a4a3a" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          )}
          {dna.species === 'forest' && <circle cx="120" cy="151" r="3.2" fill="#c07a5f" />}
          {dna.species === 'dragon' && (
            <g fill="#7a4a3a"><circle cx="116" cy="150" r="1.6" /><circle cx="124" cy="150" r="1.6" /></g>
          )}
          {mouth()}
          {fangs && happy && !sleeping && (
            <g fill="#fff3e2">
              <path d="M111 158 l3 6 3 -5 z" /><path d="M123 159 l3 5 3 -6 z" />
            </g>
          )}

          {stage.key === 'elder' && (
            <g fill="#fff3e2" opacity="0.9">
              <circle cx="106" cy="172" r="4" /><circle cx="114" cy="176" r="3.4" /><circle cx="120" cy="178" r="3" /><circle cx="126" cy="176" r="3.4" /><circle cx="134" cy="172" r="4" />
            </g>
          )}

          <Outfit pet={pet} />
          <EvolutionMarks pet={pet} />
        </svg>
      </div>
    </div>
  );
}
