/* ============================================================
 * Журнал: дневник питомца, сны, память (MemoryCore) и
 * дерево наследия прошлых питомцев.
 * ============================================================ */
import { useState } from 'react';
import type { GameState } from '../game/types';
import { RARITY_COLOR } from '../game/dna';
import Icon from './icons';

const TABS = [
  { id: 'diary', label: 'Дневник', icon: 'diary' },
  { id: 'dreams', label: 'Сны', icon: 'moon' },
  { id: 'memory', label: 'Память', icon: 'brain' },
  { id: 'legacy', label: 'Наследие', icon: 'tree' },
];

const KIND_ICON: Record<string, string> = { 'факт': 'info', 'эмоция': 'heart', 'момент': 'star', 'обещание': 'check', 'подарок': 'gift', 'шутка': 'chat' };
const KIND_COLOR: Record<string, string> = { 'факт': '#8ecae6', 'эмоция': '#ffaec9', 'момент': '#ffd98e', 'обещание': '#9fe8c9', 'подарок': '#c8b6ff', 'шутка': '#ffb49b' };

export default function Journal({ state }: { state: GameState }) {
  const [tab, setTab] = useState('diary');

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

      {tab === 'diary' && (
        <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
          {state.diary.length === 0 && <p className="text-sm text-cream/40 font-bold text-center py-6">Первая запись появится после первого дня вместе.</p>}
          {state.diary.map(e => (
            <div key={e.id} className="card-soft p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-cream/40 uppercase tracking-wide">{e.date} · день {e.day}</span>
                <span className="chip !text-[10px]" style={{ color: '#ffaec9' }}>{e.moodWord}</span>
              </div>
              <p className="text-[13px] font-bold leading-relaxed text-cream/85">{e.text}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'dreams' && (
        <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
          {state.dreams.length === 0 && <p className="text-sm text-cream/40 font-bold text-center py-6">Сны приходят, когда питомец спит — особенно пока вас нет.</p>}
          {state.dreams.map(d => (
            <div key={d.id} className="card-soft p-3 flex gap-3 items-start">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lilac" style={{ background: 'rgba(200,182,255,0.12)' }}>
                <Icon name="moon" className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[13px] font-bold leading-relaxed text-cream/85">{d.text}</p>
                {d.gift && <span className="chip !text-[10px] text-butter mt-1.5"><Icon name="gift" className="w-3 h-3" />принёс подарок из сна</span>}
                <div className="text-[10px] font-bold text-cream/35 mt-1">{new Date(d.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'memory' && (
        <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
          <div className="card-soft p-3">
            <div className="text-[11px] font-black text-sky uppercase tracking-wider mb-2">Профиль хозяина</div>
            <div className="text-[13px] font-bold text-cream/85 space-y-1">
              <p>Имя: <span className="text-butter">{state.owner.name || 'ещё не познакомились — напишите «меня зовут …» в болталке'}</span></p>
              <p>Город: <span className="text-sky">{state.owner.city || 'не указан — за окном сезонная погода'}</span></p>
              {state.owner.favorites.length > 0 && <p>Любит: <span className="text-mint">{state.owner.favorites.slice(-4).join(', ')}</span></p>}
              {state.owner.promises.length > 0 && <p>Обещания: <span className="text-rose">{state.owner.promises.slice(-3).join('; ')}</span></p>}
            </div>
          </div>
          {state.pet && state.pet.knowledge.length > 0 && (
            <div className="card-soft p-3">
              <div className="text-[11px] font-black text-lilac uppercase tracking-wider mb-1">Знания</div>
              <p className="text-[12px] font-bold text-cream/70">Изучено тем и фактов: <span className="text-butter">{state.pet.knowledge.length}</span>. Питомец умнеет с каждой викториной и каждой прочитанной статьёй.</p>
            </div>
          )}
          {state.memories.length === 0 && <p className="text-sm text-cream/40 font-bold text-center py-4">Воспоминания копятся с каждым вашим действием.</p>}
          {[...state.memories].reverse().map(m => (
            <div key={m.id} className="card-soft p-3 flex gap-3 items-start">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${KIND_COLOR[m.kind]}1f`, color: KIND_COLOR[m.kind] }}>
                <Icon name={KIND_ICON[m.kind]} className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold leading-snug text-cream/85">{m.text}</p>
                <div className="text-[10px] font-bold text-cream/35 mt-0.5">{m.kind} · {new Date(m.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'legacy' && (
        <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
          {state.legacy.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="tree" className="w-10 h-10 mx-auto text-cream/20 mb-2" />
              <p className="text-sm text-cream/40 font-bold">Дерево наследия пока растёт из настоящего дня.<br />Здесь расцветут те, кто прожил долгую счастливую жизнь.</p>
            </div>
          ) : state.legacy.map(l => (
            <div key={l.id} className="card-soft p-4 relative overflow-hidden">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-25" style={{ background: l.colorPrimary, filter: 'blur(14px)' }} />
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-display font-bold text-butter">{l.name}</span>
                <span className="chip !text-[10px]" style={{ color: RARITY_COLOR[l.rarity] }}>{l.rarity}</span>
              </div>
              <p className="text-[12px] font-bold text-cream/70 leading-relaxed">{l.epitaph}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="chip !text-[10px] text-mint">{l.species}</span>
                <span className="chip !text-[10px] text-sky">{l.days} дней вместе</span>
                <span className="chip !text-[10px] text-lilac">дар: {l.bonus}</span>
              </div>
            </div>
          ))}
          {state.legacy.length > 0 && (
            <p className="text-[11px] font-bold text-cream/40 px-1 leading-relaxed">Новое яйцо наследует цвет и дар последнего духа памяти. Связь не прерывается — она продолжается.</p>
          )}
        </div>
      )}
    </div>
  );
}
