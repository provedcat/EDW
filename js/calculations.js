export function numberOrNull(value) { if (value === '' || value == null) return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
export function mealNutrition(meal) {
  const grams = Math.max(0, numberOrNull(meal.amount_g) ?? 0), addedWater = Math.max(0, numberOrNull(meal.added_water_ml) ?? 0);
  const kcalRate = numberOrNull(meal.kcal_per_kg_snapshot), moisture = numberOrNull(meal.moisture_snapshot);
  return { grams, addedWater, kcal: kcalRate == null ? null : grams * kcalRate / 1000, foodWater: moisture == null ? null : grams * moisture / 100 };
}
export function dailyTotals(meals) {
  const rows = meals.map(mealNutrition), fed = rows.filter(r => r.grams > 0);
  return { grams: rows.reduce((n, r) => n + r.grams, 0), kcal: rows.reduce((n, r) => n + (r.kcal ?? 0), 0), foodWater: rows.reduce((n, r) => n + (r.foodWater ?? 0), 0), addedWater: rows.reduce((n, r) => n + r.addedWater, 0), missingKcal: fed.some(r => r.kcal == null), missingMoisture: fed.some(r => r.foodWater == null) };
}
export function targetForDate(settings, date) {
  const start = Date.parse(`${settings?.goal_start_date}T00:00:00Z`), end = Date.parse(`${settings?.goal_end_date}T00:00:00Z`), current = Date.parse(`${date}T00:00:00Z`);
  const from = numberOrNull(settings?.goal_start_weight_kg), to = numberOrNull(settings?.goal_weight_kg);
  if (![start, end, current, from, to].every(Number.isFinite) || end <= start) return null;
  const progress = Math.max(0, Math.min(1, (current - start) / (end - start))); return from + (to - from) * progress;
}
