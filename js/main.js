import {
  createCharadesSummary,
  createCharadesThemeDeck,
  createUndercoverRound,
  createWerewolfDeck,
  getUndercoverCount,
  getWerewolfRoleDescription,
  loadGameData,
  recordCharadesResult,
  saveProgress,
} from './gameLogic.js';
import { initGestureRecognition } from './gesture.js';
import { resetStoreSection, store, updateStore } from './store.js';
import { shuffle } from './utils/shuffle.js';
import {
  unlockAudioOnFirstTouch,
  toggleMute,
  playBGM,
  playEffect,
  resumeBGM,
  stopBGM,
} from './utils/audioManager.js';
// 导入我的版本 UI 辅助函数
import { bindCharadesThemeSelection, updateCharadesProgress, showCharadesEndSummary } from './ui.js';

const ROLE_IMAGES = {
  狼人: 'werewolf.jpg',
  预言家: 'seer.jpg',
  女巫: 'witch.jpg',
  猎人: 'hunter.jpg',
  守卫: 'guard.jpg',
  白痴: 'idiot.jpg',
  丘比特: '丘比特.jpg',
  平民: 'villager.jpg',
};

const ROLE_EMOJI = {
  狼人: '🐺',
  预言家: '🔮',
  女巫: '🧪',
  猎人: '🏹',
  守卫: '🛡️',
  白痴: '🃏',
  丘比特: '💘',
  平民: '👤',
};

// 狼人杀角色卡牌背景色映射（与 state.js 保持一致）
const ROLE_BG_COLORS = {
  狼人: 'linear-gradient(145deg, #2d1b1b, #5c3a3a)',
  预言家: 'linear-gradient(145deg, #1a237e, #3949ab)',
  女巫: 'linear-gradient(145deg, #4a148c, #7b1fa2)',
  猎人: 'linear-gradient(145deg, #1b5e20, #388e3c)',
  守卫: 'linear-gradient(145deg, #e65100, #f57c00)',
  白痴: 'linear-gradient(145deg, #880e4f, #ad1457)',
  平民: 'linear-gradient(145deg, #37474f, #546e7a)',
};

const CATEGORY_LABELS = {
  film_tv: '影视',
  sports: '运动',
  food: '美食',
  celebrities: '明星',
  animals: '动物',
};

const pages = [...document.querySelectorAll('.page')];
const pageTitle = document.querySelector('#page-title');
const backButton = document.querySelector('#back-button');
const gestureControls = document.querySelector('#gesture-controls');
const gestureStatus = document.querySelector('#gesture-status');
const gestureEnable = document.querySelector('#gesture-enable');
const feedbackFlash = document.querySelector('#feedback-flash');
const modal = document.querySelector('#result-modal');
const orientationGate = document.querySelector('#orientation-gate');
const charadesMediaStatus = document.querySelector('#charades-media-status');
const backConfirmModal = document.querySelector('#back-confirm-modal');

const pauseButton = document.querySelector('#pause-button');
const exitButton = document.querySelector('#exit-button');

let gestureController;
let charadesTimer;
let selectedWerewolfPlayers = 6;
let selectedCharadesDuration = 120;
let selectedCharadesTheme = 'film_tv';
let selectedCharadesRecordingMode = null;
let currentResultAction = navigateHome;
let charadesPausedForPortrait = false;
let charadesWaitingToStartInLandscape = false;
let charadesMediaStream = null;
let charadesMediaRecorder = null;
let charadesRecordingChunks = [];
let discardCharadesRecording = false;
let activeCharadesRecordingMode = null;
let roleImageRenderId = 0;
const roleImageCache = new Map();
const CARD_FLIP_DURATION = 580;
let werewolfCardTransitioning = false;
let undercoverCardTransitioning = false;

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  bindEvents();
  document.body.addEventListener('click', unlockAudioOnFirstTouch, { once: true });
  document.body.addEventListener('touchstart', unlockAudioOnFirstTouch, { once: true });
  document.body.addEventListener('pointerdown', resumeBGM);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeBGM();
  });
  gestureController = initGestureRecognition({
    fallbackRoot: null,
    onSwipeUp: () => handleGesture('up'),
    onSwipeDown: () => handleGesture('down'),
  });
  syncGestureStatus();
  window.setInterval(syncGestureStatus, 400);
}

