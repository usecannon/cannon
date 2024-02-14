import hre from 'hardhat';
import { getAllContractDatasFromOutputs, getContractDataFromOutputs } from '../internal/cannon';

/** Get data of a given contract from the built outputs */
export function getContractData(contractName: string) {
  if (!hre.cannon.outputs) throw new Error('There are no cannon artifacts present');
  return getContractDataFromOutputs(hre.cannon.outputs, contractName);
}

/** Get datas of all contracts from the built outputs */
export function getAllContractDatas() {
  if (!hre.cannon.outputs) throw new Error('There are no cannon artifacts present');
  return getAllContractDatasFromOutputs(hre.cannon.outputs);
}
