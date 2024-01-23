import hre from 'hardhat';
import { getAllContractDatasFromOutputs, getContractDataFromOutputs } from '../internal/cannon';

import type { Signer } from 'ethers';

/** Get data of a given contract from the built outputs */
export function getContractData(contractName: string) {
  if (!hre.cannon.outputs) throw new Error('There are no cannon artifacs present');
  return getContractDataFromOutputs(hre.cannon.outputs, contractName);
}

/** Get datas of all contracts from the built outputs */
export function getAllContractDatas() {
  if (!hre.cannon.outputs) throw new Error('There are no cannon artifacs present');
  return getAllContractDatasFromOutputs(hre.cannon.outputs);
}

/** Get an instance of a ethers.Contract from the built outputs */
export async function getContract(contractName: string, signer?: Signer) {
  const { ethers } = await import('ethers');
  if (!signer) [signer] = (await (hre as any).ethers.getSigners()) as Signer[];
  const contract = getContractData(contractName);
  return new ethers.Contract(contract.address || ethers.constants.AddressZero, contract.abi, signer);
}
