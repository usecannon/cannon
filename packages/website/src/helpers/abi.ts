import { AbiFunction } from 'abitype';

export const isReadOnly = (abiFunction: AbiFunction) =>
  abiFunction.stateMutability === 'view' || abiFunction.stateMutability === 'pure';

export const isPayable = (abiFunction: AbiFunction) => abiFunction.stateMutability === 'payable';
