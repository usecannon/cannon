import { inspect } from './inspect';
import { createDefaultReadRegistry } from '../registry';
import { IPFSLoader } from '@usecannon/builder';

import { getMainLoader, LocalLoader } from '../loader';

jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');

describe('inspect', () => {
  const packageName = 'package:1.2.3';
  const chainId = 123;
  const preset = 'your-preset';

  let testPkgData: any;
  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: IPFSLoader;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    testPkgData = {
      def: { name: 'package', version: '1.2.3' },
      state: {},
      status: 'complete',
      miscUrl: 'file:/usecannon.com/misc',
      meta: {},
      options: {},
    };

    mockedFallBackRegistry = {
      getDeployUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getUrl: jest.fn().mockResolvedValue('file:/usecannon.com/url'),
      getMetaUrl: jest.fn().mockResolvedValue('file:/usecannon.com/meta'),
    };

    localLoader = new LocalLoader('path');
    ipfsLoader = new IPFSLoader('ipfs');

    // jest.mock('../loader', () => ({
    //   getMainLoader: jest.fn().mockReturnValue({
    //     file: localLoader,
    //     ipfs: ipfsLoader,
    //   }),
    // }));

    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });

    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));

    jest.mock('../settings', () => ({
      resolveCliSettings: jest.fn().mockReturnValue({}),
    }));
    jest.spyOn(localLoader, 'read').mockResolvedValue(testPkgData);
    jest.spyOn(ipfsLoader, 'read').mockResolvedValue(testPkgData);
  });

  test('should inspect package deployment', async () => {
    // Call the 'inspect' function with the necessary arguments
    const result = await inspect(packageName, chainId, preset, false, '');

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getUrl).toHaveBeenCalledWith(`${packageName}`, `${chainId}-${preset}`);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(`${packageName}`, `${chainId}-${preset}`);
    expect(localLoader.read).toHaveBeenCalledWith('file:/usecannon.com/url');
    // expect(ipfsLoader.read).toHaveBeenCalledWith('file:/usecannon.com/url');
  });
  test('should write deployment files', async () => {
    // Set up test data and variables
    const writeDeployments = 'contracts';

    // Call the 'inspect' function with the necessary arguments
    const result = await inspect(packageName, chainId, preset, false, writeDeployments);

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getUrl).toHaveBeenCalledWith(`${packageName}`, `${chainId}-${preset}`);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(`${packageName}`, `${chainId}-${preset}`);
    // expect(mockedLoader.file.read).toHaveBeenCalledWith('file:/usecannon.com/url');
    // expect(mockedLoader.file.read).toHaveBeenCalledWith('file:/usecannon.com/misc');
    // Add more expectations based on your requirements
  });
});
