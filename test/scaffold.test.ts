import { describe, expect, it } from 'vitest';

import { GET } from '@/app/api/health/route';

describe('the test runner', () => {
  it('runs and resolves the @/ alias to src', () => {
    expect(typeof GET).toBe('function');
  });
});

describe('GET /api/health', () => {
  it('answers 200 with status, commit and uptimeSeconds', async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    expect(body).toEqual({
      status: 'ok',
      commit: expect.any(String),
      uptimeSeconds: expect.any(Number),
    });
  });

  it('falls back to "dev" when RENDER_GIT_COMMIT is unset', async () => {
    const previous = process.env.RENDER_GIT_COMMIT;
    delete process.env.RENDER_GIT_COMMIT;
    try {
      const body = (await GET().json()) as { commit: string };
      expect(body.commit).toBe('dev');
    } finally {
      if (previous !== undefined) process.env.RENDER_GIT_COMMIT = previous;
    }
  });

  it('reports the commit Render injects', async () => {
    const previous = process.env.RENDER_GIT_COMMIT;
    process.env.RENDER_GIT_COMMIT = 'abc1234';
    try {
      const body = (await GET().json()) as { commit: string };
      expect(body.commit).toBe('abc1234');
    } finally {
      if (previous === undefined) delete process.env.RENDER_GIT_COMMIT;
      else process.env.RENDER_GIT_COMMIT = previous;
    }
  });
});
