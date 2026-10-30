# E-Collar Tone

A small RandomVibez browser-local audio utility. Tap the main control for one 220 ms synthesized beep; hold it to sustain the sound until release. Space and Enter provide the same press/hold interaction.

## Run locally

Open `index.html` in a modern browser that supports Web Audio, or serve this directory with a local static server. No account, upload, backend, app-data storage, analytics, or app API/network request is used. The page references the site's shared `../cookie-banner.js`; accepting that separate notice stores only the site's first-party acceptance cookie.

## Sound and safety boundary

The sound is generated in the browser with a square-wave oscillator at 2,800 Hz and gain set to 0.35. Actual loudness depends on the device, browser, and system volume. Start at low volume and do not play it near animals or people without agreement. This is not a physical e-collar, animal-training device, or training recommendation, and it makes no claim about training effects.

## Tests

Run `node tests/test_app.js`. The focused assertions exercise the 220 ms tap completion, hold-to-sustain transition, release-to-stop, cancellation, and input ownership, along with static accessibility, privacy, CSP, and no-app-network checks.

## Public release surfaces

- App: <https://randomvibez.ai/e-collar-tone/>
- Catalog preview: <https://randomvibez.ai/assets/projects/e-collar-tone-home.svg> (designed SVG preview, not a captured browser screenshot)
- Source repository: <https://github.com/Random-Vibez/randomvibez-e-collar-tone>

The app uses the RandomVibez site's shared first-party cookie notice; app data remains browser-local and is not sent to the site.
