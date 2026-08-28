/* HUD: имя, стадия, уровень, искры, погода, характеристики. */
import type { Pet } from '../game/core';
import { stageForAge } from '../game/core';
import Icon from './icons';

const BARS = [
  { key: 'hunger' as const, label: 'Сытость', color: 'linear-gradient(90deg,#f4c266,#ffd98e)', icon: 'berry' },
  { key: 'energy' as const, label: 'Энергия', color: 'linear-gradient(90deg,#6fb4d8,#8ecae6)', icon: 'bolt' },
  { key: 'mood' as const, label: 'Настроение', color: 'linear-gradient(90deg,#f78fb3,#ffaec9)', icon: 'heart' },
  { key: 'cleanliness' as const, label: 'Чистота', color: 'linear-gradient(90deg,#7fd4ae,#9fe8c9)', icon: 'drop' },
];
const WEATHER_ICON: Record<string, string> = { clear: 'sun', clouds: 'cloud', rain: 'rain', snow: 'snowflake' };

export default function HUD({ pet, coins, weather, soundOn, onToggleSound, onOpenSettings }: {
  pet: Pet; coins: number; weather: { kind: string; label: string };
  soundOn: boolean; onToggleSound: () => void; onOpenSettings: () => void;
}) {
  const ageDays = Math.max(0, Math.floor((Date.now() - pet.growth.bornAt) / 86400000));
  const stage = stageForAge(ageDays);
  const xpNeed = 80 + pet.growth.level * 40;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-bold tracking-tight text-butter text-glow">Люмос</span>
        <div className="flex gap-1.5">
          <button className="btn btn-ghost !p-2.5" onClick={onToggleSound} aria-label="Звук"><Icon name={soundOn ? 'soundOn' : 'soundOff'} className="w-5 h-5" /></button>
          <button className="btn btn-ghost !p-2.5" onClick={onOpenSettings} aria-label="Настройки"><Icon name="gear" className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap -mt-1.5">
        <span className="chip text-cream/85">{pet.name}</span>
        <span className="chip" style={{ color: '#c8b6ff' }}>{stage.label} · {ageDays} дн</span>
        {pet.evolutionTraits.length > 0 && <span className="chip !text-[10.5px]" style={{ color: '#ffd98e' }}><Icon name="spark" className="w-3 h-3" />{pet.evolutionTraits.length} черт(ы)</span>}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <div className="flex justify-between text-[11px] font-extrabold text-cream/60 mb-1">
            <span>Уровень {pet.growth.level}</span>
            <span>{Math.floor(pet.growth.xp)} / {xpNeed} опыта</span>
          </div>
          <div className="bar-track !h-2.5">
            <div className="bar-fill" style={{ width: `${Math.min(100, (pet.growth.xp / xpNeed) * 100)}%`, background: 'linear-gradient(90deg,#a992f0,#c8b6ff)' }} />
          </div>
        </div>
        <div className="chip !text-sm !py-2 text-butter"><Icon name="spark" className="w-4 h-4" />{coins}</div>
        <div className="chip !text-sm !py-2 text-sky"><Icon name={WEATHER_ICON[weather.kind] ?? 'sun'} className="w-4 h-4" />{weather.label}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {BARS.map(b => {
          const v = pet.stats[b.key];
          const low = v < 25;
          return (
            <div key={b.key}>
              <div className="flex items-center justify-between mb-1">
                <span className={`flex items-center gap-1.5 text-[11px] font-extrabold ${low ? 'text-ember' : 'text-cream/65'}`}><Icon name={b.icon} className="w-3.5 h-3.5" />{b.label}</span>
                <span className={`text-[11px] font-black ${low ? 'text-ember' : 'text-cream/45'}`}>{Math.round(v)}</span>
              </div>
              <div className="bar-track"><div className={`bar-fill ${low ? 'anim-wiggle' : ''}`} style={{ width: `${v}%`, background: b.color }} /></div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-extrabold text-rose/90 mb-1"><span className="flex items-center gap-1.5"><Icon name="heart" className="w-3.5 h-3.5" /> Связь</span><span>{Math.round(pet.bond)}/100</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${pet.bond}%`, background: 'linear-gradient(90deg,#ff8fb3,#ffaec9)' }} /></div>
        </div>
        <div className="w-28">
          <div className="flex justify-between text-[11px] font-extrabold text-mint/90 mb-1"><span>Доверие</span><span>{Math.round(pet.trust)}</span></div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${pet.trust}%`, background: 'linear-gradient(90deg,#7fd4ae,#9fe8c9)' }} /></div>
        </div>
      </div>
    </div>
  );
}
