import { useEffect, useState } from 'react';
import { DeploymentInfo } from '@usecannon/builder';
import { Option } from '@/lib/interact';
import { processDeploymentData, sortByModulePriority } from '@/lib/interact';

/**
 * Custom hook to process deployment data into highlighted and other options
 */
export function useProcessedOptions(deploymentData: DeploymentInfo | undefined, name: string) {
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);

  // Process deployment data into highlighted and other options
  useEffect(() => {
    if (!deploymentData) {
      return;
    }

    const [highlightedData, otherData] = processDeploymentData(deploymentData, name);
    setHighlightedOptions(sortByModulePriority(highlightedData, name));
    setOtherOptions(sortByModulePriority(otherData, name));
  }, [deploymentData, name]);

  return { highlightedOptions, otherOptions };
}
