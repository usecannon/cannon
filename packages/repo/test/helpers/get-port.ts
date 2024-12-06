import { getPort as _getPort } from 'get-port-please';

let initialRange = 3000;

// Make sure that the getPort function does not return the same port when called in a row
export async function getPort(): Promise<number> {
  const port = await _getPort({
    portRange: [++initialRange, 99999],
  });
  if (port > initialRange) initialRange = port + 1;
  return port;
}
