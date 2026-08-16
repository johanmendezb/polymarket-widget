import { describe, expect, it } from 'vitest';

import { colorSchemeFor, parseWidgetTheme } from '@/ui';

describe('parseWidgetTheme', () => {
  it('accepts each documented value', () => {
    expect(parseWidgetTheme('light')).toBe('light');
    expect(parseWidgetTheme('dark')).toBe('dark');
    expect(parseWidgetTheme('auto')).toBe('auto');
  });

  it('falls back to auto for a missing param', () => {
    expect(parseWidgetTheme(undefined)).toBe('auto');
  });

  it('falls back to auto for an unrecognised value rather than throwing', () => {
    expect(parseWidgetTheme('solarized')).toBe('auto');
    expect(parseWidgetTheme('')).toBe('auto');
  });

  it('takes the first value when Next hands back an array', () => {
    expect(parseWidgetTheme(['dark', 'light'])).toBe('dark');
  });
});

describe('colorSchemeFor', () => {
  it('maps light and dark straight through', () => {
    expect(colorSchemeFor('light')).toBe('light');
    expect(colorSchemeFor('dark')).toBe('dark');
  });

  it('maps auto to both, letting the host OS decide', () => {
    expect(colorSchemeFor('auto')).toBe('light dark');
  });
});
