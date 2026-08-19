import * as data from './data.js';
import { dailyTotals, targetForDate, numberOrNull, resolvedKcal } from './calculations.js';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const date = data.today();
let store = data.loadStore();
let day = data.ensureDay(store, date);
let chart;
let activeSlot = 0;
let saveTimer;

$('todayLabel').textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
$('notice').textContent = `${store.settings.petName || '은동'} · ${date} · 이 브라우저에만 저장됩니다.`;

function persist() {
  data.saveStore(store);
  $('saveState').textContent = '저장됨';
  $('saveState').className = 'save-state';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { $('saveState').textContent = '자동 저장'; }, 1200);
  drawChart();
}

function snapshot(feed) {
  return { feedId: feed.id, name: feed['제품명'], moisture: numberOrNull(feed['수분']), kcalPerKg: resolvedKcal(feed) };
}
function calculationFeed(feed) { return feed && { id: feed.feedId, '제품명': feed.name, '수분': feed.moisture, final_me: feed.kcalPerKg }; }

function renderFeeds() {
  $('feedSlots').innerHTML = [0, 1, 2].map(i => {
    const feed = day.selectedFeeds[i];
    return `<button class="feed-slot ${feed ? '' : 'empty'}" data-slot="${i}"><span><strong>${feed ? escapeHtml(feed.name) : `+ 습사료 ${i + 1} 검색`}</strong>${feed ? `<small>${feed.moisture == null ? '수분 정보 없음' : `수분 ${feed.moisture}%`} · ${feed.kcalPerKg == null ? '칼로리 정보 없음' : `${Math.round(feed.kcalPerKg)} kcal/kg`}</small>` : ''}</span><span>${feed ? '변경' : '선택'}</span></button>`;
  }).join('');
  document.querySelectorAll('.feed-slot').forEach(button => button.onclick = () => openSearch(Number(button.dataset.slot)));
  renderMeals();
}

function renderMeals() {
  $('meals').innerHTML = day.meals.map((meal, i) => `<div class="meal"><div class="meal-time">${escapeHtml(meal.time)}</div><div class="meal-fields"><select aria-label="${i + 1}회 급여 사료" data-i="${i}" data-k="feedId"><option value="">사료 선택</option>${day.selectedFeeds.filter(Boolean).map((feed, j) => `<option value="${escapeHtml(feed.feedId)}" ${String(meal.feedId) === String(feed.feedId) ? 'selected' : ''}>습사료 ${j + 1} · ${escapeHtml(feed.name)}</option>`).join('')}</select><label class="field-unit"><input aria-label="${i + 1}회 급여량" data-i="${i}" data-k="amountG" type="number" min="0" step="0.1" inputmode="decimal" value="${escapeHtml(meal.amountG)}" placeholder="0"><span>g</span></label><label class="field-unit"><input aria-label="${i + 1}회 추가 물" data-i="${i}" data-k="addedWaterMl" type="number" min="0" step="0.1" inputmode="decimal" value="${escapeHtml(meal.addedWaterMl)}" placeholder="0"><span>ml</span></label></div></div>`).join('');
  $('meals').querySelectorAll('input,select').forEach(el => el.oninput = () => {
    day.meals[Number(el.dataset.i)][el.dataset.k] = el.value;
    renderTotals(); persist();
  });
  renderTotals();
}

function renderTotals() {
  const feeds = day.selectedFeeds.filter(Boolean).map(calculationFeed);
  const meals = day.meals.map(meal => ({ feed_id: meal.feedId, amount_g: meal.amountG, added_water_ml: meal.addedWaterMl }));
  const totals = dailyTotals(meals, feeds);
  const items = [['습사료', totals.grams, 'g'], ['칼로리', totals.kcal, 'kcal'], ['사료 수분', totals.foodWater, 'ml'], ['추가 물', totals.addedWater, 'ml'], ['총 수분', totals.foodWater + totals.addedWater, 'ml']];
  $('totals').innerHTML = items.map(([label, value, unit]) => `<div class="total"><span>${label}</span><strong>${Math.round(value * 10) / 10}${unit}</strong></div>`).join('');
  $('missingInfo').textContent = [totals.missingMoisture ? '일부 사료의 수분 정보가 없어 합계에서 제외했습니다.' : '', totals.missingKcal ? '일부 사료의 칼로리 정보가 없어 합계에서 제외했습니다.' : ''].filter(Boolean).join(' ');
  return totals;
}

