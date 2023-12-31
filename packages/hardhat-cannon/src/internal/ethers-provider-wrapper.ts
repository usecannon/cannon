/**
 * File Copied from:
 * https://github.com/NomicFoundation/hardhat/blob/%40nomiclabs/hardhat-ethers%402.2.3/packages/hardhat-ethers/src/internal/ethers-provider-wrapper.ts
 */

import { ethers } from 'ethers';
import { EthereumProvider } from 'hardhat/types';

export class EthersProviderWrapper extends ethers.providers.JsonRpcProvider {
  private readonly _hardhatProvider: EthereumProvider;

  constructor(hardhatProvider: EthereumProvider) {
    super();
    this._hardhatProvider = hardhatProvider;
  }

  public async send(method: string, params: any): Promise<any> {
    const result = await this._hardhatProvider.send(method, params);

    // We replicate ethers' behavior.
    this.emit('debug', {
      action: 'send',
      request: {
        id: 42,
        jsonrpc: '2.0',
        method,
        params,
      },
      response: result,
      provider: this,
    });

    return result;
  }

  public toJSON() {
    return '<WrappedHardhatProvider>';
  }
}
