import { SpawnOptions } from 'node:child_process';
import { after } from 'node:test';
import { Result, x } from 'tinyexec';

const procs: Result[] = [];

after(async function () {
  await Promise.all(
    procs.map((proc) => {
      if (proc.killed) return;
      return new Promise((resolve, reject) => {
        proc.process!.on('close', (code) => {
          if (code) return reject(code);
          resolve(code);
        });

        proc.kill();
      });
    })
  );
});

export function spawn(cmd: string, params?: string[], env?: SpawnOptions['env']) {
  const nodeOptions: SpawnOptions = {};

  if (env) nodeOptions.env = env;

  const proc = x(cmd, params, { nodeOptions });

  procs.push(proc);

  void (async () => {
    try {
      for await (const line of proc) {
        console.log('  ', line);
      }
    } catch (err) {
      console.error(err);
    }
  })();

  return proc;
}
