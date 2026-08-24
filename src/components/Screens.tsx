/* ============================================================
 * Эмоциональные экраны: онбординг с яйцом, встреча с питомцем,
 * «С возвращением» (офлайн-хроника), прощание и настройки.
 * ============================================================ */
import { useState } from 'react';
import type { GameState, LegacyEntry, OfflineEvent, Pet } from '../game/types';
import { engine, formatAway } from '../game/engine';
import { speciesOf, abilityOf, RARITY_COLOR } from '../game/dna';
import { sfx } from '../game/sound';
import PetSprite from './PetSprite';
import Icon from './icons';

const EVENT_ICON: Record<string, string> = { moon: 'moon', gift: 'gift', heart: 'heart', broom: 'broom', art: 'drawing', book: 'book', plant: 'plant', spark: 'spark', food: 'berry', drop: 'drop' };

/* ================= ОНБОРДИНГ: ЯЙЦО ================= */
export function Onboarding() {
  const [phase, setPhase] = useState<'intro' | 'egg' | 'reveal'>('intro');
  const [taps, setTaps] = useState(0);
  const [ownerName, setOwnerName] = useState('');
  const [pet, setPet] = useState<Pet | null>(null);

  const startEgg = () => {
    if (ownerName.trim()) { engine.state.owner.name = ownerName.trim().slice(0, 20); engine.save(); }
    setPhase('egg');
    sfx.chime();
  };

  const tapEgg = () => {
    sfx.pop();
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) {
      setTimeout(() => { const p = engine.hatchEgg(); setPet(p); setPhase('reveal'); }, 450);
    }
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="card p-6 sm:p-8 max-w-md w-full text-center anim-fade-up">
          <div className="mx-auto mb-4 w-16 h-16 rounded-3xl flex items-center justify-center text-butter" style={{ background: 'rgba(255,217,142,0.12)', animation: 'pulseSoft 3s ease-in-out infinite' }}>
            <Icon name="spark" className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-butter text-glow">Люмос</h1>
          <p className="text-[13px] font-bold text-cream/60 mt-2 leading-relaxed">
            Где-то между сном и рассветом вас ждёт маленькое существо. Оно будет расти, мечтать, скучать — и помнить вас. Даже когда вы не рядом.
          </p>
          <div className="mt-4 text-left card-soft p-3.5 space-y-1.5">
            <p className="text-[10.5px] font-black text-cream/45 uppercase tracking-wider mb-1">Как играть</p>
            {([
              ['heart', 'Гладьте питомца прямо в комнате — это сердечки, настроение и доверие.'],
              ['spark', 'Кнопки под сценой: кухня, уборка, сон, учёба и прогулка.'],
              ['moon', 'Закройте игру — питомец продолжит жить: поспит, увидит сон, соскучится.'],
              ['diary', 'Вкладки: забота и лавка, мини-игры, болталка с памятью, дневник и сны.'],
            ] as [string, string][]).map(([ic, txt]) => (
              <div key={ic} className="flex items-start gap-2">
                <Icon name={ic} className="w-4 h-4 text-butter shrink-0 mt-0.5" />
                <p className="text-[12px] font-bold text-cream/70 leading-snug">{txt}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-left">
            <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Как вас зовут? <span className="normal-case font-bold text-cream/30">(необязательно — питомец спросит сам)</span></label>
            <input className="input-soft mt-1.5" placeholder="Ваше имя" value={ownerName} onChange={e => setOwnerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && startEgg()} />
          </div>
          <button className="btn btn-primary w-full mt-5" onClick={startEgg}>
            <Icon name="star" className="w-5 h-5" />Найти яйцо
          </button>
          <p className="text-[10.5px] font-bold text-cream/30 mt-3">Всё живёт в вашем браузере. Никаких серверов — только вы двое.</p>
        </div>
      </div>
    );
  }

  if (phase === 'egg') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4">
        <p className="font-display font-bold text-cream/80 text-lg mb-2 anim-fade">В траве что-то светится…</p>
        <p className="text-[12px] font-bold text-cream/45 mb-8">Постучите по яйцу {5 - taps > 0 ? `ещё ${5 - taps} раз(а)` : '— оно отвечает!'}</p>
        <button onClick={tapEgg} className={`relative ${taps < 5 ? 'anim-egg' : ''} active:scale-90 transition-transform`} aria-label="Постучать по яйцу">
          <svg width="200" height="230" viewBox="0 0 200 230">
            <ellipse cx="100" cy="196" rx="70" ry="16" fill="#0c1220" opacity="0.5" />
            <path d="M100 18 C150 18 168 90 168 132 C168 178 138 208 100 208 C62 208 32 178 32 132 C32 90 50 18 100 18 Z" fill="#fff3e2" stroke="#ffd9a8" strokeWidth="4" />
            <circle cx="78" cy="90" r="9" fill="#ffb49b" opacity="0.7" />
            <circle cx="126" cy="120" r="7" fill="#9fe8c9" opacity="0.7" />
            <circle cx="92" cy="156" r="8" fill="#8ecae6" opacity="0.7" />
            <circle cx="120" cy="70" r="5" fill="#c8b6ff" opacity="0.7" />
            {taps >= 2 && <path d="M100 18 l-8 22 l14 10 l-10 18" stroke="#d9a86a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {taps >= 3 && <path d="M60 70 l16 14 l-6 16 l18 8" stroke="#d9a86a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {taps >= 4 && <path d="M140 60 l-14 18 l10 14 l-16 12" stroke="#d9a86a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {taps >= 5 && (
              <g style={{ animation: 'popIn 0.4s ease both' }}>
                <circle cx="86" cy="112" r="7" fill="#2b1d33" />
                <circle cx="116" cy="112" r="7" fill="#2b1d33" />
                <circle cx="88" cy="109" r="2.5" fill="#fff" />
                <circle cx="118" cy="109" r="2.5" fill="#fff" />
              </g>
            )}
          </svg>
          <div className="absolute -inset-6 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,217,142,0.15) 0%, transparent 70%)', animation: 'pulseSoft 2.4s ease-in-out infinite' }} />
        </button>
        <div className="flex gap-1.5 mt-6">
          {[0, 1, 2, 3, 4].map(i => <span key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < taps ? 'bg-butter scale-110' : 'bg-night-600'}`} />)}
        </div>
      </div>
    );
  }

  return pet ? <RevealSheet pet={pet} onDone={() => {}} embedded /> : null;
}

/* ================= КАРТОЧКА ВСТРЕЧИ ================= */
export function RevealSheet({ pet, onDone, embedded = false }: { pet: Pet; onDone: () => void; embedded?: boolean }) {
  const [name, setName] = useState(pet.name);
  const sp = speciesOf(pet.dna.species);
  const ab = abilityOf(pet.dna);
  const body = (
    <div className={`card max-w-md w-full anim-fade-up overflow-hidden ${embedded ? '' : 'max-h-[88vh] overflow-y-auto'}`}>
      <div className="p-5 pb-0 text-center relative" style={{ background: `radial-gradient(ellipse at 50% 30%, ${pet.dna.aura}22 0%, transparent 70%)` }}>
        <p className="font-display font-bold text-butter text-glow text-xl">Знакомьтесь!</p>
        <div className="flex justify-center my-2"><PetSprite pet={pet} size={200} interactive={false} /></div>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Имя</label>
          <input className="input-soft mt-1" value={name} onChange={e => setName(e.target.value)} maxLength={16} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px] font-bold">
          <div className="card-soft p-2.5"><span className="text-cream/40 block text-[10px] uppercase tracking-wide">Вид</span>{sp.label}<span className="block text-[10.5px] text-cream/40 font-bold mt-0.5">{sp.desc}</span></div>
          <div className="card-soft p-2.5"><span className="text-cream/40 block text-[10px] uppercase tracking-wide">Редкость</span><span style={{ color: RARITY_COLOR[pet.dna.rarity] }}>{pet.dna.rarity}</span><span className="block text-[10.5px] text-cream/40 font-bold mt-0.5">характер: {pet.personality.temperament}</span></div>
          <div className="card-soft p-2.5 col-span-2"><span className="text-cream/40 block text-[10px] uppercase tracking-wide">Способность</span>{ab.name}<span className="block text-[10.5px] text-cream/40 font-bold mt-0.5">{ab.desc}</span></div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="chip !text-[10px] text-mint">любит: {pet.personality.likes.slice(0, 2).join(', ')}</span>
          <span className="chip !text-[10px] text-ember">не любит: {pet.personality.dislikes[0]}</span>
        </div>
        <button className="btn btn-primary w-full" onClick={() => { engine.renamePet(name || pet.name); sfx.chime(); onDone(); }}>
          <Icon name="heart" className="w-5 h-5" />Начать жизнь вместе
        </button>
      </div>
    </div>
  );
  if (embedded) return <div className="min-h-dvh flex items-center justify-center p-4">{body}</div>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/85 anim-fade">{body}</div>;
}

/* ================= С ВОЗВРАЩЕНИЕМ ================= */
export function WelcomeBack({ awayMs, events, line, petName }: { awayMs: number; events: OfflineEvent[]; line: string; petName: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/90 anim-fade overflow-y-auto">
      <div className="card max-w-md w-full p-5 anim-pop my-8">
        <div className="text-center mb-4">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-butter mb-2" style={{ background: 'rgba(255,217,142,0.12)' }}>
            <Icon name="moon" className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-butter text-glow">С возвращением!</h2>
          <p className="chip mt-2 text-sky">вас не было {formatAway(awayMs)}</p>
        </div>
        <p className="text-[14px] font-bold text-cream/85 text-center leading-relaxed mb-4">«{line}»<span className="block text-[11px] text-cream/40 mt-1">— {petName}</span></p>
        <div className="space-y-2 mb-4">
          <p className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Пока вас не было:</p>
          {events.map((e, i) => (
            <div key={i} className="card-soft p-2.5 flex items-start gap-2.5 anim-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sky shrink-0" style={{ background: 'rgba(142,202,230,0.1)' }}>
                <Icon name={EVENT_ICON[e.icon] ?? 'star'} className="w-4 h-4" />
              </span>
              <p className="text-[12.5px] font-bold text-cream/75 leading-snug pt-1">{e.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={() => engine.dismissWelcome(true)}>
            <Icon name="heart" className="w-5 h-5" />Обнять
          </button>
          <button className="btn btn-ghost" onClick={() => engine.dismissWelcome(false)}>Позже</button>
        </div>
      </div>
    </div>
  );
}

/* ================= ПРОЩАНИЕ С ДУХОМ ================= */
export function Farewell({ entry, onNewGen, onKeep }: { entry: LegacyEntry; onNewGen: () => void; onKeep: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a2547 0%, #0c1220 75%)' }}>
      <div className="card max-w-md w-full p-6 text-center anim-pop my-8">
        <div className="mx-auto w-16 h-16 rounded-full mb-3 flex items-center justify-center" style={{ background: `${entry.colorPrimary}33`, boxShadow: `0 0 40px ${entry.colorPrimary}55`, animation: 'pulseSoft 3s ease-in-out infinite' }}>
          <Icon name="star" className="w-8 h-8 text-butter" />
        </div>
        <h2 className="font-display font-bold text-xl text-butter text-glow">{entry.name} стал(а) духом памяти</h2>
        <p className="text-[13px] font-bold text-cream/65 leading-relaxed mt-3">{entry.epitaph}</p>
        <p className="text-[12px] font-bold text-cream/45 leading-relaxed mt-2">
          Это не конец. {entry.days} дней тепла остались в дневнике, в памяти и в дереве наследия — оно теперь цветёт даром «{entry.bonus}».
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <button className="btn btn-primary" onClick={onNewGen}>
            <Icon name="spark" className="w-5 h-5" />Новое яйцо — наследует цвет и дар
          </button>
          <button className="btn btn-ghost" onClick={onKeep}>Остаться в комнате памяти</button>
        </div>
      </div>
    </div>
  );
}

/* ================= НАСТРОЙКИ ================= */
export function SettingsModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [name, setName] = useState(state.pet?.name ?? '');
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/85 anim-fade overflow-y-auto">
      <div className="card max-w-md w-full p-5 anim-pop my-8 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-butter">Настройки</h2>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
        </div>
        {msg && <div className="card-soft px-3 py-2 text-[12px] font-bold text-mint anim-fade">{msg}</div>}

        {state.pet && (
          <div>
            <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Имя питомца</label>
            <div className="flex gap-2 mt-1">
              <input className="input-soft" value={name} maxLength={16} onChange={e => setName(e.target.value)} />
              <button className="btn btn-sky !px-4" onClick={() => { engine.renamePet(name); setMsg('Имя обновлено!'); }}>Ок</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className={`btn ${state.settings.sound ? 'btn-mint' : 'btn-ghost'} !py-2.5 !text-xs`} onClick={() => engine.toggleSetting('sound')}>
            <Icon name={state.settings.sound ? 'soundOn' : 'soundOff'} className="w-4 h-4" />Звук: {state.settings.sound ? 'вкл' : 'выкл'}
          </button>
          <button className={`btn ${state.settings.reminders ? 'btn-mint' : 'btn-ghost'} !py-2.5 !text-xs`} onClick={() => { engine.toggleSetting('reminders'); setMsg(state.settings.reminders ? 'Напоминания выключены' : 'Напоминания включены'); }}>
            <Icon name="drop" className="w-4 h-4" />Напоминания
          </button>
        </div>

        <div>
          <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Перенос сохранения (для GitHub Pages — просто файл)</label>
          <div className="flex gap-2 mt-1">
            <button className="btn btn-ghost flex-1 !py-2 !text-[11px]" onClick={() => { const t = engine.exportSave(); setExportText(t); navigator.clipboard?.writeText(t).catch(() => undefined); setMsg('Код скопирован в буфер обмена'); }}>
              <Icon name="export" className="w-4 h-4" />Экспорт
            </button>
            <button className="btn btn-ghost flex-1 !py-2 !text-[11px]" onClick={() => { setMsg(engine.importSave(importText) ? 'Сохранение загружено!' : 'Не удалось прочитать код'); }}>
              <Icon name="import" className="w-4 h-4" />Импорт
            </button>
          </div>
          {exportText && <textarea readOnly className="input-soft mt-2 !text-[10px] h-16 font-mono" value={exportText} onFocus={e => e.target.select()} />}
          <textarea className="input-soft mt-2 !text-[10px] h-16 font-mono" placeholder="Вставьте код сохранения сюда…" value={importText} onChange={e => setImportText(e.target.value)} />
        </div>

        <div className="card-soft p-3">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-ember flex-1">Точно? Всё — питомец, память, дневник — исчезнет.</p>
              <button className="btn !bg-ember !text-white !py-2 !px-3 !text-[11px]" onClick={() => { engine.reset(); onClose(); }}>Да, начать заново</button>
              <button className="btn btn-ghost !py-2 !px-3 !text-[11px]" onClick={() => setConfirmReset(false)}>Нет</button>
            </div>
          ) : (
            <button className="btn btn-ghost w-full !py-2 !text-[11px] !text-ember/80" onClick={() => setConfirmReset(true)}>Сбросить игру</button>
          )}
        </div>
        <p className="text-[10px] font-bold text-cream/25 text-center leading-relaxed">Люмос · офлайн-движок v1 · данные живут только в вашем браузере (localStorage)</p>
      </div>
    </div>
  );
}
