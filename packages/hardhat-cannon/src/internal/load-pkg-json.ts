export function loadPackageJson(filepath: string): { name: string; version: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(filepath);
  } catch (err) {
    return { name: '', version: '' };
  }
}