function bindEvents() {
  // 绑定游戏菜单按钮（兼容我的版本 .game-item 和队友版本 [data-game]）
  document.querySelectorAll('[data-game]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.game));
  });
  backButton.addEventListener('click', handleBackButton);
  document.querySelector('#back-confirm-cancel').addEventListener('click', hideBackConfirmation);
  document.querySelector('#back-confirm-submit').addEventListener('click', () => {
    hideBackConfirmation();
    navigateHome();
  });
  document.querySelector('#werewolf-start').addEventListener('click', startWerewolf);
  document.querySelector('#werewolf-action').addEventListener('click', handleWerewolfAction);
  document.querySelector('#undercover-start').addEventListener('click', startUndercover);
  document.querySelector('#undercover-action').addEventListener('click', handleUndercoverAction);
  document.querySelector('#charades-start').addEventListener('click', startCharades);
  document.querySelector('#gesture-up').addEventListener('click', () => handleGesture('up'));
  document.querySelector('#gesture-down').addEventListener('click', () => handleGesture('down'));
  gestureEnable.addEventListener('click', requestGesturePermission);
  document.querySelector('#result-confirm').addEventListener('click', () => {
    closeResult();
    currentResultAction();
  });
  window.addEventListener('resize', scheduleOrientationLayoutCheck);
  window.addEventListener('orientationchange', scheduleOrientationLayoutCheck);

  const playerRange = document.querySelector('#undercover-players');
  const countRange = document.querySelector('#undercover-count');
  playerRange.addEventListener('input', () => {
    const recommendedCount = getUndercoverCount(Number(playerRange.value));
    document.querySelector('#undercover-player-output').textContent = `${playerRange.value} 人`;
    countRange.max = String(recommendedCount);
    countRange.value = String(recommendedCount);
    document.querySelector('#undercover-count-output').textContent = `${countRange.value} 人`;
  });
  countRange.addEventListener('input', () => {
    document.querySelector('#undercover-count-output').textContent = `${countRange.value} 人`;
  });

  // 时长选择按钮
  document.querySelectorAll('[data-duration]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-duration]').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      selectedCharadesDuration = Number(button.dataset.duration);
    });
  });

  document.querySelectorAll('[data-recording-mode]').forEach((button) => {
    button.addEventListener('click', () => requestCharadesMediaPermission(button));
  });

  // 我的版本：主题网格选择（每行两个的 theme-list）
  bindCharadesThemeSelection();
  // 监听主题选择自定义事件 — 选择主题后进入时间选择页面
  window.addEventListener('charadesThemeSelected', (e) => {
    selectedCharadesTheme = e.detail.theme;
    // 隐藏主题选择，显示时间选择
    document.getElementById('charades-setup').classList.add('hidden');
    document.getElementById('charades-time-select').classList.remove('hidden');
  });

  // 兼容：如果存在旧版 select 主题选择器，也绑定
  const themeSelect = document.querySelector('#charades-theme');
  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      selectedCharadesTheme = event.target.value;
    });
  }

  const musicBtn = document.querySelector('#music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      const isMuted = toggleMute();
      musicBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  // 我的版本：初始化人数滑块（带刻度放大效果）
  initPlayerSlider('werewolf-players-slider', 'werewolf-slider-value', '#werewolf-setup .slider-marks');

  // 角色介绍按钮
  const roleInfoBtn = document.querySelector('#werewolf-role-info-btn');
  if (roleInfoBtn) {
    roleInfoBtn.addEventListener('click', showWerewolfRoleInfo);
  }
  const roleInfoClose = document.querySelector('#role-info-close');
  if (roleInfoClose) {
    roleInfoClose.addEventListener('click', closeWerewolfRoleInfo);
  }

  if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
  }
  if (exitButton) {
    exitButton.addEventListener('click', exitCurrentGame);
  }
}

// ============================================================
//  我的版本：人数滑块初始化（带刻度放大效果）
//  与队友版本的 initPlayerSlider 合并，保留我的刻度样式
// ============================================================
function initPlayerSlider(sliderId, outputId, marksContainerSelector) {
  const slider = document.querySelector(`#${sliderId}`);
  const output = document.querySelector(`#${outputId}`);
  const marks = document.querySelectorAll(`${marksContainerSelector} .mark`);
  // 我的版本：滑块上方数值显示
  const valueDisplay = document.querySelector(`#${sliderId.replace('slider', 'slider-value')}`);

  if (!slider) return;

  // 初始更新
  const updateSlider = () => {
    const currentValue = parseInt(slider.value, 10);

    // 1. 更新显示的文本
    if (output) {
      output.textContent = currentValue;
    }

    // 2. 更新滑块上方数值显示
    if (valueDisplay) {
      valueDisplay.textContent = `${currentValue} 人`;
    }

    // 3. 更新狼人杀的全局变量
    if (sliderId === 'werewolf-players-slider') {
      selectedWerewolfPlayers = currentValue;
    }

    // 4. 处理刻度放大效果（我的版本特色）
    marks.forEach(mark => {
      const markValue = parseInt(mark.dataset.value, 10);
      mark.classList.toggle('active', markValue === currentValue);
    });
  };

  slider.addEventListener('input', updateSlider);
  // 初始调用一次
  updateSlider();
}

