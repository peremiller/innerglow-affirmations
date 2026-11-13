import test from "node:test";
import assert from "node:assert/strict";
import { loadSavedValue, saveSavedValue, viewFromHash, VIEW_IDS, reportStorageIssue, savedStorageIssueKeys } from "../src/app-state.js";

function storage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem(key) { return items.has(key) ? items.get(key) : null; },
    setItem(key, value) { items.set(key, value); },
  };
}

test("previously saved favorites, wishes, journals and progress survive loading", () => {
  const records = { igFavs2: '["a2"]', igWishes: '[{"id":7,"text":"Hope"}]', igMood: '{"2026-11-13":4}', igMinutes: "23" };
  const data = storage(records);
  for (const [key, fallback] of [["igFavs2", []], ["igWishes", []], ["igMood", {}], ["igMinutes", 0]]) {
    const entry = loadSavedValue(() => data, key, fallback);
    assert.equal(entry.writable, true);
    assert.equal(saveSavedValue(() => data, key, entry.value, entry), true);
    assert.deepEqual(JSON.parse(data.items.get(key)), JSON.parse(records[key]));
  }
});

test("malformed existing saved data is not overwritten by default state", () => {
  const data = storage({ igWishes: "{broken" });
  const entry = loadSavedValue(() => data, "igWishes", []);
  assert.deepEqual(entry.value, []);
  assert.equal(entry.writable, false);
  assert.equal(saveSavedValue(() => data, "igWishes", [], entry), false);
  assert.equal(data.getItem("igWishes"), "{broken");
});

test("wrong-shaped saved data is preserved rather than rewritten", () => {
  const data = storage({ igFavs2: '{"wrong":"shape"}', igMood: '["unexpected"]', igMinutes: '"number"' });
  for (const [key, fallback] of [["igFavs2", []], ["igMood", {}], ["igMinutes", 0]]) {
    const raw = data.getItem(key);
    const entry = loadSavedValue(() => data, key, fallback);
    assert.equal(entry.writable, false);
    assert.equal(saveSavedValue(() => data, key, fallback, entry), false);
    assert.equal(data.getItem(key), raw);
  }
});

test("empty store initializes defaults without touching other keys", () => {
  const data = storage({ unrelated: "preserved" });
  const entry = loadSavedValue(() => data, "igMine", []);
  assert.equal(entry.writable, true);
  assert.equal(saveSavedValue(() => data, "igMine", [{ text: "My words" }], entry), true);
  assert.equal(data.getItem("unrelated"), "preserved");
  assert.deepEqual(JSON.parse(data.getItem("igMine")), [{ text: "My words" }]);
});

test("blocked reads and quota/security-denied writes fail without crashing", () => {
  const blocked = () => { throw new Error("SecurityError"); };
  const entry = loadSavedValue(blocked, "igWishes", []);
  assert.equal(entry.writable, false);
  assert.equal(saveSavedValue(blocked, "igWishes", [], entry), false);
  const noWrites = { getItem() { return null; }, setItem() { throw new Error("QuotaExceededError"); } };
  assert.equal(saveSavedValue(() => noWrites, "igWishes", [], { writable: true }), false);
});

test("protected storage error state is detectable without resetting records", () => {
  reportStorageIssue("igFavs2");
  assert.equal(savedStorageIssueKeys().includes("igFavs2"), true);
});

test("every major tab has a unique stable hash and unrelated hashes do not crash", () => {
  assert.deepEqual(VIEW_IDS, ["today", "library", "journal", "wishes"]);
  for (const id of VIEW_IDS) assert.equal(viewFromHash("#" + id), id);
  assert.equal(viewFromHash("#unknown"), "today");
  assert.equal(viewFromHash("#main-content"), "today");
  assert.equal(viewFromHash(""), "today");
});
