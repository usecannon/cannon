import { ethers } from 'ethers';
import { alter } from './alter';
import { LocalRegistry, createDefaultReadRegistry } from '../registry';
import { CannonStorage, ChainDefinition, DeploymentInfo, FallbackRegistry, IPFSLoader } from '@usecannon/builder';
import { getMainLoader, LocalLoader } from '../loader';
import _ from 'lodash';
import cli from '../index';
import { fetch } from './fetch';
import fs from 'fs-extra';



jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');

describe('fetch', () => {

  let mockedFallBackRegistry: any;
  let localLoader: LocalLoader;
  let ipfsLoader: IPFSLoader;
  let stdoutOutput: string[] = [];
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  
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
  


  test('should fetch from IPFS hash', async () => {
    const ipfsHash =  'QmcniBv7UQ4gGPQQW2BwbD4ZZHzN3o3tPuNLZCbBchd1zh'

    // Call the 'alter' function with the necessary arguments
    await fetch(ipfsHash);

    expect(CannonStorage.prototype.readBlob as jest.Mock<any, any>).toHaveBeenCalled();
    expect(CannonStorage.prototype.putBlob as jest.Mock<any, any>).toHaveBeenCalled();
  });
});
