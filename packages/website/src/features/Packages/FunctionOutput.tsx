import * as viem from 'viem';
import { AbiParameterPreview } from '@/components/AbiParameterPreview';

type AbiParameter = viem.AbiParameter;

function _isArrayAbiParameter(
  value: AbiParameter | readonly AbiParameter[]
): value is readonly AbiParameter[] {
  return Array.isArray(value);
}

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
  if (_isArrayAbiParameter(abiParameters)) {
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
