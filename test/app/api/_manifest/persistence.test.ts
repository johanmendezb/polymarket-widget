/**
 * Real filesystem, no network. Covers T8.1 acceptance criterion "re-running
 * the hash reproduces it" and T8.3 acceptance criterion 4: resolve appends
 * outcomes and provably never mutates a frozen forecast.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sha256Hex } from '@/app/api/_manifest/hash';
import { appendOutcomes, readTextOrEmpty, writeManifest } from '@/app/api/_manifest/persistence';
import { runResolve, type ResolutionSource } from '@/app/api/_manifest/resolve';
import { serializeJsonl } from '@/app/api/_manifest/serialize';
import type { ManifestEntry, OutcomeEntry } from '@/app/api/_manifest/types';
import { asFeeRate, asPrice, asProbability, asUsdc, type Market } from '@/domain';

const NOW = 1_700_000_000_000;

function fixtureManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    marketId: '1',
    question: 'Will X happen?',
    tokenId: '111',
    outcomeLabel: 'Yes',
    marketPriceAtFreeze: asPrice(0.5),
    forecast: {
      tokenId: '111',
      outcomeLabel: 'Yes',
      blindProbability: asProbability(0.6),
      dispersion: 0.02,
      samples: [asProbability(0.6)],
      anchoredProbability: null,
      blendedProbability: asProbability(0.55),
      blendWeight: 0.35,
      marketProbability: asProbability(0.5),
      confidence: 'high',
      evidence: [],
      risks: [],
      modelId: 'claude-opus-5',
      promptVersion: 'blind-v1',
      createdAt: new Date(NOW).toISOString(),
    },
    k: 5,
    gateVerdict: 'CONSIDER',
    gateReasons: [],
    frozenAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

function fixtureResolvedMarket(): Market {
  return {
    id: '1',
    slug: 'test-market',
    conditionId: 'cond1',
    question: 'Will X happen?',
    description: 'A test market.',
    resolutionSource: null,
    resolutionCriteria: 'Resolves YES if X happens.',
    outcomes: [
      { label: 'Yes', tokenId: '111', indicativePrice: asPrice(1) },
      { label: 'No', tokenId: '222', indicativePrice: asPrice(0) },
    ],
    negRisk: false,
    acceptingOrders: false,
    closed: true,
    active: false,
    endDate: new Date(NOW).toISOString(),
    tickSize: asPrice(0.01),
    minOrderSize: asUsdc(1),
    fees: {
      enabled: true,
      takerRate: asFeeRate(0.04),
      makerRate: asFeeRate(0),
      displayLabel: 'Politics · 4% taker rate',
      source: 'market-object',
      estimated: false,
    },
    liquidityUsd: null,
    volume24hUsd: null,
    bestBid: null,
    bestAsk: null,
    spread: null,
    lastTradePrice: null,
    eventId: null,
    eventTitle: null,
    category: 'Politics',
  };
}

let dir: string;
let manifestPath: string;
let hashPath: string;
let outcomesPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'manifest-test-'));
  manifestPath = join(dir, 'MANIFEST.jsonl');
  hashPath = join(dir, 'MANIFEST.sha256');
  outcomesPath = join(dir, 'OUTCOMES.jsonl');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('writeManifest', () => {
  it('writes JSONL and a matching sha256 hash file', async () => {
    const entries = [fixtureManifestEntry()];
    const result = await writeManifest(entries, manifestPath, hashPath);

    const writtenJsonl = await readFile(manifestPath, 'utf8');
    const writtenHash = (await readFile(hashPath, 'utf8')).trim();

    expect(writtenHash).toBe(sha256Hex(writtenJsonl));
    expect(result.sha256).toBe(writtenHash);
    expect(result.entryCount).toBe(1);
  });

  it('re-running with the same entries reproduces the same hash', async () => {
    const entries = [fixtureManifestEntry()];
    const first = await writeManifest(entries, manifestPath, hashPath);
    const second = await writeManifest(entries, manifestPath, hashPath);

    expect(second.sha256).toBe(first.sha256);
  });

  it('writes an empty manifest honestly as an empty file', async () => {
    const result = await writeManifest([], manifestPath, hashPath);
    const writtenJsonl = await readFile(manifestPath, 'utf8');

    expect(writtenJsonl).toBe('');
    expect(result.entryCount).toBe(0);
    expect(result.sha256).toBe(sha256Hex(''));
  });
});

describe('readTextOrEmpty', () => {
  it('returns the empty string for a file that does not exist yet', async () => {
    expect(await readTextOrEmpty(outcomesPath)).toBe('');
  });

  it('returns the real contents for a file that exists', async () => {
    await writeManifest([fixtureManifestEntry()], manifestPath, hashPath);
    expect(await readTextOrEmpty(manifestPath)).not.toBe('');
  });
});

describe('resolve against real files: never mutates a frozen forecast', () => {
  it('leaves MANIFEST.jsonl and its hash byte-for-byte unchanged after appending an outcome', async () => {
    const entries = [fixtureManifestEntry()];
    await writeManifest(entries, manifestPath, hashPath);

    const manifestBytesBefore = await readFile(manifestPath, 'utf8');
    const hashBytesBefore = await readFile(hashPath, 'utf8');

    const resolutionSource: ResolutionSource = {
      fetchMarketStatus: () => Promise.resolve(fixtureResolvedMarket()),
    };

    const result = await runResolve({
      manifestText: manifestBytesBefore,
      hashFileText: hashBytesBefore,
      existingOutcomesText: await readTextOrEmpty(outcomesPath),
      resolutionSource,
      now: NOW,
    });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') throw new Error('unreachable');
    await appendOutcomes(result.newOutcomesJsonl, outcomesPath);

    const manifestBytesAfter = await readFile(manifestPath, 'utf8');
    const hashBytesAfter = await readFile(hashPath, 'utf8');

    expect(manifestBytesAfter).toBe(manifestBytesBefore);
    expect(hashBytesAfter).toBe(hashBytesBefore);
    expect(sha256Hex(manifestBytesAfter)).toBe(hashBytesAfter.trim());

    const outcomesText = await readFile(outcomesPath, 'utf8');
    const outcomes = JSON.parse(`[${outcomesText.trim()}]`) as OutcomeEntry[];
    expect(outcomes).toEqual([{ marketId: '1', tokenId: '111', outcome: 'YES', resolvedAt: new Date(NOW).toISOString() }]);
  });

  it('does not write OUTCOMES.jsonl at all when the manifest hash does not match', async () => {
    const entries = [fixtureManifestEntry()];
    await writeManifest(entries, manifestPath, hashPath);
    const manifestText = await readFile(manifestPath, 'utf8');

    const result = await runResolve({
      manifestText,
      hashFileText: 'deadbeef',
      existingOutcomesText: '',
      resolutionSource: { fetchMarketStatus: () => Promise.resolve(fixtureResolvedMarket()) },
      now: NOW,
    });

    expect(result.kind).toBe('hash_mismatch');
    expect(await readTextOrEmpty(outcomesPath)).toBe('');
  });

  it('appendOutcomes is a no-op, writing nothing, when there are no new outcomes', async () => {
    await appendOutcomes(serializeJsonl<OutcomeEntry>([]), outcomesPath);
    expect(await readTextOrEmpty(outcomesPath)).toBe('');
  });
});
