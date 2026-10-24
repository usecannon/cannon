import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // bootstrapping s3rver + redis-memory-server + ipfs + repo mocks can exceed the 10s default on slower hardware
    hookTimeout: 60000,
  },
});