function openSearch(slot) {
  activeSlot = slot; $('dialogTitle').textContent = `습사료 ${slot + 1}`; $('feedSearch').value = '';
  $('feedResults').innerHTML = '<p class="notice">제품명 두 글자 이상을 입력하세요.</p>';
  $('feedDialog').showModal(); setTimeout(() => $('feedSearch').focus(), 50);
}
let searchTimer;
$('feedSearch').oninput = event => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const rows = await data.searchFeeds(event.target.value);
      $('feedResults').innerHTML = rows.length ? rows.map((feed, i) => `<button class="result" data-i="${i}"><strong>${escapeHtml(feed['제품명'])}</strong><small>${feed['수분'] == null ? '수분 정보 없음' : `수분 ${feed['수분']}%`} · ${resolvedKcal(feed) == null ? '칼로리 정보 없음' : `${Math.round(resolvedKcal(feed))} kcal/kg`}</small></button>`).join('') : '<p class="notice">검색 결과가 없습니다.</p>';
      $('feedResults').querySelectorAll('button').forEach(button => button.onclick = () => {
        const oldId = day.selectedFeeds[activeSlot]?.feedId;
        const selected = snapshot(rows[Number(button.dataset.i)]);
        day.selectedFeeds[activeSlot] = selected;
        day.meals.forEach(meal => { if (String(meal.feedId) === String(oldId)) meal.feedId = selected.feedId; });
        renderFeeds(); $('feedDialog').close(); persist();
      });
    } catch (error) { $('feedResults').innerHTML = `<p class="notice error">사료 검색 실패: ${escapeHtml(error.message)}</p>`; }
  }, 300);
};

function updateGoal() {
  const weight = numberOrNull($('weight').value), goal = numberOrNull($('goalWeight').value);
  $('remaining').textContent = weight != null && goal != null ? `목표까지 ${Math.abs(weight - goal).toFixed(2)}kg` : '목표를 입력해 주세요';
  const weekly = targetForDate({ start_date: store.settings.goalStartDate, start_weight: store.settings.goalStartWeightKg, goal_weight: goal, weekly_change_kg: store.settings.weeklyChangeKg }, date);
  $('weeklyGoal').textContent = weekly == null ? '주차별 목표 —' : `이번 주 목표 ${weekly.toFixed(2)}kg · 주당 0.05kg 계획`;
}
$('weight').value = day.weightKg ?? '';
$('goalWeight').value = store.settings.goalWeightKg ?? '';
$('goalStart').value = store.settings.goalStartDate || date;
$('weight').oninput = () => { day.weightKg = $('weight').value; if (!store.settings.goalStartWeightKg && numberOrNull(day.weightKg) != null) store.settings.goalStartWeightKg = numberOrNull(day.weightKg); updateGoal(); persist(); };
for (const id of ['goalWeight', 'goalStart']) $(id).oninput = () => {
  store.settings.goalWeightKg = $('goalWeight').value; store.settings.goalStartDate = $('goalStart').value || date;
  if (!store.settings.goalStartWeightKg && numberOrNull(day.weightKg) != null) store.settings.goalStartWeightKg = numberOrNull(day.weightKg);
  updateGoal(); persist();
};

function historyRows() {
  return Object.entries(store.dailyRecords).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([recordDate, record]) => {
    const feeds = (record.selectedFeeds || []).map(calculationFeed);
    const meals = (record.meals || []).map(meal => ({ feed_id: meal.feedId, amount_g: meal.amountG, added_water_ml: meal.addedWaterMl }));
    const totals = dailyTotals(meals, feeds);
    return { date: recordDate, weight: numberOrNull(record.weightKg), water: totals.foodWater + totals.addedWater };
  });
}
function drawChart() {
  const rows = historyRows();
  if (!rows.some(row => row.weight != null || row.water > 0)) { $('chartEmpty').hidden = false; chart?.destroy(); chart = null; return; }
  $('chartEmpty').hidden = true; chart?.destroy();
  const goal = { start_date: store.settings.goalStartDate, start_weight: store.settings.goalStartWeightKg, goal_weight: store.settings.goalWeightKg, weekly_change_kg: store.settings.weeklyChangeKg };
  chart = new Chart($('trendChart'), { data: { labels: rows.map(row => row.date), datasets: [{ type: 'line', label: '실제 체중', data: rows.map(row => row.weight), yAxisID: 'y', borderColor: '#2c6558', tension: .25 }, { type: 'line', label: '목표 체중', data: rows.map(row => targetForDate(goal, row.date)), yAxisID: 'y', borderColor: '#9a6a17', borderDash: [5, 5], pointRadius: 0 }, { type: 'bar', label: '총 수분', data: rows.map(row => row.water || null), yAxisID: 'water', backgroundColor: '#b9d2c9' }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { position: 'left', ticks: { callback: value => `${value}kg` } }, water: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: value => `${value}ml` } }, x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } } } } });
}

$('backupButton').onclick = () => {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `eundong-backup-${date}.json` });
  link.click(); URL.revokeObjectURL(link.href); $('dataMessage').textContent = '백업 파일을 만들었습니다.';
};
$('restoreButton').onclick = () => $('restoreFile').click();
$('restoreFile').onchange = async event => {
  try {
    const parsed = JSON.parse(await event.target.files[0].text());
    if (!data.isValidStore(parsed)) throw new Error('은동이 백업 파일 형식이 아닙니다.');
    localStorage.setItem(data.STORAGE_KEY, JSON.stringify(parsed)); location.reload();
  } catch (error) { $('dataMessage').textContent = `복원 실패: ${error.message}`; $('dataMessage').classList.add('error'); event.target.value = ''; }
};

updateGoal(); renderFeeds(); drawChart(); $('saveState').textContent = '자동 저장';
