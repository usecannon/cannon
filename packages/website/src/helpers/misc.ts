import pako from 'pako';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function decompressData(data?: ArrayBuffer) {
  if (data) {
    return pako.inflate(data, { to: 'string' });
  }
  return undefined;
}

export function arrayBufferToUtf8(buffer: ArrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

export const Encodings = {
  utf8: 'UTF-8',
  base64: 'Base64',
  hex: 'Hexadecimal',
} as const;
export type EncodingsKeys = keyof typeof Encodings;
export const decodeData = (data: ArrayBuffer, encoding: keyof typeof Encodings) => {
  try {
    if (encoding === 'base64') {
      return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(data))));
    } else if (encoding === 'hex') {
      return Array.from(new Uint8Array(data))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } else if (encoding === 'utf8') {
      return new TextDecoder('utf-8').decode(new Uint8Array(data));
    }
    return data;
  } catch (err) {
    return data;
  }
};
