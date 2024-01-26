import hre from 'hardhat';
import { getAllContractDatasFromOutputs, getContractDataFromOutputs } from '../internal/cannon';

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

/** Get the abi and address from the built outputs */
export async function getContract(contractName: string) {
  const contract = getContractData(contractName);
  return { address: contract.address, abi: contract.abi };
}
