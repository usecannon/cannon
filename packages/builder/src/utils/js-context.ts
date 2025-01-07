export const jsContext = {
  // Fundamental objects
  String: (value: string) => String(value),
  Number: (value: string) => Number(value),
  BigInt: (value: string) => BigInt(value),
  Array: {
    from: Array.from.bind(Array),
    isArray: Array.isArray.bind(Array),
  },
  Date: {
    now: Date.now.bind(Date),
  },

  // Functions
  JSON: {
    stringify(value: any) {
      return JSON.stringify(value, (_: any, v: any) => (typeof v === 'bigint' ? v.toString() : v));
    },
    parse(value: string) {
      return JSON.parse(value);
    },
  },
  console: {
    // eslint-disable-next-line no-console
    log: console.log.bind(console),
    // eslint-disable-next-line no-console
    error: console.error.bind(console),
    // eslint-disable-next-line no-console
    warn: console.warn.bind(console),
    // eslint-disable-next-line no-console
    info: console.info.bind(console),
    // eslint-disable-next-line no-console
    debug: console.debug.bind(console),
  },
  parseFloat: (n: string) => parseFloat(n),
  parseInt: (n: string) => parseInt(n),
  isNaN: (n: any) => isNaN(n),
  isFinite: (n: any) => isFinite(n),
};
