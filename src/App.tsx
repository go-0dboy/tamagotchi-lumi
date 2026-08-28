/* ЛЮМОС — корневой компонент: сцена, верхняя навигация, панели,
 * оверлеи (учёба, прогулка, настройки), слой анимаций ухода. */
import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { engine, timePhase, getWeather, proactiveLine } from './game/engine';
import { sfx } from './game/core';
import PetSprite from './components/PetSprite';
import RoomScene from './components/Room';
import HUD from './components/HUD';
import { CarePanel, GamesHub } from './components/panels';
import ChatPanel from './components/chat';
import Journal from './components/journal';
import Minigame from './components/minigames';
import { Learning, Walk } from './components/learning';
import { Onboarding, RevealSheet, WelcomeBack, Farewell, SettingsModal } from './components/screens';
import Icon from './components/icons';

const TABS = [
  { id: 'scene', label: 'Комната', icon: 'home' },
  { id: 'care', label: 'Забота', icon: 'care' },
  { id: 'games', label: 'Игры', icon: 'game' },
  { id: 'chat', label: 'Болталка', icon: 'chat' },
  { id: 'journal', label: 'Дневник', icon: 'diary' },
];
const PHASE_LABEL = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' } as const;
const PHASE_ICON = { morning: 'sun', day: 'sun', evening: 'cloud', night: 'moon' } as const;

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Люмос упал:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex p-4" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
          <div className="card max-w-md w-full m-auto p-6 text-center anim-fade-up">
            <h2 className="font-display text-lg font-bold text-butter">Люмос споткнулся…</h2>
            <p className="text-[12.5px] font-bold text-cream/60 mt-2 leading-relaxed">Что-то пошло не так. Скорее всего, виновато старое сохранение — его можно сбросить.</p>
            <p className="text-[10.5px] font-bold text-cream/35 mt-2 break-words">{String(this.state.error?.message ?? this.state.error)}</p>
            <button className="btn btn-primary w-full mt-5" onClick={() => { engine.resetAll(); location.reload(); }}>Сбросить и запустить</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return <ErrorBoundary><Game /></ErrorBoundary>;
}

