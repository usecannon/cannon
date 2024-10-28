import { useEffect, useRef } from 'react';

export function useWorker<T>(workerPath: string, onMessage: (data: T) => void, onError?: (error: ErrorEvent) => void) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL(workerPath, import.meta.url));

    workerRef.current.onmessage = (event) => {
      onMessage(event.data);
    };

    if (onError) {
      workerRef.current.onerror = onError;
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerPath, onMessage, onError]);

  return workerRef.current;
}
