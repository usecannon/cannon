export function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot get random item from empty array');
  }

  return arr[Math.floor(Math.random() * arr.length)];
}
