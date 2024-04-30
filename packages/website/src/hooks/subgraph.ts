import { useEffect, useState } from 'react';
import merge from 'deepmerge';
import { ApolloError, DocumentNode, NoInfer, OperationVariables, QueryHookOptions, TypedDocumentNode } from '@apollo/client';
import apolloClient, { apolloClientOptimism } from '@/graphql/ApolloClient';
import { useLogs } from '@/providers/logsProvider';

export function useQueryCannonSubgraphData<TData = any, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: QueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>
): any {
  const { addLog } = useLogs();
  const [mergedData, setMergedData] = useState<TData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const fetchSubgraphs = async () => {
      setLoading(true);
      try {
        const [mainnetData, optimismData] = await Promise.all([
          apolloClient.query<TData, TVariables>({
            query,
            variables: options?.variables,
          }),
          apolloClientOptimism.query<TData, TVariables>({
            query,
            variables: options?.variables,
          }),
        ]);

        const merged: TData = merge(mainnetData.data, optimismData.data);
        setMergedData(merged);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    };

    addLog('Fetching subgraphs...');
    void fetchSubgraphs();
  }, [query, JSON.stringify(options?.variables)]);

  return {
    data: mergedData,
    loading,
    error: error as ApolloError | undefined,
  };
}
