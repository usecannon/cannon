import { useState, useEffect } from 'react';
import { ChainDefinition, RawChainDefinition } from '@usecannon/builder';

export function useChainDefinitionWorker(deployInfo: RawChainDefinition | null) {
  const [chainDef, setChainDef] = useState<ChainDefinition | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!deployInfo) return;

    let isMounted = true;

    const initChainDef = async () => {
      try {
        const def = await getChainDefinitionFromWorker(deployInfo);
        if (isMounted) {
          setChainDef(def);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      }
    };

    void initChainDef();

    return () => {
      isMounted = false;
    };
  }, [deployInfo]);

  return { chainDef, error };
}
