import { LocalRegistry } from './registry';
import { FallbackRegistry } from '@usecannon/builder';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('LocalRegistry tag caching', () => {
  let tempDir: string;
  let localRegistry: LocalRegistry;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cannon-test-'));
    localRegistry = new LocalRegistry(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.resetAllMocks();
  });

  it('should store package references in the tags folder', async () => {
    const packageRef = 'test-package:1.0.0@main';
    const chainId = 1;
    const url = 'ipfs://QmTest123';
    const metaUrl = 'ipfs://QmMeta456';

    await localRegistry.publish([packageRef], chainId, url, metaUrl, 'version');

    // Verify the tag file was created
    const tagPath = localRegistry.getTagReferenceStorage(packageRef, chainId);
    const storedUrl = await fs.readFile(tagPath, 'utf-8');
    expect(storedUrl.trim()).toBe(url);

    // Verify the meta file was created
    const metaPath = localRegistry.getMetaTagReferenceStorage(packageRef, chainId);
    const storedMetaUrl = await fs.readFile(metaPath, 'utf-8');
    expect(storedMetaUrl.trim()).toBe(metaUrl);

    // Verify getUrl returns the cached URL
    const result = await localRegistry.getUrl(packageRef, chainId);
    expect(result.url).toBe(url);
    expect(result.mutability).toBe('version');
  });

  it('should store mutable tag references', async () => {
    const packageRef = 'test-package:latest@main';
    const chainId = 1;
    const url = 'ipfs://QmTestLatest';
    const metaUrl = 'ipfs://QmMetaLatest';

    await localRegistry.publish([packageRef], chainId, url, metaUrl, 'tag');

    // Verify the tag file was created
    const tagPath = localRegistry.getTagReferenceStorage(packageRef, chainId);
    const storedUrl = await fs.readFile(tagPath, 'utf-8');
    expect(storedUrl.trim()).toBe(url);

    // Verify mutability is stored
    const result = await localRegistry.getUrl(packageRef, chainId);
    expect(result.mutability).toBe('tag');
  });

  it('should retrieve cached package reference', async () => {
    const packageRef = 'cached-package:2.0.0@main';
    const chainId = 13370;
    const url = 'ipfs://QmCached';

    // First, store the reference
    await localRegistry.publish([packageRef], chainId, url, '', 'version');

    // Then, retrieve it
    const result = await localRegistry.getUrl(packageRef, chainId);
    expect(result.url).toBe(url);
    expect(result.mutability).toBe('version');
  });

  it('should return null for non-existent package', async () => {
    const result = await localRegistry.getUrl('non-existent:0.0.0@main', 1);
    expect(result.url).toBeNull();
    expect(result.mutability).toBe('');
  });

  it('should cache all packages from registry (including mutable tags)', async () => {
    // This test verifies the new behavior where all packages are cached,
    // not just immutable ones (mutability === 'version')
    
    const immutablePackage = 'immutable-package:1.0.0@main';
    const mutablePackage = 'mutable-package:latest@main';
    const chainId = 1;
    
    // Store both immutable and mutable packages
    await localRegistry.publish([immutablePackage], chainId, 'ipfs://QmImmutable', '', 'version');
    await localRegistry.publish([mutablePackage], chainId, 'ipfs://QmMutable', '', 'tag');
    
    // Both should be retrievable
    const immutableResult = await localRegistry.getUrl(immutablePackage, chainId);
    expect(immutableResult.url).toBe('ipfs://QmImmutable');
    expect(immutableResult.mutability).toBe('version');
    
    const mutableResult = await localRegistry.getUrl(mutablePackage, chainId);
    expect(mutableResult.url).toBe('ipfs://QmMutable');
    expect(mutableResult.mutability).toBe('tag');
  });
});