function navigate(gameType) {
  // 确保音频上下文已解锁（用户点击触发的）
  unlockAudioOnFirstTouch();

  stopCharadesTimer();
  store.app.activePage = gameType;
  document.body.classList.add('game-page-active');
  pages.forEach((page) => page.classList.toggle('active', page.id === `page-${gameType}`));
  pageTitle.textContent = {
    werewolf: '狼人杀',
    undercover: '谁是卧底',
    charades: '你划我猜',
  }[gameType];
  backButton.classList.remove('hidden');
  // 暂停按钮仅在你划我猜页面显示（狼人杀和谁是卧底不需要暂停）
  pauseButton.classList.toggle('hidden', gameType !== 'charades');
  exitButton.classList.remove('hidden');
  gestureControls.classList.toggle('hidden', gameType !== 'charades');
  resetGameView(gameType);

  // 配置阶段保持安静，点击开始并真正进入游戏后再播放背景音乐。
  stopBGM();
}

function navigateHome() {
  stopCharadesTimer();
  if (store.app.activePage === 'charades') {
    stopCharadesRecording();
  }
  hideOrientationGate();
  charadesPausedForPortrait = false;
  charadesWaitingToStartInLandscape = false;
  store.app.activePage = 'home';
  document.body.classList.remove('game-page-active');
  pages.forEach((page) => page.classList.toggle('active', page.id === 'page-home'));
  pageTitle.textContent = '聚会游戏';
  backButton.classList.add('hidden');
  pauseButton.classList.add('hidden');
  exitButton.classList.add('hidden');
  updateStore('app', { isPaused: false });
  gestureController?.setEnabled(true);
  document.body.classList.remove('game-paused');
  pauseButton.textContent = '⏸️';
  gestureControls.classList.add('hidden');
  stopBGM();
}

function showBackConfirmation() {
  backConfirmModal.classList.remove('hidden');
}

function hideBackConfirmation() {
  backConfirmModal.classList.add('hidden');
}

function handleBackButton() {
  const activePage = store.app.activePage;
  const isInitialSetupPage = ['werewolf', 'undercover', 'charades'].includes(activePage)
    && !document.getElementById(`${activePage}-setup`).classList.contains('hidden');
  if (isInitialSetupPage) {
    navigateHome();
    return;
  }
  showBackConfirmation();
}

function resetGameView(gameType) {
  resetStoreSection(gameType);
  document.querySelector(`#${gameType}-setup`).classList.remove('hidden');
  document.querySelector(`#${gameType}-play`).classList.add('hidden');
  document.querySelector(`#${gameType}-card`)?.classList.remove('revealed');

  // 你划我猜特殊处理：重置为第一步（主题选择），隐藏时间选择
  if (gameType === 'charades') {
    releaseCharadesMediaStream();
    selectedCharadesRecordingMode = null;
    charadesWaitingToStartInLandscape = false;
    document.querySelectorAll('[data-recording-mode]').forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-checked', 'false');
      button.disabled = false;
    });
    document.getElementById('charades-start').disabled = false;
    charadesMediaStatus.textContent = '录制为可选项，也可以直接开始游戏';
    document.getElementById('charades-setup').classList.remove('hidden');
    document.getElementById('charades-time-select').classList.add('hidden');
  }
}

async function startWerewolf() {
  const startButton = document.querySelector('#werewolf-start');
  startButton.disabled = true;
  startButton.textContent = '正在加载身份牌…';
  try {
    const data = await loadGameData('werewolf');
    werewolfRoleDescriptionsCache = data.roleDescriptions ?? {};
    const config = data.playerConfigs[String(selectedWerewolfPlayers)];
    const assignedRoles = createWerewolfDeck(config);
    await preloadRoleImages(assignedRoles);
    updateStore('werewolf', {
      status: 'dealing',
      totalPlayers: selectedWerewolfPlayers,
      assignedRoles,
      currentPlayerIndex: 0,
      revealed: false,
    });
    document.querySelector('#werewolf-setup').classList.add('hidden');
    document.querySelector('#werewolf-play').classList.remove('hidden');
    renderWerewolf();
    playBGM('werewolf');
    saveProgress('werewolf', store.werewolf);
  } catch (error) {
    showError(error);
  } finally {
    startButton.disabled = false;
    startButton.textContent = '开始';
  }
}

async function handleWerewolfAction() {
  const game = store.werewolf;
  if (game.status !== 'dealing' || werewolfCardTransitioning) return;

  if (!game.revealed) {
    werewolfCardTransitioning = true;
    setActionButtonBusy('werewolf-action', true);
    updateStore('werewolf', { revealed: true });
    renderWerewolf();
    await wait(CARD_FLIP_DURATION);
    werewolfCardTransitioning = false;
    setActionButtonBusy('werewolf-action', false);
    return;
  }

  werewolfCardTransitioning = true;
  setActionButtonBusy('werewolf-action', true);
  const nextIndex = game.currentPlayerIndex + 1;
  updateStore('werewolf', { revealed: false });
  renderWerewolf();
  await wait(CARD_FLIP_DURATION);

  if (nextIndex >= game.totalPlayers) {
    updateStore('werewolf', { status: 'finished' });
    werewolfCardTransitioning = false;
    setActionButtonBusy('werewolf-action', false);
    showResult('🐺', '身份发放完成', '请收起手机，开始夜晚流程。');
    return;
  }

  updateStore('werewolf', { currentPlayerIndex: nextIndex });
  renderWerewolf();
  saveProgress('werewolf', store.werewolf);
  werewolfCardTransitioning = false;
  setActionButtonBusy('werewolf-action', false);
}

