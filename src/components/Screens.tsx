/* ============================================================
 * Полноэкранные состояния: онбординг (яйцо, имя и город),
 * карточка встречи, «С возвращением», прощание, настройки.
 * Без confirm()/prompt() — всё работает в песочнице.
 * ============================================================ */
import { useState } from 'react';
import type { Pet, GameState, OfflineEvent, LegacyEntry } from '../game/types';
import { engine } from '../game/engine';
import { speciesOf, abilityOf, RARITY_COLOR } from '../game/dna';
import { sfx } from '../game/sound';
import PetSprite from './PetSprite';
import Icon from './icons';

/* ================= ОНБОРДИНГ: ЯЙЦО ================= */
export function Onboarding() {
  const [phase, setPhase] = useState<'intro' | 'egg'>('intro');
  const [taps, setTaps] = useState(0);
  const [ownerName, setOwnerName] = useState('');
  const [ownerCity, setOwnerCity] = useState('');

  const startEgg = () => {
    if (ownerName.trim()) engine.state.owner.name = ownerName.trim().slice(0, 20);
    if (ownerCity.trim()) { engine.state.owner.city = ownerCity.trim().slice(0, 30); engine.state.owner.geo = null; }
    engine.save();
    setPhase('egg');
    sfx.chime();
  };

  const tapEgg = () => {
    sfx.pop();
    const n = taps + 1;
    setTaps(n);
    if (n >= 5) setTimeout(() => engine.hatchEgg(), 450);
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-dvh flex p-4 overflow-y-auto">
        <div className="card p-5 sm:p-8 max-w-md w-full m-auto text-center anim-fade-up">
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
              ['heart', 'Гладьте питомца, купайте его, убирайте комнату — на всё есть анимации.'],
              ['spark', 'Кнопки под сценой: кухня, уборка, купание, сон, учёба, прогулка (на ПК — клавиши 1–7).'],
              ['moon', 'Закройте игру — питомец продолжит жить: поспит, увидит сон, соскучится.'],
              ['diary', 'Вкладки: забота и лавка, 6 мини-игр, болталка с памятью, дневник и сны.'],
            ] as [string, string][]).map(([ic, txt]) => (
              <div key={ic} className="flex items-start gap-2">
                <Icon name={ic} className="w-4 h-4 text-butter shrink-0 mt-0.5" />
                <p className="text-[12px] font-bold text-cream/70 leading-snug">{txt}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            <div>
              <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Как вас зовут?</label>
              <input className="input-soft mt-1.5" placeholder="Ваше имя" value={ownerName} onChange={e => setOwnerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && startEgg()} />
            </div>
            <div>
              <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Ваш город?</label>
              <input className="input-soft mt-1.5" placeholder="Например, Казань" value={ownerCity} onChange={e => setOwnerCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && startEgg()} />
            </div>
            <p className="sm:col-span-2 text-[10.5px] font-bold text-cream/35 leading-snug -mt-0.5">
              Необязательно — но тогда за окном будет ваша настоящая погода, а на прогулках появятся улицы вашего города.
            </p>
          </div>
          <button className="btn btn-primary w-full mt-5" onClick={startEgg}>
            <Icon name="star" className="w-5 h-5" />Найти яйцо
          </button>
          <p className="text-[10.5px] font-bold text-cream/30 mt-3">Всё живёт в вашем браузере. Никаких серверов — только вы двое.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex p-4 overflow-y-auto">
      <div className="m-auto flex flex-col items-center">
        <p className="font-display font-bold text-cream/80 text-lg mb-1.5 sm:mb-2 anim-fade text-center">В траве что-то светится…</p>
        <p className="text-[12px] font-bold text-cream/45 mb-5 sm:mb-8 text-center">Постучите по яйцу {5 - taps > 0 ? `ещё ${5 - taps} раз(а)` : '— оно отвечает!'}</p>
        <button onClick={tapEgg} className={`relative ${taps < 5 ? 'anim-egg' : ''} active:scale-90 transition-transform`} aria-label="Постучать по яйцу">
          <svg className="w-[min(56vw,200px)] h-auto" viewBox="0 0 200 230">
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
                <circle cx="88" cy="109" r="2.5" fill="#ffffff" />
                <circle cx="118" cy="109" r="2.5" fill="#ffffff" />
              </g>
            )}
          </svg>
          <div className="absolute -inset-6 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,217,142,0.15) 0%, transparent 70%)', animation: 'pulseSoft 2.4s ease-in-out infinite' }} />
        </button>
        <div className="flex gap-1.5 mt-6">
          {[0, 1, 2, 3, 4].map(i => <span key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < taps ? 'bg-butter scale-110' : 'bg-night-600'}`} />)}
        </div>
      </div>
    </div>
  );
}

/* ================= КАРТОЧКА ВСТРЕЧИ ================= */
export function RevealSheet({ pet, onDone, embedded = false }: { pet: Pet; onDone: () => void; embedded?: boolean }) {
  const [name, setName] = useState(pet.name);
  const sp = speciesOf(pet.dna.species);
  const ability = abilityOf(pet.dna);

  const body = (
    <div className="card max-w-md w-full m-auto anim-fade-up max-h-[92dvh] overflow-x-hidden overflow-y-auto no-scrollbar">
      <div className="p-5 sm:p-6 text-center">
        <p className="text-[11px] font-black text-cream/45 uppercase tracking-[0.2em] mb-1">Знакомьтесь</p>
        <div className="flex justify-center my-2">
          <div className="anim-pop"><PetSprite pet={pet} size="180px" /></div>
        </div>
        <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
          <span className="chip" style={{ color: RARITY_COLOR[pet.dna.rarity] }}>{pet.dna.rarity}</span>
          <span className="chip text-cream/75">{sp.label}</span>
        </div>
        <p className="text-[12.5px] font-bold text-cream/60 italic leading-snug">«{sp.desc}»</p>

        <div className="mt-4 text-left">
          <label className="text-[11px] font-black text-cream/50 uppercase tracking-wider">Как его зовут?</label>
          <input className="input-soft mt-1.5 text-center font-display" value={name} maxLength={14} onChange={e => setName(e.target.value)} />
        </div>

        <div className="mt-3 card-soft p-3 text-left">
          <div className="flex items-center gap-2 text-butter mb-1">
            <Icon name="spark" className="w-4 h-4" />
            <span className="text-[12px] font-black uppercase tracking-wider">{ability.name}</span>
          </div>
          <p className="text-[12px] font-bold text-cream/60 leading-snug">{ability.desc}</p>
          <p className="text-[11px] font-bold text-cream/40 mt-1.5">Характер: {pet.personality.traits.join(' · ')}</p>
        </div>

        <button className="btn btn-primary w-full mt-4" onClick={() => {
          engine.renamePet(name);
          engine.completeReveal();
          engine.setBubble(`Привет! Я ${name.trim() || pet.name}. Теперь мы команда!`);
          sfx.chime();
          onDone();
        }}>
          <Icon name="heart" className="w-5 h-5" />Начать жизнь вместе
        </button>
      </div>
    </div>
  );

  if (embedded) return <div className="min-h-dvh flex p-4 overflow-y-auto">{body}</div>;
  return <div className="fixed inset-0 z-50 flex p-4 overflow-y-auto bg-night-950/85 anim-fade">{body}</div>;
}

/* ================= С ВОЗВРАЩЕНИЕМ ================= */
function formatAway(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч ${m % 60} мин`;
  const d = Math.floor(h / 24);
  return `${d} дн ${h % 24} ч`;
}

