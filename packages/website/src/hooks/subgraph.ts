import { useEffect } from 'react';
import {
  DocumentNode,
  NoInfer,
  OperationVariables,
  QueryHookOptions,
  QueryResult,
  TypedDocumentNode,
  useQuery,
} from '@apollo/client';
import { useLogs } from '@/providers/logsProvider';

export function useQueryCannonSubgraphData<TData = any, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>
): QueryResult<TData, TVariables> {
  const { addLog } = useLogs();

  const result = useQuery<TData, TVariables>(query, options);
  const { data } = result;

  useEffect(() => {
    addLog(
      `Subgraph Query ${JSON.stringify((query.definitions[0] as any).name.value)} with variables: ${JSON.stringify(
        options?.variables
      )} responded with result: ${JSON.stringify(data)}`
    );
  }, [query, data]);

  return result;
}
