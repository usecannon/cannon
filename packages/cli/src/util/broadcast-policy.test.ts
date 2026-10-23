import { DEFAULT_BROADCAST_POLICY } from '@usecannon/builder';
import { parseBroadcastPolicy } from './broadcast-policy';

describe('parseBroadcastPolicy()', () => {
  it('returns the default policy when the flag is not given', () => {
    expect(parseBroadcastPolicy(undefined)).toEqual(DEFAULT_BROADCAST_POLICY);
  });

  it('overrides only the retry count', () => {
    expect(parseBroadcastPolicy('0')).toEqual({ ...DEFAULT_BROADCAST_POLICY, retries: 0 });
    expect(parseBroadcastPolicy('7')).toEqual({ ...DEFAULT_BROADCAST_POLICY, retries: 7 });
  });

  it('rejects values that are not a non-negative integer', () => {
    expect(() => parseBroadcastPolicy('-1')).toThrow('--broadcast-retries');
    expect(() => parseBroadcastPolicy('1.5')).toThrow('--broadcast-retries');
    expect(() => parseBroadcastPolicy('abc')).toThrow('--broadcast-retries');
    expect(() => parseBroadcastPolicy('')).toThrow('--broadcast-retries');
  });
});
