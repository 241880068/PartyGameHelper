// ============================================================
//  CHARADES
// ============================================================
let selectedCharadesTheme = null;

function selectCharadesTheme(themeKey) {
  document.querySelectorAll('#charades-theme-grid .card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`#charades-theme-grid .card[data-theme="${themeKey}"]`);
  if (card) card.classList.add('selected');
  selectedCharadesTheme = themeKey;
  document.getElementById('charades-theme-grid').style.display = 'none';
  document.querySelector('#charades-select > p').style.display = 'none';
  document.getElementById('charades-slider-section').style.display = 'block';
  const theme = CHARADES_THEMES[themeKey];
  document.querySelector('#charades-slider-section .slider-label').textContent = `⏱️ ${theme.label} · 选择时长`;
}

function startCharadesFromSlider() {
  const slider = document.getElementById('time-slider');
  const minutes = parseInt(slider.value);
  startCharades(minutes);
}

function startCharades(minutes) {
  if (STATE.ch.running) stopCharadesTimer();
  const time = minutes * 60;
  let wordPool;
  if (selectedCharadesTheme && CHARADES_THEMES[selectedCharadesTheme]) {
    wordPool = [...CHARADES_THEMES[selectedCharadesTheme].words];
  } else {
    wordPool = [...CHARADES_WORDS];
  }
  for (let i = wordPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wordPool[i], wordPool[j]] = [wordPool[j], wordPool[i]];
  }
  STATE.ch = { time, words: wordPool, index: 0, correct: 0, timer: null, running: false, correctWords: [], skipWords: [] };
  document.getElementById('charades-select').style.display = 'none';
  document.getElementById('charades-game').style.display = 'block';
  document.getElementById('charades-word-tags').style.display = 'none';
  document.getElementById('charades-word-tags').innerHTML = '';
  document.getElementById('charades-score').textContent = '猜对数量：0';
  showCharadesCountdown();
}

function showCharadesCountdown() {
  const overlay = document.getElementById('countdown-overlay');
  const numEl = document.getElementById('countdown-number');
  let count = 3;
  overlay.classList.add('show');
  numEl.textContent = count;
  numEl.style.animation = 'none';
  setTimeout(() => numEl.style.animation = 'countPop 0.8s ease-out', 10);
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      numEl.textContent = count;
      numEl.style.animation = 'none';
      setTimeout(() => numEl.style.animation = 'countPop 0.8s ease-out', 10);
    } else {
      clearInterval(interval);
      overlay.classList.remove('show');
      beginCharadesGame();
    }
  }, 1000);
}

function beginCharadesGame() {
  STATE.ch.running = true;
  showCharadesWord();
  startCharadesTimer();
}

function showCharadesWord() {
  const ch = STATE.ch;
  if (ch.index >= ch.words.length) {
    const words = [...CHARADES_WORDS];
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    ch.words = words;
    ch.index = 0;
  }
  const word = ch.words[ch.index];
  const display = document.getElementById('charades-word-display');
  display.textContent = word;
  display.style.animation = 'none';
  setTimeout(() => display.style.animation = 'wordPop 0.3s ease-out', 10);
}

function charadesCorrect() {
  if (!STATE.ch.running) return;
  vibrate();
  const ch = STATE.ch;
  const word = ch.words[ch.index];
  ch.correctWords.push(word);
  ch.correct++;
  ch.index++;
  document.getElementById('charades-score').textContent = `猜对数量：${ch.correct}`;
  addCharadesWordTag(word);
  showCharadesWord();
}

function charadesSkip() {
  if (!STATE.ch.running) return;
  vibrate();
  const ch = STATE.ch;
  const word = ch.words[ch.index];
  ch.skipWords.push(word);
  ch.index++;
  showCharadesWord();
}

function addCharadesWordTag(word) {
  const container = document.getElementById('charades-word-tags');
  container.style.display = 'block';
  const tag = document.createElement('span');
  tag.className = 'word-tag';
  tag.textContent = `✅ ${word}`;
  const tags = container.querySelectorAll('.word-tag');
  const top = 60 + tags.length * 36;
  tag.style.top = top + 'px';
  tag.style.left = (12 + Math.floor(tags.length / 6) * 150) + 'px';
  container.appendChild(tag);
}

