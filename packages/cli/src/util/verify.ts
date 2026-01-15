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

export type SourcifyVerifyRequest = {
  stdJsonInput: object;
  compilerVersion: string;
  contractIdentifier: string;
  creationTransactionHash?: string;
}

export type SourcifyVerifyResponse = {
  verificationId: string;
}

export type SourcifyVerifyStatusResponse = {
  isJobCompleted: boolean,
  verificationId: string,
  error: {
    customCode: string,
    message: string,
    errorId: string,
    recompiledCreationCode: string,
    recompiledRuntimeCode: string,
    onchainCreationCode: string,
    onchainRuntimeCode: string,
    creationTransactionHash: string,
    errorData: object
  }
  jobStartTime: string,
  jobFinishTime: string,
  compilationTime: string,
  contract: {
    match: 'exact_match'|'match'|null,
    creationMatch: 'exact_match'|'match'|null,
    runtimeMatch: 'exact_match'|'match'|null,
    chainId: string,
    address: string,
    verifiedAt: string,
    matchId: string 
  }
}

export const ETHERSCAN_DEFAULT_SERVER_URL = 'https://api.etherscan.io/v2/api';
export const SOURCIFY_DEFAULT_SERVER_URL = 'https://sourcify.dev/server';

/**
 * Check if a smart contract is verified on Etherscan.
 * @link https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
 * @param address - The address of the smart contract.
 * @param apiUrl - Etherscan API URL.
 * @param apiKey - Etherscan API Key.
 * @returns True if the contract is verified, false otherwise.
 */
export async function isEtherscanVerified(address: string, chainId: number, apiUrl: string, apiKey: string): Promise<boolean> {
  const parameters = new URLSearchParams({
    apikey: apiKey,
    chainid: chainId.toString(),
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

/**
 * Check if a smart contract is verified on Sourcify.
 * @link https://docs.sourcify.dev/docs/api/#/Contract%20Lookup/get-contract
 * @param address - The address of the smart contract.
 * @param chainId - The chainId of the smart contract.
 * @param serverUrl - Sourcify API URL.
 * @returns True if the contract is verified, false otherwise.
 */
export async function isSourcifyVerified(address: string, chainId: number, serverUrl: string|null): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl || SOURCIFY_DEFAULT_SERVER_URL}/v2/contract/${chainId}/${address}`);

    // sourcify only returns 200 when the contract is verified, and 404 if its not
    if (response.status === 404) {
      return false;
    } else if (response.status === 200) {
      return true;
    } else {
      throw new Error(`Sourcify returned error while checking verification status (${response.status}):` + await response.text());
    }
  } catch (e) {
    throw new Error('Could not check verification status on Sourcify: ' + e);
  }
}

/**
 * Get the endpoint needed to do an actual verification with sourcify
 * @param address - The address of the smart contract.
 * @param chainId - The chainId of the smart contract.
 * @param serverUrl - Sourcify API URL.
 * @returns The URL to POST to
 */
export function getSourcifyVerificationEndpoint(chainId: number, address: string, serverOverride: string|null) {
  return `${serverOverride || SOURCIFY_DEFAULT_SERVER_URL}/v2/verify/${chainId}/${address}`
}

/**
 * Get the endpoint needed to do an actual verification with sourcify
 * @param verificationId - The ID received from the verification endpoint
 * @param serverUrl - Sourcify API URL.
 * @returns The URL to GET
 */
export function getSourcifyVerificationStatusEndpoint(verificationId: string, serverOverride: string|null) {
  return `${serverOverride || SOURCIFY_DEFAULT_SERVER_URL}/v2/verify/${verificationId}`;
}
