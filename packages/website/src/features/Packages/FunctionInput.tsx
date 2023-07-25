import { FC, useMemo } from 'react';
import { AbiParameter } from 'abitype';

export const FunctionInput: FC<{
  input: AbiParameter;
}> = ({ input }) => {
  const isArray = useMemo(() => input?.type?.endsWith('[]'), []);
  return <div>FunctionInput</div>;
};
