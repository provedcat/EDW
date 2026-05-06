async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

function setAuthMessage(message, tone = 'gray') {
  const msg = document.getElementById('authMsg');
  if (!msg) return;

  msg.textContent = message;
  msg.className = `text-xs font-bold ${tone === 'red' ? 'text-red-400' : tone === 'blue' ? 'text-blue-400' : 'text-gray-400'}`;
  msg.classList.toggle('hidden', !message);
}

function openAuthSheet() {
  const sheet = document.getElementById('authSheet');
  if (!sheet) return;

  sheet.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  document.getElementById('authEmail')?.focus();
}

function closeAuthSheet() {
  const sheet = document.getElementById('authSheet');
  if (!sheet) return;

  sheet.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

async function refreshAuthUI() {
  const box = document.getElementById('savedCatLoadBox');
  const loggedOutAuth = document.getElementById('loggedOutAuth');
  const loggedInAuth = document.getElementById('loggedInAuth');
  const userEmail = document.getElementById('userEmail');
  const authOpenBtn = document.getElementById('authOpenBtn');
  if (!box || !loggedOutAuth || !loggedInAuth || !userEmail) return;

  const user = await getCurrentUser();
  if (!user) {
    state.currentUser = null;
    state.selectedSavedCatId = null;
    box.classList.add('hidden');
    loggedOutAuth.classList.remove('hidden');
    loggedInAuth.classList.add('hidden');
    userEmail.textContent = '';
    if (authOpenBtn) authOpenBtn.textContent = '로그인';
    updateSaveFeedingButtonVisibility();
    return;
  }

  state.currentUser = user;
  loggedOutAuth.classList.add('hidden');
  loggedInAuth.classList.remove('hidden');
  userEmail.textContent = user.email || '';
  if (authOpenBtn) authOpenBtn.textContent = '내 계정';
  box.classList.remove('hidden');
  updateSaveFeedingButtonVisibility();
}

async function handleEmailOtpLogin() {
  const emailInput = document.getElementById('authEmail');
  const email = emailInput?.value.trim();

  if (!email) {
    setAuthMessage('이메일을 입력해 주세요.', 'red');
    emailInput?.focus();
    return;
  }

  setAuthMessage('로그인 링크를 보내는 중입니다...', 'blue');

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'https://provedcat.github.io/catfoodcalculator/'
    }
  });

  if (error) {
    setAuthMessage(`로그인 링크 전송 실패: ${error.message}`, 'red');
    return;
  }

  setAuthMessage('이메일로 전송된 로그인 링크를 확인해 주세요.', 'blue');
}

async function handleLogout() {
  await sb.auth.signOut();
  setAuthMessage('', 'gray');
  await refreshAuthUI();
}

async function checkLoginState() {
  await refreshAuthUI();
}

