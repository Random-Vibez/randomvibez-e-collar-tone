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
assert 'BEEP_MS = 220' in JS and 'FREQUENCY_HZ = 2800' in JS and 'GAIN_LEVEL = 0.35' in JS
for blocked in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'innerHTML', 'document.write', 'eval('):
    assert blocked not in JS, blocked
assert 'setPointerCapture' in JS and "event.code !== 'Space' && event.code !== 'Enter'" in JS
assert 'touch-action: none' in CSS and ':focus-visible' in CSS and 'prefers-reduced-motion' in CSS
print('E-Collar Tone Python static contract assertions: PASS')
