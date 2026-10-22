/**
 * Every external data source is a provider: fetch → normalize → typed result.
 * `normalize` is pure and unit-tested against saved responses in tests/fixtures/.
 * Adding a source = a new file in this folder; existing providers stay untouched.
 */

export interface ProviderContext {
  /** Injected so tests can replay fixtures instead of hitting the network. */
  fetch: typeof fetch;
  /** "Now" for the whole run, so time-window logic is deterministic in tests. */
  now: Date;
  userAgent: string;
}

export interface Provider<TQuery, TRaw, TResult> {
  readonly id: string;
  /** Network I/O only. Throw `ProviderError` on HTTP / network failure. */
  fetchRaw(query: TQuery, ctx: ProviderContext): Promise<TRaw>;
  /** Pure: raw source shape → our normalized shape. */
  normalize(raw: TRaw, query: TQuery, ctx: ProviderContext): TResult;
}

export class ProviderError extends Error {
  readonly providerId: string;

  constructor(providerId: string, message: string, options?: ErrorOptions) {
    super(`[${providerId}] ${message}`, options);
    this.name = 'ProviderError';
    this.providerId = providerId;
  }
}

export async function runProvider<TQuery, TRaw, TResult>(
  provider: Provider<TQuery, TRaw, TResult>,
  query: TQuery,
  ctx: ProviderContext,
): Promise<TResult> {
  const raw = await provider.fetchRaw(query, ctx);
  return provider.normalize(raw, query, ctx);
}
