import type { ErrorCode } from '@/domain';

/**
 * The one error type this module throws. Callers branch on `.code`, which is
 * a member of the closed `ErrorCode` union - never a string comparison.
 */
export class AiClientError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
  }
}
