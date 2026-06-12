// ============================================================
//  ui.js — 我的版本 UI 辅助函数
//  说明：此文件提供 UI 相关的工具函数，供 main.js 及其他
//  模块调用。导航逻辑已由 main.js 的 navigate() 统一管理。
//  此文件作为辅助模块保留，不重复定义导航函数。
// ============================================================

// ============================================================
//  CARD POP ANIMATION
// ============================================================
export function popCard(el) {
  if (!el) return;
  el.classList.remove('pop');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('pop');
}

// ============================================================
//  MODAL (备用弹窗系统，与 main.js 的 showResult 互补)
// ============================================================
export function showModal(title, text) {
  const titleEl = document.getElementById('modal-title');
  const textEl = document.getElementById('modal-text');
  const overlay = document.getElementById('modal-overlay');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  if (overlay) overlay.classList.add('show');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

// ============================================================
//  VIBRATE
// ============================================================
export function vibrate() {
  try { navigator.vibrate(50); } catch(e) {}
}

// ============================================================
//  GESTURE INTEGRATION (备用)
//  注：main.js 已通过 gesture.js 处理手势识别。
//  以下函数作为备用/兼容保留。
// ============================================================
export function triggerSwipeUp() {
  vibrate();
  window.dispatchEvent(new CustomEvent('swipeUp'));
}

export function triggerSwipeDown() {
  vibrate();
  window.dispatchEvent(new CustomEvent('swipeDown'));
}

// ============================================================
//  MUSIC SYSTEM (备用)
//  注：main.js 已通过 audioManager.js 管理音频。
//  以下函数作为备用/兼容保留，但实际音频控制走 audioManager。
// ============================================================
const GAME_MUSIC = {
  werewolf: { src: '', label: '🐺 狼人杀' },
  spy:      { src: '', label: '🕵️ 谁是卧底' },
  charades: { src: '', label: '🎭 你划我猜' },
};

let musicEnabled = false;
let currentMusicPage = null;
let musicAudio = null;

export function playGameMusic(page) {
  if (!musicEnabled) {
    stopMusic();
    currentMusicPage = null;
    return;
  }
  if (page === currentMusicPage) return;
  stopMusic();
  currentMusicPage = page;
  if (!page || !GAME_MUSIC[page]) return;
  const info = GAME_MUSIC[page];
  if (!info.src) {
    console.log(`[Music] 进入 ${info.label}，等待配置音乐文件`);
    return;
  }
  try {
    musicAudio = new Audio(info.src);
    musicAudio.loop = true;
    musicAudio.volume = 0.5;
    musicAudio.play().catch(e => console.log('[Music] 播放失败:', e.message));
  } catch(e) {
    console.log('[Music] 创建音频失败:', e.message);
  }
}

export function stopMusic() {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio = null;
  }
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  const btn = document.getElementById('music-toggle');
  if (btn) {
    if (musicEnabled) {
      btn.textContent = '🔊';
      btn.classList.remove('muted');
    } else {
      btn.textContent = '🔇';
      btn.classList.add('muted');
      stopMusic();
      currentMusicPage = null;
    }
  }
  console.log(`[Music] ${musicEnabled ? '已开启' : '已关闭'}`);
}

// ============================================================
//  ROLE INFO MODAL (备用)
//  注：main.js 使用 showResult 展示结果。
//  以下函数作为备用保留。
// ============================================================
export function showRoleInfo(roleName) {
  const info = window.WEREWOLF_ROLE_INFO && window.WEREWOLF_ROLE_INFO[roleName];
  if (!info) return;
  const iconEl = document.getElementById('role-info-icon');
  const nameEl = document.getElementById('role-info-name');
  const campEl = document.getElementById('role-info-camp');
  const skillEl = document.getElementById('role-info-skill');
  const tipEl = document.getElementById('role-info-tip');
  const overlay = document.getElementById('role-info-overlay');
  if (iconEl) iconEl.textContent = info.emoji;
  if (nameEl) nameEl.textContent = roleName;
  if (campEl) {
    campEl.textContent = info.camp;
    campEl.className = 'role-info-camp ' + info.campClass;
  }
  if (skillEl) skillEl.textContent = info.skill;
  if (tipEl) tipEl.textContent = info.tip;
  if (overlay) overlay.classList.add('show');
}

export function closeRoleInfo() {
  const overlay = document.getElementById('role-info-overlay');
  if (overlay) overlay.classList.remove('show');
}

// ============================================================
//  CHARADES THEME SELECTION (主题选择事件绑定)
//  供 main.js 在初始化时调用
// ============================================================
export function bindCharadesThemeSelection() {
  const themeGrid = document.getElementById('charades-theme-grid');
  if (!themeGrid) return;

  themeGrid.querySelectorAll('.theme-item').forEach(item => {
    item.addEventListener('click', () => {
      // 移除其他选中状态
      themeGrid.querySelectorAll('.theme-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      // 触发自定义事件，让 main.js 监听
      const theme = item.dataset.theme;
      window.dispatchEvent(new CustomEvent('charadesThemeSelected', { detail: { theme } }));
    });
  });
}

// ============================================================
//  UPDATE PROGRESS (进度更新工具)
//  供 charades 游戏逻辑调用
// ============================================================
export function updateCharadesProgress(current, total) {
  const progressFill = document.getElementById('charades-bar-fill');
  const progressRow = document.getElementById('charades-progress-row');
  if (!progressFill) return;
  if (progressRow) progressRow.classList.add('show');
  const pct = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = pct + '%';
  const hue = (pct / 100) * 120;
  progressFill.style.background = `hsl(${hue}, 85%, 50%)`;
}

// ============================================================
//  SHOW END SUMMARY (结束总结展示)
//  供 charades 游戏结束时调用
// ============================================================
export function showCharadesEndSummary(correctWords, skipWords) {
  const correctList = correctWords || [];
  const skipList = skipWords || [];
  const detailsEl = document.getElementById('result-details');
  if (!detailsEl) return;

  let html = `<p>猜对 ${correctList.length} 个 · 跳过 ${skipList.length} 个</p>`;
  if (correctList.length > 0) {
    html += '<p><strong>✅ 猜对：</strong>' + correctList.join('、') + '</p>';
  }
  if (skipList.length > 0) {
    html += '<p><strong>⏭️ 跳过：</strong>' + skipList.join('、') + '</p>';
  }
  detailsEl.innerHTML = html;
}
