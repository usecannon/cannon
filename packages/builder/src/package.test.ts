import { ethers } from 'ethers';

import { IPFSLoader } from './loader';
import { InMemoryRegistry } from './registry';
import { copyPackage } from './package';
import { DeploymentInfo } from './types';

jest.mock('./loader');

describe('package.ts', () => {
  describe('copyPackage()', () => {
    const fromRegistry = new InMemoryRegistry();
    const fromLoader = new IPFSLoader('hello', fromRegistry);
    let toRegistry: InMemoryRegistry;
    let toLoader: IPFSLoader;

    const testPkg = 'package:1.2.3';
    const testPkgData: DeploymentInfo = {
      def: { name: 'package', version: '1.2.3', provision: { dummyStep: { tags: ['tag3', 'tag4'] } } } as any, 
      state: { 'provision.dummyStep': { hash: '', version: 1, artifacts: { imports: { 'nested': { url: 'https://usecannon.com/nested', tags: ['tag3', 'tag4'] } }} }}, 
      status: 'complete', 
      miscUrl: 'https://usecannon.com/misc', 
      meta: {}, 
      options: {} 
    };
    const nestedPkg = 'nested:2.34.5';
    const nestedPkgData: DeploymentInfo = { def: { name: 'nested', version: '2.34.5' }, state: {}, status: 'complete', miscUrl: 'https://usecannon.com/misc', meta: {}, options: {} };

    beforeAll(async () => {
      toRegistry = new InMemoryRegistry();
      toLoader = new IPFSLoader('world', toRegistry);

      await fromRegistry.publish([testPkg], '1-main', 'https://usecannon.com', 'https://usecannon.com/meta');

      fromLoader.resolver = fromRegistry;
      toLoader.resolver = toRegistry;

      jest.mocked(fromLoader.readDeploy).mockImplementation(async (pkgRef) => {
        switch(pkgRef) {
          case testPkg:
            return testPkgData;
          case nestedPkg:
            return nestedPkgData;
        }

        return null;
      });

      jest.mocked(fromLoader.readMisc).mockImplementation(async (url) => {
        switch(url) {
          case 'https://usecannon.com/misc':
            return { misc: 'info' };
          case 'https://usecannon.com/meta':
            return { meta: 'data' };
          case 'https://usecannon.com/nested':
            return nestedPkgData;
        }
      });

      jest.mocked(await toLoader.putMisc).mockImplementation(async (data) => {
        if (data) {
          if (data.meta) {
            return 'https://usecannon.com/meta';
          }
          else if (data.misc) {
            return 'https://usecannon.com/misc';
          }
        }

        return null;
      });

      jest.mocked(await toLoader.putDeploy).mockImplementation(async (data) => {
        if (data === testPkgData) {
          return 'https://usecannon.com'
        } else {
          return 'https://usecannon.com/nested'
        }
      });

      await fromLoader.resolver.publish([testPkg], '1-main', 'https://usecannon.com', 'https://usecannon.com/meta');
      await fromLoader.resolver.publish([nestedPkg], '1-main', 'https://usecannon.com/nested');
    });

    it('fails when deployment info is not found', async () => {
      await expect(() => copyPackage({
        packageRef: 'fakePkg:1.2.3',
        variant: '1-main',
        tags: [],
        fromLoader,
        toLoader,
      })).rejects.toThrowError('could not find');
    });

    it('works fine for regular, full, package', async () => {
      await copyPackage({
        packageRef: testPkg,
        variant: '1-main',
        tags: [],
        fromLoader,
        toLoader,
      });

      expect(toLoader.putDeploy).toBeCalledTimes(1);
      expect(toLoader.putDeploy).toBeCalledWith(testPkgData);
      expect(toLoader.putMisc).toBeCalledWith({ misc: 'info' });
      expect(await toRegistry.getUrl(testPkg, '1-main')).toStrictEqual('https://usecannon.com');
      expect(await toRegistry.getMetaUrl(testPkg, '1-main')).toStrictEqual('https://usecannon.com/meta');

      // didnt recurse
      expect(await toRegistry.getUrl(nestedPkg, '1-main')).toBeFalsy();
    });

    it('recurses with correct tags and name', async () => {
      await copyPackage({
        packageRef: nestedPkg,
        variant: '1-main',
        tags: ['tag1', 'tag2'],
        fromLoader,
        toLoader,
        recursive: true
      });

      // the recursed package data should be pushed, and all the declared tags should have been honored
      expect(await toRegistry.getUrl(nestedPkg, '1-main')).toStrictEqual('https://usecannon.com/nested');
      expect(await toRegistry.getUrl('nested:tag1', '1-main')).toStrictEqual('https://usecannon.com/nested');
      expect(await toRegistry.getUrl('nested:tag2', '1-main')).toStrictEqual('https://usecannon.com/nested');
    });

    describe('recursive = true', () => {
      it('recurses with correct tags and name', async () => {
        await copyPackage({
          packageRef: testPkg,
          variant: '1-main',
          tags: [],
          fromLoader,
          toLoader,
          recursive: true
        });
  
        // the recursed package data should be pushed, and all the declared tags should have been honored
        expect(await toRegistry.getUrl(nestedPkg, '1-with-package')).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag3', '1-with-package')).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag4', '1-with-package')).toStrictEqual('https://usecannon.com/nested');
      });
    });
  });
});
