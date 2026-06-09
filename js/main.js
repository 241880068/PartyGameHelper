import {
  createCharadesDeck,
  createUndercoverRound,
  createWerewolfDeck,
  getCharadesRecord,
  loadGameData,
  recordCharadesResult,
  saveProgress,
} from './gameLogic.js';
import { initGestureRecognition } from './gesture.js';
import { resetStoreSection, store, updateStore } from './store.js';
import { shuffle } from './utils/shuffle.js';

const ROLE_IMAGES = {
  狼人: '狼人.jpg',
  预言家: '预言家.jpg',
  女巫: '女巫.jpg',
  猎人: '猎人.jpg',
  守卫: '守卫.jpg',
  白痴: '丘比特.jpg',
  平民: '村民.jpg',
};

const ROLE_EMOJI = {
  狼人: '🐺',
  预言家: '🔮',
  女巫: '🧪',
  猎人: '🏹',
  守卫: '🛡️',
  白痴: '🃏',
  平民: '👤',
};

const CATEGORY_LABELS = {
  animals: '动物',
  objects: '物品',
  actions: '动作',
  occupations: '职业',
  entertainment: '娱乐',
};

const pages = [...document.querySelectorAll('.page')];
const pageTitle = document.querySelector('#page-title');
const backButton = document.querySelector('#back-button');
const gestureControls = document.querySelector('#gesture-controls');
const gestureStatus = document.querySelector('#gesture-status');
const gestureEnable = document.querySelector('#gesture-enable');
const feedbackFlash = document.querySelector('#feedback-flash');
const modal = document.querySelector('#result-modal');

let gestureController;
let charadesTimer;
let selectedWerewolfPlayers = 6;
let selectedCharadesDuration = 120;
let currentResultAction = navigateHome;

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  renderWerewolfPlayerOptions();
  bindEvents();
  updateBestScore();
  gestureController = initGestureRecognition({
    fallbackRoot: null,
    onSwipeUp: () => handleGesture('up'),
    onSwipeDown: () => handleGesture('down'),
  });
  syncGestureStatus();
  window.setInterval(syncGestureStatus, 400);
}

function bindEvents() {
  document.querySelectorAll('[data-game]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.game));
  });
  backButton.addEventListener('click', navigateHome);
  document.querySelector('#werewolf-start').addEventListener('click', startWerewolf);
  document.querySelector('#werewolf-card').addEventListener('click', () => handleGesture(
    store.werewolf.revealed ? 'down' : 'up',
  ));
  document.querySelector('#undercover-start').addEventListener('click', startUndercover);
  document.querySelector('#undercover-card').addEventListener('click', () => handleGesture(
    store.undercover.revealed ? 'down' : 'up',
  ));
  document.querySelector('#charades-start').addEventListener('click', startCharades);
  document.querySelector('#gesture-up').addEventListener('click', () => handleGesture('up'));
  document.querySelector('#gesture-down').addEventListener('click', () => handleGesture('down'));
  gestureEnable.addEventListener('click', requestGesturePermission);
  document.querySelector('#result-confirm').addEventListener('click', () => {
    closeResult();
    currentResultAction();
  });

  const playerRange = document.querySelector('#undercover-players');
  const countRange = document.querySelector('#undercover-count');
  playerRange.addEventListener('input', () => {
    document.querySelector('#undercover-player-output').textContent = `${playerRange.value} 人`;
    countRange.max = Math.max(1, Math.min(3, Number(playerRange.value) - 2));
    if (Number(countRange.value) > Number(countRange.max)) countRange.value = countRange.max;
    document.querySelector('#undercover-count-output').textContent = `${countRange.value} 人`;
  });
  countRange.addEventListener('input', () => {
    document.querySelector('#undercover-count-output').textContent = `${countRange.value} 人`;
  });

  document.querySelectorAll('[data-duration]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-duration]').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      selectedCharadesDuration = Number(button.dataset.duration);
    });
  });
}