function renderWerewolf() {
  const game = store.werewolf;
  const role = game.assignedRoles[game.currentPlayerIndex];
  const card = document.querySelector('#werewolf-card');
  card.classList.toggle('revealed', game.revealed);
  document.querySelector('#werewolf-action').textContent = game.revealed
    ? '我记住了，传给下一位'
    : '查看身份';
  document.querySelector('#werewolf-player-label').textContent = `第 ${game.currentPlayerIndex + 1} 位玩家`;
  document.querySelector('#werewolf-progress-label').textContent = `${game.currentPlayerIndex + 1} / ${game.totalPlayers}`;
  document.querySelector('#werewolf-progress').style.width = `${((game.currentPlayerIndex + 1) / game.totalPlayers) * 100}%`;
  document.querySelector('#werewolf-role-name').textContent = role;

  // 角色介绍按钮：翻牌后才显示
  const roleInfoBtn = document.querySelector('#werewolf-role-info-btn');
  if (roleInfoBtn) {
    roleInfoBtn.classList.toggle('hidden', !game.revealed);
  }

  // 多巴胺风格：根据角色设置卡牌背面背景色
  const roleCard = document.querySelector('#werewolf-card .role-card');
  if (roleCard) {
    roleCard.style.background = ROLE_BG_COLORS[role] || 'linear-gradient(145deg, #6B7280, #4B5563)';
  }

  const image = document.querySelector('#werewolf-role-image');
  const fallback = document.querySelector('#werewolf-role-fallback');
  const imageFile = ROLE_IMAGES[role];
  const imageUrl = imageFile ? `./wolfcard/${imageFile}` : '';
  const renderId = ++roleImageRenderId;

  image.removeAttribute('src');
  image.style.display = 'none';
  image.alt = `${role}身份牌`;
  fallback.textContent = ROLE_EMOJI[role] ?? '🎴';
  fallback.style.display = 'block';

  if (!imageUrl || roleImageCache.get(imageUrl) === false) {
    return;
  }

  image.onload = () => {
    if (renderId !== roleImageRenderId) return;
    image.style.display = '';
    fallback.style.display = 'none';
  };
  image.onerror = () => {
    if (renderId !== roleImageRenderId) return;
    roleImageCache.set(imageUrl, false);
    image.style.display = 'none';
    fallback.style.display = 'block';
  };
  image.src = imageUrl;
}

async function preloadRoleImages(roles) {
  const urls = [...new Set(roles.map((role) => ROLE_IMAGES[role]).filter(Boolean))]
    .map((fileName) => `./wolfcard/${fileName}`);
  await Promise.all(urls.map(preloadImage));
}

function preloadImage(url) {
  if (roleImageCache.has(url)) {
    return Promise.resolve(roleImageCache.get(url));
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      roleImageCache.set(url, true);
      resolve(true);
    };
    image.onerror = () => {
      roleImageCache.set(url, false);
      resolve(false);
    };
    image.src = url;
  });
}

async function startUndercover() {
  try {
    const totalPlayers = Number(document.querySelector('#undercover-players').value);
    const undercoverCount = Number(document.querySelector('#undercover-count').value);
    const data = await loadGameData('undercover');
    const round = createUndercoverRound(data.wordPairs, totalPlayers, undercoverCount);
    updateStore('undercover', {
      status: 'dealing',
      totalPlayers,
      undercoverCount,
      assignedWords: round.assignedWords,
      currentPlayerIndex: 0,
      revealed: false,
    });
    document.querySelector('#undercover-setup').classList.add('hidden');
    document.querySelector('#undercover-play').classList.remove('hidden');
    renderUndercover();
    playBGM('undercover');
    saveProgress('undercover', store.undercover);
  } catch (error) {
    showError(error);
  }
}

async function handleUndercoverAction() {
  const game = store.undercover;
  if (game.status !== 'dealing' || undercoverCardTransitioning) return;

  if (!game.revealed) {
    undercoverCardTransitioning = true;
    setActionButtonBusy('undercover-action', true);
    updateStore('undercover', { revealed: true });
    renderUndercover();
    await wait(CARD_FLIP_DURATION);
    undercoverCardTransitioning = false;
    setActionButtonBusy('undercover-action', false);
    return;
  }

  undercoverCardTransitioning = true;
  setActionButtonBusy('undercover-action', true);
  const nextIndex = game.currentPlayerIndex + 1;
  updateStore('undercover', { revealed: false });
  renderUndercover();
  await wait(CARD_FLIP_DURATION);

  if (nextIndex >= game.totalPlayers) {
    updateStore('undercover', { status: 'finished' });
    undercoverCardTransitioning = false;
    setActionButtonBusy('undercover-action', false);
    showResult('🕵️', '词语发放完成', '所有人依次描述自己的词语，找出卧底吧。');
    return;
  }

  updateStore('undercover', { currentPlayerIndex: nextIndex });
  renderUndercover();
  saveProgress('undercover', store.undercover);
  undercoverCardTransitioning = false;
  setActionButtonBusy('undercover-action', false);
}

