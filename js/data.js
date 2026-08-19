import{SUPABASE_URL,SUPABASE_ANON_KEY}from'./config.js';
export const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
export async function session(){return(await db.auth.getSession()).data.session}
export async function signIn(){return db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.href.split('#')[0]}})}
export async function pet(userId){const{data,error}=await db.from('cats').select('id,name,user_id').eq('user_id',userId).ilike('name','은동이').limit(1).maybeSingle();if(error)throw error;return data}
export async function loadDay(petId,date){const[weights,goal,selections,meals]=await Promise.all([
 db.from('weight_records').select('weight_kg,recorded_date').eq('cat_id',petId).eq('recorded_date',date).maybeSingle(),
 db.from('weight_goals').select('*').eq('cat_id',petId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
 db.from('daily_feed_selections').select('slot,feed_id,feeds(id,제품명,수분,final_me)').eq('cat_id',petId).eq('recorded_date',date).order('slot'),
 db.from('daily_meals').select('*').eq('cat_id',petId).eq('recorded_date',date).order('meal_slot')]);
 for(const x of[weights,goal,selections,meals])if(x.error)throw x.error;return{weight:weights.data,goal:goal.data,selections:selections.data||[],meals:meals.data||[]}}
export async function history(petId){const from=new Date(Date.now()-29*864e5).toISOString().slice(0,10);const[w,m,g]=await Promise.all([
 db.from('weight_records').select('recorded_date,weight_kg').eq('cat_id',petId).gte('recorded_date',from).order('recorded_date'),
 db.from('daily_meals').select('recorded_date,amount_g,added_water_ml,moisture_percent_snapshot').eq('cat_id',petId).gte('recorded_date',from).order('recorded_date'),
 db.from('weight_goals').select('*').eq('cat_id',petId).order('created_at',{ascending:false}).limit(1).maybeSingle()]);for(const x of[w,m,g])if(x.error)throw x.error;return{weights:w.data||[],meals:m.data||[],goal:g.data}}
export async function searchFeeds(q){const safe=q.replace(/[%_,()]/g,' ').trim();if(safe.length<2)return[];const{data,error}=await db.from('feeds').select('id,제품명,수분,final_me,verified,verification_status,searchable_before_review').eq('type','wet').or('verified.eq.true,searchable_before_review.eq.true').ilike('제품명',`%${safe}%`).limit(12);if(error)throw error;return data||[]}
export async function saveWeight(userId,catId,date,kg){return check(await db.from('weight_records').upsert({user_id:userId,cat_id:catId,recorded_date:date,weight_kg:kg},{onConflict:'cat_id,recorded_date'}))}
export async function saveGoal(userId,catId,goal){return check(await db.from('weight_goals').upsert({user_id:userId,cat_id:catId,...goal},{onConflict:'cat_id'}))}
export async function saveSelection(userId,catId,date,slot,feedId){return check(await db.from('daily_feed_selections').upsert({user_id:userId,cat_id:catId,recorded_date:date,slot,feed_id:feedId},{onConflict:'cat_id,recorded_date,slot'}))}
export async function saveMeal(row){return check(await db.from('daily_meals').upsert(row,{onConflict:'cat_id,recorded_date,meal_slot'}))}
function check(r){if(r.error)throw r.error;return r.data}
