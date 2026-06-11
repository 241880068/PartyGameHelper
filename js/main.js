// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  checkGyroAvailability();
  initTimeSlider();

  // Init player sliders
  initPlayerSlider('werewolf-slider', 'werewolf-slider-value', 'werewolf-slider-ticks', [6, 9, 12, 15]);
  initPlayerSlider('spy-slider', 'spy-slider-value', 'spy-slider-ticks', [4, 6, 8]);
  initPlayerSlider('spy-spy-slider', 'spy-spy-value', 'spy-spy-ticks', [1, 2, 3]);

  // Spy: when player count changes, limit spy max to floor(players/2)
  document.getElementById('spy-slider').addEventListener('input', function() {
    const players = parseInt(this.value);
    const spySlider = document.getElementById('spy-spy-slider');
    const maxSpy = Math.max(1, Math.floor(players / 2));
    spySlider.max = maxSpy;
    if (parseInt(spySlider.value) > maxSpy) spySlider.value = maxSpy;
    const majorTicks = [];
    for (let v = 1; v <= maxSpy; v++) {
      if (v === 1 || v === maxSpy || v === Math.ceil(maxSpy / 2)) majorTicks.push(v);
    }
    initPlayerSlider('spy-spy-slider', 'spy-spy-value', 'spy-spy-ticks', majorTicks);
  });

  // Request gyro permission on first user interaction
  document.addEventListener('click', function requestOnClick() {
    requestGyroPermission();
    document.removeEventListener('click', requestOnClick);
  }, { once: true });

  // ============================================================
  //  ICON POP ANIMATION - click the icon inside a card
  //  The icon (emoji) pops larger then returns
  // ============================================================
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.card');
    if (card) {
      const icon = card.querySelector('.icon');
      if (icon) popCard(icon);
    }
  });
});
