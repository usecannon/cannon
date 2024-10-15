import { useState, useEffect } from 'react';

interface CommandData {
  name: string;
  [key: string]: any;
}

const collectCommandsData = (config: any, parentName?: string): CommandData[] => {
  const data: CommandData[] = [];
  Object.entries(config).forEach(([k, v]) => {
    const name = parentName ? `${parentName} ${k}` : k;
    if ((v as any).commands) {
      data.push(...collectCommandsData((v as any).commands, name));
    } else {
      data.push({ ...(v as any), name });
    }
  });
  return data;
};

export const useCommandsConfig = () => {
  const [commandsData, setCommandsData] = useState<CommandData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadCommandsConfig = async () => {
      try {
        const { default: commandsConfig } = await import('@usecannon/cli/dist/src/commands/config');

        const newCommandsData = collectCommandsData(commandsConfig);
        setCommandsData(newCommandsData);
        setIsLoading(false);
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
      }
    };

    void loadCommandsConfig();
  }, []);

  return { commandsData, isLoading, error };
};
