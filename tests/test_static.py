from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'index.html').read_text()
JS = (ROOT / 'app.js').read_text()
CSS = (ROOT / 'styles.css').read_text()

assert 'connect-src \'none\'' in HTML
assert 'cookie-notice-slot' in HTML
assert 'href="../cookie-banner.js"' not in HTML  # the script is intentionally loaded with src
assert 'src="../cookie-banner.js"' in HTML
assert 'Web Audio' in HTML and 'not a physical e-collar' in HTML
assert 'BEEP_COUNT = 5' in JS and 'BEEP_MS = 180' in JS and 'BEEP_GAP_MS = 150' in JS
assert 'FREQUENCY_HZ = 2000' in JS and "oscillator.type = 'sine'" in JS and 'GAIN_LEVEL = 0.2' in JS
assert 'five high-pitched beeps over 1.5 seconds' in HTML
assert 'continuous' not in HTML.lower() and 'sustain' not in JS.lower()
for blocked in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'innerHTML', 'document.write', 'eval('):
    assert blocked not in JS, blocked
assert 'setPointerCapture' in JS and "event.code !== 'Space' && event.code !== 'Enter'" in JS
assert 'touch-action: none' in CSS and ':focus-visible' in CSS and 'prefers-reduced-motion' in CSS
print('E-Collar Tone Python static contract assertions: PASS')
