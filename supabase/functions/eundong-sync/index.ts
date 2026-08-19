import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const PROD_ORIGIN = 'https://provedcat.github.io';
const LOCAL_ORIGINS = new Set(['http://localhost:4173', 'http://127.0.0.1:4173']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIMES = ['06:30', '09:00', '18:30', '23:00'];
const encoder = new TextEncoder();

function originAllowed(origin: string) { return origin === PROD_ORIGIN || LOCAL_ORIGINS.has(origin); }
function cors(origin: string) { return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'apikey,content-type,x-eundong-sync-token', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Vary': 'Origin' }; }
function response(origin: string, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
function validDate(value: unknown): value is string { if (typeof value !== 'string' || !DATE_RE.test(value)) return false; const d = new Date(`${value}T00:00:00Z`); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value; }
function number(value: unknown, min: number, max: number, nullable = false): number | null { if ((value === null || value === '') && nullable) return null; const n = typeof value === 'number' ? value : NaN; if (!Number.isFinite(n) || n < min || n > max) throw new Error('INVALID_NUMBER'); return n; }
function integer(value: unknown, min: number, max: number) { const n = number(value, min, max); if (!Number.isInteger(n)) throw new Error('INVALID_INTEGER'); return n as number; }
function constantTimeEqual(a: string, b: string) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
async function tokenValid(token: string) { const expected = Deno.env.get('EUNDONG_SYNC_TOKEN_SHA256') || ''; if (!token || token.length < 32 || !/^[a-f0-9]{64}$/i.test(expected)) return false; const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token)); return constantTimeEqual([...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join(''), expected.toLowerCase()); }

Deno.serve(async req => {
  const origin = req.headers.get('origin') || '';
  if (!originAllowed(origin)) return new Response(null, { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'POST') return response(origin, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!await tokenValid(req.headers.get('x-eundong-sync-token') || '')) return response(origin, { error: 'INVALID_SYNC_TOKEN' }, 401);
  try {
    const input = await req.json();
    const action = String(input.action || '');
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    let query;
    if (action === 'get_day') {
      if (!validDate(input.date)) throw new Error('INVALID_DATE');
      const [settings, record, feeds, meals, previous] = await Promise.all([
        db.from('eundong_settings').select('*').eq('id', 1).single(),
        db.from('eundong_daily_records').select('*').eq('recorded_date', input.date).maybeSingle(),
        db.from('eundong_daily_feeds').select('*').eq('recorded_date', input.date).order('feed_slot'),
        db.from('eundong_meals').select('*').eq('recorded_date', input.date).order('meal_slot'),
        db.from('eundong_daily_feeds').select('recorded_date,feed_slot,feed_id,feed_name_snapshot,moisture_snapshot,kcal_per_kg_snapshot').lt('recorded_date', input.date).order('recorded_date', { ascending: false }).limit(3)
      ]);
      for (const result of [settings, record, feeds, meals, previous]) if (result.error) throw result.error;
      return response(origin, { settings: settings.data, record: record.data, feeds: feeds.data, meals: meals.data, previousFeeds: previous.data });
    }
    if (action === 'update_settings') {
      const s = input.settings || {}; if (!validDate(s.goal_start_date) || !validDate(s.goal_end_date) || s.goal_end_date < s.goal_start_date) throw new Error('INVALID_GOAL_DATES');
      query = db.from('eundong_settings').upsert({ id: 1, pet_name: '은동', goal_weight_kg: number(s.goal_weight_kg, .1, 30, true), goal_start_weight_kg: number(s.goal_start_weight_kg, .1, 30, true), goal_start_date: s.goal_start_date, goal_end_date: s.goal_end_date }, { onConflict: 'id' }).select().single();
    } else if (action === 'upsert_weight') {
      if (!validDate(input.date)) throw new Error('INVALID_DATE'); query = db.from('eundong_daily_records').upsert({ recorded_date: input.date, weight_kg: number(input.weight_kg, .1, 30, true) }, { onConflict: 'recorded_date' }).select().single();
    } else if (action === 'search_feeds') {
      const term = String(input.query || '').trim(); if (term.length < 2 || term.length > 80) return response(origin, { data: [] });
      query = db.from('feeds').select('id,제품명,수분,final_me,official_me,corrected_me,verified,verification_status,searchable_before_review').eq('type', 'wet').or('verified.eq.true,searchable_before_review.eq.true').ilike('제품명', `%${term.replace(/[%_,()]/g, ' ')}%`).limit(15);
    } else if (action === 'upsert_feed') {
      if (!validDate(input.date)) throw new Error('INVALID_DATE'); const slot = integer(input.feed_slot, 1, 3), id = integer(input.feed_id, 1, Number.MAX_SAFE_INTEGER);
      const { data: feed, error } = await db.from('feeds').select('id,제품명,수분,final_me').eq('id', id).eq('type', 'wet').or('verified.eq.true,searchable_before_review.eq.true').single(); if (error || !feed) throw new Error('FEED_NOT_FOUND');
      query = db.from('eundong_daily_feeds').upsert({ recorded_date: input.date, feed_slot: slot, feed_id: feed.id, feed_name_snapshot: feed['제품명'], moisture_snapshot: feed['수분'], kcal_per_kg_snapshot: feed.final_me }, { onConflict: 'recorded_date,feed_slot' }).select().single();
    } else if (action === 'copy_feeds') {
      if (!validDate(input.date)) throw new Error('INVALID_DATE'); const feeds = Array.isArray(input.feeds) ? input.feeds.slice(0, 3) : [];
      const rows = feeds.map(f => ({ recorded_date: input.date, feed_slot: integer(f.feed_slot, 1, 3), feed_id: integer(f.feed_id, 1, Number.MAX_SAFE_INTEGER), feed_name_snapshot: String(f.feed_name_snapshot).slice(0, 500), moisture_snapshot: number(f.moisture_snapshot, 0, 100, true), kcal_per_kg_snapshot: number(f.kcal_per_kg_snapshot, 0, 100000, true) }));
      query = db.from('eundong_daily_feeds').upsert(rows, { onConflict: 'recorded_date,feed_slot' }).select();
    } else if (action === 'upsert_meal') {
      if (!validDate(input.date)) throw new Error('INVALID_DATE'); const slot = integer(input.meal_slot, 1, 4); const feedSlot = input.feed_slot == null ? null : integer(input.feed_slot, 1, 3); let snapshot = {};
      if (feedSlot) { const { data: f, error } = await db.from('eundong_daily_feeds').select('*').eq('recorded_date', input.date).eq('feed_slot', feedSlot).single(); if (error || !f) throw new Error('FEED_NOT_FOUND'); snapshot = { feed_slot: feedSlot, feed_id: f.feed_id, feed_name_snapshot: f.feed_name_snapshot, moisture_snapshot: f.moisture_snapshot, kcal_per_kg_snapshot: f.kcal_per_kg_snapshot }; }
      else snapshot = { feed_slot: null, feed_id: null, feed_name_snapshot: null, moisture_snapshot: null, kcal_per_kg_snapshot: null };
      query = db.from('eundong_meals').upsert({ recorded_date: input.date, meal_slot: slot, meal_time: TIMES[slot - 1], ...snapshot, amount_g: number(input.amount_g, 0, 5000), added_water_ml: number(input.added_water_ml, 0, 5000) }, { onConflict: 'recorded_date,meal_slot' }).select().single();
    } else if (action === 'history') {
      const days = input.days === null ? 3650 : integer(input.days || 30, 1, 3650); const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const [records, meals] = await Promise.all([db.from('eundong_daily_records').select('recorded_date,weight_kg').gte('recorded_date', since).order('recorded_date'), db.from('eundong_meals').select('recorded_date,amount_g,added_water_ml,moisture_snapshot').gte('recorded_date', since).order('recorded_date')]); if (records.error) throw records.error; if (meals.error) throw meals.error;
      return response(origin, { records: records.data, meals: meals.data });
    } else throw new Error('INVALID_ACTION');
    const result = await query; if (result.error) throw result.error; return response(origin, { data: result.data });
  } catch (error) { const message = error instanceof Error ? error.message : 'UNKNOWN'; const bad = message.startsWith('INVALID') || message === 'FEED_NOT_FOUND'; console.error(message); return response(origin, { error: bad ? message : 'DATABASE_ERROR' }, bad ? 400 : 500); }
});
