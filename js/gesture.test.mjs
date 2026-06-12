import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./gesture.js', import.meta.url), 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const {
    createGestureDetector,
    getScreenPitchAngle,
    initGestureRecognition,
} = await import(moduleUrl);

test('disables motion gestures in portrait orientations', () => {
    assert.equal(getScreenPitchAngle({ beta: 50, gamma: 10 }, 0), null);
    assert.equal(getScreenPitchAngle({ beta: 50, gamma: 10 }, 180), null);
});

test('keeps up/down pitch semantics in both landscape directions', () => {
    assert.equal(getScreenPitchAngle({ beta: 10, gamma: 50 }, 90), 50);
    assert.equal(getScreenPitchAngle({ beta: 10, gamma: -50 }, 270), 50);
    assert.equal(getScreenPitchAngle({ beta: 10, gamma: -50 }, -90), 50);
});

test('returns null when the required sensor axis is unavailable', () => {
    assert.equal(getScreenPitchAngle({ beta: 50, gamma: null }, 90), null);
    assert.equal(getScreenPitchAngle({ beta: 50, gamma: null }, 270), null);
});

test('fires upward and downward gestures at the configured threshold', () => {
    const events = [];
    let time = 1000;
    const detector = createGestureDetector({
        onSwipeUp: () => events.push('up'),
        onSwipeDown: () => events.push('down'),
        now: () => time,
    });

    assert.equal(detector.update(44), null);
    assert.equal(detector.update(45), 'up');
    assert.deepEqual(events, ['up']);

    time += 600;
    detector.update(0);
    assert.equal(detector.update(-45), 'down');
    assert.deepEqual(events, ['up', 'down']);
});

test('does not repeat while held beyond the threshold', () => {
    let count = 0;
    let time = 1000;
    const detector = createGestureDetector({
        onSwipeUp: () => count += 1,
        now: () => time,
    });

    detector.update(50);
    time += 1000;
    detector.update(60);

    assert.equal(count, 1);
});

test('requires both neutral reset and 500ms cooldown', () => {
    let count = 0;
    let time = 1000;
    const detector = createGestureDetector({
        onSwipeUp: () => count += 1,
        now: () => time,
    });

    detector.update(50);
    detector.update(0);
    time += 499;
    detector.update(50);
    assert.equal(count, 1);

    detector.update(0);
    time += 1;
    detector.update(50);
    assert.equal(count, 2);
});

test('ignores missing orientation values', () => {
    let count = 0;
    const detector = createGestureDetector({
        onSwipeUp: () => count += 1,
    });

    assert.equal(detector.update(null), null);
    assert.equal(detector.update(Number.NaN), null);
    assert.equal(count, 0);
});

test('renders working fallback buttons without an orientation sensor', () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalNavigator = globalThis.navigator;
    const fallbackRoot = new FakeElement('div');
    const events = [];

    globalThis.window = {
        DeviceOrientationEvent: undefined,
        dispatchEvent: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        setTimeout,
        clearTimeout,
    };
    globalThis.document = {
        body: fallbackRoot,
        createElement: (tagName) => new FakeElement(tagName),
        addEventListener: () => {},
        removeEventListener: () => {},
    };
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {},
    });

    try {
        const controller = initGestureRecognition({
            fallbackRoot,
            onSwipeUp: () => events.push('up'),
            onSwipeDown: () => events.push('down'),
        });

        assert.equal(controller.getStatus(), 'sensor-unsupported');
        assert.equal(fallbackRoot.children.length, 1);

        const fallback = fallbackRoot.children[0];
        assert.equal(fallback.dataset.gestureFallback, 'sensor-unsupported');
        assert.equal(fallback.children.length, 3);

        fallback.children[1].click();
        fallback.children[2].click();
        assert.deepEqual(events, ['up', 'down']);

        controller.destroy();
        assert.equal(fallbackRoot.children.length, 0);
    } finally {
        restoreGlobal('window', originalWindow);
        restoreGlobal('document', originalDocument);
        restoreGlobal('navigator', originalNavigator);
    }
});

test('disables and restores sensor gesture callbacks', () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalNavigator = globalThis.navigator;
    const listeners = {};
    const events = [];

    globalThis.window = {
        DeviceOrientationEvent: function DeviceOrientationEvent() {},
        screen: { orientation: { angle: 90 } },
        dispatchEvent: () => {},
        addEventListener: (type, callback) => {
            listeners[type] = callback;
        },
        removeEventListener: () => {},
        setTimeout,
        clearTimeout,
    };
    globalThis.document = {
        visibilityState: 'visible',
        body: new FakeElement('body'),
        createElement: (tagName) => new FakeElement(tagName),
        addEventListener: () => {},
        removeEventListener: () => {},
    };
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {},
    });

    try {
        const controller = initGestureRecognition({
            fallbackRoot: null,
            onSwipeUp: () => events.push('up'),
        });

        controller.setEnabled(false);
        listeners.deviceorientation({ beta: 0, gamma: 50 });
        assert.deepEqual(events, []);
        assert.equal(controller.isEnabled(), false);

        controller.setEnabled(true);
        listeners.deviceorientation({ beta: 0, gamma: 0 });
        listeners.deviceorientation({ beta: 0, gamma: 50 });
        assert.deepEqual(events, ['up']);
        assert.equal(controller.isEnabled(), true);

        controller.destroy();
    } finally {
        restoreGlobal('window', originalWindow);
        restoreGlobal('document', originalDocument);
        restoreGlobal('navigator', originalNavigator);
    }
});

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.dataset = {};
        this.listeners = {};
        this.parent = null;
    }

    append(...children) {
        children.forEach((child) => {
            child.parent = this;
            this.children.push(child);
        });
    }

    addEventListener(type, callback) {
        this.listeners[type] = callback;
    }

    setAttribute() {}

    click() {
        this.listeners.click?.();
    }

    remove() {
        if (!this.parent) {
            return;
        }
        this.parent.children = this.parent.children.filter((child) => child !== this);
        this.parent = null;
    }
}

function restoreGlobal(name, value) {
    if (value === undefined) {
        delete globalThis[name];
        return;
    }
    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
        writable: true,
    });
}
