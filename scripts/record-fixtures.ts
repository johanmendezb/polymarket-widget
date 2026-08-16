#!/usr/bin/env node
/**
 * Records real, unmodified Polymarket responses into `test/fixtures/`.
 *
 * Run with `pnpm record-fixtures`. Every later epic tests against these files
 * through MSW, so what is written here is byte-for-byte what the wire returned:
 * the response *text* is written, not a re-serialised object. Do not hand-edit
 * a fixture. If one looks wrong, that is a finding about upstream.
 *
 * Age is recorded in `test/fixtures/MANIFEST.json`, one entry per file, with the
 * URL, the HTTP status and the `Access-Control-Allow-Origin` header (OQ-01; a
 * dedicated Origin-bearing probe, not one of the recorded fixtures, confirms
 * what that header actually is — see `observations.oq01CorsAllowOrigin`).
 *
 * Endpoints are all public: no API key, no wallet, no auth header of any kind.
 * An explicit User-Agent is sent as a defensive measure — see OQ-10 and the note
 * in MANIFEST.json.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const GAMMA = 'https://gamma-api.polymarket.com';
const CLOB = 'https://clob.polymarket.com';
const USER_AGENT = 'polymarket-second-opinion-fixture-recorder/0.1';

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'test',
  'fixtures',
);

/** Notional (price x size) counted this far above the best ask, in dollars. */
const NEAR_TOUCH_BAND = 0.02;
/** A fixture market must survive long enough to still be open when it is read. */
const MIN_DAYS_TO_END = 7;

interface RawResponse {
  readonly url: string;
  readonly status: number;
  readonly text: string;
  readonly accessControlAllowOrigin: string | null;
}

interface ManifestEntry {
  readonly file: string;
  readonly url: string;
  readonly httpStatus: number;
  readonly recordedAt: string;
  readonly accessControlAllowOrigin: string | null;
  readonly note: string;
}

interface Level {
  readonly price: string;
  readonly size: string;
}

interface Book {
  readonly asks: readonly Level[];
  readonly bids: readonly Level[];
}

interface Candidate {
  readonly marketId: string;
  readonly question: string;
  readonly tokenId: string;
  readonly outcomeLabel: string;
  readonly indicativePrice: number;
  readonly endDate: string | null;
}

