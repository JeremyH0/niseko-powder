import { describe, expect, it } from 'vitest';
import { ProviderError, runProvider, type Provider, type ProviderContext } from './types.ts';

const ctx: ProviderContext = {
  fetch: () => Promise.reject(new Error('no network in tests')),
  now: new Date('2026-10-22T06:00:00Z'),
  userAgent: 'test',
};

describe('runProvider', () => {
  it('fetches then normalizes', async () => {
    const provider: Provider<{ n: number }, number[], number> = {
      id: 'fake',
      fetchRaw: async ({ n }) => [n, n * 2],
      normalize: (raw) => raw.reduce((a, b) => a + b, 0),
    };
    await expect(runProvider(provider, { n: 2 }, ctx)).resolves.toBe(6);
  });

  it('propagates provider errors with the provider id', async () => {
    const provider: Provider<void, never, never> = {
      id: 'down',
      fetchRaw: async () => {
        throw new ProviderError('down', 'HTTP 503');
      },
      normalize: () => {
        throw new Error('unreachable');
      },
    };
    await expect(runProvider(provider, undefined, ctx)).rejects.toThrow('[down] HTTP 503');
  });
});
