import { CannonStorage } from './';
import { IPFSLoader } from './loader';
import { publishPackage } from './package';
import { PackageReference } from './package-reference';
import { InMemoryRegistry } from './registry';
import { DeploymentInfo } from './types';

jest.mock('./loader');

describe('package.ts', () => {
  describe('PackageReference', () => {
    test.each([
      ['package:2.2.2@main', ['package', '2.2.2', 'main', 'package:2.2.2@main']],
      ['package', ['package', 'latest', undefined, 'package:latest@main']],
      ['package001', ['package001', undefined, undefined, 'package001:latest@main']],
      ['001package', ['001package', undefined, undefined, '001package:latest@main']],
      ['package-hyphen', ['package-hyphen', 'latest', undefined, 'package-hyphen:latest@main']],
      [
        'super-long-package-valid-nameee',
        ['super-long-package-valid-nameee', 'latest', undefined, 'super-long-package-valid-nameee:latest@main'],
      ],
      [
        'ipfs://Qmao1ynMwcpn6rtUWxP4XyNCN5BMQKCbHeEMv9MyAZ2nd8',
        [
          'ipfs',
          '//Qmao1ynMwcpn6rtUWxP4XyNCN5BMQKCbHeEMv9MyAZ2nd8',
          undefined,
          'ipfs://Qmao1ynMwcpn6rtUWxP4XyNCN5BMQKCbHeEMv9MyAZ2nd8@main',
        ],
      ],
    ])('correctly parses "%s"', (packageRef, [name, version, preset, fullPackageRef]) => {
      const ref = new PackageReference(packageRef);

      expect(ref).toHaveProperty('name', name);
      expect(ref).toHaveProperty('version', version || 'latest');
      expect(ref).toHaveProperty('preset', preset || 'main');
      expect(ref).toHaveProperty('fullPackageRef', fullPackageRef);
    });

    test.each([['a'], ['aa'], ['-aa'], ['some_package'], ['super-long-package-invalid-nameee']])(
      'throws an error with "%s"',
      (packageRef) => {
        expect(() => {
          new PackageReference(packageRef);
        }).toThrow();
      },
    );
  });

  describe('publishPackage()', () => {
    const fromRegistry = new InMemoryRegistry();
    const fromLoader = new IPFSLoader('hello');
    const fromStorage = new CannonStorage(fromRegistry, { https: fromLoader }, 'https');
    let toRegistry: InMemoryRegistry;
    let toLoader: IPFSLoader;
    let toStorage: CannonStorage;

    const testPkg = 'package:1.2.3@main';
    const testPkgData: DeploymentInfo = {
      generator: 'cannon test',
      timestamp: 1234,
      def: {
        name: 'package',
        version: '1.2.3',
        provision: { dummyStep: { source: 'some-source:1.2.3', tags: ['tag3', 'tag4'] } },
      } as any,
      state: {
        'provision.dummyStep': {
          hash: '',
          version: 1,
          artifacts: {
            imports: { nested: { url: 'https://usecannon.com/nested', preset: 'with-package', tags: ['tag3', 'tag4'] } },
          },
        },
      },
      status: 'complete',
      miscUrl: 'https://usecannon.com/misc',
      meta: {},
      options: {},
      chainId: 1,
    };
    const nestedPkg = 'nested:2.34.5@main';
    const nestedPkgData: DeploymentInfo = {
      generator: 'cannon test',
      timestamp: 1234,
      def: { name: 'nested', version: '2.34.5' },
      state: {},
      status: 'complete',
      miscUrl: 'https://usecannon.com/misc',
      meta: {},
      options: {},
      chainId: 1,
    };

    beforeEach(async () => {
      toRegistry = new InMemoryRegistry();
      toLoader = new IPFSLoader('world');
      toStorage = new CannonStorage(toRegistry, { https: toLoader }, 'https');

      await fromRegistry.publish([testPkg], 1, 'https://usecannon.com', 'https://usecannon.com/meta');
      await fromRegistry.publish([nestedPkg], 1, 'https://usecannon.com/nested', '');

      jest.mocked(fromLoader.read).mockImplementation(async (url) => {
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

      jest.mocked(await toLoader.put).mockImplementation(async (data) => {
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
        } else {
          return '';
        }
      });

      await fromRegistry.publish([testPkg], 1, 'https://usecannon.com', 'https://usecannon.com/meta');
      await fromRegistry.publish([nestedPkg], 1, 'https://usecannon.com/nested', '');
    });

    it('fails when deployment info is not found', async () => {
      await expect(() =>
        publishPackage({
          packageRef: 'fake-pkg:1.2.3@main',
          chainId: 1,
          tags: [],
          fromStorage,
          toStorage,
        }),
      ).rejects.toThrowError('could not find');
    });

    it('works fine for regular, full, package', async () => {
      await publishPackage({
        packageRef: testPkg,
        chainId: 1,
        tags: [],
        fromStorage,
        toStorage,
      });

      //expect(toLoader.putDeploy).toBeCalledTimes(1);
      expect(toLoader.put).toBeCalledWith(testPkgData);
      expect(toLoader.put).toBeCalledWith({ misc: 'info' });
      expect(await toRegistry.getUrl(testPkg, 1)).toStrictEqual('https://usecannon.com');
      // TODO: temp meta url is disabled due to cannon registry support
      //expect(await toRegistry.getMetaUrl(testPkg, 1)).toStrictEqual('https://usecannon.com/meta');

      // didnt recurse
      expect(await toRegistry.getUrl(nestedPkg, 1)).toBeFalsy();
    });

    it('recurses with correct tags and name', async () => {
      await publishPackage({
        packageRef: nestedPkg,
        chainId: 1,
        tags: ['tag1', 'tag2'],
        fromStorage,
        preset: 'main',
        toStorage,
        includeProvisioned: true,
      });

      // the recursed package data should be pushed, and all the declared tags should have been honored
      expect(await toRegistry.getUrl(nestedPkg, 1)).toStrictEqual('https://usecannon.com/nested');
      expect(await toRegistry.getUrl('nested:tag1@main', 1)).toStrictEqual('https://usecannon.com/nested');
      expect(await toRegistry.getUrl('nested:tag2@main', 1)).toStrictEqual('https://usecannon.com/nested');
    });

    describe('recursive = true', () => {
      it('recurses with correct tags and name', async () => {
        await publishPackage({
          packageRef: nestedPkg,
          chainId: 1,
          tags: ['tag3', 'tag4'],
          preset: 'main',
          fromStorage,
          toStorage,
          includeProvisioned: true,
        });

        // the recursed package data should be pushed, and all the declared tags should have been honored
        expect(await toRegistry.getUrl(nestedPkg, 1)).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag3@main', 1)).toStrictEqual('https://usecannon.com/nested');
        expect(await toRegistry.getUrl('nested:tag4@main', 1)).toStrictEqual('https://usecannon.com/nested');
      });
    });
  });
});
