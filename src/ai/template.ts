const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/**
 * Fills a `{{placeholder}}` template with plain string substitution. Every
 * value is inserted verbatim: this function does not interpret, sanitise or
 * treat any input specially, which is exactly what makes it safe to feed
 * third-party text (a market question, resolution criteria) into a delimited
 * block — the block's headers come from the template file, not from here.
 *
 * @throws Error when the template references a placeholder `values` does not
 *   supply, so a typo in a prompt file fails loudly instead of shipping a
 *   literal `{{typo}}` to the model.
 */
export function interpolate(template: string, values: Readonly<Record<string, string>>): string {
  const missing = new Set<string>();

  const rendered = template.replace(PLACEHOLDER, (match, key: string) => {
    if (!(key in values)) {
      missing.add(key);
      return match;
    }
    return values[key] as string;
  });

  if (missing.size > 0) {
    throw new Error(`Template references unknown placeholder(s): ${[...missing].join(', ')}`);
  }

  return rendered;
}
