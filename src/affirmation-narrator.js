const IDLE_PROGRESS = { status: "idle", repetition: 0, repeatCount: 2, cyclePosition: 0, total: 0, remainingSeconds: 0, totalSeconds: 0 };

const SPEECH_RATE = 0.78;

function estimateUtteranceMs(text) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length;
  const punctuationPauses = (String(text).match(/[,.!?;:—]/g) || []).length * 110;
  return Math.max(1800, Math.ceil((wordCount / (2.8 * SPEECH_RATE)) * 1000 + punctuationPauses));
}

function estimateCycleMs(sequence, startIndex, repeatCount) {
  const ordered = sequence.map((_, offset) => sequence[(startIndex + offset) % sequence.length]);
  return ordered.reduce((total, item, itemIndex) => {
    const speech = estimateUtteranceMs(item.text) * repeatCount;
    const repetitionGaps = Math.max(0, repeatCount - 1) * 520;
    const itemGap = itemIndex < ordered.length - 1 ? 760 : 0;
    return total + speech + repetitionGaps + itemGap;
  }, 0);
}

export function createAffirmationNarrator({
  speechSynthesis,
  Utterance,
  onAffirmation,
  onProgress,
  onComplete,
  onError,
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  unschedule = (timer) => globalThis.clearTimeout(timer),
  watch = (callback, delay) => globalThis.setInterval(callback, delay),
  unwatch = (timer) => globalThis.clearInterval(timer),
  countdownWatch = (callback, delay) => globalThis.setInterval(callback, delay),
  countdownUnwatch = (timer) => globalThis.clearInterval(timer),
  visibilityTarget = typeof document === "undefined" ? null : document,
  now = () => Date.now(),
}) {
  let timer;
  let watchdog;
  let countdownTimer;
  let countdownLastTick;
  let countdownLastSecond;
  let utteranceVersion = 0;
  let utteranceStartedAt = 0;
  let recoveryAttempts = 0;
  let run = {
    token: 0,
    active: false,
    paused: false,
    waiting: false,
    sequence: [],
    startIndex: 0,
    itemOffset: 0,
    repetition: 1,
    repeatCount: 2,
    remainingMs: 0,
    totalMs: 0,
    remainingAtUtteranceStart: 0,
    currentUtteranceMs: 0,
    timeBounded: false,
    completedRecitations: 0,
  };

  const supported = Boolean(speechSynthesis && Utterance);
  const emitProgress = (status) => onProgress?.({
    status,
    repetition: run.repetition,
    repeatCount: run.repeatCount,
    cyclePosition: run.itemOffset,
    total: run.sequence.length,
    remainingSeconds: Math.max(0, Math.ceil(run.remainingMs / 1000)),
    totalSeconds: Math.max(0, Math.ceil(run.totalMs / 1000)),
  });

  const clearScheduledStep = () => {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
  };

  const clearWatchdog = () => {
    if (watchdog !== undefined) unwatch(watchdog);
    watchdog = undefined;
  };

  const clearCountdown = () => {
    if (countdownTimer !== undefined) countdownUnwatch(countdownTimer);
    countdownTimer = undefined;
    countdownLastTick = undefined;
  };

  const consumeCountdown = () => {
    const currentTime = now();
    if (countdownLastTick === undefined) {
      countdownLastTick = currentTime;
      return;
    }
    const elapsed = Math.max(0, currentTime - countdownLastTick);
    run.remainingMs = Math.max(0, run.remainingMs - elapsed);
    countdownLastTick = currentTime;
  };

  const startCountdown = () => {
    clearCountdown();
    const token = run.token;
    countdownLastTick = now();
    countdownLastSecond = Math.ceil(run.remainingMs / 1000);
    countdownTimer = countdownWatch(() => {
      if (!run.active || run.paused) return;
      consumeCountdown();
      const nextSecond = Math.ceil(run.remainingMs / 1000);
      if (nextSecond !== countdownLastSecond) {
        countdownLastSecond = nextSecond;
        emitProgress("speaking");
      }
      if (run.timeBounded && run.remainingMs <= 0) finish(token);
    }, 250);
  };

  const finish = (token) => {
    if (!run.active || run.token !== token) return;
    const totalRecitations = run.completedRecitations;
    run.active = false;
    run.waiting = false;
    clearWatchdog();
    clearCountdown();
    utteranceVersion += 1;
    speechSynthesis.cancel?.();
    onProgress?.(IDLE_PROGRESS);
    onComplete?.({ totalAffirmations: run.sequence.length, totalRecitations });
  };

  const chooseVoice = () => {
    const voices = speechSynthesis.getVoices?.() || [];
    return voices.find((voice) => voice.lang?.toLowerCase().startsWith("en") && /samantha|serena|ava|victoria|zira|google uk english female/i.test(voice.name))
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith("en"))
      || null;
  };

  const scheduleCurrent = (delay) => {
    const token = run.token;
    clearScheduledStep();
    run.waiting = true;
    timer = schedule(() => {
      timer = undefined;
      if (!run.active || run.token !== token || run.paused) return;
      run.waiting = false;
      speakCurrent();
    }, delay);
  };

  const advance = (token) => {
    if (!run.active || run.token !== token || run.paused) return;
    consumeCountdown();
    if (!run.timeBounded) run.remainingMs = Math.max(0, run.remainingAtUtteranceStart - run.currentUtteranceMs);
    run.completedRecitations += 1;
    recoveryAttempts = 0;
    if (run.repetition < run.repeatCount) {
      run.repetition += 1;
      emitProgress("speaking");
      scheduleCurrent(520);
      return;
    }
    if (run.itemOffset + 1 < run.sequence.length) {
      run.itemOffset += 1;
      run.repetition = 1;
      scheduleCurrent(760);
      return;
    }
    if (run.timeBounded && run.remainingMs > 0) {
      run.itemOffset = 0;
      run.repetition = 1;
      scheduleCurrent(760);
      return;
    }
    finish(token);
  };

  const recoverCurrent = (token, version, error) => {
    if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
    clearWatchdog();
    if (!run.timeBounded) run.remainingMs = Math.max(run.remainingMs, run.remainingAtUtteranceStart);
    countdownLastTick = now();
    utteranceVersion += 1;
    speechSynthesis.cancel?.();
    if (recoveryAttempts < 3) {
      recoveryAttempts += 1;
      scheduleCurrent(240);
      return;
    }
    recoveryAttempts = 0;
    onError?.(error || new Error("The browser speech engine stopped unexpectedly."));
    advance(token);
  };

  const keepSpeechAlive = (token, version) => {
    if (!run.active || run.token !== token || utteranceVersion !== version || run.paused || run.waiting) return;
    if (speechSynthesis.paused) speechSynthesis.resume?.();
    const engineIsIdle = speechSynthesis.speaking === false && speechSynthesis.pending === false;
    if (engineIsIdle && now() - utteranceStartedAt > 1800) {
      recoverCurrent(token, version);
    }
  };

  const speakCurrent = () => {
    if (!run.active || run.paused || !run.sequence.length) return;
    const token = run.token;
    const version = ++utteranceVersion;
    const itemIndex = (run.startIndex + run.itemOffset) % run.sequence.length;
    const item = run.sequence[itemIndex];
    run.waiting = false;
    utteranceStartedAt = now();
    run.remainingAtUtteranceStart = run.remainingMs;
    run.currentUtteranceMs = estimateUtteranceMs(item.text);
    onAffirmation?.(item);
    emitProgress("speaking");

    const utterance = new Utterance(item.text);
    utterance.voice = chooseVoice();
    utterance.rate = SPEECH_RATE;
    utterance.pitch = 0.96;

    utterance.onend = () => {
      if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
      clearWatchdog();
      advance(token);
    };

    utterance.onerror = (event) => {
      if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
      recoverCurrent(token, version, event);
    };

    utterance.onpause = () => {
      if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
      speechSynthesis.resume?.();
    };

    speechSynthesis.speak(utterance);
    clearWatchdog();
    watchdog = watch(() => keepSpeechAlive(token, version), 1000);
  };

  const start = (sequence, startId, repeatCount = 2, durationMinutes) => {
    if (!supported || !sequence?.length) return false;
    stop();
    const snapshot = [...sequence];
    const normalizedRepeatCount = Math.min(3, Math.max(1, Number(repeatCount) || 2));
    const startIndex = Math.max(0, snapshot.findIndex((item) => item.id === startId));
    const normalizedDuration = Number(durationMinutes);
    const timeBounded = Number.isFinite(normalizedDuration) && normalizedDuration > 0;
    const totalMs = timeBounded
      ? Math.round(normalizedDuration * 60 * 1000)
      : estimateCycleMs(snapshot, startIndex, normalizedRepeatCount);
    run = {
      token: run.token + 1,
      active: true,
      paused: false,
      waiting: false,
      sequence: snapshot,
      startIndex,
      itemOffset: 0,
      repetition: 1,
      repeatCount: normalizedRepeatCount,
      remainingMs: totalMs,
      totalMs,
      remainingAtUtteranceStart: totalMs,
      currentUtteranceMs: 0,
      timeBounded,
      completedRecitations: 0,
    };
    startCountdown();
    speakCurrent();
    return true;
  };

  const pause = () => {
    if (!run.active || run.paused) return false;
    const wasWaiting = run.waiting;
    consumeCountdown();
    if (!wasWaiting && !run.timeBounded) run.remainingMs = Math.max(run.remainingMs, run.remainingAtUtteranceStart);
    run.paused = true;
    run.waiting = true;
    clearScheduledStep();
    clearWatchdog();
    clearCountdown();
    utteranceVersion += 1;
    speechSynthesis.cancel();
    emitProgress("paused");
    return true;
  };

  const resume = () => {
    if (!run.active || !run.paused) return false;
    run.paused = false;
    run.waiting = false;
    startCountdown();
    speakCurrent();
    return true;
  };

  function stop() {
    run.token += 1;
    run.active = false;
    run.paused = false;
    run.waiting = false;
    clearScheduledStep();
    clearWatchdog();
    clearCountdown();
    utteranceVersion += 1;
    speechSynthesis?.cancel?.();
    onProgress?.(IDLE_PROGRESS);
  }

  const toggle = (sequence, startId, repeatCount = 2, durationMinutes) => {
    if (!run.active) return start(sequence, startId, repeatCount, durationMinutes);
    return run.paused ? resume() : pause();
  };

  const handleVisibilityChange = () => {
    if (!run.active || run.paused || visibilityTarget?.visibilityState === "hidden") return;
    speechSynthesis.resume?.();
    keepSpeechAlive(run.token, utteranceVersion);
  };

  visibilityTarget?.addEventListener?.("visibilitychange", handleVisibilityChange);

  const destroy = () => {
    stop();
    visibilityTarget?.removeEventListener?.("visibilitychange", handleVisibilityChange);
  };

  return {
    isSupported: () => supported,
    isActive: () => run.active,
    toggle,
    stop,
    destroy,
  };
}
