(function () {
  const IOS_INSTALL_MESSAGE = 'Safari에서 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택해주세요.';
  const ANDROID_INSTALL_MESSAGE = '앱 설치 창이 뜨면 설치를 눌러주세요.';
  const FALLBACK_INSTALL_MESSAGE = 'Chrome 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택해주세요.';

  let deferredInstallPrompt = null;

  function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function isIosSafari() {
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);

    return isIosDevice && isSafari;
  }

  function setInstallMessage(message) {
    const messageEl = document.getElementById('pwaInstallMsg');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.classList.remove('hidden');
  }

  function updateInstallPromptVisibility() {
    const promptEl = document.getElementById('pwaInstallPrompt');
    if (!promptEl) return;

    const shouldShow = isMobileViewport() && !isStandaloneMode();
    promptEl.classList.toggle('hidden', !shouldShow);

    if (!shouldShow) {
      const messageEl = document.getElementById('pwaInstallMsg');
      if (messageEl) messageEl.classList.add('hidden');
    }
  }

  async function handleInstallClick() {
    if (isStandaloneMode()) {
      updateInstallPromptVisibility();
      return;
    }

    if (deferredInstallPrompt) {
      setInstallMessage(ANDROID_INSTALL_MESSAGE);
      deferredInstallPrompt.prompt();

      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;

      updateInstallPromptVisibility();
      return;
    }

    if (isIosSafari()) {
      setInstallMessage(IOS_INSTALL_MESSAGE);
      return;
    }

    setInstallMessage(FALLBACK_INSTALL_MESSAGE);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallPromptVisibility();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallPromptVisibility();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const installButton = document.getElementById('pwaInstallBtn');
    if (installButton) installButton.addEventListener('click', handleInstallClick);
    updateInstallPromptVisibility();
  });

  window.addEventListener('resize', updateInstallPromptVisibility);

  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  if (standaloneMedia.addEventListener) {
    standaloneMedia.addEventListener('change', updateInstallPromptVisibility);
  } else if (standaloneMedia.addListener) {
    standaloneMedia.addListener(updateInstallPromptVisibility);
  }
}());
