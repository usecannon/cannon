export function loadPackageJson(filepath: string): { name: string; version: string } {
  try {
    return require(filepath);
  } catch (_) {
    return { name: '', version: '' };
  }
}
