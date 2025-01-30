import * as viem from 'viem';
import { AbiParameterPreview } from '@/components/AbiParameterPreview';
import { isAbiParameterArray } from '@/components/AbiParameterPreview/utils';

interface Props {
  abiParameters: viem.AbiParameter | readonly viem.AbiParameter[];
  methodResult?: string;
}

export function FunctionOutput({ abiParameters, methodResult }: Props) {
  if (isAbiParameterArray(abiParameters)) {
    return abiParameters.map((abiParameter, index) => (
      <AbiParameterPreview
        key={`${abiParameter.name}-${index}`}
        abiParameter={abiParameter}
        value={methodResult?.[index]}
      />
    ));
  }

  return (
    <AbiParameterPreview
      key={`${abiParameters.name}-${methodResult}`}
      abiParameter={abiParameters}
      value={methodResult}
    />
  );
}
