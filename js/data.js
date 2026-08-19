import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { MEAL_TIMES } from './calculations.js';

export const STORAGE_KEY = 'eundong-daily-v1';
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const today = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
const emptyMeal = (slot) => ({ slot, time: MEAL_TIMES[slot - 1], feedId: null, amountG: '', addedWaterMl: '' });
export const emptyDay = (selectedFeeds = []) => ({ weightKg: '', selectedFeeds: selectedFeeds.map(feed => ({ ...feed })), meals: MEAL_TIMES.map((_, i) => emptyMeal(i + 1)) });
export const initialStore = () => ({ version: 1, settings: { petName: '은동', goalWeightKg: '', goalStartDate: today(), goalStartWeightKg: '', weeklyChangeKg: -0.05 }, dailyRecords: {} });

export function isValidStore(value) {
  return Boolean(value && value.version === 1 && value.settings && typeof value.settings === 'object' && value.dailyRecords && typeof value.dailyRecords === 'object' && !Array.isArray(value.dailyRecords));
}

export function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isValidStore(parsed) ? parsed : initialStore();
  } catch { return initialStore(); }
}
export function saveStore(store) { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }

export function ensureDay(store, date) {
  if (!store.dailyRecords[date]) {
    const previousDate = Object.keys(store.dailyRecords).filter(d => d < date).sort().at(-1);
    const previousFeeds = previousDate ? store.dailyRecords[previousDate].selectedFeeds || [] : [];
    store.dailyRecords[date] = emptyDay(previousFeeds);
    saveStore(store);
  }
  const day = store.dailyRecords[date];
  day.selectedFeeds ||= [];
  day.meals = MEAL_TIMES.map((time, i) => ({ ...emptyMeal(i + 1), ...(day.meals || []).find(m => Number(m.slot) === i + 1), slot: i + 1, time }));
  return day;
}

export async function searchFeeds(query) {
  const safe = query.replace(/[%_,()]/g, ' ').trim();
  if (safe.length < 2) return [];
  const { data, error } = await db.from('feeds')
    .select('id,제품명,수분,final_me,verified,verification_status,searchable_before_review')
    .eq('type', 'wet').or('verified.eq.true,searchable_before_review.eq.true')
    .ilike('제품명', `%${safe}%`).limit(12);
  if (error) throw error;
  return data || [];
}
