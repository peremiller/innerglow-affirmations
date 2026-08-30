const IDLE_PROGRESS = { status: "idle", repetition: 0, repeatCount: 2, cyclePosition: 0, total: 0 };

export function createAffirmationNarrator({
  speechSynthesis,
  Utterance,
  onAffirmation,
  onProgress,
  onComplete,
  onError,
  schedule = (callback, delay) => window.setTimeout(callback, delay),
  unschedule = (timer) => window.clearTimeout(timer),
}) {
  let timer;
  let utteranceVersion = 0;
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

  const finish = (token) => {
    if (!run.active || run.token !== token) return;
    const totalRecitations = run.sequence.length * run.repeatCount;
    run.active = false;
    run.waiting = false;
    onProgress?.(IDLE_PROGRESS);
    onComplete?.({ totalAffirmations: run.sequence.length, totalRecitations });
  };

  const chooseVoice = () => {
    const voices = speechSynthesis.getVoices?.() || [];
    return voices.find((voice) => voice.lang?.toLowerCase().startsWith("en") && /samantha|serena|ava|victoria|zira|google uk english female/i.test(voice.name))
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith("en"))
      || null;
  };

  const speakCurrent = () => {
    if (!run.active || run.paused || !run.sequence.length) return;
    const token = run.token;
    const version = ++utteranceVersion;
    const itemIndex = (run.startIndex + run.itemOffset) % run.sequence.length;
    const item = run.sequence[itemIndex];
    run.waiting = false;
    onAffirmation?.(item);
    emitProgress("speaking");

    const utterance = new Utterance(item.text);
    utterance.voice = chooseVoice();
    utterance.rate = 0.78;
    utterance.pitch = 0.96;

    const scheduleNext = (delay) => {
      if (!run.active || run.token !== token || utteranceVersion !== version) return;
      run.waiting = true;
      timer = schedule(() => {
        timer = undefined;
        if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
        speakCurrent();
      }, delay);
    };

    utterance.onend = () => {
      if (!run.active || run.token !== token || utteranceVersion !== version || run.paused) return;
      if (run.repetition < run.repeatCount) {
        run.repetition += 1;
        emitProgress("speaking");
        scheduleNext(520);
        return;
      }
      if (run.itemOffset + 1 < run.sequence.length) {
        run.itemOffset += 1;
        run.repetition = 1;
        scheduleNext(760);
        return;
      }
      finish(token);
    };

    utterance.onerror = (event) => {
      if (!run.active || run.token !== token || utteranceVersion !== version || ["canceled", "interrupted"].includes(event.error)) return;
      stop();
      onError?.(event);
    };

    speechSynthesis.speak(utterance);
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
    utteranceVersion += 1;
    speechSynthesis?.cancel?.();
    onProgress?.(IDLE_PROGRESS);
  }

  const toggle = (sequence, startId, repeatCount = 2) => {
    if (!run.active) return start(sequence, startId, repeatCount);
    return run.paused ? resume() : pause();
  };

  return {
    isSupported: () => supported,
    isActive: () => run.active,
    toggle,
    stop,
    destroy: stop,
  };
}
