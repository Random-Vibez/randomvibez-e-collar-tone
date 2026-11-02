# E-Collar Tone

A small RandomVibez browser-local audio utility. Tap the main control once, or activate it with Space/Enter, to play five short synthesized beeps over 1.5 seconds. The sequence continues if you release the button; pointer cancellation, focus loss, or leaving the page stops it.

## Run locally

Open `index.html` in a modern browser that supports Web Audio, or serve this directory with a local static server. No account, upload, backend, app-data storage, analytics, or app API/network request is used. The page references the site's shared `../cookie-banner.js`; accepting that separate notice stores only the site's first-party acceptance cookie.

## Sound and safety boundary

The sound is generated in the browser with a sine-wave oscillator at 2,000 Hz and gain set to 0.2. Each activation plays five 180 ms beeps with four 150 ms gaps, for a 1,500 ms sequence. Actual loudness depends on the device, browser, and system volume. Start at low volume and do not play it near animals or people without agreement. This is not a physical e-collar, animal-training device, or training recommendation, and it makes no claim about training effects.

## Tests

Run `node --test tests/test_app.js` (the Node test runner executes the focused file) and `python3 tests/test_static.py`. The focused assertions exercise all five beep onsets and stops, 180 ms tone duration, 150 ms inter-beep gaps, 1.5 second total timing, release continuation, cancellation, startup failure, and input ownership, along with static accessibility, privacy, CSP, and no-app-network checks.

## Public release surfaces

- App: <https://randomvibez.ai/e-collar-tone/>
- Catalog preview: <https://randomvibez.ai/assets/projects/e-collar-tone-home.svg> (designed SVG preview, not a captured browser screenshot)
- Source repository: <https://github.com/Random-Vibez/randomvibez-e-collar-tone>

The app uses the RandomVibez site's shared first-party cookie notice; app data remains browser-local and is not sent to the site.
