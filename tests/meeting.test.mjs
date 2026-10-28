import test from 'node:test';
import assert from 'node:assert/strict';
import { meetingSlide, meetingLines, clock } from '../src/meeting-data.js';

test('meeting presentation advances every 12 seconds and loops the intention', () => {
  assert.equal(meetingSlide(0, 8), 0);
  assert.equal(meetingSlide(11.99, 8), 0);
  assert.equal(meetingSlide(12, 8), 1);
  assert.equal(meetingSlide(96, 8), 0);
  assert.equal(meetingSlide(-12, 8), 0);
  assert.equal(meetingSlide(12, 0), 0);
  assert.equal(meetingSlide(6, 8, 1), 1);
  assert.equal(meetingSlide(6, 8, -1), 7);
});

test('custom affirmations preserve user text and reject blank messages', () => {
  assert.deepEqual(meetingLines('custom', '   '), []);
  assert.deepEqual(meetingLines('custom', '  We learn together.  '), ['We learn together.']);
  assert.equal(meetingLines('together', '').length, 8);
  assert.deepEqual(meetingLines('daily', '', 'My daily affirmation.'), ['My daily affirmation.']);
  assert.deepEqual(meetingLines('invalid', ''), meetingLines('together', ''));
});

test('meeting countdown rounds remaining seconds and stops at zero', () => {
  assert.equal(clock(120), '2:00');
  assert.equal(clock(60.1), '1:01');
  assert.equal(clock(0), '0:00');
  assert.equal(clock(-3), '0:00');
});
