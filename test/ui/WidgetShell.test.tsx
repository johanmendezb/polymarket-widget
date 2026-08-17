/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { sampleRecommendation, WidgetShell } from '@/ui';

describe('WidgetShell', () => {
  // jsdom does not run a real CSS engine, so `container-type` and the
  // @container rules it enables are proven in a real browser instead — see
  // e2e/widget-shell.spec.ts.

  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    ['auto', 'light dark'],
  ] as const)('applies color-scheme %s -> %s from the theme prop', (theme, expected) => {
    render(
      <WidgetShell theme={theme}>
        <p>content</p>
      </WidgetShell>,
    );

    const root = screen.getByTestId('widget-shell');
    expect(root.getAttribute('data-theme')).toBe(theme);
    expect(root.style.colorScheme).toBe(expected);
  });

  it('renders a typed, domain-valid Recommendation fixture with no network call', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    render(
      <WidgetShell theme="light">
        <p data-testid="verdict">{sampleRecommendation.verdict}</p>
        <p data-testid="edge">{sampleRecommendation.estimatedEdge}</p>
      </WidgetShell>,
    );

    expect(screen.getByTestId('verdict').textContent).toBe('CONSIDER');
    expect(screen.getByTestId('edge').textContent).toBe('0.023');
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
