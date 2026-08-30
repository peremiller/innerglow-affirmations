const IDLE_PROGRESS = { status: "idle", repetition: 0, repeatCount: 2, cyclePosition: 0, total: 0 };

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
  visibilityTarget = typeof document === "undefined" ? null : document,
  now = () => Date.now(),
}) {
  let timer;
  let watchdog;
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
  };

  const supported = Boolean(speechSynthesis && Utterance);
  const emitProgress = (status) => onProgress?.({
    status,
    repetition: run.repetition,
    repeatCount: run.repeatCount,
    cyclePosition: run.itemOffset,
    total: run.sequence.length,
  });

  const clearScheduledStep = () => {
    if (timer !== undefined) unschedule(timer);
    timer = undefined;
  };

  const clearWatchdog = () => {
    if (watchdog !== undefined) unwatch(watchdog);
    watchdog = undefined;
  };

  const finish = (token) => {
    if (!run.active || run.token !== token) return;
    const totalRecitations = run.sequence.length * run.repeatCount;
    run.active = false;
    run.waiting = false;
    clearWatchdog();
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
    finish(token);
  };

  const recoverCurrent = (token, version, error) => {
    if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
    clearWatchdog();
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
    onAffirmation?.(item);
    emitProgress("speaking");

    const utterance = new Utterance(item.text);
    utterance.voice = chooseVoice();
    utterance.rate = 0.78;
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

  const start = (sequence, startId, repeatCount = 2) => {
    if (!supported || !sequence?.length) return false;
    stop();
    const snapshot = [...sequence];
    const normalizedRepeatCount = Math.min(3, Math.max(1, Number(repeatCount) || 2));
    run = {
      token: run.token + 1,
      active: true,
      paused: false,
      waiting: false,
      sequence: snapshot,
      startIndex: Math.max(0, snapshot.findIndex((item) => item.id === startId)),
      itemOffset: 0,
      repetition: 1,
      repeatCount: normalizedRepeatCount,
    };
    speakCurrent();
    return true;
  };

  const pause = () => {
    if (!run.active || run.paused) return false;
    run.paused = true;
    run.waiting = true;
    clearScheduledStep();
    clearWatchdog();
    utteranceVersion += 1;
    speechSynthesis.cancel();
    emitProgress("paused");
    return true;
  };

  const resume = () => {
    if (!run.active || !run.paused) return false;
    run.paused = false;
    run.waiting = false;
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
    utteranceVersion += 1;
    speechSynthesis?.cancel?.();
    onProgress?.(IDLE_PROGRESS);
  }

  const toggle = (sequence, startId, repeatCount = 2) => {
    if (!run.active) return start(sequence, startId, repeatCount);
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
