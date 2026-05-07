function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function setSavedCatLoadMessage(message, tone = 'gray') {
  const msg = document.getElementById('savedCatLoadMsg');
  if (!msg) return;

  msg.textContent = message;
  msg.className = `text-xs font-bold ${tone === 'red' ? 'text-red-400' : tone === 'blue' ? 'text-blue-400' : 'text-gray-400'}`;
  msg.classList.toggle('hidden', !message);
}

async function loadMyCats() {
  const list = document.getElementById('myCatList');
  if (!list) return;

  if (!state.currentUser) {
    setSavedCatLoadMessage('로그인 후 저장된 고양이를 불러올 수 있습니다.', 'gray');
    return;
  }

  list.innerHTML = '';
  list.classList.add('hidden');
  setSavedCatLoadMessage('저장된 고양이를 불러오는 중입니다...', 'blue');

  const { data, error } = await sb
    .from('cats')
    .select('id, name, birth_date, neutered')
    .eq('user_id', state.currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    setSavedCatLoadMessage(`불러오기 실패: ${error.message}`, 'red');
    return;
  }

  if (!data || data.length === 0) {
    setSavedCatLoadMessage('저장된 고양이가 없습니다. 직접 입력해서 계산할 수 있습니다.', 'gray');
    return;
  }

  list.innerHTML = data.map(cat => `
    <button type="button" data-cat-id="${escapeHtml(cat.id)}"
      class="w-full p-3 bg-white border border-blue-100 rounded-xl text-left hover:border-[#2d7dd2] transition-colors">
      <span class="block text-sm font-black text-gray-800">${escapeHtml(cat.name || '이름 없음')}</span>
      <span class="block text-xs font-bold text-gray-400 mt-0.5">
        ${escapeHtml(cat.birth_date || '생년월일 없음')} · ${cat.neutered ? '중성화 O' : '중성화 X'}
      </span>
    </button>
  `).join('');
  list._cats = data;
  list.onclick = e => {
    const button = e.target.closest('[data-cat-id]');
    if (!button) return;
    const cat = list._cats.find(item => item.id === button.dataset.catId);
    if (cat) selectSavedCat(cat);
  };
  list.classList.remove('hidden');
  setSavedCatLoadMessage('불러올 고양이를 선택해주세요.', 'gray');
}

async function selectSavedCat(cat) {
  state.selectedSavedCatId = cat.id;

  document.getElementById('catName').value = cat.name || '';
  document.getElementById('catBirth').value = cat.birth_date || '';
  document.getElementById('catNeutered').value = cat.neutered ? 'true' : 'false';

  const weightInput = document.getElementById('catWeight');
  weightInput.value = '';
  setSavedCatLoadMessage(`${cat.name || '선택한 고양이'}의 최신 체중을 불러오는 중입니다...`, 'blue');

  const { data, error } = await sb
    .from('weight_records')
    .select('weight_kg, recorded_date')
    .eq('cat_id', cat.id)
    .eq('user_id', state.currentUser.id)
    .order('recorded_date', { ascending: false })
    .limit(1);

  if (error) {
    setSavedCatLoadMessage(`체중 불러오기 실패: ${error.message}`, 'red');
    updateCalorie();
    updateSaveFeedingButtonVisibility();
    return;
  }

  const latestWeight = data?.[0];
  if (latestWeight) {
    weightInput.value = latestWeight.weight_kg;
    setSavedCatLoadMessage(`${cat.name || '선택한 고양이'} 정보를 불러왔습니다. 최신 체중 기준일: ${latestWeight.recorded_date}`, 'blue');
  } else {
    setSavedCatLoadMessage(`${cat.name || '선택한 고양이'} 정보를 불러왔습니다. 저장된 체중 기록은 없습니다.`, 'gray');
  }

  updateCalorie();
  updateSaveFeedingButtonVisibility();
}

function updateSaveFeedingButtonVisibility() {
  const button = document.getElementById('saveFeedingRecordBtn');
  if (!button) return;

  const canSave = !!(state.currentUser && state.selectedSavedCatId && state.lastResult);
  button.classList.toggle('hidden', !canSave);

  if (!canSave) {
    document.getElementById('saveFeedingRecordMsg')?.classList.add('hidden');
  }
}

function handleSaveFeedingRecord() {
  const msg = document.getElementById('saveFeedingRecordMsg');
  const payload = {
    userId: state.currentUser?.id || null,
    catId: state.selectedSavedCatId,
    result: state.lastResult
  };

  console.log('feeding_records 저장 로직은 다음 단계에서 구현 예정입니다.', payload);
  if (msg) {
    msg.textContent = '급여 기록 저장 기능은 다음 단계에서 연결될 예정입니다.';
    msg.classList.remove('hidden');
  }
}
