/* ============================================================
 * Вкладка «Забота»: кухня, ежедневные ритуалы, гардероб,
 * лавка и подарки.
 * ============================================================ */
import { useState } from 'react';
import type { GameState } from '../game/types';
import { engine } from '../game/engine';
import { FOODS, SHOP, KEEPSAKES, ROOM_THEMES, SKILLS } from '../game/content';
import { sfx } from '../game/sound';
import Icon from './icons';

const TABS = [
  { id: 'kitchen', label: 'Кухня', icon: 'berry' },
  { id: 'quests', label: 'Ритуалы', icon: 'check' },
  { id: 'wardrobe', label: 'Гардероб', icon: 'hat' },
  { id: 'shop', label: 'Лавка', icon: 'spark' },
  { id: 'gifts', label: 'Подарки', icon: 'gift' },
];

export default function CarePanel({ state, goScene }: { state: GameState; goScene: () => void }) {
  const [tab, setTab] = useState('kitchen');
  const [toast, setToast] = useState('');
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const pet = state.pet!;

  return (
    <div className="card p-3.5 sm:p-4 anim-fade-up">
      <div className="flex gap-1 mb-3 bg-night-900/50 rounded-2xl p-1 sm:p-1.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 rounded-xl text-[9.5px] sm:text-[10.5px] font-extrabold leading-none transition-all ${tab === t.id ? 'bg-night-700 text-butter shadow-lg' : 'text-cream/50 hover:text-cream'}`}>
            <Icon name={t.icon} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>

      {toast && <div className="card-soft px-3 py-2 mb-3 text-[12.5px] font-bold text-mint" style={{ animation: 'toastIn 0.3s ease both' }}>{toast}</div>}

      {/* ---------- кухня ---------- */}
      {tab === 'kitchen' && (
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-bold text-cream/50 leading-snug">
            Любимое {pet.name}: <span className="text-mint">{pet.personality.likes.slice(0, 2).join(', ')}</span>. Любимая еда насыщает в полтора раза!
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {FOODS.map(f => {
              const owned = state.inventory[f.id] ?? 0;
              const liked = pet.personality.likes.includes(f.tag);
              return (
                <button key={f.id} onClick={() => { const r = engine.feed(f.id); flash(r.msg); if (!r.ok) sfx.sad(); }}
                  className="card-soft p-3 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all relative group">
                  {liked && <span className="absolute top-2 right-2 text-rose"><Icon name="heart" className="w-3.5 h-3.5" /></span>}
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-peach mb-1.5 group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,180,155,0.12)' }}>
                    <Icon name={f.icon} className="w-5 h-5" />
                  </span>
                  <div className="font-display font-bold text-[12px] leading-tight">{f.name}</div>
                  <div className="text-[10px] font-bold text-cream/40 mt-0.5">{f.desc}</div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10.5px] font-black text-butter">+{f.hunger} сытости</span>
                    {owned > 0
                      ? <span className="chip !text-[9.5px] !py-0.5 text-mint">×{owned}</span>
                      : <span className="chip !text-[9.5px] !py-0.5 text-butter"><Icon name="spark" className="w-2.5 h-2.5" />{f.price}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- ритуалы ---------- */}
      {tab === 'quests' && (
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-bold text-cream/50">Ежедневные ритуалы обновляются каждое утро. Выполняйте — {pet.name} обожает традиции.</p>
          {state.quests.map(q => {
            const done = q.progress >= q.target;
            return (
              <div key={q.id} className={`card-soft p-3 flex items-center gap-3 ${q.claimed ? 'opacity-45' : ''}`}>
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'text-mint' : 'text-cream/40'}`}
                  style={{ background: done ? 'rgba(159,232,201,0.12)' : 'rgba(142,202,230,0.06)' }}>
                  <Icon name={done ? 'check' : 'timer'} className="w-4.5 h-4.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-extrabold leading-snug">{q.text}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="bar-track flex-1 !h-1.5">
                      <div className="bar-fill" style={{ width: `${(q.progress / q.target) * 100}%`, background: 'linear-gradient(90deg,#7fd4ae,#9fe8c9)' }} />
                    </div>
                    <span className="text-[10px] font-black text-cream/45 tabular-nums">{q.progress}/{q.target}</span>
                  </div>
                </div>
                {q.claimed ? (
                  <span className="chip !text-[10px] text-cream/35">готово</span>
                ) : done ? (
                  <button className="btn btn-mint !py-1.5 !px-3 !text-[11px]" onClick={() => { engine.claimQuest(q.id); sfx.coin(); }}>+{q.reward}</button>
                ) : (
                  <span className="chip !text-[10px] text-butter"><Icon name="spark" className="w-3 h-3" />{q.reward}</span>
                )}
              </div>
            );
          })}

          <div className="card-soft p-3 mt-3">
            <div className="text-[11px] font-black text-cream/45 uppercase tracking-wider mb-2">Навыки {pet.name}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {SKILLS.map(sk => {
                const v = Math.min(100, pet.growth.skills[sk.key] ?? 0);
                return (
                  <div key={sk.key}>
                    <div className="flex justify-between text-[10.5px] font-extrabold text-cream/60 mb-0.5">
                      <span className="flex items-center gap-1"><Icon name={sk.icon} className="w-3 h-3" />{sk.key}</span>
                      <span className="text-cream/35">{Math.round(v)}</span>
                    </div>
                    <div className="bar-track !h-1.5">
                      <div className="bar-fill" style={{ width: `${v}%`, background: sk.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------- гардероб ---------- */}
      {tab === 'wardrobe' && (
        <div className="space-y-3">
          {(['hat', 'scarf', 'glasses', 'wings'] as const).map(slot => {
            const items = SHOP.filter(i => i.kind === slot && (state.inventory[i.id] ?? 0) > 0);
            if (items.length === 0) return null;
            return (
              <div key={slot}>
                <div className="text-[10.5px] font-black text-cream/45 uppercase tracking-wider mb-1.5">
                  {{ hat: 'Шапочки', scarf: 'Шарфики', glasses: 'Очки', wings: 'Крылышки' }[slot]}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {items.map(it => {
                    const on = pet.outfit[slot] === it.id;
                    return (
                      <button key={it.id} onClick={() => { engine.equip(it.id, slot); sfx.pop(); }}
                        className={`chip !text-[11px] !py-2 transition-all ${on ? '!border-mint/60 text-mint bg-mint/10' : 'hover:border-sky/40'}`}>
                        <Icon name={it.icon} className="w-4 h-4" />{it.name}{on ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <div className="text-[10.5px] font-black text-cream/45 uppercase tracking-wider mb-1.5">Тема комнаты</div>
            <div className="flex gap-2 flex-wrap">
              {ROOM_THEMES.map(t => (
                <button key={t.id} onClick={() => { engine.setRoomTheme(t.id); sfx.pop(); goScene(); }}
                  className={`chip !text-[11px] !py-2 transition-all ${state.roomTheme === t.id ? '!border-butter/60 text-butter bg-butter/10' : 'hover:border-sky/40'}`}>
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: t.wall }} />{t.name}
                </button>
              ))}
            </div>
          </div>

          {!SHOP.some(i => ['hat', 'scarf', 'glasses', 'wings'].includes(i.kind) && (state.inventory[i.id] ?? 0) > 0) && (
            <p className="text-[11.5px] font-bold text-cream/40">Одежды пока нет — загляните в Лавку!</p>
          )}
        </div>
      )}

      {/* ---------- лавка ---------- */}
      {tab === 'shop' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold text-cream/50">Искры за игры, прогулки и ритуалы.</p>
            <span className="chip text-butter !text-[11px]"><Icon name="spark" className="w-3.5 h-3.5" />{state.coins}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {SHOP.map(it => {
              const owned = it.kind === 'furniture' ? state.furniture.includes(it.id) : (state.inventory[it.id] ?? 0) > 0;
              return (
                <button key={it.id} onClick={() => { const r = engine.buy(it.id); flash(r.msg); if (!r.ok) sfx.sad(); else sfx.coin(); }}
                  disabled={owned}
                  className={`card-soft p-3 text-left transition-all ${owned ? 'opacity-45' : 'hover:-translate-y-0.5 active:scale-[0.97]'}`}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sky mb-1.5" style={{ background: 'rgba(142,202,230,0.1)' }}>
                    <Icon name={it.icon} className="w-5 h-5" />
                  </span>
                  <div className="font-display font-bold text-[12px] leading-tight">{it.name}</div>
                  <div className="text-[10px] font-bold text-cream/40 mt-0.5 leading-snug">{it.desc}</div>
                  <div className="mt-1.5">
                    {owned
                      ? <span className="chip !text-[9.5px] !py-0.5 text-mint"><Icon name="check" className="w-2.5 h-2.5" />куплено</span>
                      : <span className="chip !text-[9.5px] !py-0.5 text-butter"><Icon name="spark" className="w-2.5 h-2.5" />{it.price}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- подарки ---------- */}
      {tab === 'gifts' && (
        <div className="space-y-2.5">
          <p className="text-[11.5px] font-bold text-cream/50">Подарки укрепляют связь и доверие. Находки с прогулок и из снов — здесь же.</p>
          {[...SHOP, ...KEEPSAKES].filter(i => (state.inventory[i.id] ?? 0) > 0).length === 0 && (
            <p className="text-[11.5px] font-bold text-cream/40 card-soft p-3">Рюкзак пуст. Купить подарок можно в Лавке, а редкие сувениры приносит прогулка или сон.</p>
          )}
          {[...SHOP, ...KEEPSAKES].filter(i => (state.inventory[i.id] ?? 0) > 0).map(it => (
            <div key={it.id} className="card-soft p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lilac shrink-0" style={{ background: 'rgba(200,182,255,0.1)' }}>
                <Icon name={it.icon} className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-extrabold">{it.name} <span className="text-cream/35">×{state.inventory[it.id]}</span></div>
                <div className="text-[10.5px] font-bold text-cream/40 leading-snug">{it.desc}</div>
              </div>
              {it.kind === 'gift' || it.kind === 'keepsake' ? (
                <button className="btn btn-lilac !py-1.5 !px-3 !text-[11px]" onClick={() => { const r = engine.giveGift(it.id); flash(r.msg); if (r.ok) sfx.chime(); else sfx.sad(); }}>Подарить</button>
              ) : (
                <span className="chip !text-[9.5px] text-cream/40">в гардеробе</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