function Game() {
  const [s, setS] = useState(engine.state);
  const [tab, setTab] = useState<'scene' | 'care' | 'games' | 'chat' | 'journal'>('scene');
  const [game, setGame] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showWalk, setShowWalk] = useState(false);
  const [squishAt, setSquishAt] = useState(0);
  const [, force] = useState(0);

  const seasonal = useMemo(() => getWeather(), []);
  const weather = s.weatherReal && Date.now() - s.weatherReal.at < 3 * 3600000
    ? { kind: s.weatherReal.kind, label: s.weatherReal.label }
    : seasonal;
  const phase = timePhase();

  useEffect(() => {
    try { engine.start(); } catch (e) { console.error(e); }
    const unsub = engine.subscribe(() => { setS({ ...engine.state }); force(x => x + 1); });
    const loop = setInterval(() => engine.tick(), 4000);
    const saveInt = setInterval(() => engine.save(), 30000);
    const speak = setInterval(() => {
      if (!engine.state.settings.reminders) return;
      const p = engine.state.pet;
      if (p && !p.sleeping && !p.transcended && !document.hidden) {
        const line = engine.smartProactive() ?? (Math.random() < 0.5 ? proactiveLine(engine.state) : null);
        if (line) { engine.setBubble(line); engine.save(); }
      }
    }, 40000);
    const onHide = () => { if (document.hidden) engine.save(); };
    const onUnload = () => engine.save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    void engine.refreshWeather();
    const weatherInt = setInterval(() => void engine.refreshWeather(), 30 * 60000);
    return () => {
      unsub(); clearInterval(loop); clearInterval(saveInt); clearInterval(speak); clearInterval(weatherInt);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  /* реплика гаснет сама через 5 секунд */
  useEffect(() => {
    if (!s.bubble) return;
    const t = setTimeout(() => engine.clearBubble(), 5000);
    return () => clearTimeout(t);
  }, [s.bubble]);

  /* одноразовые эффекты гаснут через 2.6 с */
  useEffect(() => {
    if (!s.fx) return;
    const t = setTimeout(() => engine.clearFx(), 2600);
    return () => clearTimeout(t);
  }, [s.fx]);

  /* подпрыгивание при поглаживании */
  useEffect(() => { if (s.fx?.kind === 'pet') setSquishAt(s.fx.at); }, [s.fx]);

  /* горячие клавиши 1–7 */
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

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
      {s.freshHatch && <RevealSheet pet={pet} onDone={() => engine.completeReveal()} />}
      {s.pendingWelcome && !pet.transcended && !s.freshHatch && (
        <WelcomeBack awayMs={s.pendingWelcome.awayMs} events={s.pendingWelcome.events} line={s.pendingWelcome.line} petName={pet.name} />
      )}
      {s.pendingFarewell && <Farewell entry={s.pendingFarewell} onNewGen={() => engine.startNewGeneration()} onKeep={() => engine.dismissFarewell()} />}
      {showSettings && <SettingsModal state={s} onClose={() => setShowSettings(false)} />}
      {showLearning && <Learning onClose={() => setShowLearning(false)} />}
      {showWalk && <Walk onClose={() => setShowWalk(false)} />}

      {/* верхняя навигация — над комнатой */}
      <header className="sticky top-0 z-30 border-b border-sky/10" style={{ background: 'rgba(12,18,32,0.85)', backdropFilter: 'blur(12px)' }}>
        <nav className="max-w-[1280px] mx-auto flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 py-1.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as typeof tab); setGame(null); sfx.tap(); }}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}>
              <Icon name={t.icon} className="w-5 h-5" />{t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="lg:h-[calc(100dvh-54px)] lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-4 lg:p-4 lg:max-w-[1280px] lg:mx-auto">
        {/* сцена */}
        <div className="relative h-[46dvh] min-h-[330px] sm:h-[50dvh] sm:min-h-[380px] lg:h-full lg:min-h-0 overflow-hidden border-b lg:border border-sky/10 lg:rounded-[28px]">
          <RoomScene themeId={s.roomTheme} furniture={s.furniture} phase={phase} weather={weather}
            sleeping={pet.sleeping} cleanliness={pet.stats.cleanliness}>
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex gap-1.5 sm:gap-2 z-20">
              <span className="chip !text-[11px] backdrop-blur-sm bg-night-900/60"><Icon name={PHASE_ICON[phase]} className="w-3.5 h-3.5 text-butter" />{PHASE_LABEL[phase]}</span>
              <span className="chip !text-[11px] backdrop-blur-sm bg-night-900/60 text-cream/70">день {Math.max(1, Math.floor((Date.now() - pet.growth.bornAt) / 86400000) + 1)}</span>
            </div>
            {pet.sleeping && <span className="chip absolute top-2.5 sm:top-3 right-2.5 sm:right-3 z-20 bg-night-900/60 text-sky"><Icon name="sleep" className="w-3.5 h-3.5" />спит</span>}

            {s.bubble && (
              <div className="absolute top-11 sm:top-12 inset-x-0 flex justify-center z-30 pointer-events-none px-3">
                <div key={s.bubble.at} className="anim-bubble max-w-[min(300px,88%)]">
                  <div className="bg-cream text-night-900 px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[11.5px] sm:text-[12.5px] font-extrabold leading-snug shadow-2xl">{s.bubble.text}</div>
                </div>
              </div>
            )}

            {pet.transcended ? (
              <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-4 z-10 px-6">
                <div className="anim-float">
                  <span className="block w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${pet.dna.colorPrimary}2e`, boxShadow: `0 0 50px ${pet.dna.colorPrimary}66` }}>
                    <Icon name="star" className="w-9 h-9 text-butter" />
                  </span>
                </div>
                <p className="text-[13px] font-bold text-cream/60 text-center">Здесь живёт память о {pet.name}.</p>
                <button className="btn btn-primary" onClick={() => engine.startNewGeneration()}><Icon name="spark" className="w-5 h-5" />Новое яйцо</button>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-[84px] sm:bottom-[92px] lg:bottom-[70px] flex justify-center z-10">
                <div key={squishAt} className={squishAt ? 'anim-squish' : ''}>
                  <PetSprite pet={pet} size="min(50vw, 240px)" onStroke={() => engine.petStroke()} />
                </div>
              </div>
            )}

            {s.fx && <FxLayer fx={s.fx} />}

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

        {/* панель */}
        <div className="lg:h-full lg:overflow-y-auto no-scrollbar lg:pr-1">
          <div className="p-3.5 sm:p-4 pb-10 lg:pb-6 space-y-3.5 max-w-xl lg:max-w-none mx-auto">
            <HUD pet={pet} coins={s.coins} weather={weather} soundOn={s.settings.sound}
              onToggleSound={() => engine.setSound(!s.settings.sound)} onOpenSettings={() => setShowSettings(true)} />
            {tab === 'scene' && (
              <div className="card p-4 text-center anim-fade-up">
                <p className="text-[13px] font-bold text-cream/65 leading-relaxed">
                  {pet.name} сейчас в комнате. Погладьте его, выкупайте, уберитесь — или загляните во вкладки: учёба, прогулки, игры, болталка и дневник.
                </p>
                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                  <button className="btn btn-butter !py-2 !px-3.5 !text-xs" onClick={() => setTab('care')}>Забота</button>
                  <button className="btn btn-lilac !py-2 !px-3.5 !text-xs" onClick={() => setTab('games')}>Игры</button>
                  <button className="btn btn-sky !py-2 !px-3.5 !text-xs" onClick={() => setTab('chat')}>Болталка</button>
                </div>
              </div>
            )}
            {tab === 'care' && <CarePanel state={s} />}
            {tab === 'games' && (game
              ? <Minigame game={game} petName={pet.name} onExit={() => setGame(null)} />
              : <GamesHub petName={pet.name} onPlay={g => setGame(g)} />)}
            {tab === 'chat' && <ChatPanel state={s} />}
            {tab === 'journal' && <Journal state={s} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={disabled ? 'Питомец спит' : undefined}
      className={`flex flex-col items-center gap-0.5 sm:gap-1 group min-w-0 transition-opacity ${disabled ? 'opacity-30 saturate-50 pointer-events-none' : ''}`}>
      <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border border-sky/20 text-cream bg-night-900/70 backdrop-blur-sm shadow-lg transition-all group-hover:-translate-y-1 group-hover:border-butter/60 group-hover:text-butter group-active:scale-90">
        <Icon name={icon} className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
      </span>
      <span className="text-[8px] sm:text-[9.5px] font-black text-cream/80 drop-shadow leading-none whitespace-nowrap">{label}</span>
    </button>
  );
}

/* одноразовые эффекты: сердца / метла с пылью / пузыри */
function FxLayer({ fx }: { fx: { kind: 'pet' | 'clean' | 'bath'; at: number } }) {
  const key = `${fx.kind}-${fx.at}`;
  if (fx.kind === 'pet') {
    const hearts = [
      { l: '38%', b: '52%', d: 0, r: -12, x: '-24px' }, { l: '58%', b: '58%', d: 0.08, r: 14, x: '28px' },
      { l: '46%', b: '64%', d: 0.16, r: 0, x: '0px' }, { l: '34%', b: '44%', d: 0.24, r: -18, x: '-36px' },
      { l: '62%', b: '48%', d: 0.3, r: 18, x: '40px' }, { l: '50%', b: '70%', d: 0.38, r: 6, x: '10px' },
    ];
    return (
      <div key={key} className="absolute inset-0 pointer-events-none z-30">
        {hearts.map((h, i) => (
          <span key={i} className="absolute fx-heart text-rose" style={{ left: h.l, bottom: h.b, animationDelay: `${h.d}s`, ['--hr' as string]: `${h.r}deg`, ['--hx' as string]: h.x }}>
            <Icon name="heart" className="w-5 h-5 fill-current" />
          </span>
        ))}
      </div>
    );
  }
  if (fx.kind === 'clean') {
    return (
      <div key={key} className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <div className="fx-broom" style={{ bottom: '12%', width: 64 }}>
          <div className="fx-broom-inner"><Icon name="broom" className="w-14 h-14 text-butter drop-shadow-lg" /></div>
        </div>
        {[18, 34, 50, 66, 82].map((l, i) => (
          <span key={l} className="absolute fx-dust" style={{ left: `${l}%`, bottom: '12%', animationDelay: `${i * 0.18}s`, ['--dx' as string]: i % 2 ? '14px' : '-10px' }}>
            <span className="block w-7 h-7 rounded-full" style={{ background: 'rgba(255,243,226,0.28)', filter: 'blur(3px)' }} />
          </span>
        ))}
        {[26, 45, 62, 78].map((l, i) => (
          <span key={`s${l}`} className="absolute fx-spark text-mint" style={{ left: `${l}%`, bottom: '30%', animationDelay: `${0.4 + i * 0.15}s` }}>
            <Icon name="spark" className="w-4 h-4" />
          </span>
        ))}
      </div>
    );
  }
  const bubbles = [
    { l: '40%', b: '46%', s: 14, d: 0, x: '-12px' }, { l: '55%', b: '50%', s: 20, d: 0.1, x: '18px' },
    { l: '47%', b: '56%', s: 10, d: 0.2, x: '0px' }, { l: '60%', b: '44%', s: 16, d: 0.28, x: '24px' },
    { l: '36%', b: '54%', s: 12, d: 0.36, x: '-20px' }, { l: '52%', b: '62%', s: 18, d: 0.44, x: '12px' },
    { l: '44%', b: '42%', s: 9, d: 0.5, x: '-8px' }, { l: '58%', b: '58%', s: 12, d: 0.56, x: '16px' },
  ];
  return (
    <div key={key} className="absolute inset-0 pointer-events-none z-30">
      <span className="absolute left-1/2 fx-splash rounded-full border-2 border-sky/60" style={{ bottom: '22%', width: 150, height: 40 }} />
      {bubbles.map((b, i) => (
        <span key={i} className="absolute fx-bubble" style={{ left: b.l, bottom: b.b, animationDelay: `${b.d}s`, ['--bx' as string]: b.x }}>
          <span className="block rounded-full" style={{ width: b.s, height: b.s, background: 'radial-gradient(circle at 32% 30%, rgba(255,255,255,0.9), rgba(142,202,230,0.35) 60%, rgba(142,202,230,0.1))', boxShadow: '0 0 8px rgba(142,202,230,0.5)' }} />
        </span>
      ))}
      <span className="absolute left-[49%] bottom-[64%] fx-spark text-sky" style={{ animationDelay: '0.6s' }}><Icon name="drop" className="w-5 h-5" /></span>
    </div>
  );
}
