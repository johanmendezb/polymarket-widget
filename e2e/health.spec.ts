import { expect, test } from '@playwright/test';

test('the health endpoint answers on the port the environment assigned', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);

  const body = (await response.json()) as Record<string, unknown>;
  expect(body.status).toBe('ok');
  expect(typeof body.commit).toBe('string');
  expect(typeof body.uptimeSeconds).toBe('number');
});
