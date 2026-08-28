/* Вкладка «Забота» (кухня, ритуалы, гардероб, лавка, подарки)
 * и «Игры» (хаб мини-игр). */
import { useState } from 'react';
import type { GameState } from '../game/core';
import { engine } from '../game/engine';
import { SHOP, ROOM_THEMES } from '../game/content-data';
import { sfx } from '../game/core';
import Icon from './icons';

const TABS = [
  { id: 'kitchen', label: 'Кухня', icon: 'berry' },
  { id: 'quests', label: 'Ритуалы', icon: 'check' },
  { id: 'wardrobe', label: 'Гардероб', icon: 'hat' },
  { id: 'shop', label: 'Лавка', icon: 'spark' },
  { id: 'gifts', label: 'Подарки', icon: 'gift' },
];

const FOODS = [
  { id: 'berries', name: 'Лесные ягоды', icon: 'berry', price: 8, tag: 'ягоды' },
  { id: 'honey', name: 'Капля мёда', icon: 'honey', price: 12, tag: 'мёд' },
  { id: 'soup', name: 'Звёздный суп', icon: 'soup', price: 20, tag: 'звёздный суп' },
  { id: 'cookie', name: 'Лунное печенье', icon: 'cookie', price: 15, tag: 'лунное печенье' },
  { id: 'tea', name: 'Облачный чай', icon: 'tea', price: 10, tag: 'чай' },
  { id: 'cake', name: 'Праздничный торт', icon: 'cake', price: 40, tag: 'торт' },
];

