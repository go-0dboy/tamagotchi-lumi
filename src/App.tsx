/* ============================================================
 * ЛЮМОС — корневой компонент: игровой цикл, сцена комнаты,
 * навигация, оверлеи («С возвращением», прощание, настройки).
 * ============================================================ */
import { useEffect, useState } from 'react';
import { engine, timePhase, getWeather } from './game/engine';
import PetSprite from './components/PetSprite';
import RoomScene from './components/Room';
import HUD from './components/HUD';
import CarePanel from './components/Panels';
import Journal from './components/Journal';
import ChatPanel from './components/Chat';
import Minigames from './components/Minigames';
import DesignDoc from './components/DesignDoc';
import { Onboarding, WelcomeBack, Farewell, SettingsModal, RevealSheet } from './components/Screens';
import Icon from './components/icons';
import { sfx } from './game/sound';

const TABS = [
  { id: 'care', label: 'Забота', icon: 'care' },
  { id: 'games', label: 'Игры', icon: 'game' },
  { id: 'chat', label: 'Болталка', icon: 'chat' },
  { id: 'journal', label: 'Дневник', icon: 'diary' },
  { id: 'doc', label: 'Док', icon: 'book' },
];
const PHASE_LABEL: Record<string, string> = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };
const PHASE_ICON: Record<string, string> = { morning: 'sun', day: 'sun', evening: 'cloud', night: 'moon' };

