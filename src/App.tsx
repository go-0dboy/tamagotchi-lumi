/* ============================================================
 * ЛЮМОС — карманный дух-компаньон.
 * Корневой компонент: игровой цикл, сцена, навигация, оверлеи.
 * ============================================================ */
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { engine, timePhase, getWeather } from './game/engine';
import { initializeNative } from './native/platform';
import { initPwa } from './native/pwa';
import PetSprite from './components/PetSprite';
import RoomScene from './components/Room';
import HUD from './components/HUD';
import CarePanel from './components/Panels';
import { Onboarding, WelcomeBack, Farewell, RevealSheet, SettingsModal } from './components/Screens';
import Icon from './components/icons';
import { sfx } from './game/sound';
import { proactiveLine } from './game/speech';

const Minigames = lazy(() => import('./components/Minigames'));
const ChatPanel = lazy(() => import('./components/Chat'));
const Journal = lazy(() => import('./components/Journal'));
const DesignDoc = lazy(() => import('./components/DesignDoc'));
const Learning = lazy(() => import('./components/Learning'));
const Walk = lazy(() => import('./components/Walk'));

const TABS = [
  { id: 'scene', label: 'Комната', icon: 'home' },
  { id: 'care', label: 'Забота', icon: 'care' },
  { id: 'games', label: 'Игры', icon: 'game' },
  { id: 'chat', label: 'Болталка', icon: 'chat' },
  { id: 'journal', label: 'Дневник', icon: 'diary' },
  { id: 'doc', label: 'Док', icon: 'book' },
] as const;

const PHASE_LABEL = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' } as const;
const PHASE_ICON = { morning: 'sun', day: 'sun', evening: 'cloud', night: 'moon' } as const;

