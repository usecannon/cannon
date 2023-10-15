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

  useEffect(() => {
    addLog(`Querying Subgraph: ${(query.definitions[0] as any).name.value}(${JSON.stringify(options?.variables)})`);
  }, [query, JSON.stringify(options?.variables)]);

  const result = useQuery<TData, TVariables>(query, options);

  return result;
}
