import readline from 'node:readline';

interface KeyboardEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

interface Controls {
  pause: (fn: () => Promise<unknown>) => unknown;
  stop: () => unknown;
}

export default function onKeypress(handleKeyPress: (evt: KeyboardEvent, controls: Controls) => void) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      escapeCodeTimeout: 50,
    });

    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const listener = (_: string, key: KeyboardEvent) => {
      handleKeyPress(key, { pause, stop });
    };

    const pause = async (fn: Parameters<Controls['pause']>[0]) => {
      process.stdin.off('keypress', listener);
      process.stdin.setRawMode(false);
      await fn();
      process.stdin.on('keypress', listener);
      process.stdin.setRawMode(true);
      process.stdin.resume();
    };

    const stop = () => {
      process.stdin.off('keypress', listener);
      process.stdin.setRawMode(false);
      rl.close();
      resolve(null);
    };

    process.stdin.on('keypress', listener);
  });
}
