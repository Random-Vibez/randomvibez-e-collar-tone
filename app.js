(function (root) {
  'use strict';

  const BEEP_COUNT = 5;
  const BEEP_MS = 180;
  const BEEP_GAP_MS = 150;
  const TOTAL_SEQUENCE_MS = BEEP_COUNT * BEEP_MS + (BEEP_COUNT - 1) * BEEP_GAP_MS;
  const FREQUENCY_HZ = 2000;
  const GAIN_LEVEL = 0.2;

  function createBeepSequenceController(options) {
    const startTone = options.startTone;
    const stopTone = options.stopTone;
    const setTimer = options.setTimer || root.setTimeout.bind(root);
    const clearTimer = options.clearTimer || root.clearTimeout.bind(root);
    const onBeep = options.onBeep || function () {};
    const onSilence = options.onSilence || function () {};
    const onStopped = options.onStopped || function () {};
    const onError = options.onError || function () {};
    let activeToken = null;
    let beepNumber = 0;
    let toneActive = false;
    let timer = null;

    function finish(cancelled) {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      if (activeToken === null) return false;
      const wasActive = activeToken;
      activeToken = null;
      if (toneActive) {
        try { stopTone(); } catch (_) {}
        toneActive = false;
      }
      onStopped({ cancelled: Boolean(cancelled), token: wasActive });
      return true;
    }

    function play(token) {
      if (activeToken !== token) return false;
      try {
        startTone(beepNumber + 1);
        toneActive = true;
        onBeep(beepNumber + 1);
        timer = setTimer(function () {
          timer = null;
          if (activeToken !== token) return;
          if (toneActive) {
            try { stopTone(); } catch (_) {}
            toneActive = false;
          }
          if (beepNumber + 1 >= BEEP_COUNT) {
            beepNumber = BEEP_COUNT;
            finish(false);
            return;
          }
          beepNumber += 1;
          onSilence();
          timer = setTimer(function () {
            timer = null;
            play(token);
          }, BEEP_GAP_MS);
        }, BEEP_MS);
        return true;
      } catch (error) {
        finish(true);
        onError(error);
        return false;
      }
    }

    function press(token) {
      if (token == null || activeToken !== null) return false;
      activeToken = token;
      beepNumber = 0;
      return play(token);
    }

    function release(token) {
      return activeToken === token;
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
      get beepNumber() { return beepNumber; }
    });
  }

  const api = Object.freeze({ BEEP_COUNT, BEEP_MS, BEEP_GAP_MS, TOTAL_SEQUENCE_MS, FREQUENCY_HZ, GAIN_LEVEL, createBeepSequenceController });
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
    oscillator.type = 'sine';
    oscillator.frequency.value = FREQUENCY_HZ;
    oscillator.connect(gainNode);
    oscillator.start();
  }

  const toneController = createBeepSequenceController({
    startTone: startAudio,
    stopTone: stopAudio,
    onBeep: function () { button.classList.add('sounding'); },
    onSilence: function () { button.classList.remove('sounding'); },
    onStopped: function (event) {
      button.classList.remove('pressed', 'sounding');
      setStatus(event.cancelled ? 'Playback stopped. Ready to replay.' : 'Five-beep sequence complete. Ready to replay.', false);
    },
    onError: function (error) {
      button.classList.remove('pressed', 'sounding');
      setStatus(error && error.message ? error.message : 'Audio could not start. Check browser sound permissions.', false);
    }
  });

  function begin(token) {
    if (!toneController.press(token)) return false;
    button.classList.add('pressed');
    setStatus('Playing five high-pitched beeps over 1.5 seconds…', true);
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
    activeKey = null;
    if (toneController.active) toneController.cancelCurrent();
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