function renderUndercover() {
  const game = store.undercover;
  document.querySelector('#undercover-card').classList.toggle('revealed', game.revealed);
  document.querySelector('#undercover-action').textContent = game.revealed
    ? '我记住了，传给下一位'
    : '查看词语';
  document.querySelector('#undercover-player-label').textContent = `第 ${game.currentPlayerIndex + 1} 位玩家`;
  document.querySelector('#undercover-progress-label').textContent = `${game.currentPlayerIndex + 1} / ${game.totalPlayers}`;
  document.querySelector('#undercover-progress').style.width = `${((game.currentPlayerIndex + 1) / game.totalPlayers) * 100}%`;
  document.querySelector('#undercover-word').textContent = game.assignedWords[game.currentPlayerIndex];
}

async function startCharades() {
  if (!isLandscape()) {
    charadesWaitingToStartInLandscape = true;
    charadesMediaStatus.textContent = '请先将手机旋转为横屏，再开始游戏';
    showOrientationGate();
    return;
  }

  charadesWaitingToStartInLandscape = false;
  hideOrientationGate();
  // 隐藏时间选择页面
  document.getElementById('charades-time-select').classList.add('hidden');
  document.getElementById('charades-play').classList.remove('hidden');

  // 显示横屏提示 Toast（2秒后自动消失，然后开始倒计时）
  showLandscapeToast();

  try {
    if (selectedCharadesRecordingMode && hasLiveCharadesMediaStream()) {
      await startCharadesRecording();
    }
    const data = await loadGameData('charades');
    const deck = createCharadesThemeDeck(data.categories, selectedCharadesTheme);
    updateStore('charades', {
      status: 'countdown',
      selectedTheme: selectedCharadesTheme,
      duration: selectedCharadesDuration,
      remainingSeconds: selectedCharadesDuration,
      deck,
      currentIndex: 0,
      score: 0,
      correctWords: [],
      passedWords: [],
    });
    renderCharades();
    playBGM('charades');
    // 等待 2 秒让 Toast 显示，然后开始倒计时
    await wait(2000);
    await runCountdown();
    if (!isLandscape()) {
      updateStore('charades', { status: 'waiting-orientation' });
      charadesPausedForPortrait = true;
      showOrientationGate();
      return;
    }
    updateStore('charades', { status: 'playing' });
    renderCharades();
    if (!store.app.isPaused) {
      startCharadesTimer();
    }
  } catch (error) {
    stopCharadesRecording({ discard: true });
    showError(error);
  }
}

// 横屏提示 Toast — 在倒计时前显示，2秒后自动消失
function showLandscapeToast() {
  // 移除已存在的 toast
  const existing = document.getElementById('landscape-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'landscape-toast';
  toast.textContent = '↻ 请将手机旋转至横屏模式以获得最佳体验';
  Object.assign(toast.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '200',
    padding: '16px 28px',
    borderRadius: '16px',
    background: 'rgba(0,0,0,0.78)',
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '80%',
    pointerEvents: 'none',
    animation: 'fadeInOut 2s ease-in-out forwards',
  });
  document.body.appendChild(toast);

  // 2秒后自动移除
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 2000);
}

function handleCharades(direction) {
  const game = store.charades;
  if (game.status !== 'playing') return;
  const current = game.deck[game.currentIndex];
  const correct = direction === 'up';
  const nextIndex = game.currentIndex + 1;
  const patch = {
    currentIndex: nextIndex >= game.deck.length ? 0 : nextIndex,
    score: game.score + (correct ? 1 : 0),
    correctWords: correct ? [...game.correctWords, current.word] : game.correctWords,
    passedWords: correct ? game.passedWords : [...game.passedWords, current.word],
    deck: nextIndex >= game.deck.length ? shuffle(game.deck) : game.deck,
  };
  updateStore('charades', patch);
  renderCharades();
  saveProgress('charades', store.charades);

  // 我的版本：更新进度条
  const total = game.deck.length;
  const answered = patch.correctWords.length + patch.passedWords.length;
  updateCharadesProgress(answered, total);
}

function renderCharades() {
  const game = store.charades;
  const current = game.deck[game.currentIndex];
  const showWord = game.status === 'playing';
  const word = document.querySelector('#charades-word');
  const category = document.querySelector('#charades-category');
  document.querySelector('#charades-time').textContent = formatTime(game.remainingSeconds);
  document.querySelector('#charades-score').textContent = String(game.score);
  word.textContent = showWord ? (current?.word ?? '') : '';
  category.textContent = showWord ? (CATEGORY_LABELS[current?.category] ?? '题目') : '';
  word.style.visibility = showWord ? 'visible' : 'hidden';
  category.style.visibility = showWord ? 'visible' : 'hidden';
}

