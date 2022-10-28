import { URL } from 'node:url';

export function isURL(uri: string) {
  try {
    new URL(uri);
    return true;
  } catch (err) {
    return false;
  }
}