export function CarePanel({ state }: { state: GameState }) {
  const [tab, setTab] = useState('kitchen');
  const [toast, setToast] = useState('');
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const pet = state.pet!;

  return (
    <div className="card p-3.5 sm:p-4 anim-fade-up">
      <div className="flex gap-1 mb-3 bg-night-900/50 rounded-2xl p-1 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[9.5px] font-extrabold leading-none transition-all ${tab === t.id ? 'bg-night-700 text-butter' : 'text-cream/50 hover:text-cream'}`}>
            <Icon name={t.icon} className="w-4 h-4" /><span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>
      {toast && <div className="card-soft px-3 py-2 mb-2 text-[12px] font-bold text-mint" style={{ animation: 'toastIn 0.3s ease both' }}>{toast}</div>}

      {tab === 'kitchen' && (
        <div className="grid grid-cols-2 gap-2.5">
          {FOODS.map(f => {
            const liked = pet.personality.likes.includes(f.tag);
            return (
              <button key={f.id} onClick={() => { const r = engine.feed(f.id); flash(r.msg); if (!r.ok) sfx.sad(); }}
                className="card-soft p-3 text-left hover:-translate-y-0.5 active:scale-[0.97] transition-all relative group">
                {liked && <span className="absolute top-2 right-2 text-rose"><Icon name="heart" className="w-3.5 h-3.5" /></span>}
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-peach mb-1.5 group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,180,155,0.12)' }}><Icon name={f.icon} className="w-5 h-5" /></span>
                <div className="font-display font-bold text-[12px] leading-tight">{f.name}</div>
                <div className="text-[10.5px] font-bold text-butter mt-0.5 flex items-center gap-1"><Icon name="spark" className="w-3 h-3" />{f.price}</div>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'quests' && (
        <div className="space-y-2">
          {state.quests.map(q => {
            const done = q.progress >= q.target;
            return (
              <div key={q.id} className={`card-soft p-3 flex items-center gap-3 ${q.claimed ? 'opacity-40' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-extrabold">{q.text}</div>
                  <div className="bar-track mt-1.5"><div className="bar-fill" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%`, background: 'linear-gradient(90deg,#7fd4ae,#9fe8c9)' }} /></div>
                  <div className="text-[10px] font-bold text-cream/40 mt-1">{q.progress}/{q.target} · +{q.reward} искр</div>
                </div>
                {done && !q.claimed && <button className="btn btn-mint !py-2 !px-3 !text-xs" onClick={() => engine.claimQuest(q.id)}>Забрать</button>}
                {q.claimed && <span className="text-mint"><Icon name="check" className="w-5 h-5" /></span>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'wardrobe' && (
        <div className="space-y-3">
          {(['hat', 'scarf', 'glasses', 'wings'] as const).map(slot => {
            const items = SHOP.filter(i => i.kind === slot && (state.inventory[i.id] ?? 0) > 0);
            if (!items.length) return null;
            return (
              <div key={slot}>
                <div className="text-[10.5px] font-black text-cream/45 uppercase tracking-wider mb-1.5">{{ hat: 'Шапочки', scarf: 'Шарфики', glasses: 'Очки', wings: 'Крылышки' }[slot]}</div>
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
                <button key={t.id} onClick={() => { engine.setRoomTheme(t.id); sfx.pop(); }}
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

      {tab === 'shop' && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-cream/50">Покупки — в гардероб и комнату.</span>
            <span className="chip text-butter !text-[11px]"><Icon name="spark" className="w-3.5 h-3.5" />{state.coins}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {SHOP.map(it => {
              const owned = it.kind === 'furniture' ? state.furniture.includes(it.id) : (state.inventory[it.id] ?? 0) > 0;
              return (
                <button key={it.id} onClick={() => { const r = engine.buy(it.id, it.price, it.kind); flash(r.msg); if (!r.ok) sfx.sad(); else sfx.coin(); }}
                  disabled={owned}
                  className={`card-soft p-3 text-left transition-all ${owned ? 'opacity-45' : 'hover:-translate-y-0.5 active:scale-[0.97]'}`}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sky mb-1.5" style={{ background: 'rgba(142,202,230,0.1)' }}><Icon name={it.icon} className="w-5 h-5" /></span>
                  <div className="font-display font-bold text-[12px] leading-tight">{it.name}</div>
                  <div className="text-[10.5px] font-bold text-butter mt-0.5 flex items-center gap-1"><Icon name="spark" className="w-3 h-3" />{it.price}</div>
                  {owned && <div className="text-[10px] font-bold text-mint mt-0.5">куплено</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'gifts' && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold text-cream/50">Подарки укрепляют связь и доверие.</p>
          {[...SHOP].filter(i => (state.inventory[i.id] ?? 0) > 0).map(it => (
            <div key={it.id} className="card-soft p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lilac shrink-0" style={{ background: 'rgba(200,182,255,0.1)' }}><Icon name={it.icon} className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-extrabold">{it.name} <span className="text-cream/35">×{state.inventory[it.id]}</span></div>
                <div className="text-[10.5px] font-bold text-cream/40 leading-snug">{it.desc}</div>
              </div>
              {it.kind === 'gift' ? (
                <button className="btn btn-lilac !py-1.5 !px-3 !text-[11px]" onClick={() => { const r = engine.giveGift(it.id); flash(r.msg); }}>Подарить</button>
              ) : (
                <span className="chip !text-[9.5px] text-cream/40">в гардеробе</span>
              )}
            </div>
          ))}
          {[...SHOP].filter(i => (state.inventory[i.id] ?? 0) > 0).length === 0 && (
            <p className="text-[11.5px] font-bold text-cream/40 card-soft p-3">Рюкзак пуст. Купить подарок можно в Лавке.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Игры (хаб) ---------- */
export function GamesHub({ petName, onPlay }: { petName: string; onPlay: (g: string) => void }) {
  const CARDS = [
    { key: 'memory', icon: 'brain', color: '#c8b6ff', title: 'Звёздная память', desc: '6 пар созвездий. Интеллект.' },
    { key: 'firefly', icon: 'spark', color: '#ffd98e', title: 'Лови светлячков', desc: 'Реакция. Спорт.' },
    { key: 'echo', icon: 'musicbox', color: '#9fe8c9', title: 'Эхо-мелодия', desc: 'Повтори ноты. Творчество.' },
    { key: 'hangman', icon: 'book', color: '#8ecae6', title: 'Виселица', desc: 'Угадай слово по буквам.' },
    { key: 'puzzle', icon: 'grid', color: '#ffaec9', title: 'Пятнашки', desc: 'Собери небо.' },
    { key: 'sudoku', icon: 'diary', color: '#ffb49b', title: 'Судоку', desc: '4 сложности, одно решение.' },
  ];
  return (
    <div className="card p-4 anim-fade-up space-y-3">
      <h3 className="font-display font-bold text-lg text-butter">Игровая поляна</h3>
      <p className="text-[12px] font-bold text-cream/50 -mt-1">Игры развивают навыки {petName} и приносят искры.</p>
      <div className="grid grid-cols-2 gap-2.5">
        {CARDS.map(c => (
          <button key={c.key} onClick={() => { onPlay(c.key); sfx.pop(); }}
            className="card-soft p-3.5 text-left hover:-translate-y-0.5 transition-all active:scale-[0.97] group">
            <span className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" style={{ background: `${c.color}1f`, color: c.color }}><Icon name={c.icon} className="w-5.5 h-5.5" /></span>
            <div className="font-display font-bold text-[13.5px] leading-tight">{c.title}</div>
            <div className="text-[10.5px] font-bold text-cream/45 leading-snug mt-0.5">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
