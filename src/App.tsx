/* ============================================================
 * ЛЮМОС — карманный дух-компаньон.
 * Корневой компонент: игровой цикл, сцена, навигация, оверлеи.
 * ============================================================ */
import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { engine, timePhase, getWeather } from './game/engine';
import { initializeNative } from './native/platform';
import PetSprite from './components/PetSprite';
import RoomScene from './components/Room';
import HUD from './components/HUD';
import CarePanel from './components/Panels';
import Minigames from './components/Minigames';
import ChatPanel from './components/Chat';
import Journal from './components/Journal';
import DesignDoc from './components/DesignDoc';
import Learning from './components/Learning';
import Walk from './components/Walk';
import { Onboarding, WelcomeBack, Farewell, RevealSheet, SettingsModal } from './components/Screens';
import Icon from './components/icons';
import { sfx } from './game/sound';
import { proactiveLine } from './game/speech';

const TABS = [
  { id: 'scene', label: 'Комната', icon: 'home' },
  { id: 'care', label: 'Забота', icon: 'care' },
  { id: 'games', label: 'Игры', icon: 'game' },
  { id: 'chat', label: 'Болталка', icon: 'chat' },
  { id: 'journal', label: 'Дневник', icon: 'diary' },
  { id: 'doc', label: 'Док', icon: 'book' },
];

const PHASE_LABEL = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' } as const;
const PHASE_ICON = { morning: 'sun', day: 'sun', evening: 'cloud', night: 'moon' } as const;

