// ============================================================
//  GYROSCOPE
// ============================================================
let lastGamma = null;
const SWIPE_THRESHOLD = 15;

function checkGyroAvailability() {
  if (typeof DeviceOrientationEvent === 'undefined') {
    STATE.gyroAvailable = false;
    document.getElementById('gyro-banner').classList.add('show');
    return false;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    STATE.gyroAvailable = true;
    return true;
  }
  STATE.gyroAvailable = true;
  return true;
}

function requestGyroPermission() {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(state => {
        if (state === 'granted') {
          STATE.gyroAvailable = true;
          document.getElementById('gyro-banner').classList.remove('show');
          window.addEventListener('deviceorientation', handleOrientation);
        } else {
          STATE.gyroAvailable = false;
          document.getElementById('gyro-banner').classList.add('show');
        }
      })
      .catch(() => {
        STATE.gyroAvailable = false;
        document.getElementById('gyro-banner').classList.add('show');
      });
  } else if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', handleOrientation);
    STATE.gyroAvailable = true;
  } else {
    STATE.gyroAvailable = false;
    document.getElementById('gyro-banner').classList.add('show');
  }
}

function handleOrientation(event) {
  if (event.gamma === null) return;
  if (lastGamma === null) { lastGamma = event.gamma; return; }
  const diff = event.gamma - lastGamma;
  if (diff > SWIPE_THRESHOLD) { triggerSwipeUp(); lastGamma = event.gamma; }
  else if (diff < -SWIPE_THRESHOLD) { triggerSwipeDown(); lastGamma = event.gamma; }
}