export default function App() {
  const [, setTick] = useState(0);
  const [tab, setTab] = useState('care');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const unsub = engine.subscribe(() => setTick(t => t + 1));
    const loop = setInterval(() => engine.tick(), 4000);
    const speak = setInterval(() => { if (document.visibilityState === 'visible') engine.idleSpeak(); }, 34000);
    const saveInt = setInterval(() => engine.save(), 20000);
    const onHide = () => { if (document.visibilityState === 'hidden') engine.save(); };
    const onUnload = () => engine.save();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      unsub(); clearInterval(loop); clearInterval(speak); clearInterval(saveInt);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const s = engine.state;
  const pet = s.pet;

  if (!pet) return <Onboarding />;

  const phase = timePhase();
  const weather = getWeather();
  const ageDays = Math.max(0, Math.floor((Date.now() - pet.growth.bornAt) / 86400000));

  const newGeneration = () => engine.startNewGeneration();

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1c2a52 0%, #10172b 55%)' }}>
      {/* ------- оверлеи ------- */}
      {s.freshHatch && pet && (
        <RevealSheet pet={pet} onDone={() => engine.completeReveal()} />
      )}
      {s.pendingWelcome && !pet.transcended && !s.freshHatch && (
        <WelcomeBack awayMs={s.pendingWelcome.awayMs} events={s.pendingWelcome.events} line={s.pendingWelcome.line} petName={pet.name} />
      )}
      {s.pendingFarewell && (
        <Farewell entry={s.pendingFarewell} onNewGen={newGeneration} onKeep={() => engine.dismissFarewell()} />
      )}
      {showSettings && <SettingsModal state={s} onClose={() => setShowSettings(false)} />}

      <div className="max-w-6xl mx-auto lg:h-full lg:grid lg:grid-cols-[1fr_430px] lg:gap-5 lg:p-5">
        {/* ================= СЦЕНА ================= */}
        <div className="relative h-[50vh] min-h-[400px] lg:h-auto lg:min-h-0 overflow-hidden border-b lg:border border-sky/10 lg:rounded-[28px]">
          <RoomScene themeId={s.roomTheme} furniture={s.furniture} phase={phase} weather={weather}>
            {/* инфо-чипы сцены */}
            <div className="absolute top-3 left-3 flex gap-2 z-20">
              <span className="chip backdrop-blur-sm bg-night-900/60"><Icon name={PHASE_ICON[phase]} className="w-3.5 h-3.5 text-butter" />{PHASE_LABEL[phase]}</span>
              <span className="chip backdrop-blur-sm bg-night-900/60 text-cream/70">день {ageDays + 1}</span>
            </div>
            {pet.sleeping && <span className="chip absolute top-3 right-3 z-20 bg-night-900/60 text-sky"><Icon name="sleep" className="w-3.5 h-3.5" />спит</span>}

            {/* питомец + реплика */}
            {pet.transcended ? (
              <div className="absolute inset-x-0 bottom-[16%] flex flex-col items-center gap-4 z-10">
                <div className="anim-float">
                  <span className="block w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${pet.dna.colorPrimary}2e`, boxShadow: `0 0 50px ${pet.dna.colorPrimary}66` }}>
                    <Icon name="star" className="w-9 h-9 text-butter" />
                  </span>
                </div>
                <p className="text-[13px] font-bold text-cream/60 text-center px-8">Здесь живёт память о {pet.name}. Дерево наследия цветёт.</p>
                <button className="btn btn-primary" onClick={newGeneration}><Icon name="spark" className="w-5 h-5" />Новое яйцо</button>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-[96px] flex justify-center z-10">
                <div className="relative">
                  {s.bubble && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full w-max max-w-[240px] z-20 anim-bubble">
                      <div className="bg-cream text-night-900 px-3.5 py-2.5 rounded-2xl rounded-bl-md text-[12.5px] font-extrabold leading-snug shadow-2xl">
                        {s.bubble.text}
                      </div>
                    </div>
                  )}
                  <PetSprite pet={pet} size="min(52vw, 226px)" onStroke={() => engine.petStroke()} />
                </div>
              </div>
            )}

            {/* быстрые действия */}
            {!pet.transcended && (
              <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5 sm:gap-2 px-2 sm:px-3">
                <QuickBtn icon="berry" label="Кухня" onClick={() => setTab('care')} />
                <QuickBtn icon="heart" label="Гладить" onClick={() => engine.petStroke()} />
                <QuickBtn icon="broom" label="Уборка" onClick={() => engine.cleanRoom()} />
                <QuickBtn icon="sleep" label={pet.sleeping ? 'Будить' : 'Спать'} onClick={() => engine.toggleSleep()} />
                <QuickBtn icon="book" label="Учиться" onClick={() => { const r = engine.studyTogether(); if (!r.ok) sfx.sad(); }} />
                <QuickBtn icon="walk" label="Гулять" onClick={() => { const r = engine.explore(); if (!r.ok) sfx.sad(); }} />
              </div>
            )}
          </RoomScene>
        </div>

        {/* ================= ПАНЕЛЬ ================= */}
        <div className="lg:h-full lg:overflow-y-auto no-scrollbar px-3 sm:px-4 lg:px-0 pt-3 lg:pt-0 pb-32 lg:pb-24 space-y-3">
          <div className="card p-4">
            <HUD pet={pet} coins={s.coins} weather={weather} soundOn={s.settings.sound} onToggleSound={() => engine.toggleSetting('sound')} onOpenSettings={() => setShowSettings(true)} />
          </div>

          {tab === 'care' && <CarePanel state={s} />}
          {tab === 'games' && <Minigames petName={pet.name} />}
          {tab === 'chat' && <ChatPanel state={s} />}
          {tab === 'journal' && <Journal state={s} />}
          {tab === 'doc' && <DesignDoc />}

          {/* переключатель темы комнаты */}
          {tab === 'care' && (
            <div className="card p-4">
              <div className="text-[11px] font-black text-cream/50 uppercase tracking-wider mb-2">Настроение комнаты</div>
              <div className="flex gap-2">
                {[{ id: 'dusk', c: '#253258' }, { id: 'meadow', c: '#2e4a43' }, { id: 'rose', c: '#4a2f45' }, { id: 'sea', c: '#23435c' }].map(t => (
                  <button key={t.id} onClick={() => engine.setRoomTheme(t.id)} aria-label={`Тема ${t.id}`}
                    className={`w-10 h-10 rounded-2xl border-2 transition-all active:scale-90 ${s.roomTheme === t.id ? 'border-butter scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ background: `linear-gradient(160deg, ${t.c}, #10172b)` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------- нижняя навигация (мобильная) ------- */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden safe-bottom" style={{ background: 'linear-gradient(180deg, rgba(12,18,32,0) 0%, rgba(12,18,32,0.92) 26%)' }}>
        <div className="max-w-md mx-auto flex gap-1 px-3 pt-5 pb-1.5">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); sfx.tap(); }}>
              <Icon name={t.icon} className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ------- боковая навигация (десктоп) ------- */}
      <div className="hidden lg:flex fixed left-1/2 -translate-x-1/2 bottom-4 z-30 card !rounded-full px-2 py-1.5 gap-1" style={{ maxWidth: '94vw' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); sfx.tap(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-extrabold transition-all ${tab === t.id ? 'bg-butter text-night-900 shadow-lg' : 'text-cream/60 hover:text-cream hover:bg-night-700'}`}>
            <Icon name={t.icon} className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 group">
      <span className="w-12 h-12 rounded-2xl flex items-center justify-center border border-sky/20 text-cream bg-night-900/70 backdrop-blur-sm shadow-lg transition-all group-hover:-translate-y-1 group-hover:border-butter/60 group-hover:text-butter group-active:scale-90">
        <Icon name={icon} className="w-5.5 h-5.5" />
      </span>
      <span className="text-[9.5px] font-black text-cream/80 drop-shadow">{label}</span>
    </button>
  );
}
