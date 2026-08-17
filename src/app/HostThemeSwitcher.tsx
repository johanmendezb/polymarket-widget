'use client';

import { useState } from 'react';

import { WIDGET_THEMES, type WidgetTheme } from '@/ui';

/**
 * A demo control for the host page. Switches the iframe's `?theme=` param.
 * State lives in memory only — a sandboxed iframe has no storage, and the
 * demo host must not pretend otherwise.
 */
export function HostThemeSwitcher() {
  const [theme, setTheme] = useState<WidgetTheme>('auto');

  return (
    <div>
      <div role="group" aria-label="Widget theme" style={{ display: 'flex', gap: 8 }}>
        {WIDGET_THEMES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === theme}
            onClick={() => {
              setTheme(option);
            }}
          >
            {option}
          </button>
        ))}
      </div>
      <iframe
        title="Second Opinion widget"
        src={`/widget?theme=${theme}`}
        sandbox="allow-scripts"
        style={{ width: '100%', height: 640, border: '1px solid light-dark(#d1d5db, #374151)' }}
      />
    </div>
  );
}
