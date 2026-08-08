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

  cancel() {}
}

const scheduleImmediately = (callback) => {
  queueMicrotask(callback);
  return Symbol("timer");
};

test("recites each affirmation three times and completes one wrapped cycle", async () => {
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
    "Affirmation B", "Affirmation B", "Affirmation B",
    "Affirmation C", "Affirmation C", "Affirmation C",
    "Affirmation A", "Affirmation A", "Affirmation A",
  ]);
  assert.deepEqual(selected, ["b", "b", "b", "c", "c", "c", "a", "a", "a"]);
  assert.deepEqual(completion, { totalAffirmations: 3, totalRecitations: 9 });
  assert.equal(progress.at(-1).status, "idle");
  assert.equal(narrator.isActive(), false);
});

test("toggles between pause and resume during an active recitation", () => {
  const speech = new FakeSpeechSynthesis({ autoEnd: false });
  const states = [];
  const narrator = createAffirmationNarrator({
    speechSynthesis: speech,
    Utterance: FakeUtterance,
    onProgress: (state) => states.push(state.status),
  });

  narrator.toggle([{ id: "a", text: "Affirmation A" }], "a");
  narrator.toggle();
  narrator.toggle();

  assert.equal(speech.pauseCount, 1);
  assert.equal(speech.resumeCount, 1);
  assert.deepEqual(states.slice(-2), ["paused", "speaking"]);
});
