import { IPFSLoader } from './loader';
import { InMemoryRegistry } from './registry';
import { copyPackage } from './package';
import { DeploymentInfo } from './types';
import { CannonStorage } from '.';

jest.mock('./loader');

describe('package.ts', () => {
  describe('copyPackage()', () => {
    const fromRegistry = new InMemoryRegistry();
    const fromLoader = new IPFSLoader('hello');
    const fromStorage = new CannonStorage(fromRegistry, { https: fromLoader }, 'https');
    let toRegistry: InMemoryRegistry;
    let toLoader: IPFSLoader;
    let toStorage: CannonStorage;

    const testPkg = 'package:1.2.3';
    const testPkgData: DeploymentInfo = {
      def: { name: 'package', version: '1.2.3', provision: { dummyStep: { tags: ['tag3', 'tag4'] } } } as any,
      state: {
        'provision.dummyStep': {
          hash: '',
          version: 1,
          artifacts: {
            imports: { nested: { url: 'https://usecannon.com/nested', preset: 'with-package', tags: ['tag3', 'tag4'] } }
          }
        }
      },
      status: 'complete',
      miscUrl: 'https://usecannon.com/misc',
      meta: {},
      options: {}
    };
    const nestedPkg = 'nested:2.34.5';
    const nestedPkgData: DeploymentInfo = {
      def: { name: 'nested', version: '2.34.5' },
      state: {},
      status: 'complete',
      miscUrl: 'https://usecannon.com/misc',
      meta: {},
      options: {}
    };

    beforeAll(async () => {
      toRegistry = new InMemoryRegistry();
      toLoader = new IPFSLoader('world');
      toStorage = new CannonStorage(toRegistry, { https: toLoader }, 'https');

      await fromRegistry.publish([testPkg], '1-main', 'https://usecannon.com', 'https://usecannon.com/meta');
      await fromRegistry.publish([nestedPkg], '1-main', 'https://usecannon.com/nested', '');

      jest.mocked(fromLoader.read).mockImplementation(async url => {
        switch (url) {
          case 'https://usecannon.com/misc':
            return { misc: 'info' };
          case 'https://usecannon.com/meta':
            return { itsMeta: 'data' };
          case 'https://usecannon.com':
            return testPkgData;
          case 'https://usecannon.com/nested':
            return nestedPkgData;
        }
      });

      jest.mocked(await toLoader.put).mockImplementation(async data => {
        if (data) {
          if (data === testPkgData) {
            return 'https://usecannon.com';
          } else if (data.itsMeta) {
            return 'https://usecannon.com/meta';
          } else if (data.misc) {
            return 'https://usecannon.com/misc';
          } else {
            return 'https://usecannon.com/nested';
          }
        }

        return null;
      });

      await fromRegistry.publish([testPkg], '1-main', 'https://usecannon.com', 'https://usecannon.com/meta');
      await fromRegistry.publish([nestedPkg], '1-main', 'https://usecannon.com/nested', '');
    });

    it('fails when deployment info is not found', async () => {
      await expect(() =>
        copyPackage({
          packageRef: 'fakePkg:1.2.3',
          variant: '1-main',
          tags: [],
          fromStorage,
          toStorage
        })
      ).rejects.toThrowError('could not find');
    });

    it('works fine for regular, full, package', async () => {
      await copyPackage({
        packageRef: testPkg,
        variant: '1-main',
        tags: [],
        fromStorage,
        toStorage
      });

      //expect(toLoader.putDeploy).toBeCalledTimes(1);
      expect(toLoader.put).toBeCalledWith(testPkgData);
      expect(toLoader.put).toBeCalledWith({ misc: 'info' });
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
        fromStorage,
        toStorage,
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
          fromStorage,
          toStorage,
          recursive: true
        });

        // the recursed package data should be pushed, and all the declared tags should have been honored
        console.log(toRegistry.pkgs);
        expect(await toRegistry.getUrl(nestedPkg, '1-with-package')).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag3', '1-with-package')).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag4', '1-with-package')).toStrictEqual('https://usecannon.com/nested');
      });
    });
  });
});
