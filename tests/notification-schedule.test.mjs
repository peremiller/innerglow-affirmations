import assert from "node:assert/strict";
import test from "node:test";
import { getDueNotificationSlot, manilaDateParts } from "../src/notification-schedule.js";

test("detects all three daily notification times in Manila", () => {
  assert.equal(getDueNotificationSlot(new Date("2026-08-30T03:15:00Z"))?.id, "morning-glow");
  assert.equal(getDueNotificationSlot(new Date("2026-08-30T11:00:00Z"))?.id, "evening-reset");
  assert.equal(getDueNotificationSlot(new Date("2026-08-30T16:15:00Z"))?.id, "midnight-release");
});

test("allows a short delivery grace period without sending outside it", () => {
  assert.equal(getDueNotificationSlot(new Date("2026-08-30T03:24:00Z"))?.id, "morning-glow");
  assert.equal(getDueNotificationSlot(new Date("2026-08-30T03:26:00Z")), null);
});

test("formats the Manila calendar date independently of UTC", () => {
  assert.deepEqual(manilaDateParts(new Date("2026-08-30T16:15:00Z")), {
    dateKey: "2026-08-31",
    dateCompact: "20260831",
    hour: 0,
    minute: 15,
  });
});
