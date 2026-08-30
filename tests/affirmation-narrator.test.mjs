import assert from "node:assert/strict";
import test from "node:test";
import { createAffirmationNarrator } from "../src/affirmation-narrator.js";

class FakeUtterance {
  constructor(text) {
    this.text = text;
  }
}

class FakeSpeechSynthesis {
  constructor({ autoEnd = true } = {}) {
    this.autoEnd = autoEnd;
    this.spoken = [];
    this.current = null;
    this.speaking = false;
    this.pending = false;
    this.paused = false;
    this.pauseCount = 0;
    this.resumeCount = 0;
    this.cancelCount = 0;
  }

  getVoices() {
    return [{ name: "Serena", lang: "en-GB" }];
  }

  speak(utterance) {
    this.current = utterance;
    this.spoken.push(utterance.text);
    this.speaking = true;
    this.paused = false;
    if (this.autoEnd) queueMicrotask(() => {
      this.speaking = false;
      utterance.onend?.();
    });
  }

  pause() {
    this.pauseCount += 1;
    this.paused = true;
  }

  resume() {
    this.resumeCount += 1;
    this.paused = false;
  }

  cancel() {
    this.cancelCount += 1;
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  }
}

const scheduleImmediately = (callback) => {
  queueMicrotask(callback);
  return Symbol("timer");
};

test("recites each affirmation twice by default and completes one wrapped cycle", async () => {
  const speech = new FakeSpeechSynthesis();
  const selected = [];
  const progress = [];
  let completion;
  const sequence = [
    { id: "a", text: "Affirmation A" },
    { id: "b", text: "Affirmation B" },
    { id: "c", text: "Affirmation C" },
  ];

  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    onAffirmation: (item) => selected.push(item.id),
    onProgress: (state) => progress.push(state),
    onComplete: (result) => { completion = result; },
    schedule: scheduleImmediately,
    unschedule: () => {},
  });

  assert.equal(narrator.toggle(sequence, "b"), true);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(speech.spoken, [
    "Affirmation B", "Affirmation B",
    "Affirmation C", "Affirmation C",
    "Affirmation A", "Affirmation A",
  ]);
  assert.deepEqual(selected, ["b", "b", "c", "c", "a", "a"]);
  assert.deepEqual(completion, { totalAffirmations: 3, totalRecitations: 6 });
  assert.equal(progress.at(-1).status, "idle");
  assert.equal(narrator.isActive(), false);
});

test("supports one, two, or three recitations per affirmation", async () => {
  for (const repeatCount of [1, 2, 3]) {
    const speech = new FakeSpeechSynthesis();
    let completion;
    const narrator = createAffirmationNarrator({
      speechSynthesis: speech,
      Utterance: FakeUtterance,
      onComplete: (result) => { completion = result; },
      schedule: scheduleImmediately,
      unschedule: () => {},
    });

    narrator.toggle([{ id: "a", text: "Affirmation A" }], "a", repeatCount);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(speech.spoken.length, repeatCount);
    assert.deepEqual(completion, { totalAffirmations: 1, totalRecitations: repeatCount });
  }
});

test("emits a visible remaining-time countdown and freezes it while paused", () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  const states = [];
  let countdownTick;
  let currentTime = 0;
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    onProgress: (state) => states.push(state),
    countdownWatch: (callback) => { countdownTick = callback; return Symbol("countdown"); },
    countdownUnwatch: () => {},
    visibilityTarget: null,
    now: () => currentTime,
  });

  narrator.toggle([{ id: "a", text: "I welcome this calm and steady moment with an open heart." }], "a", 1);
  const initialSeconds = states.at(-1).remainingSeconds;
  currentTime = 1000;
  countdownTick();
  const activeSeconds = states.at(-1).remainingSeconds;

  assert.equal(initialSeconds > 0, true);
  assert.equal(activeSeconds, initialSeconds - 1);

  narrator.toggle();
  const pausedState = states.at(-1);
  currentTime = 6000;
  countdownTick();

  assert.equal(pausedState.status, "paused");
  assert.equal(states.at(-1).remainingSeconds, pausedState.remainingSeconds);
  narrator.destroy();
});

test("uses the selected session duration and stops audio when the timer ends", () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  const states = [];
  let countdownTick;
  let completion;
  let currentTime = 0;
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    onProgress: (state) => states.push(state),
    onComplete: (result) => { completion = result; },
    countdownWatch: (callback) => { countdownTick = callback; return Symbol("countdown"); },
    countdownUnwatch: () => {},
    visibilityTarget: null,
    now: () => currentTime,
  });

  narrator.toggle([{ id: "a", text: "Affirmation A" }], "a", 1, 1);
  assert.equal(states.at(-1).totalSeconds, 60);

  currentTime = 30000;
  countdownTick();
  assert.equal(states.at(-1).remainingSeconds, 30);

  currentTime = 60000;
  countdownTick();
  assert.equal(states.at(-1).status, "idle");
  assert.equal(narrator.isActive(), false);
  assert.deepEqual(completion, { totalAffirmations: 1, totalRecitations: 0 });
});

test("reliably resumes by restarting the current repetition after pause", () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  const states = [];
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    onProgress: (state) => states.push(state.status),
  });

  narrator.toggle([{ id: "a", text: "Affirmation A" }], "a");
  const cancelCountAfterStart = speech.cancelCount;
  narrator.toggle();
  const canceledUtterance = speech.current;
  canceledUtterance.onend?.();
  narrator.toggle();

  assert.equal(speech.cancelCount, cancelCountAfterStart + 1);
  assert.deepEqual(speech.spoken, ["Affirmation A", "Affirmation A"]);
  assert.equal(speech.resumeCount, 0);
  assert.deepEqual(states.slice(-2), ["paused", "speaking"]);
  narrator.destroy();
});

test("automatically resumes an unexpected browser speech pause", () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
  });

  narrator.toggle([{ id: "a", text: "Affirmation A" }], "a");
  speech.paused = true;
  speech.current.onpause?.();

  assert.equal(speech.resumeCount, 1);
  assert.equal(speech.paused, false);
  narrator.destroy();
});

test("retries the current affirmation when the speech engine silently stalls", async () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  let watchdog;
  let currentTime = 0;
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    schedule: scheduleImmediately,
    unschedule: () => {},
    watch: (callback) => { watchdog = callback; return Symbol("watchdog"); },
    unwatch: () => {},
    visibilityTarget: null,
    now: () => currentTime,
  });

  narrator.toggle([{ id: "a", text: "Affirmation A" }], "a");
  speech.speaking = false;
  currentTime = 2000;
  watchdog();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(speech.spoken, ["Affirmation A", "Affirmation A"]);
  assert.equal(speech.cancelCount >= 2, true);
  narrator.destroy();
});