function Game() {
  const [s, setS] = useState(engine.state);
  const [tab, setTab] = useState<'scene' | 'care' | 'games' | 'chat' | 'journal' | 'doc'>('scene');
  const [showSettings, setShowSettings] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showWalk, setShowWalk] = useState(false);
  const [squishAt, setSquishAt] = useState(0);
  const [sleepLearning, setSleepLearning] = useState(false);
  const [, force] = useState(0);

  const seasonal = useMemo(() => getWeather(), []);
  const weather = s.weatherReal && Date.now() - s.weatherReal.at < 3 * 3600000
    ? { kind: s.weatherReal.kind, label: s.weatherReal.label }
    : seasonal;
  const phase = timePhase();

  useEffect(() => {
    try { engine.start(); } catch (e) { console.error('Ошибка старта движка:', e); }
    /* нативная платформа (Capacitor): сплэш, статус-бар, пуши, жизненный цикл.
       В браузере — мгновенный no-op, веб-версия ничего не чувствует. */
    void initializeNative();
    const unsub = engine.subscribe(() => { setS({ ...engine.state }); force(x => x + 1); });
    const loop = setInterval(() => engine.tick(), 4000);
    const saveInt = setInterval(() => engine.save(), 30000);
    const speak = setInterval(() => {
      if (!engine.state.settings.reminders) return;
      const p = engine.state.pet;
      if (p && !p.sleeping && !p.transcended && !document.hidden) {
        const line = engine.smartProactive() ?? proactiveLine(engine.state);
        engine.setBubble(line);
        engine.save();
      }
    }, 40000);
    const onHide = () => { if (document.hidden) engine.save(); };
    const onUnload = () => engine.save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    void engine.refreshWeather();
    const weatherInt = setInterval(() => void engine.refreshWeather(), 30 * 60000);
    return () => {
      unsub(); clearInterval(loop); clearInterval(speak); clearInterval(saveInt); clearInterval(weatherInt);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  /* «подпрыгивание» питомца при поглаживании */
  useEffect(() => {
    if (s.fx?.kind === 'pet') setSquishAt(s.fx.at);
  }, [s.fx]);

  /* одноразовые эффекты (сердца/метла/пузыри) гаснут после проигрывания */
  useEffect(() => {
    if (!s.fx) return;
    const t = setTimeout(() => engine.clearFx(), 2600);
    return () => clearTimeout(t);
  }, [s.fx]);

  /* реплика питомца исчезает сама через несколько секунд */
  useEffect(() => {
    if (!s.bubble) return;
    const t = setTimeout(() => engine.clearBubble(), 5000);
    return () => clearTimeout(t);
  }, [s.bubble]);

  /* самообучение нейросети во сне: пока питомец спит, каждые 20 с
     читаем статью из Википедии и дообучаем мозг (нужен интернет) */
  const petSleeping = !!s.pet?.sleeping && !s.pet.transcended;
  useEffect(() => {
    if (!petSleeping) { setSleepLearning(false); return; }
    let alive = true;
    const learn = async () => {
      const ok = await engine.sleepLearn();
      if (alive) setSleepLearning(ok);
    };
    void learn();
    const iv = setInterval(() => void learn(), 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [petSleeping]);

  /* горячие клавиши для ПК: 1–7 повторяют кнопки под сценой */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const p = engine.state.pet;
      if (!p || p.transcended) return;
      switch (e.key) {
        case '1': setTab('care'); sfx.tap(); break;
        case '2': engine.petStroke(); break;
        case '3': engine.cleanRoom(); break;
        case '4': engine.bathPet(); break;
        case '5': engine.toggleSleep(); break;
        case '6': setShowLearning(true); break;
        case '7': setShowWalk(true); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!s.pet) return <Onboarding />;

  const pet = s.pet;
  const ageDays = Math.max(0, Math.floor((Date.now() - pet.growth.bornAt) / 86400000));
  const newGeneration = () => engine.startNewGeneration();

  return (
    <div className="min-h-dvh lg:h-dvh lg:flex lg:flex-col lg:overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
      {/* ------- оверлеи ------- */}
      {s.freshHatch && (
        <RevealSheet pet={pet} onDone={() => engine.completeReveal()} />
      )}
      {s.pendingWelcome && !pet.transcended && !s.freshHatch && (
        <WelcomeBack awayMs={s.pendingWelcome.awayMs} events={s.pendingWelcome.events} line={s.pendingWelcome.line} petName={pet.name} />
      )}
      {s.pendingFarewell && (
        <Farewell entry={s.pendingFarewell} onNewGen={newGeneration} onKeep={() => engine.dismissFarewell()} />
      )}
      {showSettings && <SettingsModal state={s} onClose={() => setShowSettings(false)} />}
      {showLearning && pet && !pet.transcended && <Learning petName={pet.name} onClose={() => setShowLearning(false)} />}
      {showWalk && pet && !pet.transcended && <Walk onClose={() => setShowWalk(false)} />}

      {/* ================= НАВИГАЦИЯ СВЕРХУ ================= */}
      {/* Отступ под безопасную зону: на Android статус-бар занимает своё место
          (inset = 0), на iOS env(safe-area-inset-top) компенсирует «чёлку». */}
      <header className="sticky top-0 z-30 border-b border-sky/10 shrink-0"
        style={{ background: 'rgba(12,18,32,0.85)', backdropFilter: 'blur(12px)', paddingTop: 'env(safe-area-inset-top)' }}>
        <nav className="max-w-[1280px] mx-auto flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-1.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as typeof tab); sfx.tap(); }}
              className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-1 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[12px] font-extrabold leading-none transition-all whitespace-nowrap ${tab === t.id ? 'bg-butter/15 text-butter' : 'text-cream/50 hover:text-cream hover:bg-night-700/60'}`}>
              <Icon name={t.icon} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:p-4 lg:pt-2.5 lg:max-w-[1280px] lg:mx-auto lg:w-full">
        {/* ================= СЦЕНА ================= */}
        <div className="relative h-[46dvh] min-h-[330px] sm:h-[50dvh] sm:min-h-[380px] lg:h-full lg:min-h-0 overflow-hidden border-b lg:border border-sky/10 lg:rounded-[28px]">
          <RoomScene themeId={s.roomTheme} furniture={s.furniture} phase={phase} weather={weather}
            sleeping={pet.sleeping} cleanliness={pet.stats.cleanliness}>
            {/* инфо-чипы сцены */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex gap-1.5 sm:gap-2 z-20">
              <span className="chip !text-[11px] backdrop-blur-sm bg-night-900/60"><Icon name={PHASE_ICON[phase]} className="w-3.5 h-3.5 text-butter" />{PHASE_LABEL[phase]}</span>
              <span className="chip !text-[11px] backdrop-blur-sm bg-night-900/60 text-cream/70">день {ageDays + 1}</span>
            </div>
            {pet.sleeping && <span className="chip absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-20 bg-night-900/60 text-sky"><Icon name="sleep" className="w-3.5 h-3.5" />спит</span>}

            {/* реплика — закреплена сверху сцены: никогда не вылетает за край */}
            {/* питомец */}
            {pet.transcended ? (
              <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-4 z-10 px-6">
                <div className="anim-float">
                  <span className="block w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${pet.dna.colorPrimary}2e`, boxShadow: `0 0 50px ${pet.dna.colorPrimary}66` }}>
                    <Icon name="star" className="w-9 h-9 text-butter" />
                  </span>
                </div>
                <p className="text-[13px] font-bold text-cream/60 text-center">Здесь живёт память о {pet.name}. Дерево наследия цветёт.</p>
                <button className="btn btn-primary" onClick={newGeneration}><Icon name="spark" className="w-5 h-5" />Новое яйцо</button>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-[84px] sm:bottom-[92px] lg:bottom-[70px] flex justify-center z-10">
                <div className="relative">
                  {/* Реплика привязана к питомцу. bottom задан ПРОЦЕНТОМ от высоты
                      спрайта (78% ≈ макушка), а не bottom-full — так облачко всегда
                      сидит на голове и не улетает к верху окна на любом разрешении.
                      Внешний div — только позиционирование (без анимации transform),
                      внутренний — анимация появления. Хвостик указывает на голову. */}
                  {s.bubble && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[78%] w-max max-w-[min(380px,86vw)] z-30 pointer-events-none">
                      <div key={s.bubble.at} className="anim-bubble">
                        <div className="relative bg-cream text-night-900 px-3.5 py-2.5 rounded-2xl text-[11.5px] sm:text-[12.5px] font-extrabold leading-snug shadow-2xl">
                          {s.bubble.text}
                          {/* хвостик пузыря, указывающий на макушку */}
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-cream rotate-45 rounded-[3px]" />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Облака сна привязаны к питомцу (центрированы по его обёртке),
                      а не к сцене — так они всегда ровно над головой.
                      Скрываются, когда показывается реплика (например, при побудке). */}
                  {pet.sleeping && !s.bubble && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[78%] z-20 pointer-events-none">
                      <DreamCloud learning={sleepLearning} />
                    </div>
                  )}
                  <div key={squishAt} className={squishAt ? 'anim-squish' : ''}>
                    <PetSprite pet={pet} size="min(46vw, 232px)" onStroke={() => engine.petStroke()} />
                  </div>
                </div>
              </div>
            )}

            {/* одноразовые анимации: сердца, метла, пузыри */}
            {!pet.transcended && s.fx && <FxLayer fx={s.fx} />}

            {/* быстрые действия под питомцем; во сне доступны только сон и уборка */}
            {!pet.transcended && (
              <div className="absolute inset-x-0 bottom-2.5 sm:bottom-3 z-20 flex justify-center gap-0.5 sm:gap-1.5 px-1">
                <QuickBtn icon="berry" label="Кухня" disabled={pet.sleeping} onClick={() => setTab('care')} />
                <QuickBtn icon="heart" label="Гладить" disabled={pet.sleeping} onClick={() => engine.petStroke()} />
                <QuickBtn icon="broom" label="Уборка" onClick={() => { const r = engine.cleanRoom(); if (!r.ok) sfx.sad(); }} />
                <QuickBtn icon="drop" label="Купать" disabled={pet.sleeping} onClick={() => { const r = engine.bathPet(); if (!r.ok) sfx.sad(); }} />
                <QuickBtn icon="sleep" label={pet.sleeping ? 'Будить' : 'Спать'} onClick={() => engine.toggleSleep()} />
                <QuickBtn icon="book" label="Учиться" disabled={pet.sleeping} onClick={() => setShowLearning(true)} />
                <QuickBtn icon="walk" label="Гулять" disabled={pet.sleeping} onClick={() => setShowWalk(true)} />
              </div>
            )}
          </RoomScene>
        </div>

        {/* ================= ПАНЕЛЬ ================= */}
        <div className="lg:h-full lg:overflow-y-auto no-scrollbar lg:pr-1">
          <div className="p-3.5 sm:p-4 pb-8 lg:pb-6 space-y-3.5 max-w-xl lg:max-w-none mx-auto">
            <HUD pet={pet} coins={s.coins} weather={weather} soundOn={s.settings.sound}
              onToggleSound={() => engine.setSound(!s.settings.sound)} onOpenSettings={() => setShowSettings(true)} />

            {tab === 'scene' && (
              <div className="card p-4 text-center anim-fade-up">
                <p className="text-[13px] font-bold text-cream/65 leading-relaxed">
                  {pet.name} сейчас в комнате. Погладьте его, выкупайте, уберитесь — или загляните во вкладки: там еда, учёба, прогулки, игры и дневник.
                </p>
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                  <button className="btn btn-butter !py-2 !px-3.5 !text-xs" onClick={() => setTab('care')}>Забота</button>
                  <button className="btn btn-lilac !py-2 !px-3.5 !text-xs" onClick={() => setTab('games')}>Игры</button>
                  <button className="btn btn-sky !py-2 !px-3.5 !text-xs" onClick={() => setTab('chat')}>Болталка</button>
                </div>
              </div>
            )}
            {tab === 'care' && <CarePanel state={s} />}
            {tab === 'games' && <Minigames petName={pet.name} />}
            {tab === 'chat' && <ChatPanel state={s} />}
            {tab === 'journal' && <Journal state={s} />}
            {tab === 'doc' && <DesignDoc />}
          </div>
        </div>
      </div>

    </div>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={disabled ? 'Питомец спит — сначала разбудите' : undefined}
      className={`flex flex-col items-center gap-0.5 sm:gap-1 group min-w-0 transition-opacity ${disabled ? 'opacity-30 saturate-50 pointer-events-none' : ''}`}>
      <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border border-sky/20 text-cream bg-night-900/70 backdrop-blur-sm shadow-lg transition-all group-hover:-translate-y-1 group-hover:border-butter/60 group-hover:text-butter group-active:scale-90">
        <Icon name={icon} className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
      </span>
      <span className="text-[8px] sm:text-[9.5px] font-black text-cream/80 drop-shadow leading-none whitespace-nowrap">{label}</span>
    </button>
  );
}

