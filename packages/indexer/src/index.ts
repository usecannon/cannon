export * from './db';

import(`./${process.argv[2]}`)
  .then((m) => void m.loop())
  .catch((e) => {
    throw e;
  });
