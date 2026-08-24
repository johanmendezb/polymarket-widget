import { describe, expect, it } from 'vitest';

import { asUsdc } from '@/domain';
import { formatShares, formatUsdc } from '@/ui/format';

describe('formatUsdc', () => {
  it('always shows two decimal places', () => {
    expect(formatUsdc(asUsdc(0.624))).toBe('$0.62');
    expect(formatUsdc(asUsdc(2))).toBe('$2.00');
  });

  it('groups thousands, matching formatShares — the bug that put $151830.33 next to 198,424.23', () => {
    expect(formatUsdc(asUsdc(151830.33))).toBe('$151,830.33');
    expect(formatShares(198424.23)).toBe('198,424.23');
  });

  it('puts the sign before the dollar sign for a negative value', () => {
    expect(formatUsdc(asUsdc(-42.5))).toBe('-$42.50');
  });

  it('rounds to two decimals rather than truncating', () => {
    expect(formatUsdc(asUsdc(1.005))).toBe('$1.01');
  });
});

describe('formatShares', () => {
  it('groups thousands', () => {
    expect(formatShares(1234.5)).toBe('1,234.5');
  });

  it('trims trailing zeros rather than padding to two decimals', () => {
    expect(formatShares(100)).toBe('100');
    expect(formatShares(100.5)).toBe('100.5');
  });

  it('caps at two decimal places', () => {
    expect(formatShares(1.239)).toBe('1.24');
  });
});
