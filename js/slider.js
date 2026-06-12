// ============================================================
//  PLAYER SLIDER (通用人数滑块)
// ============================================================
function initPlayerSlider(sliderId, valueId, ticksId, majorTicks) {
  const slider = document.getElementById(sliderId);
  const valueEl = document.getElementById(valueId);
  const ticksEl = document.getElementById(ticksId);
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const step = parseInt(slider.step) || 1;

  // Build ticks
  ticksEl.innerHTML = '';
  for (let v = min; v <= max; v += step) {
    const tick = document.createElement('div');
    tick.className = 'tick';
    const isMajor = majorTicks.includes(v);
    if (isMajor) tick.classList.add('major');
    const line = document.createElement('div');
    line.className = 'tick-line';
    tick.appendChild(line);
    const label = document.createElement('span');
    label.textContent = v;
    tick.appendChild(label);
    tick.dataset.value = v;
    ticksEl.appendChild(tick);
  }

  const updateSlider = () => {
    const val = parseInt(slider.value);
    valueEl.textContent = val;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, #e0e0e0 ${pct}%, #e0e0e0 100%)`;
    ticksEl.querySelectorAll('.tick').forEach(t => t.classList.remove('active'));
    const activeTick = ticksEl.querySelector(`.tick[data-value="${val}"]`);
    if (activeTick) activeTick.classList.add('active');
  };

  slider.addEventListener('input', updateSlider);
  updateSlider();
}

// ============================================================
//  TIME SLIDER
// ============================================================
function initTimeSlider() {
  const slider = document.getElementById('time-slider');
  const display = document.getElementById('slider-value-display');
  const updateSlider = () => {
    const val = parseInt(slider.value);
    display.textContent = val;
    const pct = ((val - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, #e0e0e0 ${pct}%, #e0e0e0 100%)`;
  };
  slider.addEventListener('input', updateSlider);
  updateSlider();
}
