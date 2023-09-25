import _ from 'lodash';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';

import { CannonStorage} from '@usecannon/builder';
import * as settings from '../settings';
import { resolveCliSettings } from '../settings';
import { fetch } from './fetch';

jest.mock('../registry');
jest.mock('../settings');
jest.mock('../loader');
jest.mock('../helpers');

describe('fetch', () => {
  const ipfsHash =  'QmdK9vgAF3Qnsi11o5gwXW27GEzayQ1QjyPLhYceq3BAcR'
  const pkgName = 'registry:2.4.7';

  const deployDataLocalFileName = `${pkgName.replace(':', '_')}_5-main.txt`;
  const deployMetaLocalFileName = `${pkgName.replace(':', '_')}_5-main.txt.meta`;

  let testPkgDataFilePath = '';
  let testPkgMetaFilePath = '';
  

  beforeAll(async () => {
    jest.resetAllMocks();

    jest.spyOn(settings, 'resolveCliSettings').mockImplementation(
      jest.fn().mockReturnValue({
        ipfsUrl: 'http://127.0.0.1:5001',
        publishIpfsUrl: 'http://127.0.0.1:5001',
        registryProviderUrl: 'http://localhost:3000',
        registryAddress: ethers.constants.AddressZero,
        registryChainId: '123', // or whatever value is appropriate in your case
        cannonDirectory: '/cannon/directory/',
        // Add other properties as needed
      })
    );

  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    jest.spyOn(settings, 'resolveCliSettings').mockImplementation(
      jest.fn().mockReturnValue({
        ipfsUrl: 'http://127.0.0.1:5001',
        publishIpfsUrl: 'http://127.0.0.1:5001',
        registryProviderUrl: 'http://localhost:3000',
        registryAddress: ethers.constants.AddressZero,
        registryChainId: '123', // or whatever value is appropriate in your case
        cannonDirectory: '/cannon/directory/',
        // Add other properties as needed
      })
    );

    const cliSettings = resolveCliSettings();
    testPkgDataFilePath = path.join(cliSettings.cannonDirectory, 'tags', deployDataLocalFileName);
    testPkgMetaFilePath = path.join(cliSettings.cannonDirectory, 'tags', deployMetaLocalFileName);

  });
  
  
  test('should fetch from IPFS hash', async () => {
    expect(fs.existsSync(testPkgDataFilePath)).toBe(false);
    expect(fs.existsSync(testPkgMetaFilePath)).toBe(false);

    // Call the 'fetch' function with the necessary arguments
    await fetch(pkgName, ipfsHash);

    expect(CannonStorage.prototype.readBlob as jest.Mock<any, any>).toHaveBeenCalled();
    expect(CannonStorage.prototype.putBlob as jest.Mock<any, any>).toHaveBeenCalled();
    expect(fs.existsSync(testPkgDataFilePath)).toBe(true);
    expect(fs.existsSync(testPkgMetaFilePath)).toBe(true);
  });

  test('should fail to fetch if IPFS hash is empty', async () => {
    expect(fs.existsSync(testPkgDataFilePath)).toBe(false);
    expect(fs.existsSync(testPkgMetaFilePath)).toBe(false);

    // Call the 'fetcg' function with the necessary arguments
    await fetch(pkgName, '');

    expect(fetch).toThrowError(expect.stringMatching(/One of your IPFS hashes does not match the IPFS CID v0 format/));
  });
});
