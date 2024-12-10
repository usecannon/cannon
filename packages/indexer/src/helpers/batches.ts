export function* batches(start: number, end: number, batchSize: number) {
  const count = Math.ceil((end - start) / batchSize);
  for (let i = 0; i < count; i++) {
    const batchStart = start + batchSize * i;
    const batchEnd = batchStart + batchSize - 1 > end ? end : batchStart + batchSize - 1;
    yield [batchStart, batchEnd];
  }
}
