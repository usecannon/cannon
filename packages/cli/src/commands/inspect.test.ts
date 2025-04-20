import { inspect } from './inspect';
import { createDefaultReadRegistry } from '../registry';
import { resolveCliSettings } from '../settings';
import { getContractsAndDetails, getSourceFromRegistry } from '../helpers';
import { IPFSLoader } from '@usecannon/builder';
import fs from 'fs-extra';
import { getMainLoader, CliLoader, LocalLoader } from '../loader';
import { ContractData } from '@usecannon/builder';
import { fetchIPFSAvailability } from '@usecannon/builder/dist/src/ipfs';

jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');
jest.mock('@usecannon/builder/dist/src/ipfs');
jest.mock('../settings', () => ({
  resolveCliSettings: jest.fn().mockReturnValue({ ipfsUrl: 'ipfsUrl' }),
}));

describe('inspect', () => {
  const chainId = 123;
  const preset = 'your-preset';
  const basePkgName = 'package:1.2.3';
  const packageName = `${basePkgName}@${preset}`;
  const cliSettings = resolveCliSettings();
  const ipfsUrl = 'ipfs://QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';

  let testPkgData: any;
  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: CliLoader;
  let stdoutOutput: string[] = [];
  let writeSpy: jest.SpyInstance;
  let contractsAndDetails: { [contractName: string]: ContractData };
  let ipfsAvailabilityScore: number | undefined;
  let localSource: string | undefined;

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
      getDeployUrl: jest.fn().mockResolvedValue('ipfs://QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'),
      getUrl: jest.fn().mockResolvedValue('ipfs://QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn'),
      getMetaUrl: jest.fn().mockResolvedValue('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'),
      registries: [],
    };

    contractsAndDetails = {
      TokenContract: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        abi: [],
        deployTxnHash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        contractName: 'TokenContract',
        sourceName: 'TokenSource',
        deployedOn: '2023-10-16',
        highlight: true,
        gasUsed: 1,
        gasCost: '1',
      },
    };

    ipfsAvailabilityScore = 10;
    localSource = 'on chain 0x1AAAAAAAA';

    localLoader = new LocalLoader('path');
    ipfsLoader = new CliLoader({
      readIpfs: new IPFSLoader('ipfs'),
      writeIpfs: new IPFSLoader('ipfs'),
      repoLoader: new IPFSLoader('ipfs'),
      fileCacheDir: 'path',
    });

    jest.mocked(getMainLoader).mockReturnValueOnce({
      file: localLoader,
      ipfs: ipfsLoader,
    });

    jest.mocked(createDefaultReadRegistry).mockResolvedValue(Promise.resolve(mockedFallBackRegistry));
    jest.mocked(fetchIPFSAvailability).mockResolvedValue(Promise.resolve(ipfsAvailabilityScore));

    jest.mocked(getContractsAndDetails).mockReturnValue(contractsAndDetails);
    jest.mocked(getSourceFromRegistry).mockReturnValue(localSource);

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
<<<<<<< HEAD
    const result = await inspect(packageName, cliSettings, chainId, 'overview', '', false);
=======
    const result = await inspect(packageName, ipfsUrl, chainId, testPkgData, cliSettings, 'overview', '', false);
>>>>>>> origin/dev

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(packageName, chainId);
    expect(getSourceFromRegistry).toHaveBeenCalledWith(mockedFallBackRegistry.registries);
    expect(getContractsAndDetails).toHaveBeenCalledWith(testPkgData.state);

    expect(ipfsLoader.read).toHaveBeenCalledWith(testPkgData.miscUrl);
  });

  test('should write deployment files', async () => {
    const writeDeployments = 'contracts';
<<<<<<< HEAD
    const result = await inspect(packageName, cliSettings, chainId, 'overview', writeDeployments, false);
=======
    const result = await inspect(
      packageName,
      ipfsUrl,
      chainId,
      testPkgData,
      cliSettings,
      'overview',
      writeDeployments,
      false
    );
>>>>>>> origin/dev

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(packageName, chainId);
    expect(fs.outputFile).toHaveBeenCalled();
  });

  test('should call inspect with sources flag ', async () => {
<<<<<<< HEAD
    const result = await inspect(packageName, cliSettings, chainId, 'overview', '', true);
=======
    const result = await inspect(packageName, ipfsUrl, chainId, testPkgData, cliSettings, 'overview', '', true);
>>>>>>> origin/dev

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getMetaUrl).toHaveBeenCalledWith(packageName, chainId);
    expect(getSourceFromRegistry).toHaveBeenCalledWith(mockedFallBackRegistry.registries);
    expect(getContractsAndDetails).toHaveBeenCalledWith(testPkgData.state);

    expect(ipfsLoader.read).toHaveBeenCalledWith(testPkgData.miscUrl);
  });

  test('should call inspect with json flag ', async () => {
<<<<<<< HEAD
    const result = await inspect(packageName, cliSettings, chainId, 'deploy-json', '', false);
=======
    const result = await inspect(packageName, ipfsUrl, chainId, testPkgData, cliSettings, 'deploy-json', '', false);
>>>>>>> origin/dev

    expect(result).toEqual(testPkgData);
    expect(mockedFallBackRegistry.getMetaUrl).not.toHaveBeenCalled();
    expect(stdoutOutput.join('')).toEqual(JSON.stringify(testPkgData, null, 2));
  });
});