export function WelcomeBack({ awayMs, events, line, petName }: { awayMs: number; events: OfflineEvent[]; line: string; petName: string }) {
  return (
    <div className="fixed inset-0 z-50 flex p-4 bg-night-950/90 anim-fade overflow-y-auto">
      <div className="card max-w-md w-full m-auto p-4 sm:p-5 anim-pop">
        <div className="text-center mb-3">
          <p className="text-[11px] font-black text-cream/45 uppercase tracking-[0.2em]">С возвращением!</p>
          <h3 className="font-display text-xl font-bold text-butter text-glow mt-1">Вас не было {formatAway(awayMs)}</h3>
        </div>
        <p className="text-[13px] font-bold text-cream/80 text-center italic leading-relaxed">«{line}»</p>

        <div className="mt-4 space-y-2">
          <p className="text-[10.5px] font-black text-cream/45 uppercase tracking-wider px-1">Что случилось, пока вас не было:</p>
          {events.length === 0 && (
            <p className="text-[12.5px] font-bold text-cream/55 card-soft p-3">{petName} тихо дремал и видел маленький тёплый сон.</p>
          )}
          {events.map((e, i) => (
            <div key={i} className="card-soft p-3 flex items-start gap-3" style={{ animation: `toastIn 0.4s ease both ${i * 0.12}s` }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-butter shrink-0" style={{ background: 'rgba(255,217,142,0.1)' }}>
                <Icon name={e.icon} className="w-4 h-4" />
              </span>
              <p className="text-[12.5px] font-bold text-cream/75 leading-snug">{petName} {e.text}.</p>
            </div>
          ))}
        </div>

        <button className="btn btn-primary w-full mt-4" onClick={() => { engine.hugOnReturn(); sfx.purr(); }}>
          <Icon name="heart" className="w-5 h-5" />Обнять
        </button>
      </div>
    </div>
  );
}

/* ================= ПРОЩАНИЕ ================= */
export function Farewell({ entry, onNewGen, onKeep }: { entry: LegacyEntry; onNewGen: () => void; onKeep: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex p-4 anim-fade overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a2547 0%, #0c1220 75%)' }}>
      <div className="card max-w-md w-full m-auto p-5 sm:p-6 text-center anim-pop">
        <div className="mx-auto mb-3 w-20 h-20 rounded-full flex items-center justify-center anim-float"
          style={{ background: `${entry.colorPrimary}26`, boxShadow: `0 0 60px ${entry.colorPrimary}59` }}>
          <Icon name="star" className="w-10 h-10 text-butter" />
        </div>
        <p className="text-[11px] font-black text-cream/45 uppercase tracking-[0.2em]">Дух памяти</p>
        <h3 className="font-display text-2xl font-bold text-butter text-glow mt-1">{entry.name}</h3>
        <p className="text-[13px] font-bold text-cream/75 leading-relaxed mt-3">{entry.epitaph}</p>

        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          <span className="chip text-mint">{entry.species}</span>
          <span className="chip text-sky">{entry.days} дней вместе</span>
          <span className="chip text-lilac">дар: {entry.bonus}</span>
        </div>

        <p className="text-[11.5px] font-bold text-cream/45 mt-4 leading-relaxed">
          Новая жизнь унаследует его цвет и маленький дар. Связь не прерывается — она продолжается.
        </p>

        <button className="btn btn-primary w-full mt-4" onClick={onNewGen}>
          <Icon name="spark" className="w-5 h-5" />Найти новое яйцо
        </button>
        <button className="btn btn-ghost w-full mt-2 !text-xs" onClick={onKeep}>Побыть в комнате памяти</button>
      </div>
    </div>
  );
}

/* ================= НАСТРОЙКИ ================= */
export function SettingsModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saveCode, setSaveCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [city, setCity] = useState(state.owner.city);
  const [brainCode, setBrainCode] = useState('');
  const [showBrainImport, setShowBrainImport] = useState(false);
  const brain = engine.brainInfo();
  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 2600); };

  const doExport = () => {
    const code = engine.exportSave();
    setSaveCode(code);
    setShowCode(true);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => flash('Сейв скопирован в буфер обмена!'))
        .catch(() => flash('Код сейва показан ниже — скопируйте его вручную', false));
    } else flash('Код сейва показан ниже — скопируйте его вручную', false);
  };
  const doImport = () => {
    if (!importCode.trim()) { flash('Вставьте код сейва в поле ниже', false); return; }
    if (engine.importSave(importCode)) {
      flash('Сейв загружен! С возвращением.');
      setShowImport(false); setImportCode('');
    } else flash('Не получилось прочитать сейв. Проверьте код.', false);
  };
  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    engine.resetAll();
    onClose();
  };

  const doExportBrain = () => {
    const code = engine.exportBrain();
    if (!code) { flash('Мозг ещё не вырос', false); return; }
    setBrainCode(code);
    setShowBrainImport(true);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => flash('Модель мозга скопирована!'))
        .catch(() => flash('Код модели показан в поле ниже', false));
    } else flash('Код модели показан в поле ниже', false);
  };
  const doImportBrain = () => {
    if (!brainCode.trim()) { flash('Вставьте код модели в поле', false); return; }
    if (engine.importBrain(brainCode)) {
      flash('Мозг загружен! Питомец стал умнее.');
      setShowBrainImport(false); setBrainCode('');
    } else flash('Не удалось прочитать модель мозга', false);
  };

  return (
    <div className="fixed inset-0 z-50 flex p-4 bg-night-950/85 anim-fade overflow-y-auto">
      <div className="card max-w-md w-full m-auto p-4 sm:p-5 anim-pop space-y-3.5 max-h-[92dvh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-butter">Настройки</h3>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="Закрыть"><Icon name="close" className="w-5 h-5" /></button>
        </div>

        {msg && (
          <div className={`card-soft px-3 py-2 text-[12.5px] font-bold ${msg.ok ? 'text-mint' : 'text-peach'}`} style={{ animation: 'toastIn 0.3s ease both' }}>
            {msg.text}
          </div>
        )}

        <div className="card-soft p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-cream/85">
            <Icon name={state.settings.sound ? 'soundOn' : 'soundOff'} className="w-5 h-5 text-sky" />
            <span className="text-[13px] font-extrabold">Звук</span>
          </div>
          <button className={`btn !py-1.5 !px-4 !text-xs ${state.settings.sound ? 'btn-mint' : 'btn-ghost'}`}
            onClick={() => engine.setSound(!state.settings.sound)}>
            {state.settings.sound ? 'Вкл' : 'Выкл'}
          </button>
        </div>

        <div className="card-soft p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-cream/85">
            <Icon name="drop" className="w-5 h-5 text-sky" />
            <span className="text-[13px] font-extrabold">Напоминания</span>
          </div>
          <button className={`btn !py-1.5 !px-4 !text-xs ${state.settings.reminders ? 'btn-mint' : 'btn-ghost'}`}
            onClick={() => engine.setReminders(!state.settings.reminders)}>
            {state.settings.reminders ? 'Вкл' : 'Выкл'}
          </button>
        </div>

        <div className="card-soft p-3.5">
          <div className="flex items-center gap-2.5 text-cream/85 mb-2">
            <Icon name="compass" className="w-5 h-5 text-sky" />
            <span className="text-[13px] font-extrabold">Город (для погоды и прогулок)</span>
          </div>
          <div className="flex gap-2">
            <input className="input-soft flex-1 min-w-0 !py-2 !text-[12.5px]" placeholder="Например, Казань" value={city} onChange={e => setCity(e.target.value)} />
            <button className="btn btn-sky !py-2 !px-3.5 !text-xs" onClick={() => { engine.setCity(city); flash(city.trim() ? `Погода обновится для: ${city.trim()}` : 'Город убран — вернулась сезонная погода'); }}>
              <Icon name="check" className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10.5px] font-bold text-cream/35 mt-1.5 leading-snug">Настоящая погода из Open-Meteo появится за окном, а на прогулках — улицы вашего города.</p>
        </div>

        <div className="card-soft p-3.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2.5 text-cream/85">
              <Icon name="brain" className="w-5 h-5 text-lilac" />
              <span className="text-[13px] font-extrabold">Нейросеть питомца</span>
            </div>
            <span className={`chip !text-[10px] ${brain.ready ? 'text-mint' : 'text-cream/40'}`}>
              {brain.ready ? `знает ${brain.words} слов` : 'растёт…'}
            </span>
          </div>
          <p className="text-[10.5px] font-bold text-cream/40 leading-snug mb-2.5">
            Маленькая языковая модель учится на разговорах, фактах и снах. Обработано {brain.tokens.toLocaleString('ru-RU')} слов. Хранится вместе с питомцем, выгружается отдельной моделью.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-lilac !py-2 !text-xs" onClick={doExportBrain}><Icon name="export" className="w-4 h-4" />Модель</button>
            <button className="btn btn-ghost !py-2 !text-xs" onClick={() => setShowBrainImport(v => !v)}><Icon name="import" className="w-4 h-4" />Вживить</button>
          </div>
          {showBrainImport && (
            <div className="anim-fade-up space-y-2 mt-2">
              <textarea value={brainCode} onChange={e => setBrainCode(e.target.value)} placeholder="Вставьте код модели мозга…"
                className="input-soft !text-[10px] !leading-relaxed h-20 resize-none no-scrollbar" aria-label="Код модели мозга" />
              <button className="btn btn-lilac w-full !py-2 !text-xs" onClick={doImportBrain}><Icon name="import" className="w-4 h-4" />Загрузить мозг</button>
            </div>
          )}
        </div>

        <p className="text-[11px] font-bold text-cream/40 leading-relaxed px-1">
          Питомец живёт в localStorage этого браузера. Чтобы перенести его на другое устройство, экспортируйте сейв и импортируйте там.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-sky !py-2.5 !text-xs" onClick={doExport}><Icon name="export" className="w-4 h-4" />Экспорт</button>
          <button className="btn btn-lilac !py-2.5 !text-xs" onClick={() => { setShowImport(v => !v); setShowCode(false); }}><Icon name="import" className="w-4 h-4" />Импорт</button>
        </div>

        {showCode && (
          <div className="anim-fade-up">
            <textarea readOnly value={saveCode} onFocus={e => e.currentTarget.select()}
              className="input-soft !text-[10px] !leading-relaxed h-24 resize-none no-scrollbar" aria-label="Код сейва" />
            <p className="text-[10.5px] font-bold text-cream/40 mt-1 px-1">Нажмите на код, чтобы выделить его, и скопируйте.</p>
          </div>
        )}
        {showImport && (
          <div className="anim-fade-up space-y-2">
            <textarea value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="Вставьте сюда код сейва…"
              className="input-soft !text-[10px] !leading-relaxed h-24 resize-none no-scrollbar" aria-label="Код сейва для импорта" />
            <button className="btn btn-lilac w-full !py-2 !text-xs" onClick={doImport}><Icon name="import" className="w-4 h-4" />Загрузить сейв</button>
          </div>
        )}

        <button
          className={`btn w-full !text-xs transition-all ${confirmReset ? 'btn-danger' : 'btn-ghost'}`}
          onClick={doReset}>
          {confirmReset ? 'Точно? Питомец и воспоминания исчезнут. Нажмите ещё раз' : 'Начать новую историю…'}
        </button>

        <p className="text-center text-[10.5px] font-bold text-cream/30">Люмос · живёт между сном и рассветом · v1.1</p>
      </div>
    </div>
  );
}
