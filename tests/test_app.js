'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BEEP_MS, FREQUENCY_HZ, GAIN_LEVEL, createToneController } = require('../app.js');
const ROOT = path.resolve(__dirname, '..');

assert.equal(BEEP_MS, 220, 'a tap is one 220 ms beep');
assert.equal(FREQUENCY_HZ, 2800, 'tone frequency matches the approved draft behavior');
assert.equal(GAIN_LEVEL, 0.35, 'gain uses the requested moderate starting level');

function makeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimer(fn, delay) {
      const id = nextId++;
      timers.set(id, { at: now + delay, fn });
      return id;
    },
    clearTimer(id) { timers.delete(id); },
    advance(delta) {
      const target = now + delta;
      while (true) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].fn();
      }
      now = target;
    },
    get pending() { return timers.size; }
  };
}

{
  const clock = makeClock();
  let started = 0;
  let stopped = 0;
  const events = [];
  const controller = createToneController({
    durationMs: BEEP_MS,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: () => { started += 1; },
    stopTone: () => { stopped += 1; },
    onSustain: () => events.push('sustain'),
    onStopped: (event) => events.push(event.cancelled ? 'cancelled' : 'stopped')
  });
  assert.equal(controller.press('tap-1'), true);
  assert.equal(controller.press('overlap'), false, 'a second input cannot start an overlapping oscillator');
  assert.equal(controller.release('wrong-input'), false, 'a different input cannot release the active press');
  assert.equal(started, 1);
  assert.equal(controller.release('tap-1'), true);
  clock.advance(BEEP_MS - 1);
  assert.equal(stopped, 0, 'a quick tap still completes the full beep interval');
  clock.advance(1);
  assert.equal(stopped, 1, 'the short beep stops at 220 ms');
  assert.deepEqual(events, ['stopped']);
  assert.equal(controller.active, false);
  assert.equal(clock.pending, 0);
}

{
  const clock = makeClock();
  let stopped = 0;
  let sustained = 0;
  const controller = createToneController({
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: () => {},
    stopTone: () => { stopped += 1; },
    onSustain: () => { sustained += 1; }
  });
  assert.equal(controller.press('hold'), true);
  clock.advance(BEEP_MS);
  assert.equal(controller.sustained, true, 'holding past the one-beep window switches to continuous tone');
  assert.equal(sustained, 1);
  assert.equal(stopped, 0, 'the tone continues while the input remains held');
  clock.advance(2500);
  assert.equal(stopped, 0, 'a long hold remains active until release');
  assert.equal(controller.release('hold'), true);
  assert.equal(stopped, 1, 'release stops a sustained tone immediately');
  assert.equal(controller.active, false);
}

{
  const clock = makeClock();
  let stopped = 0;
  let cancelled = 0;
  const controller = createToneController({
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: () => {},
    stopTone: () => { stopped += 1; },
    onStopped: (event) => { if (event.cancelled) cancelled += 1; }
  });
  assert.equal(controller.press('pointer-cancel'), true);
  assert.equal(controller.cancel('pointer-cancel'), true, 'pointer cancellation stops without waiting for the tap interval');
  assert.equal(stopped, 1);
  assert.equal(cancelled, 1);
  clock.advance(BEEP_MS);
  assert.equal(stopped, 1, 'cancellation clears the pending short-beep timer');
  assert.equal(controller.cancelCurrent(), false, 'cancel with no active input is harmless');
}

{
  const controller = createToneController({ startTone: () => { throw new Error('audio unavailable'); }, stopTone: () => {} });
  let message = '';
  const failing = createToneController({
    startTone: () => { throw new Error('audio unavailable'); },
    stopTone: () => {},
    onError: (error) => { message = error.message; }
  });
  assert.equal(failing.press('gesture'), false, 'audio startup failure fails closed');
  assert.equal(failing.active, false, 'audio startup failure does not leave a stuck hold');
  assert.equal(message, 'audio unavailable');
  assert.equal(controller.active, false);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const checks = [
  ['RandomVibez brand/header and skip link', /class="skip-link"[\s\S]*?<header class="topbar">[\s\S]*?RandomVibez\.ai/],
  ['cookie slot directly after the header', /<\/header>\s*<div id="cookie-notice-slot"><\/div>/],
  ['cookie notice script follows app runtime', /<script src="app\.js" defer><\/script>\s*<script src="\.\.\/cookie-banner\.js" defer><\/script>/],
  ['no inline script or styles', /<script\s+src="app\.js" defer><\/script>/],
  ['CSP denies app network connections', /connect-src 'none'/],
  ['canonical planned URL', /<link rel="canonical" href="https:\/\/randomvibez\.ai\/e-collar-tone\/">/],
  ['accessible main button and live status', /<button id="tone-button"[^>]*aria-label="[^"]+"[\s\S]*?<p id="status" class="status" role="status" aria-live="polite"/],
  ['warning and cookie privacy disclosure', /not a physical e-collar[\s\S]*?first-party cookie[\s\S]*?privacy details/i],
  ['pointer capture and keyboard support', /setPointerCapture[\s\S]*?pointercancel[\s\S]*?event\.code !== 'Space' && event\.code !== 'Enter'/],
  ['context menu, selection prevention and touch-safe button', /contextmenu[\s\S]*?selectstart[\s\S]*?dragstart/]
];
for (const [label, pattern] of checks) assert.match(label.includes('touch-safe') ? js : html + js, pattern, label);
assert.match(css, /\.tone-button\s*\{[^}]*touch-action:\s*none[^}]*user-select:\s*none/s, 'button blocks touch gestures and text selection');
assert.match(css, /\.tone-button:focus-visible\s*\{[^}]*outline:/s, 'strong visible keyboard focus exists');
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'reduced-motion preferences are honored');
assert.match(css, /#cookie-notice-slot \.cookie-banner\s*\{[^}]*position:\s*static/s, 'notice is restyled as an in-flow, non-overlay panel');
assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|innerHTML|document\.write|eval\s*\(/, 'app runtime has no network API or unsafe HTML execution');
assert(!/https?:\/\//.test(js), 'app runtime contains no remote endpoints');
console.log('E-Collar Tone unit, interaction-state, and static contract tests: PASS');
