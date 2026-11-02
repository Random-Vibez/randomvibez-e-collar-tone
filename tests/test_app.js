'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BEEP_COUNT, BEEP_MS, BEEP_GAP_MS, TOTAL_SEQUENCE_MS, FREQUENCY_HZ, GAIN_LEVEL, createBeepSequenceController } = require('../app.js');
const ROOT = path.resolve(__dirname, '..');

assert.equal(BEEP_COUNT, 5, 'one activation plays five beeps');
assert.equal(BEEP_MS, 180, 'each beep lasts 180 ms');
assert.equal(BEEP_GAP_MS, 150, 'each gap between beeps lasts 150 ms');
assert.equal(TOTAL_SEQUENCE_MS, 1500, 'the five-beep sequence spans 1.5 seconds');
assert.equal(FREQUENCY_HZ, 2000, 'the synthesized tone is high-pitched at 2,000 Hz');
assert.equal(GAIN_LEVEL, 0.2, 'gain uses a restrained starting level');

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
    get now() { return now; },
    get pending() { return timers.size; }
  };
}

{
  const clock = makeClock();
  let started = 0;
  let stopped = 0;
  const startedAt = [];
  const stoppedAt = [];
  const events = [];
  const controller = createBeepSequenceController({
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: (index) => { started += 1; startedAt.push(clock.now); events.push(`start:${index}`); },
    stopTone: () => { stopped += 1; stoppedAt.push(clock.now); events.push('stop'); },
    onBeep: (index) => events.push(`beep:${index}`),
    onSilence: () => events.push('gap'),
    onStopped: (event) => events.push(event.cancelled ? 'cancelled' : 'complete')
  });
  assert.equal(controller.press('tap-1'), true);
  assert.equal(controller.press('overlap'), false, 'a second input cannot start an overlapping sequence');
  assert.equal(controller.release('wrong-input'), false, 'a different input cannot release the active sequence');
  assert.equal(controller.release('tap-1'), true, 'releasing the control does not truncate the requested sequence');
  assert.equal(started, 1);
  clock.advance(BEEP_MS + BEEP_GAP_MS - 1);
  assert.equal(started, 1, 'the next beep waits for the complete 180 ms tone and 150 ms gap');
  clock.advance(1);
  assert.equal(started, 2, 'the second beep starts at 330 ms');
  clock.advance(TOTAL_SEQUENCE_MS - (BEEP_MS + BEEP_GAP_MS));
  assert.equal(started, BEEP_COUNT, 'exactly five beeps start');
  assert.equal(stopped, BEEP_COUNT, 'all five beeps stop');
  assert.deepEqual(startedAt, [0, 330, 660, 990, 1320], 'beeps are evenly distributed across the 1.5 second sequence');
  assert.deepEqual(stoppedAt, [180, 510, 840, 1170, 1500], 'each beep lasts 180 ms, with the last ending at 1.5 seconds');
  assert.deepEqual(events.filter((event) => event.startsWith('beep:')), ['beep:1', 'beep:2', 'beep:3', 'beep:4', 'beep:5']);
  assert.equal(events.at(-1), 'complete', 'the sequence completes at 1.5 seconds');
  assert.equal(controller.active, false);
  assert.equal(clock.pending, 0);
}


{
  const clock = makeClock();
  let started = 0;
  let stopped = 0;
  let cancelled = 0;
  const controller = createBeepSequenceController({
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: () => { started += 1; },
    stopTone: () => { stopped += 1; },
    onStopped: (event) => { if (event.cancelled) cancelled += 1; }
  });
  assert.equal(controller.press('pointer-cancel'), true);
  assert.equal(controller.cancel('pointer-cancel'), true, 'pointer cancellation stops the active beep immediately');
  assert.equal(stopped, 1);
  assert.equal(cancelled, 1);
  clock.advance(TOTAL_SEQUENCE_MS);
  assert.equal(started, 1, 'cancellation clears the remaining sequence timers');
  assert.equal(stopped, 1, 'a cancelled beep is not stopped twice');
  assert.equal(controller.cancelCurrent(), false, 'cancel with no active sequence is harmless');
}

{
  const clock = makeClock();
  const controller = createBeepSequenceController({
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    startTone: () => { throw new Error('audio unavailable'); },
    stopTone: () => {},
    onError: (error) => { message = error.message; }
  });
  let message = '';
  assert.equal(controller.press('gesture'), false, 'audio startup failure fails closed');
  assert.equal(controller.active, false, 'audio startup failure does not leave a stuck sequence');
  assert.equal(message, 'audio unavailable');
  assert.equal(clock.pending, 0);
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
  ['five-beep copy and 1.5 second timing', /five (?:short )?(?:high-pitched )?beeps over 1\.5 seconds/i],
  ['sequence constants and sine tone', /BEEP_COUNT = 5[\s\S]*?BEEP_MS = 180[\s\S]*?BEEP_GAP_MS = 150[\s\S]*?FREQUENCY_HZ = 2000[\s\S]*?oscillator\.type = 'sine'/],
  ['accessible main button and live status', /<button id="tone-button"[^>]*aria-label="[^"]+"[\s\S]*?<p id="status" class="status" role="status" aria-live="polite"/],
  ['warning and cookie privacy disclosure', /not a physical e-collar[\s\S]*?first-party cookie[\s\S]*?privacy details/i],
  ['pointer capture and keyboard support', /setPointerCapture[\s\S]*?pointercancel[\s\S]*?event\.code !== 'Space' && event\.code !== 'Enter'/],
  ['context menu, selection prevention and touch-safe button', /contextmenu[\s\S]*?selectstart[\s\S]*?dragstart/]
];
for (const [label, pattern] of checks) assert.match(label.includes('touch-safe') ? js : html + js, pattern, label);
assert.doesNotMatch(html + js, /continuous|sustain/i, 'obsolete continuous/sustained-tone copy is removed')
assert.match(css, /\.tone-button\s*\{[^}]*touch-action:\s*none[^}]*user-select:\s*none/s, 'button blocks touch gestures and text selection');
assert.match(css, /\.tone-button:focus-visible\s*\{[^}]*outline:/s, 'strong visible keyboard focus exists');
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'reduced-motion preferences are honored');
assert.match(css, /#cookie-notice-slot \.cookie-banner\s*\{[^}]*position:\s*static/s, 'notice is restyled as an in-flow, non-overlay panel');
assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|innerHTML|document\.write|eval\s*\(/, 'app runtime has no network API or unsafe HTML execution');
assert(!/https?:\/\//.test(js), 'app runtime contains no remote endpoints');
console.log('E-Collar Tone unit, interaction-state, and static contract tests: PASS');
