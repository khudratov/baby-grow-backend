// src/tracking/date-range.util.ts
import { BadRequestException } from '@nestjs/common';

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DateRange = { from: Date; to: Date };

export function parseDateRange(fromIso?: string, toIso?: string): DateRange {
  const to = toIso ? new Date(toIso) : new Date();
  if (Number.isNaN(to.getTime())) {
    throw new BadRequestException('Invalid `to` date');
  }
  const from = fromIso
    ? new Date(fromIso)
    : new Date(to.getTime() - DEFAULT_RANGE_MS);
  if (Number.isNaN(from.getTime())) {
    throw new BadRequestException('Invalid `from` date');
  }
  if (from > to) {
    throw new BadRequestException('`from` must be before `to`');
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new BadRequestException('Date range exceeds 90 days');
  }
  return { from, to };
}
