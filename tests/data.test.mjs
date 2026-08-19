import test from 'node:test';
import assert from 'node:assert/strict';

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
globalThis.window = { supabase: { createClient: () => ({ from: () => { throw new Error('network access is not expected in local data tests'); } }) } };
const { emptyDay, ensureDay, initialStore, isValidStore, loadStore, STORAGE_KEY, today } = await import('../js/data.js');

test('uses the Korean calendar date', () => {
  assert.equal(today(new Date('2026-08-18T15:01:00Z')), '2026-08-19');
});

test('a new day copies feed snapshots but starts meals empty', () => {
  const store = initialStore();
  store.dailyRecords['2026-08-18'] = emptyDay([{ feedId: 7, name: '테스트', moisture: 82, kcalPerKg: 950 }]);
  store.dailyRecords['2026-08-18'].meals[0].amountG = '40';
  const next = ensureDay(store, '2026-08-19');
  assert.deepEqual(next.selectedFeeds, [{ feedId: 7, name: '테스트', moisture: 82, kcalPerKg: 950 }]);
  assert.ok(next.meals.every(meal => meal.amountG === '' && meal.addedWaterMl === ''));
});

test('invalid backup data is rejected and corrupt storage resets safely', () => {
  assert.equal(isValidStore({ dailyRecords: {} }), false);
  memory.set(STORAGE_KEY, '{broken');
  assert.equal(loadStore().version, 1);
});
