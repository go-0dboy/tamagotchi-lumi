/* ============================================================
 * Панель «Забота»: кухня, ритуалы дня, гардероб, лавка, подарки.
 * ============================================================ */
import { useState } from 'react';
import type { GameState } from '../game/types';
import { FOODS, SHOP, KEEPSAKES } from '../game/content';
import { engine } from '../game/engine';
import { sfx } from '../game/sound';
import Icon from './icons';

const SUBTABS = [
  { id: 'food', label: 'Кухня', icon: 'berry' },
  { id: 'rituals', label: 'Ритуалы', icon: 'star' },
  { id: 'wardrobe', label: 'Гардероб', icon: 'hat' },
  { id: 'shop', label: 'Лавка', icon: 'bag' },
  { id: 'gifts', label: 'Подарки', icon: 'gift' },
];

const SLOT_LABEL: Record<string, string> = { hat: 'Головные уборы', scarf: 'Шарфики', glasses: 'Очки', wings: 'Крылышки' };
const ALL_DEFS = [...SHOP, ...KEEPSAKES];

export default function CarePanel({ state, goScene }: { state: GameState; goScene?: () => void }) {
  const [sub, setSub] = useState('food');
  const [note, setNote] = useState('');
  const pet = state.pet!;

  const flash = (msg: string) => { setNote(msg); setTimeout(() => setNote(''), 2600); };

  return (
    <div className="card p-4 anim-fade-up">
      <div className="flex gap-1 mb-3 bg-night-900/50 rounded-2xl p-1.5">
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => { setSub(t.id); sfx.tap(); }}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10.5px] font-extrabold transition-all ${sub === t.id ? 'bg-night-700 text-butter shadow-lg' : 'text-cream/50 hover:text-cream'}`}>
            <Icon name={t.icon} className="w-4.5 h-4.5" />
            {t.label}
          </button>
        ))}
      </div>

      {note && <div className="mb-3 text-sm font-bold text-mint card-soft px-3 py-2 anim-pop" style={{ animationName: 'toastIn' }}>{note}</div>}

      {/* ---------- КУХНЯ ---------- */}
      {sub === 'food' && (
        <div className="grid grid-cols-2 gap-2.5">
          {FOODS.map(f => {
            const owned = state.inventory[f.id] ?? 0;
            const liked = pet.personality.likes.includes(f.tag);
            const disliked = pet.personality.dislikes.includes(f.tag);
            return (
              <button key={f.id} onClick={() => { const r = engine.feed(f.id); if (!r.ok) { flash(r.msg); sfx.sad(); } else flash(r.msg); }}
                className="card-soft p-3 text-left hover:border-peach/50 hover:-translate-y-0.5 transition-all active:scale-95">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,217,142,0.12)', color: '#ffd98e' }}>
                    <Icon name={f.icon} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold leading-tight truncate">{f.name}</div>
                    <div className="text-[10px] font-bold text-cream/45">+{f.hunger} сытости {liked ? '· любит!' : disliked ? '· не любит' : ''}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="chip !text-[10px] !py-0.5 text-butter">{owned > 0 ? `×${owned}` : <><Icon name="spark" className="w-3 h-3" />{f.price}</>}</span>
                  {liked && <Icon name="heart" className="w-3.5 h-3.5 text-rose" />}
                </div>
              </button>
            );
          })}
          <p className="col-span-2 text-[11px] text-cream/40 font-bold leading-relaxed px-1">
            Любимая еда {pet.name}: {pet.personality.likes.join(', ')}. Нелюбимая — {pet.personality.dislikes.join(', ')}.
          </p>
        </div>
      )}

      {/* ---------- РИТУАЛЫ ---------- */}
      {sub === 'rituals' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-cream/45 px-1">Маленькие ежедневные ритуалы укрепляют связь. Обновляются каждое утро.</p>
          {state.quests.map(q => {
            const done = q.progress >= q.target;
            return (
              <div key={q.id} className={`card-soft p-3 ${q.claimed ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-extrabold">{q.text}</span>
                  {q.claimed ? (
                    <span className="chip !text-[10px] text-mint"><Icon name="check" className="w-3 h-3" />готово</span>
                  ) : done ? (
                    <button className="btn btn-butter !py-1.5 !px-3 !text-xs" onClick={() => { engine.claimQuest(q.id); flash(`+${q.reward} искр!`); }}>
                      <Icon name="spark" className="w-3.5 h-3.5" />+{q.reward}
                    </button>
                  ) : (
                    <span className="text-[11px] font-black text-cream/45">{q.progress}/{q.target}</span>
                  )}
                </div>
                <div className="bar-track !h-1.5 mt-2">
                  <div className="bar-fill" style={{ width: `${(q.progress / q.target) * 100}%`, background: 'linear-gradient(90deg,#f4c266,#ffd98e)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- ГАРДЕРОБ ---------- */}
      {sub === 'wardrobe' && (
        <div className="space-y-3">
          {(['hat', 'scarf', 'glasses', 'wings'] as const).map(slot => {
            const owned = SHOP.filter(i => i.kind === slot && (state.inventory[i.id] ?? 0) > 0);
            return (
              <div key={slot}>
                <div className="text-[11px] font-black text-cream/50 uppercase tracking-wider mb-1.5 px-1">{SLOT_LABEL[slot]}</div>
                {owned.length === 0 ? (
                  <p className="text-[11px] text-cream/35 font-bold px-1">Пока пусто — загляни в лавку.</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {owned.map(i => {
                      const on = pet.outfit[slot] === i.id;
                      return (
                        <button key={i.id} onClick={() => { engine.equip(i.id, slot); sfx.pop(); }}
                          className={`card-soft px-3 py-2 flex items-center gap-2 text-[12px] font-extrabold transition-all active:scale-95 ${on ? '!border-butter/70 text-butter' : 'hover:border-sky/40'}`}>
                          <Icon name={i.icon} className="w-4 h-4" />{i.name}
                          {on && <Icon name="check" className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {pet.evolutionTraits.length > 0 && (
            <div className="card-soft p-3">
              <div className="text-[11px] font-black text-lilac uppercase tracking-wider mb-1.5">Черты характера (выросли из заботы)</div>
              <div className="flex gap-1.5 flex-wrap">
                {pet.evolutionTraits.map(t => <span key={t} className="chip !text-[10px] text-lilac !border-lilac/30">{t}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- ЛАВКА ---------- */}
      {sub === 'shop' && (
        <div className="grid grid-cols-2 gap-2.5">
          {SHOP.map(i => {
            const isFurn = i.kind === 'furniture';
            const ownedFurn = isFurn && state.furniture.includes(i.id);
            return (
              <div key={i.id} className="card-soft p-3 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sky" style={{ background: 'rgba(142,202,230,0.1)' }}>
                    <Icon name={i.icon} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-extrabold leading-tight truncate">{i.name}</div>
                    <div className="text-[10px] font-bold text-cream/40 leading-tight">{i.desc}</div>
                  </div>
                </div>
                <div className="mt-auto pt-1.5">
                  {ownedFurn ? (
                    <span className="chip !text-[10px] text-mint"><Icon name="check" className="w-3 h-3" />в комнате</span>
                  ) : (
                    <button className="btn btn-sky !py-1.5 !px-3 !text-xs w-full"
                      onClick={() => { const r = engine.buy(i.id); flash(r.msg); if (!r.ok) sfx.sad(); }}>
                      <Icon name="spark" className="w-3.5 h-3.5" />{i.price}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- ПОДАРКИ ---------- */}
      {sub === 'gifts' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-cream/45 px-1">Рюкзачок находок и подарков. Подарки укрепляют связь и доверие.</p>
          {ALL_DEFS.filter(i => ['toy', 'gift', 'keepsake'].includes(i.kind) && (state.inventory[i.id] ?? 0) > 0).length === 0 && (
            <p className="text-[12px] text-cream/35 font-bold px-1 py-4 text-center">Пока пусто. Прогуляйтесь вместе или загляните в лавку — питомец найдёт сокровища и во снах.</p>
          )}
          {ALL_DEFS.filter(i => ['toy', 'gift', 'keepsake'].includes(i.kind) && (state.inventory[i.id] ?? 0) > 0).map(i => (
            <div key={i.id} className="card-soft p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-rose shrink-0" style={{ background: 'rgba(255,174,201,0.1)' }}>
                <Icon name={i.icon} className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-extrabold">{i.name} <span className="text-cream/40 text-[11px]">×{state.inventory[i.id]}</span></div>
                <div className="text-[10.5px] font-bold text-cream/40">{i.desc}</div>
              </div>
              <button className="btn btn-lilac !py-2 !px-3 !text-xs" onClick={() => { const r = engine.giveGift(i.id); flash(r.msg); }}>
                <Icon name="gift" className="w-4 h-4" />Дарить
              </button>
            </div>
          ))}
          {goScene && <button className="btn btn-ghost w-full !text-xs" onClick={goScene}>Вернуться в комнату</button>}
        </div>
      )}
    </div>
  );
}
