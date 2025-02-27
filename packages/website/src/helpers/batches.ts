export function* batches(start: number, end: number, batchSize: number) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(batchSize)) {
    throw new Error('Invalid input: all parameters must be finite numbers');
  }

  if (batchSize <= 0) {
    throw new Error('Batch size must be positive');
  }

  if (start === end) {
    yield [start, end];
    return;
  }

  const isAscending = start < end;
  const count = Math.ceil(Math.abs(end - start) / batchSize);

  for (let i = 0; i < count; i++) {
    const batchStart = start + (isAscending ? i * batchSize : -i * batchSize);
    const batchEndRaw = isAscending ? batchStart + batchSize : batchStart - batchSize;
    const batchEnd = isAscending ? Math.min(end, batchEndRaw) : Math.max(end, batchEndRaw);
    yield [batchStart, batchEnd];
  }
}
