/**
 * CLOB token ids.
 *
 * The live values are 77-digit decimals, far beyond `Number.MAX_SAFE_INTEGER`.
 * `Number()`, `parseInt` or a coercing schema silently corrupts one, and the
 * corruption is invisible until an order book request returns nothing. So the
 * type is a plain string, everywhere, forever.
 *
 * `TokenId` is an alias rather than a brand deliberately: a brand would force
 * a conversion at every boundary in four modules for no safety the string
 * shape does not already give, and the rule that matters — never a number — is
 * enforced by the type being `string` at all.
 */
export type TokenId = string;

/** Matches the upstream shape: one or more decimal digits, nothing else. */
const TOKEN_ID_PATTERN = /^\d+$/;

/**
 * True when `value` is a bare decimal string. Use it as the refinement behind
 * the upstream schema; on the Gamma market object `clobTokenIds` arrives as a
 * JSON-encoded string and must be parsed before each element reaches this.
 */
export function isTokenId(value: unknown): value is TokenId {
  return typeof value === 'string' && TOKEN_ID_PATTERN.test(value);
}
