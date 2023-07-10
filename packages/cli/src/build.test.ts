import cli from './index';
import * as paramUtils from './util/params';

import { ethers } from 'ethers';
import * as buildCommand from './commands/build';
import * as helpers from './helpers';
import * as utilProvider from './util/provider';
import { CannonWrapperGenericProvider } from '@usecannon/builder';

jest.mock('ethers');
jest.mock('@usecannon/builder');

describe('build', () => {
  beforeEach(() => {
    // reset mocks
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('should handle when cannon file is not passed, default cannonfile.toml should be used', async () => {
    const errorMessage = 'Reject Error';
    jest.spyOn(paramUtils, 'parseSettings').mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const settings = ['first=1', 'second=2'];
    await expect(async () => {
      await cli.parseAsync(['node', 'cannon.ts', 'build', ...settings]);
    }).rejects.toThrow(errorMessage);
    expect(paramUtils.parseSettings).toHaveBeenCalledWith(settings);
  });

  it('should resolve chainId from provider url', async () => {
    const providerUrl = 'http://localhost:8545';
    const chainId = 999;

    const getNetworkFake = jest.fn().mockResolvedValue({ chainId });
    jest.mocked(ethers.providers.JsonRpcProvider).mockImplementation(() => {
      return {
        ...jest.requireActual('ethers').providers.JsonRpcProvider,
        getNetwork: getNetworkFake,
      };
    });
    const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

    jest.spyOn(helpers, 'loadCannonfile').mockResolvedValue({} as any);
    jest.mocked(provider.getNetwork).mockResolvedValue({ chainId, name: 'dummy' });
    jest.spyOn(buildCommand, 'build').mockResolvedValue({ outputs: {}, provider });
    jest.spyOn(utilProvider, 'resolveWriteProvider').mockResolvedValue({ provider, signers: [] });

    await cli.parseAsync(['node', 'cannon.ts', 'build', '--provider-url', providerUrl]);

    // Resolved chainId from provider url
    expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith('http://localhost:8545');
    expect(getNetworkFake).toHaveBeenCalledTimes(1);

    // create write provider with expected values
    expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][0].providerUrl).toEqual(providerUrl);
    expect((utilProvider.resolveWriteProvider as jest.Mock).mock.calls[0][1]).toEqual(chainId);
    expect(utilProvider.resolveWriteProvider).toHaveBeenCalledTimes(1);

    // The same provider is passed to build command
    expect((buildCommand.build as jest.Mock).mock.calls[0][0].provider).toEqual(provider);
  });
});
