// ============================================================
//  SPY
// ============================================================
function startSpyFromSlider() {
  const playerSlider = document.getElementById('spy-slider');
  const spySlider = document.getElementById('spy-spy-slider');
  const num = parseInt(playerSlider.value);
  const spyCount = parseInt(spySlider.value);
  startSpy(num, spyCount);
}

function startSpy(num, spyCount) {
  const pair = SPY_WORDS[Math.floor(Math.random() * SPY_WORDS.length)];
  const allIndices = Array.from({length: num}, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }
  const spyIndices = new Set(allIndices.slice(0, spyCount));
  const words = [];
  for (let i = 0; i < num; i++) {
    words.push(spyIndices.has(i) ? pair[1] : pair[0]);
  }
  const indices = Array.from({length: num}, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffledWords = indices.map(i => words[i]);
  const newSpyIndex = shuffledWords.indexOf(pair[1]);

  STATE.spy = { players: num, words: shuffledWords, spyIndex: newSpyIndex, index: 0, flipped: false, done: false, started: false };
  document.getElementById('spy-select').style.display = 'none';
  document.getElementById('spy-deal').style.display = 'block';
  document.getElementById('spy-card').classList.remove('flipped');
  document.getElementById('spy-front-text').textContent = '发牌开始';
  document.getElementById('spy-skip-btn').textContent = '开始';
  document.getElementById('spy-progress').textContent = `共 ${num} 位玩家`;
}

function spyNext() {
  const spy = STATE.spy;
  if (spy.done) { navigateTo('home'); return; }
  if (!spy.started) {
    spy.started = true;
    spy.flipped = true;
    const word = spy.words[spy.index];
    document.getElementById('spy-card').classList.add('flipped');
    document.getElementById('spy-back-text').textContent = word;
    document.getElementById('spy-skip-btn').textContent = '我记住了';
    updateSpyProgress();
    vibrate();
    return;
  }
  if (spy.flipped) {
    spy.flipped = false;
    spy.index++;
    document.getElementById('spy-card').classList.remove('flipped');
    if (spy.index >= spy.players) {
      spy.done = true;
      document.getElementById('spy-front-text').textContent = '🎉 发牌结束，游戏开始 🎉';
      document.getElementById('spy-skip-btn').style.display = 'none';
      document.getElementById('spy-progress').textContent = '';
    } else {
      document.getElementById('spy-front-text').textContent = '传递给下一位玩家吧';
      document.getElementById('spy-skip-btn').textContent = '翻牌';
      updateSpyProgress();
    }
    vibrate();
  } else {
    spy.flipped = true;
    const word = spy.words[spy.index];
    document.getElementById('spy-card').classList.add('flipped');
    document.getElementById('spy-back-text').textContent = word;
    document.getElementById('spy-skip-btn').textContent = '我记住了';
    updateSpyProgress();
    vibrate();
  }
}

function updateSpyProgress() {
  const spy = STATE.spy;
  document.getElementById('spy-progress').textContent = `剩余 ${spy.players - spy.index} 位玩家`;
}