function renderWerewolfPlayerOptions() {
  const root = document.querySelector('#werewolf-player-options');
  for (let count = 6; count <= 12; count += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${count} 人`;
    button.classList.toggle('selected', count === selectedWerewolfPlayers);
    button.addEventListener('click', () => {
      selectedWerewolfPlayers = count;
      root.querySelectorAll('button').forEach((item) => item.classList.toggle('selected', item === button));
    });
    root.append(button);
  }
}

function navigate(gameType) {
  stopCharadesTimer();
  store.app.activePage = gameType;
  pages.forEach((page) => page.classList.toggle('active', page.id === `page-${gameType}`));
  pageTitle.textContent = {
    werewolf: '狼人杀',
    undercover: '谁是卧底',
    charades: '你划我猜',
  }[gameType];
  backButton.classList.remove('hidden');
  gestureControls.classList.toggle('hidden', gameType === 'home');
  resetGameView(gameType);
}

function navigateHome() {
  stopCharadesTimer();
  store.app.activePage = 'home';
  pages.forEach((page) => page.classList.toggle('active', page.id === 'page-home'));
  pageTitle.textContent = '聚会游戏';
  backButton.classList.add('hidden');
  gestureControls.classList.add('hidden');
  updateBestScore();
}

function resetGameView(gameType) {
  resetStoreSection(gameType);
  document.querySelector(`#${gameType}-setup`).classList.remove('hidden');
  document.querySelector(`#${gameType}-play`).classList.add('hidden');
  document.querySelector(`#${gameType}-card`)?.classList.remove('revealed');
}

async function startWerewolf() {
  try {
    const data = await loadGameData('werewolf');
    const config = data.playerConfigs[String(selectedWerewolfPlayers)];
    const assignedRoles = createWerewolfDeck(config);
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
    saveProgress('werewolf', store.werewolf);
  } catch (error) {
    showError(error);
  }
}

function handleWerewolf(direction) {
  const game = store.werewolf;
  if (game.status !== 'dealing') return;

  if (direction === 'up' && !game.revealed) {
    updateStore('werewolf', { revealed: true });
    renderWerewolf();
    return;
  }
  if (direction !== 'down' || !game.revealed) return;

  const nextIndex = game.currentPlayerIndex + 1;
  if (nextIndex >= game.totalPlayers) {
    updateStore('werewolf', { status: 'finished', revealed: false });
    showResult('🐺', '身份发放完成', '请收起手机，开始夜晚流程。');
    return;
  }
  updateStore('werewolf', { currentPlayerIndex: nextIndex, revealed: false });
  renderWerewolf();
  saveProgress('werewolf', store.werewolf);
}

function renderWerewolf() {
  const game = store.werewolf;
  const role = game.assignedRoles[game.currentPlayerIndex];
  const card = document.querySelector('#werewolf-card');
  card.classList.toggle('revealed', game.revealed);
  document.querySelector('#werewolf-player-label').textContent = `第 ${game.currentPlayerIndex + 1} 位玩家`;
  document.querySelector('#werewolf-progress-label').textContent = `${game.currentPlayerIndex + 1} / ${game.totalPlayers}`;
  document.querySelector('#werewolf-progress').style.width = `${((game.currentPlayerIndex + 1) / game.totalPlayers) * 100}%`;
  document.querySelector('#werewolf-role-name').textContent = role;

  const image = document.querySelector('#werewolf-role-image');
  const fallback = document.querySelector('#werewolf-role-fallback');
  image.src = `./wolfcard/${ROLE_IMAGES[role] ?? ''}`;
  image.alt = `${role}身份牌`;
  image.style.display = ROLE_IMAGES[role] ? '' : 'none';
  fallback.textContent = ROLE_EMOJI[role] ?? '🎴';
  fallback.style.display = ROLE_IMAGES[role] ? 'none' : 'block';
  image.onerror = () => {
    image.style.display = 'none';
    fallback.style.display = 'block';
  };
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
    saveProgress('undercover', store.undercover);
  } catch (error) {
    showError(error);
  }
}

function handleUndercover(direction) {
  const game = store.undercover;
  if (game.status !== 'dealing') return;

  if (direction === 'up' && !game.revealed) {
    updateStore('undercover', { revealed: true });
    renderUndercover();
    return;
  }
  if (direction !== 'down' || !game.revealed) return;

  const nextIndex = game.currentPlayerIndex + 1;
  if (nextIndex >= game.totalPlayers) {
    updateStore('undercover', { status: 'finished', revealed: false });
    showResult('🕵️', '词语发放完成', '所有人依次描述自己的词语，找出卧底吧。');
    return;
  }
  updateStore('undercover', { currentPlayerIndex: nextIndex, revealed: false });
  renderUndercover();
  saveProgress('undercover', store.undercover);
}

function renderUndercover() {
  const game = store.undercover;
  document.querySelector('#undercover-card').classList.toggle('revealed', game.revealed);
  document.querySelector('#undercover-player-label').textContent = `第 ${game.currentPlayerIndex + 1} 位玩家`;
  document.querySelector('#undercover-progress-label').textContent = `${game.currentPlayerIndex + 1} / ${game.totalPlayers}`;
  document.querySelector('#undercover-progress').style.width = `${((game.currentPlayerIndex + 1) / game.totalPlayers) * 100}%`;
  document.querySelector('#undercover-word').textContent = game.assignedWords[game.currentPlayerIndex];
}

async function startCharades() {
  try {
    const data = await loadGameData('charades');
    const deck = createCharadesDeck(data.categories);
    updateStore('charades', {
      status: 'countdown',
      duration: selectedCharadesDuration,
      remainingSeconds: selectedCharadesDuration,
      deck,
      currentIndex: 0,
      score: 0,
      correctWords: [],
      passedWords: [],
    });
    document.querySelector('#charades-setup').classList.add('hidden');
    document.querySelector('#charades-play').classList.remove('hidden');
    renderCharades();
    await runCountdown();
    updateStore('charades', { status: 'playing' });
    startCharadesTimer();
  } catch (error) {
    showError(error);
  }
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
}

function renderCharades() {
  const game = store.charades;
  const current = game.deck[game.currentIndex];
  document.querySelector('#charades-time').textContent = formatTime(game.remainingSeconds);
  document.querySelector('#charades-score').textContent = String(game.score);
  document.querySelector('#charades-word').textContent = current?.word ?? '准备开始';
  document.querySelector('#charades-category').textContent = CATEGORY_LABELS[current?.category] ?? '题目';
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

function finishCharades() {
  stopCharadesTimer();
  updateStore('charades', { status: 'ended' });
  const game = store.charades;
  const record = recordCharadesResult({ score: game.score });
  const details = game.correctWords.length
    ? `猜对：${game.correctWords.join('、')}`
    : '本轮还没有猜对词语，再来一次一定会更好。';
  showResult('🎉', `本轮得分 ${game.score}`, `历史最佳 ${record.bestScore} 分`, details);
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
  const page = store.app.activePage;
  if (page === 'home') return;
  provideFeedback(direction);
  if (page === 'werewolf') handleWerewolf(direction);
  if (page === 'undercover') handleUndercover(direction);
  if (page === 'charades') handleCharades(direction);
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

function updateBestScore() {
  const record = getCharadesRecord();
  document.querySelector('#best-score').textContent = `${record.bestScore ?? 0} 分`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
