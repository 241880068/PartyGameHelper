// ============================================================
//  WEREWOLF
// ============================================================
function startWerewolfFromSlider() {
  const slider = document.getElementById('werewolf-slider');
  const num = parseInt(slider.value);
  startWerewolf(num);
}

function startWerewolf(num) {
  const roles = [...(WEREWOLF_ROLES[num] || WEREWOLF_ROLES[12])];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  STATE.ww = { roles, index: 0, flipped: false, done: false, started: false };
  document.getElementById('werewolf-select').style.display = 'none';
  document.getElementById('werewolf-deal').style.display = 'block';
  document.getElementById('werewolf-card').classList.remove('flipped');
  document.getElementById('werewolf-front-text').textContent = '发牌开始';
  document.getElementById('werewolf-skip-btn').textContent = '开始';
  document.getElementById('werewolf-progress').textContent = `共 ${roles.length} 位玩家`;
}

function werewolfNext() {
  const ww = STATE.ww;
  if (ww.done) { navigateTo('home'); return; }
  if (!ww.started) {
    ww.started = true;
    ww.flipped = true;
    const role = ww.roles[ww.index];
    document.getElementById('werewolf-card').classList.add('flipped');
    showWerewolfRole(role);
    document.getElementById('werewolf-info-btn').style.display = '';
    document.getElementById('werewolf-skip-btn').textContent = '我记住了';
    updateWerewolfProgress();
    vibrate();
    return;
  }
  if (ww.flipped) {
    ww.flipped = false;
    ww.index++;
    document.getElementById('werewolf-card').classList.remove('flipped');
    document.getElementById('werewolf-info-btn').style.display = 'none';
    if (ww.index >= ww.roles.length) {
      ww.done = true;
      document.getElementById('werewolf-front-text').textContent = '🎉 发牌结束，游戏开始 🎉';
      document.getElementById('werewolf-skip-btn').style.display = 'none';
      document.getElementById('werewolf-progress').textContent = '';
    } else {
      document.getElementById('werewolf-front-text').textContent = '传递给下一位玩家吧';
      document.getElementById('werewolf-skip-btn').textContent = '翻牌';
      updateWerewolfProgress();
    }
    vibrate();
  } else {
    ww.flipped = true;
    const role = ww.roles[ww.index];
    document.getElementById('werewolf-card').classList.add('flipped');
    showWerewolfRole(role);
    document.getElementById('werewolf-info-btn').style.display = '';
    document.getElementById('werewolf-skip-btn').textContent = '我记住了';
    updateWerewolfProgress();
    vibrate();
  }
}

function showWerewolfRole(role) {
  const img = document.getElementById('werewolf-back-img');
  const emoji = document.getElementById('werewolf-back-emoji');
  const text = document.getElementById('werewolf-back-text');
  const backFace = document.getElementById('werewolf-back');
  backFace.style.background = WEREWOLF_BG_COLORS[role] || 'linear-gradient(145deg, #00bcd4, #7bc67e)';
  text.style.display = '';
  text.textContent = role;
  const imgName = WEREWOLF_IMG_MAP[role] || role;
  img.src = `wolfcard/${imgName}.jpg`;
  img.style.display = '';
  img.onerror = function() {
    this.src = `wolfcard/${imgName}.png`;
    this.onerror = function() {
      this.style.display = 'none';
      emoji.style.display = '';
      emoji.textContent = WEREWOLF_EMOJI[role] || '👤';
    };
  };
  img.onload = function() { emoji.style.display = 'none'; };
}

function showWerewolfInfo() {
  const ww = STATE.ww;
  if (!ww.started || ww.done) return;
  showRoleInfo(ww.roles[ww.index]);
}

function updateWerewolfProgress() {
  const ww = STATE.ww;
  const remaining = ww.roles.length - ww.index;
  document.getElementById('werewolf-progress').textContent = `剩余 ${remaining} 位玩家`;
}
