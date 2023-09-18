import { inspect } from './inspect';
import { createDefaultReadRegistry } from '../registry';
import { IPFSLoader } from '@usecannon/builder';
import fs from 'fs-extra';
import { getMainLoader, LocalLoader } from '../loader';

jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');

describe('inspect', () => {
  const chainId = 123;
  const preset = 'your-preset';
  const basePkgName = 'package:1.2.3';
  const packageName = `${basePkgName}@${preset}`;

  let testPkgData: any;
  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: IPFSLoader;
  let stdoutOutput: string[] = [];
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    testPkgData = {
      def: { name: 'package', version: '1.2.3' },
      state: [
        {
          artifacts: {
            contracts: {
              'package:1.2.3': {
                abi: [
                  {
                    constant: true,
                    inputs: [],
                    name: 'name',
                    outputs: [
                      {
                        name: '',
                        type: 'string',
                      },
                    ],
                    payable: false,
                    type: 'function',
                  },
                ],
                contractAddress: '0x123abc...',
                source: `pragma solidity ^0.5.0;

                contract MyContract {
                  string public name;
                
                  constructor() public {
                    name = "MyContract";
                  }
                }`,
                bytecode: '0x6060604052341561000f57600080fd5b60d38061001d6000396000f3fe6080...',
              },
            },
          },
        },
      ],
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

    stdoutOutput = [];
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation((output) => {
      stdoutOutput.push(output as string);
      return true;
    });
    jest.spyOn(fs, 'outputFile').mockImplementation(() => Promise.resolve());
  });
  afterEach(() => {
    writeSpy.mockRestore();
  });

  test('should inspect package deployment', async () => {
    const result = await inspect(packageName, chainId, preset, false, '');

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getUrl).toHaveBeenCalledWith(`${basePkgName}`, `${chainId}-${preset}`);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(`${basePkgName}`, `${chainId}-${preset}`);
    expect(localLoader.read).toHaveBeenCalledWith('file:/usecannon.com/url');
  });

  test('should write deployment files', async () => {
    const writeDeployments = 'contracts';
    const result = await inspect(packageName, chainId, preset, false, writeDeployments);

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getUrl).toHaveBeenCalledWith(`${basePkgName}`, `${chainId}-${preset}`);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(`${basePkgName}`, `${chainId}-${preset}`);
    expect(fs.outputFile).toHaveBeenCalled();
  });

  test('should call inspect with json flag ', async () => {
    const result = await inspect(packageName, chainId, preset, true, '');

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getUrl).toHaveBeenCalledWith(`${basePkgName}`, `${chainId}-${preset}`);
    expect(mockedFallBackRegistry.getMetaUrl).not.toHaveBeenCalled();
    expect(stdoutOutput.join('')).toEqual(JSON.stringify(testPkgData, null, 2));
  });
});
