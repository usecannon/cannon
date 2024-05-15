interface EtherscanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

interface EtherscanGetSourceCodeNotOkResponse {
  status: '0';
  message: 'NOTOK';
  result: string;
}

interface EtherscanGetSourceCodeOkResponse {
  status: '1';
  message: 'OK';
  result: EtherscanContract[];
}

export type EtherscanGetSourceCodeResponse = EtherscanGetSourceCodeNotOkResponse | EtherscanGetSourceCodeOkResponse;

/**
 * Check if a smart contract is verified on Etherscan.
 * @link https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
 * @param address - The address of the smart contract.
 * @param apiUrl - Etherscan API URL.
 * @param apiKey - Etherscan API Key.
 * @returns True if the contract is verified, false otherwise.
 */

export async function isVerified(address: string, apiUrl: string, apiKey: string): Promise<boolean> {
  const parameters = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'getsourcecode',
    address,
  });

  const url = new URL(apiUrl);
  url.search = parameters.toString();

  try {
    const response = await fetch(url);

    // checking that status is in the range 200-299 inclusive
    if (!response.ok) {
      throw new Error(`Network response failed (${response.status}: ${response.statusText})`);
    }

    const json = (await response.json()) as EtherscanGetSourceCodeResponse;

    if (json.message !== 'OK') {
      return false;
    }

    const sourceCode = json.result[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== null && sourceCode !== '';
  } catch (e) {
    return false;
  }
}