/* Целостная «сновидческая» композиция над спящим питомцем:
   большое облако + два маленьких, плывущих с разной скоростью,
   мерцающие звёзды вокруг. Когда learning=true — нейросеть читает
   Википедию: в облаке пульсирует мозг с книгой, а снизу прикреплена
   pill-подпись «учится во сне…» — всё как единое целое. */
function DreamCloud({ learning }: { learning: boolean }) {
  return (
    <div className="relative w-[210px] h-[104px]">
      {/* мерцающие звёзды вокруг облаков */}
      {[[16, 10, 0], [188, 6, 0.8], [6, 46, 1.4], [200, 50, 2], [104, 0, 2.6]].map(([l, t, d], i) => (
        <span key={`st${i}`} className="absolute rounded-full bg-butter"
          style={{ left: l, top: t, width: 3, height: 3, animation: `twinkle ${2.2 + i * 0.5}s ease-in-out infinite ${d}s` }} />
      ))}

      {/* маленькое облако слева — плывёт медленно */}
      <svg viewBox="0 0 64 36" className="absolute left-0 bottom-9 w-[60px] opacity-80"
        style={{ animation: 'floatSlow 6.5s ease-in-out infinite 0.9s' }}>
        <ellipse cx="22" cy="24" rx="17" ry="10" fill="rgba(255,243,226,0.78)" />
        <ellipse cx="41" cy="19" rx="17" ry="12" fill="rgba(255,243,226,0.84)" />
      </svg>

      {/* маленькое облако справа — плывёт ещё медленнее */}
      <svg viewBox="0 0 60 34" className="absolute right-0 bottom-12 w-[54px] opacity-70"
        style={{ animation: 'floatSlow 7.5s ease-in-out infinite 1.7s' }}>
        <ellipse cx="23" cy="20" rx="17" ry="11" fill="rgba(255,243,226,0.72)" />
        <ellipse cx="41" cy="24" rx="14" ry="9" fill="rgba(255,243,226,0.68)" />
      </svg>

      {/* главное облако — у самого низа композиции: низ коробки стоит
          на якоре (макушка), и облако растёт вверх, как облачко фразы */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[132px] h-[66px]">
        <svg viewBox="0 0 132 66" className="absolute inset-0 w-full h-full drop-shadow-lg">
          <ellipse cx="37" cy="45" rx="28" ry="17" fill="rgba(255,243,226,0.92)" />
          <ellipse cx="71" cy="34" rx="32" ry="20" fill="rgba(255,243,226,0.96)" />
          <ellipse cx="101" cy="47" rx="23" ry="14" fill="rgba(255,243,226,0.9)" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center text-butter" style={{ paddingBottom: 8 }}>
          {learning ? (
            /* мозг в мягком свечении + книга/звезда — учимся во сне */
            <span className="flex items-center gap-1.5">
              <span className="relative flex items-center justify-center">
                <span className="absolute w-9 h-9 rounded-full"
                  style={{ background: 'rgba(200,182,255,0.35)', animation: 'pulseSoft 1.8s ease-in-out infinite' }} />
                <Icon name="brain" className="relative w-6 h-6 text-lilac" />
              </span>
              <span className="dream-icon" style={{ animationDelay: '0s' }}><Icon name="book" className="w-4 h-4" /></span>
              <span className="dream-icon absolute" style={{ animationDelay: '1.5s' }}><Icon name="star" className="w-4 h-4" /></span>
            </span>
          ) : (
            <>
              <span className="dream-icon" style={{ animationDelay: '0s' }}><Icon name="star" className="w-5 h-5" /></span>
              <span className="dream-icon absolute" style={{ animationDelay: '2s' }}><Icon name="moon" className="w-5 h-5" /></span>
              <span className="dream-icon absolute" style={{ animationDelay: '4s' }}><Icon name="spark" className="w-5 h-5" /></span>
            </>
          )}
        </div>

        {/* pill-подпись, прикреплённая к облаку — часть композиции */}
        {learning && (
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(200,182,255,0.18)', border: '1px solid rgba(200,182,255,0.4)', animation: 'fadeIn 0.6s ease both' }}>
            <span className="text-[9px] font-black text-lilac tracking-wide" style={{ textShadow: '0 0 8px rgba(200,182,255,0.5)' }}>
              учится во сне…
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* одноразовые эффекты в сцене, запускаются по s.fx.at */
function FxLayer({ fx }: { fx: { kind: 'pet' | 'clean' | 'bath'; at: number } }) {
  const key = `${fx.kind}-${fx.at}`;

  if (fx.kind === 'pet') {
    const hearts = [
      { l: '38%', b: '52%', d: 0, r: -12, x: '-14px', sz: 'w-5 h-5' },
      { l: '58%', b: '58%', d: 0.08, r: 14, x: '16px', sz: 'w-6 h-6' },
      { l: '46%', b: '64%', d: 0.16, r: 0, x: '-6px', sz: 'w-4 h-4' },
      { l: '34%', b: '44%', d: 0.24, r: -18, x: '-20px', sz: 'w-5 h-5' },
      { l: '62%', b: '48%', d: 0.3, r: 18, x: '22px', sz: 'w-4 h-4' },
      { l: '50%', b: '70%', d: 0.38, r: 6, x: '8px', sz: 'w-6 h-6' },
    ];
    return (
      <div key={key} className="absolute inset-0 pointer-events-none z-30">
        {hearts.map((h, i) => (
          <span key={i} className={`absolute fx-heart text-rose ${h.sz}`}
            style={{ left: h.l, bottom: h.b, animationDelay: `${h.d}s`, ['--hr' as string]: `${h.r}deg`, ['--hx' as string]: h.x }}>
            <Icon name="heart" className="w-full h-full fill-current" />
          </span>
        ))}
      </div>
    );
  }

  if (fx.kind === 'clean') {
    return (
      <div key={key} className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {/* метла проезжает слева направо, покачиваясь */}
        <div className="fx-broom" style={{ bottom: '11%' }}>
          <div className="fx-broom-inner">
            <Icon name="broom" className="w-12 h-12 sm:w-14 sm:h-14 text-butter drop-shadow-lg" />
          </div>
        </div>
        {/* облачка пыли */}
        {[18, 34, 50, 66, 82].map((l, i) => (
          <span key={l} className="absolute fx-dust" style={{ left: `${l}%`, bottom: '12%', animationDelay: `${i * 0.2}s`, ['--dx' as string]: `${i % 2 ? 14 : -10}px` }}>
            <span className="block w-7 h-7 rounded-full" style={{ background: 'rgba(255,243,226,0.28)', filter: 'blur(3px)' }} />
          </span>
        ))}
        {/* искорки чистоты */}
        {[26, 45, 62, 78].map((l, i) => (
          <span key={`s${l}`} className="absolute fx-spark text-mint" style={{ left: `${l}%`, bottom: '32%', animationDelay: `${0.5 + i * 0.16}s` }}>
            <Icon name="spark" className="w-4 h-4" />
          </span>
        ))}
      </div>
    );
  }

  /* bath */
  const bubbles = [
    { l: '40%', b: '46%', s: 14, d: 0, x: '-10px' }, { l: '55%', b: '50%', s: 20, d: 0.1, x: '12px' },
    { l: '47%', b: '56%', s: 10, d: 0.2, x: '-6px' }, { l: '60%', b: '44%', s: 16, d: 0.28, x: '16px' },
    { l: '36%', b: '54%', s: 12, d: 0.36, x: '-14px' }, { l: '52%', b: '62%', s: 18, d: 0.44, x: '8px' },
    { l: '44%', b: '42%', s: 9, d: 0.5, x: '-4px' }, { l: '58%', b: '58%', s: 12, d: 0.56, x: '10px' },
  ];
  return (
    <div key={key} className="absolute inset-0 pointer-events-none z-30">
      {/* кольцо всплеска у лап (центрируется через keyframe translateX(-50%)) */}
      <span className="absolute left-1/2 fx-splash rounded-full border-2 border-sky/60" style={{ bottom: '22%', width: '150px', height: '40px' }} />
      {bubbles.map((b, i) => (
        <span key={i} className="absolute fx-bubble" style={{ left: b.l, bottom: b.b, animationDelay: `${b.d}s`, ['--bx' as string]: b.x }}>
          <span className="block rounded-full" style={{
            width: b.s, height: b.s,
            background: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,0.9), rgba(142,202,230,0.35) 60%, rgba(142,202,230,0.1))',
            boxShadow: '0 0 8px rgba(142,202,230,0.5)',
          }} />
        </span>
      ))}
      <span className="absolute left-[49%] bottom-[64%] fx-spark text-sky" style={{ animationDelay: '0.6s' }}>
        <Icon name="drop" className="w-5 h-5" />
      </span>
    </div>
  );
}

/* ---------- защитный экран запуска ---------- */
class LaunchBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Люмос упал:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex p-4" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
          <div className="card max-w-md w-full m-auto p-6 text-center anim-fade-up">
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl flex items-center justify-center text-ember" style={{ background: 'rgba(255,143,125,0.12)' }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><circle cx="12" cy="16.5" r="0.6" fill="currentColor" /></svg>
            </div>
            <h2 className="font-display text-lg font-bold text-butter">Люмос споткнулся…</h2>
            <p className="text-[12.5px] font-bold text-cream/60 mt-2 leading-relaxed">
              Что-то пошло не так при запуске. Скорее всего, виновато старое сохранение. Его можно сбросить — начнём новую историю.
            </p>
            <p className="text-[10.5px] font-bold text-cream/35 mt-2 break-words">{String(this.state.error?.message ?? this.state.error)}</p>
            <div className="flex flex-col gap-2 mt-5">
              <button className="btn btn-primary" onClick={() => { engine.resetAll(); location.reload(); }}>Сбросить сохранение и запустить</button>
              <button className="btn btn-ghost !text-xs" onClick={() => location.reload()}>Просто перезагрузить</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <LaunchBoundary>
      <Game />
    </LaunchBoundary>
  );
}