interface Measured extends Candidate {
  /** Dollars resting within NEAR_TOUCH_BAND of the best ask. */
  readonly nearTouchUsd: number;
  readonly askLevels: number;
  readonly bidLevels: number;
  readonly bestAsk: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** `outcomes`, `outcomePrices` and `clobTokenIds` all arrive JSON-encoded. */
function parseEncodedArray(value: unknown): string[] | null {
  const raw = asString(value);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.every((entry): entry is string => typeof entry === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

function parseLevels(value: unknown): Level[] {
  if (!Array.isArray(value)) return [];
  const levels: Level[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const price = asString(entry.price);
    const size = asString(entry.size);
    if (price !== null && size !== null) levels.push({ price, size });
  }
  return levels;
}

function parseBook(value: unknown): Book {
  if (!isRecord(value)) return { asks: [], bids: [] };
  return { asks: parseLevels(value.asks), bids: parseLevels(value.bids) };
}

async function getRaw(url: string): Promise<RawResponse> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  return {
    url,
    status: response.status,
    text: await response.text(),
    accessControlAllowOrigin: response.headers.get('access-control-allow-origin'),
  };
}

function parsed(response: RawResponse): unknown {
  if (response.status !== 200) {
    throw new Error(`${response.url} returned ${response.status}`);
  }
  return JSON.parse(response.text) as unknown;
}

const manifest: ManifestEntry[] = [];

async function record(file: string, response: RawResponse, note: string): Promise<void> {
  if (response.status !== 200) {
    throw new Error(`refusing to record ${file}: ${response.url} returned ${response.status}`);
  }
  await writeFile(path.join(FIXTURE_DIR, file), `${response.text.trimEnd()}\n`, 'utf8');
  manifest.push({
    file,
    url: response.url,
    httpStatus: response.status,
    recordedAt: new Date().toISOString(),
    accessControlAllowOrigin: response.accessControlAllowOrigin,
    note,
  });
  console.log(`  wrote ${file} (${response.text.length.toLocaleString()} bytes)`);
}

/** Flattens whatever a Gamma payload nests markets inside into a flat list. */
function collectMarkets(payload: unknown): Record<string, unknown>[] {
  const markets: Record<string, unknown>[] = [];
  const push = (value: unknown): void => {
    if (isRecord(value) && typeof value.clobTokenIds === 'string') markets.push(value);
  };
  if (Array.isArray(payload)) {
    for (const entry of payload) push(entry);
    return markets;
  }
  if (!isRecord(payload)) return markets;
  for (const key of ['events', 'data', 'markets'] as const) {
    const branch = payload[key];
    if (!Array.isArray(branch)) continue;
    for (const entry of branch) {
      push(entry);
      if (isRecord(entry) && Array.isArray(entry.markets)) {
        for (const nested of entry.markets) push(nested);
      }
    }
  }
  return markets;
}

function toCandidate(market: Record<string, unknown>): Candidate | null {
  if (market.acceptingOrders !== true || market.closed === true) return null;
  const tokenIds = parseEncodedArray(market.clobTokenIds);
  const outcomes = parseEncodedArray(market.outcomes);
  const prices = parseEncodedArray(market.outcomePrices);
  const tokenId = tokenIds?.[0];
  const outcomeLabel = outcomes?.[0];
  const priceText = prices?.[0];
  if (tokenId === undefined || outcomeLabel === undefined || priceText === undefined) return null;

  const indicativePrice = Number(priceText);
  // Longshots at 0.001 make a book fixture where every fee and edge number is
  // degenerate. Keep the middle of the range.
  if (!Number.isFinite(indicativePrice) || indicativePrice < 0.15 || indicativePrice > 0.85) {
    return null;
  }

  const endDate = asString(market.endDate);
  if (endDate !== null) {
    const daysLeft = (Date.parse(endDate) - Date.now()) / 86_400_000;
    // A market resolving this afternoon makes a fixture that is closed tomorrow.
    if (Number.isFinite(daysLeft) && daysLeft < MIN_DAYS_TO_END) return null;
  }

  const id = asString(market.id);
  const question = asString(market.question);
  if (id === null || question === null) return null;

  return { marketId: id, question, tokenId, outcomeLabel, indicativePrice, endDate };
}

async function measure(candidate: Candidate): Promise<Measured | null> {
  const response = await getRaw(`${CLOB}/book?token_id=${candidate.tokenId}`);
  if (response.status !== 200) return null;
  const book = parseBook(JSON.parse(response.text) as unknown);

  // Upstream sends both sides worst-price-first, so the best ask is the LAST
  // element. This script only ranks books; the reversal itself is T3.2's job.
  const best = book.asks.at(-1);
  if (best === undefined || book.asks.length < 3 || book.bids.length < 1) return null;
  const bestAsk = Number(best.price);
  if (!Number.isFinite(bestAsk) || bestAsk <= 0) return null;

  const nearTouchUsd = book.asks
    .filter((level) => Number(level.price) <= bestAsk + NEAR_TOUCH_BAND)
    .reduce((total, level) => total + Number(level.price) * Number(level.size), 0);
  if (nearTouchUsd <= 0) return null;

  return {
    ...candidate,
    nearTouchUsd,
    askLevels: book.asks.length,
    bidLevels: book.bids.length,
    bestAsk,
  };
}

function describe(market: Measured): string {
  return (
    `market ${market.marketId} "${market.question}", outcome "${market.outcomeLabel}", ` +
    `best ask ${market.bestAsk}, $${Math.round(market.nearTouchUsd).toLocaleString()} resting ` +
    `within ${NEAR_TOUCH_BAND} of it across ${market.askLevels} ask levels and ` +
    `${market.bidLevels} bid levels`
  );
}

async function main(): Promise<void> {
  await mkdir(FIXTURE_DIR, { recursive: true });
  console.log(`Recording Polymarket fixtures into ${path.relative(process.cwd(), FIXTURE_DIR)}`);

  // 1. Search, and the market object for the first market it returns.
  const search = await getRaw(`${GAMMA}/public-search?q=election`);
  await record('gamma-public-search-election.json', search, 'Contracted search call, q=election.');

  const searchMarkets = collectMarkets(parsed(search));
  const firstId = asString(searchMarkets[0]?.id ?? null);
  if (firstId === null) throw new Error('public-search returned no market with an id');
  await record(
    'gamma-market-first-search-result.json',
    await getRaw(`${GAMMA}/markets/${firstId}`),
    `Market object for the first market in the search response (id ${firstId}).`,
  );

  // 2. Build the candidate pool for the two books. The election search alone is
  //    dominated by one negRisk group and contains nothing genuinely liquid, so
  //    two ordered market listings widen it. Neither listing is recorded as a
  //    fixture; they only choose which books to record.
  console.log('Measuring candidate books...');
  const pool = new Map<string, Candidate>();
  const listings = [
    `${GAMMA}/markets?closed=false&active=true&order=volume1wk&ascending=false&limit=40`,
    `${GAMMA}/markets?closed=false&active=true&order=liquidityClob&ascending=false&limit=40`,
  ];
  for (const source of [search, ...(await Promise.all(listings.map(getRaw)))]) {
    for (const market of collectMarkets(parsed(source))) {
      const candidate = toCandidate(market);
      if (candidate !== null) pool.set(candidate.tokenId, candidate);
    }
  }

  const measured: Measured[] = [];
  for (const candidate of pool.values()) {
    const result = await measure(candidate);
    if (result !== null) measured.push(result);
  }
  if (measured.length < 2) {
    throw new Error(`only ${measured.length} usable book(s) found; cannot pick liquid and thin`);
  }
  measured.sort((a, b) => b.nearTouchUsd - a.nearTouchUsd);

  const liquid = measured[0];
  const thin = measured[measured.length - 1];
  if (liquid === undefined || thin === undefined) throw new Error('unreachable: empty measurement');
  console.log(`  liquid: ${describe(liquid)}`);
  console.log(`  thin:   ${describe(thin)}`);

  // 3. The two books, the market object behind each, and the price history.
  await record(
    'clob-book-liquid.json',
    await getRaw(`${CLOB}/book?token_id=${liquid.tokenId}`),
    `Deepest book found. ${describe(liquid)}.`,
  );
  await record(
    'gamma-market-liquid.json',
    await getRaw(`${GAMMA}/markets/${liquid.marketId}`),
    'Market object paired with clob-book-liquid.json: fee fields, tick size, min order size.',
  );
  await record(
    'clob-book-thin.json',
    await getRaw(`${CLOB}/book?token_id=${thin.tokenId}`),
    `Thinnest usable book found; E2 walks past its depth. ${describe(thin)}.`,
  );
  await record(
    'gamma-market-thin.json',
    await getRaw(`${GAMMA}/markets/${thin.marketId}`),
    'Market object paired with clob-book-thin.json.',
  );
  await record(
    'clob-prices-history-liquid.json',
    await getRaw(`${CLOB}/prices-history?market=${liquid.tokenId}&interval=1w&fidelity=60`),
    `One week of hourly prices for the liquid token (market ${liquid.marketId}).`,
  );

  // 4. OQ-10: is a User-Agent actually required? Probe it rather than assume it.
  //    A single earlier 403 under no UA did not reproduce on a later multi-client
  //    sweep, so this probe records what happened *this run*, not a claim.
  const noUserAgent = await fetch(`${CLOB}/book?token_id=${liquid.tokenId}`, {
    headers: { Accept: 'application/json' },
  });

  // OQ-01: CORS headers only appear on a response when the request itself
  // carries an Origin header — the calls above never send one, so their
  // fixtures correctly show no Access-Control-* headers. Probe with one
  // explicitly rather than let that silence be misread as "CORS is closed".
  const withOrigin = await fetch(`${GAMMA}/public-search?q=election`, {
    headers: { 'User-Agent': USER_AGENT, Origin: 'https://example.com' },
  });

  await writeFile(
    path.join(FIXTURE_DIR, 'MANIFEST.json'),
    `${JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        recordedBy: 'pnpm record-fixtures',
        userAgent: USER_AGENT,
        authentication: 'none: no API key, no wallet, no auth header on any call',
        observations: {
          oq01CorsAllowOrigin: `A request carrying an Origin header got back access-control-allow-origin: ${withOrigin.headers.get('access-control-allow-origin') ?? '(absent)'}. The recorded fixtures below never send an Origin header, so their own accessControlAllowOrigin is expected to be null — that is not evidence CORS is closed.`,
          oq10UserAgentRequired: `A request carrying no User-Agent header returned ${noUserAgent.status} at the time of recording. See OQ-10: this has been observed as both 200 and 403 across different runs/clients and the cause is unresolved, so treat a single run's result here as a data point, not a contract.`,
        },
        fixtures: manifest,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log('  wrote MANIFEST.json');
  console.log(`Done. ${manifest.length} fixtures recorded.`);
}

await main();
