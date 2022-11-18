import path from 'node:path';
import { createRequire } from 'node:module';

interface ErrorWithCode extends Error {
  code: string;
}

/**
 * Try to import a file relative to the given baseDir, if not present, try to
 * get the relative NPM Module.
 */
export async function importFrom(baseDir: string, fileOrModule: string) {
  try {
    return await import(path.resolve(baseDir, fileOrModule));
  } catch (e) {
    const err = e as ErrorWithCode;
    if (err.code === 'MODULE_NOT_FOUND') {
      const localRequire = createRequire(baseDir);
      return await import(localRequire.resolve(fileOrModule));
    }
    throw err;
  }
}