function startCharadesTimer() {
  stopCharadesTimer();
  charadesTimer = window.setInterval(() => {
    const remainingSeconds = Math.max(0, store.charades.remainingSeconds - 1);
    updateStore('charades', { remainingSeconds });
    renderCharades();
    if (remainingSeconds === 0) finishCharades();
  }, 1000);
}

function stopCharadesTimer() {
  if (charadesTimer) {
    window.clearInterval(charadesTimer);
    charadesTimer = null;
  }
}

function scheduleOrientationLayoutCheck() {
  handleOrientationLayoutChange();
  window.setTimeout(handleOrientationLayoutChange, 150);
  window.setTimeout(handleOrientationLayoutChange, 400);
}

function handleOrientationLayoutChange() {
  if (store.app.activePage !== 'charades') return;

  if (!isLandscape()) {
    showOrientationGate();
    if (store.charades.status === 'playing') {
      stopCharadesTimer();
      charadesPausedForPortrait = true;
      pauseCharadesRecording('已切换为竖屏，录制已暂停');
    }
    return;
  }

  hideOrientationGate();
  if (charadesWaitingToStartInLandscape) {
    charadesWaitingToStartInLandscape = false;
    startCharades();
    return;
  }
  if (store.charades.status === 'waiting-orientation') {
    charadesPausedForPortrait = false;
    updateStore('charades', { status: 'playing' });
    renderCharades();
    if (!store.app.isPaused) {
      startCharadesTimer();
      resumeCharadesRecording();
    }
    return;
  }
  if (charadesPausedForPortrait && store.charades.status === 'playing' && !store.app.isPaused) {
    charadesPausedForPortrait = false;
    startCharadesTimer();
    resumeCharadesRecording();
  }
}

function togglePause() {
  const currentState = store.app.isPaused;
  const newState = !currentState;
  updateStore('app', { isPaused: newState });

  pauseButton.textContent = newState ? '▶️' : '⏸️';

  // 针对"你划我猜"的特殊处理：暂停/恢复定时器
  if (store.app.activePage === 'charades') {
    gestureController?.setEnabled(!newState);
    if (newState) {
      stopCharadesTimer(); // 暂停：清除定时器
      pauseCharadesRecording();
    } else if (store.charades.status === 'playing' && isLandscape()) {
      startCharadesTimer(); // 恢复：重启定时器
      resumeCharadesRecording();
    }
  }

  // 可选：给 body 加个 class 方便成员 D 做暗化 UI
  document.body.classList.toggle('game-paused', newState);
}

function exitCurrentGame() {
  // 退出游戏就是进行一次彻底的重置并返回主页
  updateStore('app', { isPaused: false });
  document.body.classList.remove('game-paused');
  pauseButton.textContent = '⏸️'; // 重置按钮图标
  navigateHome(); // navigateHome 里已经包含了 stopCharadesTimer() 和 stopBGM()
}

function isLandscape() {
  return window.matchMedia?.('(orientation: landscape)').matches
    ?? window.innerWidth > window.innerHeight;
}

function showOrientationGate() {
  orientationGate.classList.remove('hidden');
}

function hideOrientationGate() {
  orientationGate.classList.add('hidden');
}

function finishCharades() {
  stopCharadesTimer();
  stopCharadesRecording();
  updateStore('charades', { status: 'ended' });
  const game = store.charades;
  const summary = createCharadesSummary(game);
  const correctDetails = summary.correctWords.length
    ? summary.correctWords.join('、')
    : '无';
  const incorrectDetails = summary.incorrectWords.length
    ? summary.incorrectWords.join('、')
    : '无';
  const details = `猜对 ${summary.correctCount} 个：${correctDetails}\n猜错 ${summary.incorrectCount} 个：${incorrectDetails}`;
  showResult(
    '🎉',
    `本轮得分 ${summary.score}`,
    details,
  );

  // 我的版本：在结果弹窗中展示详细词语列表
  showCharadesEndSummary(summary.correctWords, summary.incorrectWords);
}

async function runCountdown() {
  const overlay = document.querySelector('#countdown');
  overlay.classList.remove('hidden');
  for (const value of ['3', '2', '1', '开始']) {
    overlay.textContent = value;
    await wait(value === '开始' ? 500 : 800);
  }
  overlay.classList.add('hidden');
}

function handleGesture(direction) {
  if (store.app.isPaused) return;
  const page = store.app.activePage;
  if (page !== 'charades') return;
  if (store.charades.status !== 'playing') return;
  provideFeedback(direction);
  playEffect(direction === 'up' ? 'correct' : 'skip');
  handleCharades(direction);
}

