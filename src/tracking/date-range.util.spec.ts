// src/tracking/date-range.util.spec.ts
import { BadRequestException } from '@nestjs/common';
import { parseDateRange } from './date-range.util';

describe('parseDateRange', () => {
  it('valid range', () => {
    const r = parseDateRange('2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z');
    expect(r.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('range > 90 days throws 400', () => {
    expect(() =>
      parseDateRange('2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ).toThrow(BadRequestException);
  });

  it('missing from defaults to 30 days before to', () => {
    const to = new Date('2026-01-31T00:00:00Z');
    const r = parseDateRange(undefined, to.toISOString());
    const diffDays =
      (r.to.getTime() - r.from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeCloseTo(30, 1);
  });
});
