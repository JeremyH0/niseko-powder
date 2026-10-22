import { describe, expect, it } from 'vitest';
import { createTranslator, defineMessages } from './index.ts';

const messages = defineMessages({
  en: { hello: 'Hello {name}', plain: 'Plain', both: '{a} and {b}' },
});

describe('createTranslator', () => {
  const t = createTranslator(messages);

  it('returns the English string', () => {
    expect(t('plain')).toBe('Plain');
  });

  it('interpolates params', () => {
    expect(t('hello', { name: 'Hirafu' })).toBe('Hello Hirafu');
    expect(t('both', { a: 1, b: 2 })).toBe('1 and 2');
  });

  it('falls back to the key for unknown messages instead of crashing', () => {
    const loose = createTranslator(messages as unknown as Parameters<typeof createTranslator<string>>[0]);
    expect(loose('reason.gone', { cm: 1 })).toBe('reason.gone');
  });

  it('leaves unknown placeholders visible instead of printing "undefined"', () => {
    expect(t('both', { a: 1 })).toBe('1 and {b}');
  });
});