async function startCharadesRecording() {
  if (!charadesMediaStatus) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    charadesMediaStatus.textContent = '当前浏览器不支持录音录像，仍可继续游戏';
    return;
  }

  const mode = selectedCharadesRecordingMode;
  const mimeType = getSupportedRecordingMimeType(mode);
  if (!mimeType) {
    charadesMediaStatus.textContent = mode === 'video'
      ? '当前浏览器不能生成 MP4，游戏将继续但不会录制'
      : '当前浏览器不能生成 MP3，游戏将继续但不会录音';
    return;
  }

  if (!hasLiveCharadesMediaStream()) {
    charadesMediaStatus.textContent = '媒体权限已失效，请重新点击相机或话筒授权';
    return;
  }

  try {
    charadesRecordingChunks = [];
    discardCharadesRecording = false;
    activeCharadesRecordingMode = mode;

    charadesMediaRecorder = new MediaRecorder(charadesMediaStream, { mimeType });
    charadesMediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        charadesRecordingChunks.push(event.data);
      }
    });
    charadesMediaRecorder.addEventListener('stop', saveCharadesRecording);
    charadesMediaRecorder.start(1000);
    charadesMediaStatus.textContent = mode === 'video'
      ? '正在录制横屏 MP4 视频，游戏结束后自动保存'
      : '正在录制 MP3 音频，游戏结束后自动保存';
  } catch (error) {
    console.warn('[charades] Recording could not start:', error);
    releaseCharadesMediaStream();
    activeCharadesRecordingMode = null;
    charadesMediaStatus.textContent = '录制启动失败，游戏将继续但不会生成文件';
  }
}

async function requestCharadesMediaPermission(button) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    charadesMediaStatus.textContent = '当前浏览器不支持录音录像';
    return;
  }

  const mode = button.dataset.recordingMode;
  if (mode === 'video' && !isLandscape()) {
    charadesMediaStatus.textContent = '请先将手机旋转为横屏，再点击相机授权';
    showOrientationGate();
    return;
  }

  hideOrientationGate();
  releaseCharadesMediaStream();
  selectedCharadesRecordingMode = null;
  document.getElementById('charades-start').disabled = true;
  document.querySelectorAll('[data-recording-mode]').forEach((item) => {
    item.classList.remove('selected');
    item.setAttribute('aria-checked', 'false');
    item.disabled = true;
  });
  charadesMediaStatus.textContent = mode === 'video'
    ? '正在申请摄像头和麦克风权限…'
    : '正在申请麦克风权限…';

  try {
    const constraints = mode === 'video'
      ? {
          audio: true,
          video: {
            aspectRatio: { ideal: 16 / 9 },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        }
      : { audio: true, video: false };
    charadesMediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (!getSupportedRecordingMimeType(mode)) {
      releaseCharadesMediaStream();
      charadesMediaStatus.textContent = mode === 'video'
        ? '权限已允许，但当前浏览器不能生成 MP4'
        : '权限已允许，但当前浏览器不能生成 MP3';
      return;
    }

    selectedCharadesRecordingMode = mode;
    button.classList.add('selected');
    button.setAttribute('aria-checked', 'true');
    document.getElementById('charades-start').disabled = false;
    charadesMediaStatus.textContent = mode === 'video'
      ? '相机和麦克风已授权，将录制横屏 MP4 视频'
      : '麦克风已授权，将仅录制 MP3 音频';
  } catch (error) {
    console.warn('[charades] Media permission was not granted:', error);
    releaseCharadesMediaStream();
    charadesMediaStatus.textContent = mode === 'video'
      ? '未获得摄像头或麦克风权限，请点击相机重试'
      : '未获得麦克风权限，请点击话筒重试';
  } finally {
    document.querySelectorAll('[data-recording-mode]').forEach((item) => {
      item.disabled = false;
    });
    document.getElementById('charades-start').disabled = false;
  }
}

function hasLiveCharadesMediaStream() {
  if (!charadesMediaStream) return false;
  const hasLiveAudio = charadesMediaStream.getAudioTracks()
    .some((track) => track.readyState === 'live');
  if (selectedCharadesRecordingMode === 'audio') return hasLiveAudio;
  const hasLiveVideo = charadesMediaStream.getVideoTracks()
    .some((track) => track.readyState === 'live');
  return hasLiveAudio && hasLiveVideo;
}

function pauseCharadesRecording(message = '游戏已暂停，录制同步暂停') {
  if (charadesMediaRecorder?.state === 'recording') {
    charadesMediaRecorder.pause();
    charadesMediaStatus.textContent = message;
  }
}

function resumeCharadesRecording() {
  if (charadesMediaRecorder?.state === 'paused') {
    charadesMediaRecorder.resume();
    charadesMediaStatus.textContent = activeCharadesRecordingMode === 'video'
      ? '正在录制横屏 MP4 视频，游戏结束后自动保存'
      : '正在录制 MP3 音频，游戏结束后自动保存';
  }
}

