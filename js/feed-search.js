async function searchFeed(type, query, listId, slotId) {
  const list = document.getElementById(listId);
  if (!list) return;

  if (!query || query.length < 1) {
    list.classList.add('hidden');
    return;
  }

  const { data, error } = await sb
    .from('feeds')
    .select('제품명, 제조사, final_me, eb_칼슘, eb_인, 수분')
    .eq('type', type)
    .eq('verified', true)
    .gt('final_me', 0)
    .ilike('제품명', `%${query}%`)
    .limit(10);

  if (error) {
    list.innerHTML = `<div class="p-3 text-red-400 text-xs">${error.message}</div>`;
    list.classList.remove('hidden');
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="p-4 text-gray-400 text-xs text-center">검색 결과가 없습니다</div>`;
    list.classList.remove('hidden');
    return;
  }

  list.innerHTML = data.map((f, rowIdx) => {
    const display = f.제조사 ? `${f.제조사} | ${f.제품명}` : f.제품명;
    return `
      <div class="autocomplete-item p-4 border-b border-gray-50 cursor-pointer" data-row="${rowIdx}">
        <p class="font-bold text-sm text-gray-800">${display}</p>
        <p class="text-xs text-gray-400 mt-0.5">${f.final_me} kcal/kg${f.수분 != null ? ` · 수분 ${f.수분}%` : ''}</p>
      </div>`;
  }).join('');

  list._cache = { data, type, slotId, listId };
  list.classList.remove('hidden');

  list.onclick = (e) => {
    const item = e.target.closest('[data-row]');
    if (!item) return;
    const { data: cData, type: cType, slotId: cSlotId, listId: cListId } = list._cache;
    selectFeed(cType, cSlotId, cData[parseInt(item.dataset.row)], cListId);
  };
}

function selectFeed(type, slotId, feedData, listId) {
  const feed = {
    name:     feedData.제품명,
    display:  feedData.제조사 ? `${feedData.제조사} | ${feedData.제품명}` : feedData.제품명,
    kcal:     feedData.final_me,
    ebCa:     feedData.eb_칼슘  || 0,
    ebP:      feedData.eb_인    || 0,
    moisture: feedData.수분     ?? null
  };

  if (type === 'dry') {
    state.dryFeeds[slotId] = feed;
    document.getElementById(`dryInput${slotId + 1}`).value = feed.display;
    const sel = document.getElementById(`drySelected${slotId + 1}`);
    sel.textContent = `✓ ${feed.name} (${feed.kcal} kcal/kg)`;
    sel.classList.remove('hidden');
  } else {
    state.wetFeedMap[slotId] = feed;
    document.getElementById(`wetInput_${slotId}`).value = feed.display;
    const sel = document.getElementById(`wetSelected_${slotId}`);
    sel.textContent = `✓ ${feed.name} (${feed.kcal} kcal/kg)`;
    sel.classList.remove('hidden');
  }

  document.getElementById(listId)?.classList.add('hidden');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.relative')) {
    document.querySelectorAll('[id^="dryList"],[id*="wetList_"]')
      .forEach(el => el.classList.add('hidden'));
  }
});

function setUploadType(type) {
  state.uploadType = type;
  document.getElementById('upDryBtn').className =
    `flex-1 py-3 rounded-2xl text-sm font-black border-2 ${type === 'dry'
      ? 'border-[#f4a44a] text-[#f4a44a]'
      : 'border-gray-200 text-gray-400'}`;
  document.getElementById('upWetBtn').className =
    `flex-1 py-3 rounded-2xl text-sm font-black border-2 ${type === 'wet'
      ? 'border-[#4a9af4] text-[#4a9af4]'
      : 'border-gray-200 text-gray-400'}`;
}

async function handleUpload(input) {
  if (!input.files?.length) return;
  const file  = input.files[0];
  const msgEl = document.getElementById('uploadMsg');

  msgEl.innerHTML = `<p class="text-xs text-blue-400 font-bold mt-2">📡 분석 중... 잠시 기다려주세요</p>`;

  const base64 = await new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result.split(',')[1]);
    r.readAsDataURL(file);
  });

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'upload',
        base64Data: base64,
        mimeType: file.type,
        fileName: file.name,
        type: state.uploadType
      })
    });
    const result = await resp.json();
    if (result.성공) {
      msgEl.innerHTML = `<p class="text-xs text-green-500 font-bold mt-2">✅ 전송 완료 — 검수 후 목록에 반영됩니다.</p>`;
    } else {
      msgEl.innerHTML = `<p class="text-xs text-orange-400 font-bold mt-2">⚠️ 실패: ${result.오류 || '알 수 없는 오류'}</p>`;
    }
  } catch (err) {
    msgEl.innerHTML = `<p class="text-xs text-red-400 font-bold mt-2">❌ 오류: 네트워크 문제 또는 서버 응답 없음</p>`;
  }

  input.value = '';
}
