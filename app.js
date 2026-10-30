(function (root) {
  'use strict';

  const BEEP_MS = 220;
  const FREQUENCY_HZ = 2800;
  const GAIN_LEVEL = 0.35;

  function createToneController(options) {
    const startTone = options.startTone;
    const stopTone = options.stopTone;
    const setTimer = options.setTimer || root.setTimeout.bind(root);
    const clearTimer = options.clearTimer || root.clearTimeout.bind(root);
    const onSustain = options.onSustain || function () {};
    const onStopped = options.onStopped || function () {};
    const onError = options.onError || function () {};
    const durationMs = options.durationMs == null ? BEEP_MS : options.durationMs;
    let activeToken = null;
    let holding = false;
    let sustaining = false;
    let timer = null;

    function finish(cancelled) {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      if (activeToken === null) return false;
      activeToken = null;
      holding = false;
      sustaining = false;
      stopTone();
      onStopped({ cancelled: Boolean(cancelled) });
      return true;
    }

    function press(token) {
      if (token == null || activeToken !== null) return false;
      activeToken = token;
      holding = true;
      sustaining = false;
      try {
        startTone();
      } catch (error) {
        activeToken = null;
        holding = false;
        try { stopTone(); } catch (_) {}
        onError(error);
        return false;
      }
      timer = setTimer(function () {
        timer = null;
        if (activeToken !== token) return;
        if (holding) {
          sustaining = true;
          onSustain();
        } else {
          finish(false);
        }
      }, durationMs);
      return true;
    }

    function release(token) {
      if (activeToken !== token) return false;
      holding = false;
      if (sustaining) finish(false);
      return true;
    }

    function cancel(token) {
      if (activeToken === null || (token !== undefined && token !== activeToken)) return false;
      return finish(true);
    }

    return Object.freeze({
      press,
      release,
      cancel,
      cancelCurrent: function () { return cancel(); },
      get active() { return activeToken !== null; },
      get sustained() { return sustaining; },
      get durationMs() { return durationMs; }
    });
  }

  const api = Object.freeze({ BEEP_MS, FREQUENCY_HZ, GAIN_LEVEL, createToneController });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (!root || !root.document || root.window !== root) return;

  const button = root.document.getElementById('tone-button');
  const status = root.document.getElementById('status');
  if (!button || !status) return;

  let audioContext = null;
  let oscillator = null;
  let gainNode = null;
  let pointerId = null;
  let activeKey = null;

  function setStatus(message, active) {
    status.textContent = message;
    status.classList.toggle('active', Boolean(active));
  }

  function stopAudio() {
    if (oscillator) {
      try { oscillator.stop(); } catch (_) {}
      try { oscillator.disconnect(); } catch (_) {}
      oscillator = null;
    }
    if (gainNode) {
      try { gainNode.disconnect(); } catch (_) {}
      gainNode = null;
    }
  }

  function startAudio() {
    const AudioContextType = root.AudioContext || root.webkitAudioContext;
    if (!AudioContextType) throw new Error('Web Audio is not available in this browser.');
    if (!audioContext) audioContext = new AudioContextType();
    if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
      const resumeRequest = audioContext.resume();
      if (resumeRequest && typeof resumeRequest.catch === 'function') {
        resumeRequest.catch(function () {
          toneController.cancelCurrent();
          setStatus('Audio could not start. Check browser sound permissions and try again.', false);
        });
      }
    }
    gainNode = audioContext.createGain();
    gainNode.gain.value = GAIN_LEVEL;
    gainNode.connect(audioContext.destination);
    oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = FREQUENCY_HZ;
    oscillator.connect(gainNode);
    oscillator.start();
  }

  const toneController = createToneController({
    startTone: startAudio,
    stopTone: stopAudio,
    onSustain: function () {
      button.classList.add('sounding');
      setStatus('Continuous tone — release the button to stop.', true);
    },
    onStopped: function () {
      button.classList.remove('pressed', 'sounding');
      setStatus('Ready. Tap for one beep or hold for a continuous tone.', false);
    },
    onError: function (error) {
      button.classList.remove('pressed', 'sounding');
      setStatus(error && error.message ? error.message : 'Audio could not start. Check browser sound permissions.', false);
    }
  });

  function begin(token) {
    if (!toneController.press(token)) return false;
    button.classList.add('pressed');
    setStatus('Playing one 220 ms beep… Keep holding for a continuous tone.', true);
    return true;
  }

  function end(token, cancelled) {
    button.classList.remove('pressed');
    if (cancelled) toneController.cancel(token);
    else toneController.release(token);
  }

  button.addEventListener('pointerdown', function (event) {
    if (event.button != null && event.button !== 0) return;
    if (pointerId !== null || activeKey !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    try { button.setPointerCapture(event.pointerId); } catch (_) {}
    if (!begin('pointer:' + event.pointerId)) {
      pointerId = null;
      try { button.releasePointerCapture(event.pointerId); } catch (_) {}
    }
  });

  button.addEventListener('pointerup', function (event) {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    const token = 'pointer:' + pointerId;
    pointerId = null;
    try { button.releasePointerCapture(event.pointerId); } catch (_) {}
    end(token, false);
  });

  button.addEventListener('pointercancel', function (event) {
    if (pointerId !== event.pointerId) return;
    const token = 'pointer:' + pointerId;
    pointerId = null;
    end(token, true);
  });

  button.addEventListener('pointerleave', function (event) {
    if (pointerId === null || event.pointerId !== pointerId) return;
    event.preventDefault();
    const token = 'pointer:' + pointerId;
    pointerId = null;
    try { button.releasePointerCapture(event.pointerId); } catch (_) {}
    end(token, true);
  });

  button.addEventListener('lostpointercapture', function (event) {
    if (pointerId !== event.pointerId) return;
    const token = 'pointer:' + pointerId;
    pointerId = null;
    end(token, true);
  });

  button.addEventListener('keydown', function (event) {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault();
    if (event.repeat || activeKey !== null || pointerId !== null) return;
    activeKey = event.code;
    if (!begin('key:' + event.code)) activeKey = null;
  });

  button.addEventListener('keyup', function (event) {
    if (event.code !== activeKey) return;
    event.preventDefault();
    const token = 'key:' + activeKey;
    activeKey = null;
    end(token, false);
  });

  button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  button.addEventListener('selectstart', function (event) { event.preventDefault(); });
  button.addEventListener('dragstart', function (event) { event.preventDefault(); });

  root.addEventListener('blur', function () {
    if (pointerId !== null) {
      const token = 'pointer:' + pointerId;
      pointerId = null;
      end(token, true);
    }
    if (activeKey !== null) {
      const token = 'key:' + activeKey;
      activeKey = null;
      end(token, true);
    }
  });

  const noticeSlot = root.document.getElementById('cookie-notice-slot');
  if (noticeSlot && root.MutationObserver) {
    const moveNotice = function () {
      const notice = root.document.querySelector('.cookie-banner');
      if (!notice) return false;
      if (notice.parentNode !== noticeSlot) noticeSlot.appendChild(notice);
      return true;
    };
    const observer = new root.MutationObserver(function () {
      if (moveNotice()) observer.disconnect();
    });
    observer.observe(root.document.body, { childList: true });
    if (moveNotice()) observer.disconnect();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