// ============================================================
//  TIMER & PROGRESS BAR
// ============================================================
function startCharadesTimer() {
  const ch = STATE.ch;
  if (ch.timer) clearInterval(ch.timer);
  const row = document.getElementById('charades-progress-row');
  row.classList.add('show');
  ch.totalTime = ch.time;
  ch.timer = setInterval(() => {
    ch.time--;
    updateCharadesTimerDisplay();
    updateCharadesProgressBar();
    if (ch.time <= 0) {
      stopCharadesTimer();
      showCharadesResult();
    }
  }, 1000);
}

function updateCharadesProgressBar() {
  const ch = STATE.ch;
  if (!ch.totalTime) return;
  const pct = Math.max(0, (ch.time / ch.totalTime) * 100);
  const fill = document.getElementById('charades-bar-fill');
  fill.style.width = pct + '%';
  // HSL interpolation: 0% = red (hue 0), 50% = yellow (hue 60), 100% = green (hue 120)
  const hue = (pct / 100) * 120;
  fill.style.background = `hsl(${hue}, 85%, 50%)`;
}

function stopCharadesTimer() {
  if (STATE.ch.timer) {
    clearInterval(STATE.ch.timer);
    STATE.ch.timer = null;
  }
  STATE.ch.running = false;
  document.getElementById('charades-progress-row').classList.remove('show');
}

function updateCharadesTimerDisplay() {
  const ch = STATE.ch;
  const mins = Math.floor(ch.time / 60);
  const secs = ch.time % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  document.getElementById('charades-progress-timer').textContent = timeStr;
}

// ============================================================
//  RESULT MODAL
// ============================================================
function showCharadesResult() {
  const ch = STATE.ch;
  const correctList = ch.correctWords || [];
  const skipList = ch.skipWords || [];
  document.getElementById('result-subtitle').textContent = `猜对 ${correctList.length} 个 · 跳过 ${skipList.length} 个`;

  const correctEl = document.getElementById('result-correct-list');
  correctEl.innerHTML = '';
  if (correctList.length === 0) {
    correctEl.innerHTML = '<div class="result-empty">暂无</div>';
  } else {
    correctList.forEach(word => {
      const tag = document.createElement('span');
      tag.className = 'result-tag correct-tag';
      tag.textContent = word;
      correctEl.appendChild(tag);
    });
  }

  const skipEl = document.getElementById('result-skip-list');
  skipEl.innerHTML = '';
  if (skipList.length === 0) {
    skipEl.innerHTML = '<div class="result-empty">暂无</div>';
  } else {
    skipList.forEach(word => {
      const tag = document.createElement('span');
      tag.className = 'result-tag skip-tag';
      tag.textContent = word;
      skipEl.appendChild(tag);
    });
  }

  document.getElementById('result-modal-overlay').classList.add('show');
}

function closeResultModal() {
  document.getElementById('result-modal-overlay').classList.remove('show');
}

function resetCharades() {
  stopCharadesTimer();
  selectedCharadesTheme = null;
  document.querySelectorAll('#charades-theme-grid .card').forEach(c => c.classList.remove('selected'));
  document.getElementById('charades-theme-grid').style.display = 'grid';
  document.querySelector('#charades-select > p').style.display = 'block';
  document.getElementById('charades-slider-section').style.display = 'none';
  document.getElementById('charades-select').style.display = 'block';
  document.getElementById('charades-game').style.display = 'none';
  document.getElementById('charades-word-tags').innerHTML = '';
  document.getElementById('charades-word-tags').style.display = 'none';
  const fill = document.getElementById('charades-bar-fill');
  fill.style.width = '100%';
  fill.style.background = 'hsl(120, 85%, 50%)';
  document.getElementById('charades-progress-row').classList.remove('show');
}
