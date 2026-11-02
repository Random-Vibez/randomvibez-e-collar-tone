# Security policy

E-Collar Tone is a static browser-only sound generator. It does not accept uploads, persist app data, contact an application backend, or make app-originated network requests. The Web Audio API is used only after an explicit user gesture. A separate same-origin site script displays the shared RandomVibez cookie notice; accepting it stores only the notice-acceptance preference described on the site's privacy page.

## Reporting a concern

Report security concerns privately through the contact route on <https://randomvibez.ai/>. Do not include passwords, live credentials, or personal information in a public issue.

## Scope and limitations

- The generated 2,000 Hz sine-wave beep sequence is a browser audio simulation, not a device control, animal-training system, or training advice.
- Output loudness depends on the visitor's hardware and system settings. Users should start at low volume and avoid playing the sound near animals or people who have not agreed to hear it.
- Security behavior depends in part on the effective HTTP headers of the eventual hosting environment. A CSP meta policy in the staged page is not evidence that production response headers have been configured or verified.
- The shared site's optional first-party cookie is separate from app functionality and is not used for analytics, identity, or app data.
