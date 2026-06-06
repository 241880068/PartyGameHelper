const DEFAULT_THRESHOLD = 45;
const DEFAULT_RESET_ANGLE = 20;
const DEFAULT_COOLDOWN = 500;
const SENSOR_START_TIMEOUT = 2000;

function noop() {}

/**
 * Pure gesture state machine. Kept separate from browser APIs so the angle
 * detection and cooldown behavior can be tested independently.
 */
export function createGestureDetector({
    onSwipeUp = noop,
    onSwipeDown = noop,
    threshold = DEFAULT_THRESHOLD,
    resetAngle = DEFAULT_RESET_ANGLE,
    cooldown = DEFAULT_COOLDOWN,
    now = () => Date.now(),
} = {}) {
    let armed = true;
    let lastTriggerTime = -Infinity;

    function update(beta) {
        if (!Number.isFinite(beta)) {
            return null;
        }

        if (Math.abs(beta) <= resetAngle) {
            armed = true;
            return null;
        }

        const currentTime = now();
        if (!armed || currentTime - lastTriggerTime < cooldown) {
            return null;
        }

        let direction = null;
        if (beta >= threshold) {
            direction = 'up';
        } else if (beta <= -threshold) {
            direction = 'down';
        }

        if (!direction) {
            return null;
        }

        armed = false;
        lastTriggerTime = currentTime;

        if (direction === 'up') {
            onSwipeUp();
        } else {
            onSwipeDown();
        }

        return direction;
    }

    function reset() {
        armed = true;
        lastTriggerTime = -Infinity;
    }

    return { update, reset };
}

/**
 * Starts device-orientation gesture recognition.
 *
 * Positive beta angles are treated as an upward flip and negative beta
 * angles as a downward flip. The returned controller can be used by an
 * integration page or a standalone demo.
 */
export function initGestureRecognition({
    onSwipeUp = noop,
    onSwipeDown = noop,
    threshold = DEFAULT_THRESHOLD,
    resetAngle = DEFAULT_RESET_ANGLE,
    cooldown = DEFAULT_COOLDOWN,
    fallbackRoot = typeof document === 'undefined' ? null : document.body,
} = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return createUnavailableController('browser-required');
    }

    let status = 'initializing';
    let listening = false;
    let receivedSensorEvent = false;
    let sensorTimer = null;
    let fallbackElement = null;

    const detector = createGestureDetector({
        threshold,
        resetAngle,
        cooldown,
        onSwipeUp: () => trigger('up', onSwipeUp),
        onSwipeDown: () => trigger('down', onSwipeDown),
    });

    function vibrate(direction) {
        if (typeof navigator.vibrate !== 'function') {
            return;
        }

        navigator.vibrate(direction === 'up' ? 60 : [40, 40, 40]);
    }

    function trigger(direction, callback) {
        vibrate(direction);
        callback();
        window.dispatchEvent(new CustomEvent('gesture:trigger', {
            detail: { direction },
        }));
    }

    function handleOrientation(event) {
        if (!Number.isFinite(event.beta)) {
            return;
        }

        receivedSensorEvent = true;
        if (sensorTimer) {
            window.clearTimeout(sensorTimer);
            sensorTimer = null;
        }

        status = 'active';
        removeFallback();
        detector.update(event.beta);
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            detector.reset();
        }
    }

    function handleScreenOrientationChange() {
        detector.reset();
    }

    function startListening() {
        if (listening) {
            return;
        }

        listening = true;
        status = 'waiting-for-sensor';
        window.addEventListener('deviceorientation', handleOrientation, true);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('orientationchange', handleScreenOrientationChange);

        sensorTimer = window.setTimeout(() => {
            if (!receivedSensorEvent) {
                stopListening();
                showFallback('sensor-no-data');
            }
        }, SENSOR_START_TIMEOUT);
    }

    function stopListening() {
        if (listening) {
            window.removeEventListener('deviceorientation', handleOrientation, true);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('orientationchange', handleScreenOrientationChange);
            listening = false;
        }
        if (sensorTimer) {
            window.clearTimeout(sensorTimer);
            sensorTimer = null;
        }
    }

    async function requestPermission() {
        const OrientationEvent = window.DeviceOrientationEvent;
        if (!OrientationEvent) {
            showFallback('sensor-unsupported');
            return false;
        }

        if (typeof OrientationEvent.requestPermission !== 'function') {
            startListening();
            return true;
        }

        try {
            const permission = await OrientationEvent.requestPermission();
            if (permission === 'granted') {
                removeFallback();
                startListening();
                return true;
            }
            showFallback('permission-denied');
        } catch (error) {
            console.warn('[gesture] Device orientation permission failed:', error);
            showFallback('permission-error');
        }

        return false;
    }

    function showFallback(reason) {
        status = reason;
        if (!fallbackRoot || fallbackElement) {
            return;
        }

        const needsPermission = reason === 'permission-required';
        fallbackElement = document.createElement('section');
        fallbackElement.className = 'gesture-fallback';
        fallbackElement.dataset.gestureFallback = reason;
        fallbackElement.setAttribute('aria-label', '手势备用控制');

        const message = document.createElement('p');
        message.className = 'gesture-fallback__message';
        message.textContent = needsPermission
            ? '需要启用动作与方向权限，也可以使用下方按钮。'
            : '当前设备无法使用体感操作，请使用下方按钮。';
        fallbackElement.append(message);

        if (needsPermission) {
            const permissionButton = createButton('启用体感操作', 'gesture-enable');
            permissionButton.addEventListener('click', requestPermission);
            fallbackElement.append(permissionButton);
        }

        const upButton = createButton('向上翻：正确 / 下一个', 'gesture-up');
        const downButton = createButton('向下翻：跳过 / 返回', 'gesture-down');
        upButton.addEventListener('click', () => trigger('up', onSwipeUp));
        downButton.addEventListener('click', () => trigger('down', onSwipeDown));
        fallbackElement.append(upButton, downButton);
        fallbackRoot.append(fallbackElement);
    }

    function removeFallback() {
        if (fallbackElement) {
            fallbackElement.remove();
            fallbackElement = null;
        }
    }

    function destroy() {
        stopListening();
        removeFallback();
        detector.reset();
        status = 'destroyed';
    }

    const OrientationEvent = window.DeviceOrientationEvent;
    if (!OrientationEvent) {
        showFallback('sensor-unsupported');
    } else if (typeof OrientationEvent.requestPermission === 'function') {
        showFallback('permission-required');
    } else {
        startListening();
    }

    return {
        destroy,
        requestPermission,
        getStatus: () => status,
        isActive: () => status === 'active',
    };
}

function createButton(label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `gesture-fallback__button ${className}`;
    button.textContent = label;
    return button;
}

function createUnavailableController(status) {
    return {
        destroy: noop,
        requestPermission: async () => false,
        getStatus: () => status,
        isActive: () => false,
    };
}
