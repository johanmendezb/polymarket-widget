import { describe, expect, it } from 'vitest';

import { interpolate } from '@/ai/template';

describe('interpolate', () => {
  it('replaces every placeholder with its value', () => {
    const result = interpolate('Hello {{name}}, today is {{day}}.', {
      name: 'Ada',
      day: 'Tuesday',
    });
    expect(result).toBe('Hello Ada, today is Tuesday.');
  });

  it('replaces a repeated placeholder at every occurrence', () => {
    const result = interpolate('{{x}} and {{x}} again', { x: 'echo' });
    expect(result).toBe('echo and echo again');
  });

  it('inserts values verbatim, without interpreting their contents', () => {
    const result = interpolate('QUESTION\n{{question}}\nEND', {
      question: 'Contains {{braces}} and\nnewlines.',
    });
    expect(result).toBe('QUESTION\nContains {{braces}} and\nnewlines.\nEND');
  });

  it('throws when the template references a placeholder with no supplied value', () => {
    expect(() => interpolate('{{known}} {{typo}}', { known: 'x' })).toThrow(/typo/);
  });

  it('ignores values that the template does not reference', () => {
    expect(interpolate('no placeholders here', { unused: 'x' })).toBe('no placeholders here');
  });
});
