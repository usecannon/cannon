import { z } from 'zod';

const urlSchema = z.string().url();

export function isValidUrl(url: string): boolean {
  try {
    urlSchema.parse(url);
    return true;
  } catch (error) {
    return false;
  }
}
