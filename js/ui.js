// ============================================================
//  NAVIGATION
// ============================================================
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    STATE.currentPage = 'home';
    stopCharadesTimer();
    playGameMusic(null); // stop music when back to home
    return;
  }
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); STATE.currentPage = page; }
  // Play music for the entered game
  playGameMusic(page);
}

function showComingSoon() {
  showModal('🎲 敬请期待', '更多精彩游戏即将上线，敬请期待！');
}

// ============================================================
//  CARD POP ANIMATION
// ============================================================
function popCard(el) {
  if (!el) return;
  el.classList.remove('pop');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('pop');
}

// ============================================================
//  MODAL
// ============================================================
function showModal(title, text) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-text').textContent = text;
  document.getElementById('modal-overlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

// ============================================================
//  VIBRATE
// ============================================================
function vibrate() {
  try { navigator.vibrate(50); } catch(e) {}
}

// ============================================================
//  GESTURE INTEGRATION
// ============================================================
window.onSwipeUp = function() { triggerSwipeUp(); };
window.onSwipeDown = function() { triggerSwipeDown(); };

function triggerSwipeUp() {
  vibrate();
  window.dispatchEvent(new CustomEvent('swipeUp'));
  const page = STATE.currentPage;
  if (page === 'werewolf') werewolfNext();
  else if (page === 'spy') spyNext();
  else if (page === 'charades') charadesCorrect();
}

function triggerSwipeDown() {
  vibrate();
  window.dispatchEvent(new CustomEvent('swipeDown'));
  const page = STATE.currentPage;
  if (page === 'charades') charadesSkip();
}

// ============================================================
//  MUSIC SYSTEM
//  - Initially muted (no music)
//  - Entering a game page starts corresponding BGM
//  - Toggle button to mute/unmute
// ============================================================
const GAME_MUSIC = {
  werewolf: { src: '', label: '🐺 狼人杀' },
  spy:      { src: '', label: '🕵️ 谁是卧底' },
  charades: { src: '', label: '🎭 你划我猜' },
};

let musicEnabled = false; // initially no music
let currentMusicPage = null;
let musicAudio = null;

function playGameMusic(page) {
  // If music is disabled, do nothing
  if (!musicEnabled) {
    stopMusic();
    currentMusicPage = null;
    return;
  }
  // If same page, keep playing
  if (page === currentMusicPage) return;
  // Stop previous
  stopMusic();
  currentMusicPage = page;
  if (!page || !GAME_MUSIC[page]) return;
  const info = GAME_MUSIC[page];
  if (!info.src) {
    // No music file configured yet - show placeholder behavior
    console.log(`[Music] 进入 ${info.label}，等待配置音乐文件`);
    return;
  }
  // Play music
  try {
    musicAudio = new Audio(info.src);
    musicAudio.loop = true;
    musicAudio.volume = 0.5;
    musicAudio.play().catch(e => console.log('[Music] 播放失败:', e.message));
  } catch(e) {
    console.log('[Music] 创建音频失败:', e.message);
  }
}

function stopMusic() {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio = null;
  }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  const btn = document.getElementById('music-toggle');
  if (musicEnabled) {
    btn.textContent = '🔊';
    btn.classList.remove('muted');
    // Resume music for current page
    if (STATE.currentPage && STATE.currentPage !== 'home') {
      playGameMusic(STATE.currentPage);
    }
  } else {
    btn.textContent = '🔇';
    btn.classList.add('muted');
    stopMusic();
    currentMusicPage = null;
  }
  console.log(`[Music] ${musicEnabled ? '已开启' : '已关闭'}`);
}

// ============================================================
//  ROLE INFO MODAL
// ============================================================
function showRoleInfo(roleName) {
  const info = WEREWOLF_ROLE_INFO[roleName];
  if (!info) return;
  document.getElementById('role-info-icon').textContent = info.emoji;
  document.getElementById('role-info-name').textContent = roleName;
  const campEl = document.getElementById('role-info-camp');
  campEl.textContent = info.camp;
  campEl.className = 'role-info-camp ' + info.campClass;
  document.getElementById('role-info-skill').textContent = info.skill;
  document.getElementById('role-info-tip').textContent = info.tip;
  document.getElementById('role-info-overlay').classList.add('show');
}

function closeRoleInfo() {
  document.getElementById('role-info-overlay').classList.remove('show');
}
