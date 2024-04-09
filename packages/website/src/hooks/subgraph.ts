import { useEffect, useState } from 'react';
import { ApolloError, DocumentNode, NoInfer, OperationVariables, QueryHookOptions, TypedDocumentNode } from '@apollo/client';
import apolloClient, { apolloClientOptimism } from '@/graphql/ApolloClient';
import { useLogs } from '@/providers/logsProvider';
import { merge } from 'lodash';

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
        // Query mainnet
        const { data: mainnetData } = await apolloClient.query<TData, TVariables>({
          query,
          variables: options?.variables,
        });

        // Query optimism
        const { data: optimismData } = await apolloClientOptimism.query<TData, TVariables>({
          query,
          variables: options?.variables,
        });

        // Merge results, with optimism data taking precedence
        const merged = merge({}, mainnetData, optimismData);
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
