import type { ReactNode } from 'react';

import styles from './WidgetShell.module.css';
import { colorSchemeFor, type WidgetTheme } from './theme';

export interface WidgetShellProps {
  readonly theme: WidgetTheme;
  readonly children: ReactNode;
}

/**
 * The widget root. Hosts exactly one state at a time (search, market detail,
 * order preview, confirmation) — states arrive as `children` from the tasks
 * that build them. This component owns only the container-query layout
 * system and the explicit theme, per ADR-0014.
 */
export function WidgetShell({ theme, children }: WidgetShellProps) {
  return (
    <div
      className={styles.shell}
      data-testid="widget-shell"
      data-theme={theme}
      style={{ colorScheme: colorSchemeFor(theme) }}
    >
      <div className={styles.frame} data-testid="widget-shell-frame">
        {children}
      </div>
    </div>
  );
}
