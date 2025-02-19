import * as viem from 'viem';
import { AbiParameterPreview } from '@/components/AbiParameterPreview';

interface Props {
  chainId: number;
  abiParameters: readonly viem.AbiParameter[];
  methodResult?: unknown;
}

export function FunctionOutput({
  chainId,
  abiParameters,
  methodResult,
}: Props) {
  if (!abiParameters.length) {
    return null;
  }

  if (abiParameters.length > 1) {
    return abiParameters.map((abiParameter, index) => {
      return (
        <AbiParameterPreview
          chainId={chainId}
          key={`${abiParameter.name}-${index}`}
          abiParameter={abiParameter}
          value={
            Array.isArray(methodResult) ? methodResult[index] : methodResult
          }
        />
      );
    });
  }

  const abiParameter = abiParameters[0];

  return (
    <AbiParameterPreview
      chainId={chainId}
      key={`${abiParameter?.name}-${methodResult}`}
      abiParameter={abiParameter}
      value={methodResult}
    />
  );
}
