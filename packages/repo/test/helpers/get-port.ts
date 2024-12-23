import { getPort as _getPort } from 'get-port-please';

const WORKER_ID = parseInt(process.env.VITEST_WORKER_ID || '0');
let initialRange = 3000 + WORKER_ID * 100; // Each worker gets its own range

export function setInitialRange(range: number) {
  initialRange = range;
}

// Make sure that the getPort function does not return the same port when called in a row
export async function getPort(): Promise<number> {
  const port = await _getPort({
    portRange: [++initialRange, initialRange + 100],
  });

  if (port > initialRange) initialRange = port + 1;

  return port;
}
