import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createServer } from 'vite';

const saveKey = 'lumos.save.v1';
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  },
});

const encode = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
const readSave = () => JSON.parse(storage.get(saveKey));
const hour = 3_600_000;
let vite;
let engine;
let soundEnabled;

before(async () => {
  vite = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
  ({ engine } = await vite.ssrLoadModule('/src/game/engine.ts'));
  ({ soundEnabled } = await vite.ssrLoadModule('/src/game/sound.ts'));
});

beforeEach(() => {
  engine.resume();
  engine.resetAll();
  engine.setSound(false);
  engine.hatchEgg();
  engine.completeReveal();
});

after(async () => { await vite?.close(); });

test('a regular tick updates the screen and saves an automatic wake-up and focus reward once', () => {
  const pet = engine.state.pet;
  pet.stats.energy = 99.99;
  pet.sleeping = true;
  engine.state.focusEndsAt = Date.now() - 1;
  engine.state.focusMinutes = 15;
  let updates = 0;
  const unsubscribe = engine.subscribe(() => updates++);
  const coins = engine.state.coins;
  engine.tick();
  assert.equal(updates, 1);
  assert.equal(pet.sleeping, false);
  assert.equal(readSave().focusEndsAt, null);
  assert.equal(readSave().coins, coins + 25);
  engine.tick();
  assert.equal(updates, 2);
  assert.equal(engine.state.coins, coins + 25);
  unsubscribe();
});

test('background saves leave the timestamp intact and only one resume simulates time away', t => {
  t.mock.method(Date, 'now', () => now);
  let now = new Date(2026, 9, 13, 10).getTime();
  engine.state.dayKey = new Date(now).toISOString().slice(0, 10);
  engine.pause();
  now += 2 * hour;
  engine.save();
  const hunger = engine.state.pet.stats.hunger;
  engine.tick();
  assert.equal(readSave().lastSeen, now - 2 * hour);
  assert.equal(engine.state.pet.stats.hunger, hunger);
  engine.resume();
  assert.equal(engine.state.pet.stats.hunger, hunger - 8);
  assert.equal(engine.state.pendingWelcome.awayMs, 2 * hour);
  engine.resume();
  assert.equal(engine.state.pet.stats.hunger, hunger - 8);
});

test('both save formats load, while a corrupted import preserves the current game', () => {
  const v1 = readSave();
  delete v1.pet.outfit;
  delete v1.pet.knowledge;
  delete v1.owner.city;
  assert.equal(engine.importSave(encode(v1)), true);
  assert.deepEqual(engine.state.pet.knowledge, []);
  assert.equal(engine.state.pet.outfit.glasses, null);
  assert.equal(engine.state.owner.city, '');
  assert.equal(soundEnabled(), false);
  const v2 = JSON.parse(Buffer.from(engine.exportSave(), 'base64').toString('utf8'));
  assert.equal(engine.importSave(encode(v2)), true);
  const before = storage.get(saveKey);
  v2.state.chat = [null];
  assert.equal(engine.importSave(encode(v2)), false);
  assert.equal(storage.get(saveKey), before);
  assert.equal(engine.state.pet.id, v1.pet.id);
});

test('closing the farewell still allows one new generation with the previous pet in the legacy', () => {
  const pet = engine.state.pet;
  pet.growth.bornAt = Date.now() - 55 * 24 * hour;
  engine.state.dayKey = '2000-01-01';
  engine.tick();
  assert.equal(engine.state.pendingFarewell.name, pet.name);
  engine.dismissFarewell();
  const entry = engine.startNewGeneration();
  assert.equal(entry.name, pet.name);
  assert.equal(engine.state.legacy[0], entry);
  assert.equal(engine.state.inherit.species, pet.dna.species);
  assert.equal(engine.startNewGeneration(), null);
});

test('weather for a previous city cannot overwrite a newer forecast', async t => {
  const response = body => new Response(JSON.stringify(body));
  let finishOld;
  const oldForecast = new Promise(resolve => { finishOld = resolve; });
  t.mock.method(globalThis, 'fetch', input => {
    const url = new URL(input);
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      const name = url.searchParams.get('name');
      return Promise.resolve(response({ results: [{ name, latitude: name === 'Казань' ? 1 : 2, longitude: 3 }] }));
    }
    if (url.searchParams.get('latitude') === '1') return oldForecast;
    return Promise.resolve(response({ current: { weather_code: 71, temperature_2m: -4 } }));
  });
  engine.state.owner.city = 'Казань';
  const oldRequest = engine.refreshWeather();
  await new Promise(resolve => setImmediate(resolve));
  engine.state.owner.city = 'Пермь';
  await engine.refreshWeather();
  finishOld(response({ current: { weather_code: 0, temperature_2m: 20 } }));
  await oldRequest;
  assert.equal(engine.state.owner.city, 'Пермь');
  assert.equal(engine.state.weatherReal.kind, 'snow');
  assert.equal(engine.state.weatherReal.temp, -4);
});
