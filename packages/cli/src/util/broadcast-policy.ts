import { BroadcastPolicy, DEFAULT_BROADCAST_POLICY } from '@usecannon/builder';

// Maps the `--broadcast-retries <count>` flag onto the builder's broadcast policy. Only the retry
// count is user-facing; backoff timing stays at the builder default.
export function parseBroadcastPolicy(broadcastRetries: string | undefined): BroadcastPolicy {
  if (broadcastRetries === undefined) {
    return DEFAULT_BROADCAST_POLICY;
  }

  if (!/^\d+$/.test(broadcastRetries)) {
    throw new Error(`--broadcast-retries must be a non-negative integer, got "${broadcastRetries}"`);
  }

  return { ...DEFAULT_BROADCAST_POLICY, retries: Number(broadcastRetries) };
}
