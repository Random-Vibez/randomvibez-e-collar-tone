# Focused test notes

Run from this app directory:

```sh
node tests/test_app.js
```

The script is directly executable and uses only Node.js built-ins. It checks the press-state controller with deterministic fake timers plus static app/privacy/accessibility contracts. This is an assertion script, not a pytest-collected suite. Independent rendered-browser QA remains a separate release gate.
