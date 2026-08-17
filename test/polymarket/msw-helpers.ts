/**
 * Shared MSW plumbing for the client (T3.3) and route (T3.4) integration
 * tests. Fixtures are read fresh off disk per call rather than imported as
 * JSON modules, so a handler can mutate a copy without touching the file.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';

export const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';
export const CLOB_BASE_URL = 'https://clob.polymarket.com';

const FIXTURE_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));

export function readFixture(file: string): JsonBodyType {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), 'utf8')) as JsonBodyType;
}

export const server = setupServer();

/** Captures every request the mock server saw, for header/UA assertions. */
export function capturedUserAgents(): string[] {
  return [...seenUserAgents];
}

let seenUserAgents: string[] = [];

server.events.on('request:start', ({ request }) => {
  seenUserAgents.push(request.headers.get('user-agent') ?? '');
});

export function resetCapturedUserAgents(): void {
  seenUserAgents = [];
}

export const handlers = {
  gammaSearch: (fixtureFile = 'gamma-public-search-election.json') =>
    http.get(`${GAMMA_BASE_URL}/public-search`, () => HttpResponse.json(readFixture(fixtureFile))),

  gammaMarket: (id: string, fixtureFile: string) =>
    http.get(`${GAMMA_BASE_URL}/markets/${id}`, () => HttpResponse.json(readFixture(fixtureFile))),

  gammaMarketSlug: (slug: string, fixtureFile: string) =>
    http.get(`${GAMMA_BASE_URL}/markets/slug/${slug}`, () => HttpResponse.json(readFixture(fixtureFile))),

  clobBook: (fixtureFile = 'clob-book-liquid.json') =>
    http.get(`${CLOB_BASE_URL}/book`, () => HttpResponse.json(readFixture(fixtureFile))),

  clobPriceHistory: (fixtureFile = 'clob-prices-history-liquid.json') =>
    http.get(`${CLOB_BASE_URL}/prices-history`, () => HttpResponse.json(readFixture(fixtureFile))),

  status: (url: string, status: number, body: JsonBodyType = { error: 'mock' }) =>
    http.get(url, () => HttpResponse.json(body, { status })),

  malformed: (url: string) => http.get(url, () => new HttpResponse('not json{{{', { status: 200 })),

  networkError: (url: string) => http.get(url, () => HttpResponse.error()),
};