function Game() {
  const [s, setS] = useState(engine.state);
  const [tab, setTab] = useState<'scene' | 'care' | 'games' | 'chat' | 'journal' | 'doc'>('scene');
  const [showSettings, setShowSettings] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showWalk, setShowWalk] = useState(false);
  const [sleepLearning, setSleepLearning] = useState(false);
  const petMotion = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const seasonal = useMemo(() => getWeather(), []);
  const weather = s.weatherReal && Date.now() - s.weatherReal.at < 3 * 3600000
    ? { kind: s.weatherReal.kind, label: s.weatherReal.label }
    : seasonal;
  const phase = timePhase();

  useEffect(() => {
    const unsub = engine.subscribe(() => setS({ ...engine.state }));
    try { engine.start(); } catch (e) { console.error('Ошибка старта движка:', e); }
    /* нативная платформа (Capacitor): сплэш, статус-бар, пуши, жизненный цикл.
       В браузере — мгновенный no-op, веб-версия ничего не чувствует. */
    void initializeNative();
    /* PWA-слой: service worker + перехват «Установить приложение» */
    initPwa();
    const loop = setInterval(() => engine.tick(), 4000);
    const saveInt = setInterval(() => { if (!document.hidden) engine.save(); }, 30000);
    const speak = setInterval(() => {
      if (!engine.state.settings.reminders) return;
      const p = engine.state.pet;
      if (p && !p.sleeping && !p.transcended && !document.hidden) {
        const line = engine.smartProactive() ?? proactiveLine(engine.state);
        engine.showBubble(line);
      }
    }, 40000);
    const pause = () => engine.pause();
    const resume = () => { if (!document.hidden) engine.resume(); };
    const onVisibility = () => { if (document.hidden) pause(); else resume(); };
    if (!Capacitor.isNativePlatform()) {
      onVisibility();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', pause);
      window.addEventListener('pageshow', resume);
    }
    const refreshWeather = () => { if (!document.hidden) void engine.refreshWeather(); };
    refreshWeather();
    const weatherInt = setInterval(refreshWeather, 30 * 60000);
    return () => {
      unsub(); clearInterval(loop); clearInterval(speak); clearInterval(saveInt); clearInterval(weatherInt);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', resume);
    };
  }, []);

  /* Реакция на поглаживание сохраняет фокус на кнопке питомца. */
  useEffect(() => {
    if (s.fx?.kind !== 'pet' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = petMotion.current?.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.08, 0.9)', offset: 0.28 },
      { transform: 'scale(0.97, 1.06)', offset: 0.56 },
      { transform: 'scale(1)' },
    ], { duration: 500, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [s.fx]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (panel.current) panel.current.scrollTop = 0;
  }, [tab]);

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
  const petId = s.pet?.id;
  useEffect(() => {
    setSleepLearning(false);
    if (!petSleeping) return;
    let alive = true;
    let pending = false;
    const learn = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const ok = await engine.sleepLearn();
        if (alive) setSleepLearning(ok);
      } finally {
        pending = false;
      }
    };
    void learn();
    const iv = setInterval(() => void learn(), 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [petSleeping, petId]);

  const overlayOpen = showSettings || showLearning || showWalk || s.freshHatch || !!s.pendingFarewell
    || (!!s.pendingWelcome && !s.pet?.transcended);
  /* Горячие клавиши повторяют доступность кнопок сцены. */
  useEffect(() => {
    if (overlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select'))) return;
      const p = engine.state.pet;
      if (!p || p.transcended) return;
      if (p.sleeping && e.key !== '3' && e.key !== '5') return;
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
  }, [overlayOpen]);

  if (!s.pet) return <Onboarding />;

  const pet = s.pet;
  const ageDays = Math.max(0, Math.floor((Date.now() - pet.growth.bornAt) / 86400000));
  const roomStatus = pet.transcended ? 'Память о питомце хранится в дневнике.'
    : pet.sleeping ? `${pet.name} спит и восстанавливает энергию.`
    : pet.stats.hunger < 35 ? `${pet.name} проголодался. Загляните на кухню.`
    : pet.stats.cleanliness < 55 ? `${pet.name} пора искупать.`
    : `${pet.name} готов поиграть или отправиться на прогулку.`;
  const newGeneration = () => engine.startNewGeneration();

  return (
    <div className="game-shell min-h-dvh lg:h-dvh lg:flex lg:flex-col lg:overflow-hidden">
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
      <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-night-950/90"><PanelLoading /></div>}>
        {showLearning && !pet.transcended && <Learning petName={pet.name} onClose={() => setShowLearning(false)} />}
        {showWalk && !pet.transcended && <Walk onClose={() => setShowWalk(false)} />}
      </Suspense>

      {/* ================= НАВИГАЦИЯ СВЕРХУ ================= */}
      {/* Отступ под безопасную зону: на Android статус-бар занимает своё место
          (inset = 0), на iOS env(safe-area-inset-top) компенсирует «чёлку». */}
      <header className="game-header sticky top-0 z-30 border-b border-sky/10 shrink-0">
        <nav aria-label="Разделы игры" className="max-w-[1280px] mx-auto flex items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 py-1">
          {TABS.map(t => (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => { setTab(t.id); sfx.tap(); }}
              className="game-nav-button">
              <Icon name={t.icon} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(350px,36%)] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:p-5 lg:max-w-[1280px] lg:mx-auto lg:w-full">
        {/* ================= СЦЕНА ================= */}
        <section aria-label="Комната питомца" className={`room-card ${tab === 'scene' ? 'grid' : 'hidden lg:grid'}`}>
          <div className="room-stage">
            <RoomScene themeId={s.roomTheme} furniture={s.furniture} phase={phase} weatherKind={weather.kind}
              sleeping={pet.sleeping} cleanliness={pet.stats.cleanliness}>
              {/* инфо-чипы сцены */}
              <div className="room-badges absolute inset-x-3 top-3 flex flex-wrap gap-1.5 z-20">
                <span className="chip room-badge"><Icon name={PHASE_ICON[phase]} className="w-3.5 h-3.5 text-butter" />{PHASE_LABEL[phase]}</span>
                <span className="chip room-badge text-cream/75">День {ageDays + 1}</span>
                {pet.sleeping && <span className="chip room-badge ml-auto text-sky"><Icon name="sleep" className="w-3.5 h-3.5" />спит</span>}
              </div>

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
                <div className="scene-resident absolute inset-x-0 flex justify-center z-10">
                  <div className="relative">
                    {s.bubble && (
                      <div className="scene-message absolute left-1/2 -translate-x-1/2 w-max z-30">
                        <div key={s.bubble.at} className="anim-bubble">
                          <div className="scene-speech" role="status">
                            {s.bubble.text}
                          </div>
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2.5 h-2.5 bg-cream rotate-45 rounded-[2px]" />
                        </div>
                      </div>
                    )}
                    {pet.sleeping && !s.bubble && (
                      <div className="scene-message scene-dream absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <DreamCloud learning={sleepLearning} />
                      </div>
                    )}
                    <div ref={petMotion} className="scene-pet-motion">
                      <PetSprite pet={pet} size="var(--scene-pet-size)" onStroke={() => engine.petStroke()} />
                    </div>
                  </div>
                </div>
              )}

              {/* одноразовые анимации: сердца, метла, пузыри */}
              {!pet.transcended && s.fx && <FxLayer fx={s.fx} />}
            </RoomScene>
          </div>
          {!pet.transcended && (
            <div className="room-actions" aria-label="Быстрые действия">
              <QuickBtn icon="berry" label="Кухня" disabled={pet.sleeping} onClick={() => setTab('care')} />
              <QuickBtn icon="heart" label="Гладить" disabled={pet.sleeping} onClick={() => engine.petStroke()} />
              <QuickBtn icon="broom" label="Уборка" onClick={() => { const r = engine.cleanRoom(); if (!r.ok) sfx.sad(); }} />
              <QuickBtn icon="drop" label="Купать" disabled={pet.sleeping} onClick={() => { const r = engine.bathPet(); if (!r.ok) sfx.sad(); }} />
              <QuickBtn icon="sleep" label={pet.sleeping ? 'Будить' : 'Спать'} onClick={() => engine.toggleSleep()} />
              <QuickBtn icon="book" label="Учиться" disabled={pet.sleeping} onClick={() => setShowLearning(true)} />
              <QuickBtn icon="walk" label="Гулять" disabled={pet.sleeping} onClick={() => setShowWalk(true)} />
            </div>
          )}
        </section>

        {/* ================= ПАНЕЛЬ ================= */}
        {/* нижний отступ учитывает системную панель Android («Назад/Домой»)
            и домашний индикатор iPhone — контент никогда не уходит под них */}
        <div ref={panel} className="lg:h-full lg:overflow-y-auto no-scrollbar lg:pr-1">
          <div className="px-3 pt-3 sm:px-4 lg:px-0 lg:pt-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] lg:pb-5 space-y-3.5 max-w-xl lg:max-w-none mx-auto">
            <div className={tab === 'scene' ? undefined : 'hidden lg:block'}>
              <HUD pet={pet} coins={s.coins} weather={weather} soundOn={s.settings.sound}
                onToggleSound={() => engine.setSound(!s.settings.sound)} onOpenSettings={() => setShowSettings(true)} />
            </div>

            {tab === 'scene' && (
              <div className="card p-4 text-center anim-fade-up">
                <p className="text-[13px] font-bold text-cream/65 leading-relaxed">
                  {roomStatus}
                </p>
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                  <button className="btn btn-butter !py-2 !px-3.5 !text-xs" onClick={() => setTab('care')}>Забота</button>
                  <button className="btn btn-lilac !py-2 !px-3.5 !text-xs" onClick={() => setTab('games')}>Игры</button>
                  <button className="btn btn-sky !py-2 !px-3.5 !text-xs" onClick={() => setTab('chat')}>Болталка</button>
                </div>
              </div>
            )}
            {tab === 'care' && <CarePanel state={s} />}
            <Suspense fallback={<PanelLoading />}>
              {tab === 'games' && <Minigames petName={pet.name} />}
              {tab === 'chat' && <ChatPanel state={s} />}
              {tab === 'journal' && <Journal state={s} />}
              {tab === 'doc' && <DesignDoc />}
            </Suspense>
          </div>
        </div>
      </main>

    </div>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="room-action" onClick={onClick} disabled={disabled}
      title={disabled ? 'Питомец спит — сначала разбудите' : undefined}>
      <Icon name={icon} className="w-5 h-5 sm:w-6 sm:h-6" />
      <span>{label}</span>
    </button>
  );
}

function PanelLoading() {
  return <p role="status" className="card px-5 py-4 text-center text-sm text-cream/70">Открываем раздел…</p>;
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
        <div className="min-h-dvh flex safe-p-4" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
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