function stopCharadesRecording({ discard = false } = {}) {
  if (!charadesMediaRecorder) {
    releaseCharadesMediaStream();
    return;
  }

  discardCharadesRecording = discardCharadesRecording || discard;
  if (charadesMediaRecorder.state !== 'inactive') {
    charadesMediaRecorder.stop();
  }
}

function saveCharadesRecording() {
  const recorder = charadesMediaRecorder;
  const chunks = charadesRecordingChunks;
  const shouldDiscard = discardCharadesRecording;
  const recordingMode = activeCharadesRecordingMode;
  charadesMediaRecorder = null;
  charadesRecordingChunks = [];
  discardCharadesRecording = false;
  activeCharadesRecordingMode = null;
  releaseCharadesMediaStream();

  if (shouldDiscard || chunks.length === 0) return;

  const isVideo = recordingMode === 'video';
  const mimeType = recorder.mimeType || chunks[0].type || (isVideo ? 'video/mp4' : 'audio/mpeg');
  const extension = isVideo ? 'mp4' : 'mp3';
  const blob = new Blob(chunks, { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `你划我猜-${isVideo ? '视频' : '录音'}-${formatRecordingTime(new Date())}.${extension}`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  charadesMediaStatus.textContent = `${isVideo ? 'MP4 视频' : 'MP3 录音'}已生成，请在手机“下载”中查看`;
}

function releaseCharadesMediaStream() {
  charadesMediaStream?.getTracks().forEach((track) => track.stop());
  charadesMediaStream = null;
}

function getSupportedRecordingMimeType(mode) {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const candidates = mode === 'video'
    ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ]
    : ['audio/mpeg', 'audio/mp3'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function formatRecordingTime(date) {
  const parts = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ];
  return `${parts.slice(0, 3).join('')}-${parts.slice(3).join('')}`;
}

function provideFeedback(direction) {
  feedbackFlash.className = `feedback-flash ${direction}`;
  window.setTimeout(() => { feedbackFlash.className = 'feedback-flash'; }, 300);
  if (navigator.vibrate) {
    navigator.vibrate(direction === 'up' ? 55 : [35, 35, 35]);
  }
}

function syncGestureStatus() {
  const status = gestureController && gestureController.getStatus
    ? gestureController.getStatus()
    : 'initializing';
  updateStore('app', { gestureStatus: status });
  const active = status === 'active';
  const needsPermission = status === 'permission-required'
    || status === 'permission-denied'
    || status === 'permission-error';
  gestureEnable.classList.toggle('hidden', !needsPermission);
  if (active) {
    gestureStatus.textContent = '体感操作已连接，按钮仍可备用';
  } else if (needsPermission) {
    gestureStatus.textContent = '点击启用手机翻转，或直接使用下方按钮';
  } else {
    gestureStatus.textContent = '体感操作不可用，请使用按钮';
  }
}

async function requestGesturePermission() {
  gestureEnable.disabled = true;
  gestureEnable.textContent = '正在请求权限…';
  try {
    await gestureController.requestPermission();
  } finally {
    gestureEnable.disabled = false;
    gestureEnable.textContent = '启用手机翻转';
    syncGestureStatus();
  }
}

function showResult(icon, title, message, details = '') {
  document.querySelector('#result-icon').textContent = icon;
  document.querySelector('#result-title').textContent = title;
  document.querySelector('#result-message').textContent = message;
  document.querySelector('#result-details').textContent = details;
  modal.classList.remove('hidden');
  currentResultAction = navigateHome;
}

function showError(error) {
  console.error(error);
  showResult('⚠️', '加载失败', '请通过本地服务器打开项目后重试。', error.message);
}

function closeResult() {
  modal.classList.add('hidden');
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function setActionButtonBusy(buttonId, busy) {
  const button = document.querySelector(`#${buttonId}`);
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

// ============================================================
//  角色介绍功能（狼人杀翻牌后显示角色说明）
// ============================================================
// 缓存角色描述数据，在 startWerewolf 时加载
let werewolfRoleDescriptionsCache = {};

function showWerewolfRoleInfo() {
  const game = store.werewolf;
  if (game.status !== 'dealing') return;
  const role = game.assignedRoles[game.currentPlayerIndex];
  const roleInfo = getWerewolfRoleDescription({ roleDescriptions: werewolfRoleDescriptionsCache }, role);
  if (!roleInfo) {
    showResult('📖', role, '暂无该角色的详细介绍。');
    return;
  }

  document.querySelector('#role-info-icon').textContent = ROLE_EMOJI[role] ?? '🎴';
  document.querySelector('#role-info-title').textContent = role;
  document.querySelector('#role-info-camp').textContent = `阵营：${roleInfo.camp}`;
  document.querySelector('#role-info-gameplay').textContent = roleInfo.gameplay;
  document.querySelector('#role-info-skill').textContent = `技能：${roleInfo.skill}`;
  document.querySelector('#role-info-modal').classList.remove('hidden');
}

function closeWerewolfRoleInfo() {
  document.querySelector('#role-info-modal').classList.add('hidden');
}
