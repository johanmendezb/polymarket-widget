/**
 * Theme arrives as `?theme=light|dark|auto`, never inherited from the host:
 * CSS does not cross a sandboxed iframe boundary. See ADR-0014.
 */
export const WIDGET_THEMES = ['light', 'dark', 'auto'] as const;

export type WidgetTheme = (typeof WIDGET_THEMES)[number];

const DEFAULT_THEME: WidgetTheme = 'auto';

function isWidgetTheme(value: unknown): value is WidgetTheme {
  return typeof value === 'string' && (WIDGET_THEMES as readonly string[]).includes(value);
}

/**
 * Parses the raw `theme` search param. Falls back to `auto` for anything
 * missing, empty or unrecognised rather than throwing: a malformed URL
 * parameter is not a reason to fail the whole widget.
 */
export function parseWidgetTheme(raw: string | readonly string[] | undefined): WidgetTheme {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isWidgetTheme(value) ? value : DEFAULT_THEME;
}

/** The CSS `color-scheme` value for a given theme. `auto` lets the host's OS preference decide. */
export function colorSchemeFor(theme: WidgetTheme): string {
  return theme === 'auto' ? 'light dark' : theme;
}
