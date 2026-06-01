import test from 'node:test';
import assert from 'node:assert/strict';
import { getSlotBookingPolicy } from '../src/services/tokenService.js';

test('slot policy allows future booking inside admin availability window', () => {
  const policy = getSlotBookingPolicy(
    {
      startTime: '10:00',
      availableFrom: '2026-05-19',
      availableUntil: '2026-05-25',
      advanceBookingMinutes: 60
    },
    '2026-05-22',
    new Date('2026-05-19T08:00:00+05:30')
  );

  assert.equal(policy.isBookable, true);
});

test('slot policy blocks future booking after admin availability window', () => {
  const policy = getSlotBookingPolicy(
    {
      startTime: '10:00',
      availableUntil: '2026-05-25',
      advanceBookingMinutes: 60
    },
    '2026-05-26',
    new Date('2026-05-19T08:00:00+05:30')
  );

  assert.equal(policy.isBookable, false);
  assert.match(policy.reasons[0], /not available/);
});

test('slot policy blocks same-day booking after the advance cutoff', () => {
  const policy = getSlotBookingPolicy(
    {
      startTime: '10:00',
      advanceBookingMinutes: 60
    },
    '2026-05-19',
    new Date('2026-05-19T09:30:00+05:30')
  );

  assert.equal(policy.isBookable, false);
  assert.match(policy.reasons[0], /at least 60 minutes/);
});

