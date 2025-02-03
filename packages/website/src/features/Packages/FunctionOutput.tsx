import * as viem from 'viem';
import { AbiParameterPreview } from '@/components/AbiParameterPreview';
import { isAbiParameterArray } from '@/components/AbiParameterPreview/utils';

interface Props {
  chainId: number;
  abiParameters: viem.AbiParameter | readonly viem.AbiParameter[];
  methodResult?: string;
}

export function FunctionOutput({
  chainId,
  abiParameters,
  methodResult,
}: Props) {
  if (isAbiParameterArray(abiParameters)) {
    return abiParameters.map((abiParameter, index) => (
      <AbiParameterPreview
        chainId={chainId}
        key={`${abiParameter.name}-${index}`}
        abiParameter={abiParameter}
        value={methodResult?.[index]}
      />
    ));
  }

  return (
    <AbiParameterPreview
      chainId={chainId}
      key={`${abiParameters.name}-${methodResult}`}
      abiParameter={abiParameters}
      value={methodResult}
    />
  );
}
