// -----------------------------------------------
// 로그인 사용자 고양이 불러오기
// -----------------------------------------------
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

async function handleKakaoOAuthLogin() {
  setAuthMessage('카카오 로그인으로 이동합니다...', 'blue');

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: 'https://provedcat.github.io/catfoodcalculator/'
    }
  });

  if (error) {
    setAuthMessage(`카카오 로그인 시작 실패: ${error.message}`, 'red');
  }
}

async function handleGoogleOAuthLogin() {
  setAuthMessage('Google 로그인으로 이동합니다...', 'blue');

  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://provedcat.github.io/catfoodcalculator/'
    }
  });

  if (error) {
    setAuthMessage(`Google 로그인 시작 실패: ${error.message}`, 'red');
  }
}

async function handleLogout() {
  await sb.auth.signOut();
  setAuthMessage('', 'gray');
  await refreshAuthUI();
}

async function checkLoginState() {
  await refreshAuthUI();
}

window.openAuthSheet = openAuthSheet;
window.closeAuthSheet = closeAuthSheet;
window.handleKakaoOAuthLogin = handleKakaoOAuthLogin;
window.handleGoogleOAuthLogin = handleGoogleOAuthLogin;
window.handleLogout = handleLogout;
window.checkLoginState = checkLoginState;
