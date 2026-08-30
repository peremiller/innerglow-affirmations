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
    if (this.autoEnd) queueMicrotask(() => utterance.onend?.());
  }

  pause() {
    this.pauseCount += 1;
  }

  resume() {
    this.resumeCount += 1;
  }

  cancel() {
    this.cancelCount += 1;
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
});
