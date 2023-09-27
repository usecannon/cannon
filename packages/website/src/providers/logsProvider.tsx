import { ReactNode, createContext, useContext, useState } from 'react';

export type Log = {
  date: Date;
  message: string;
};

export type LogsContextType = {
  logs: Log[];
  addLog: (message: string) => void;
};

const LogsContext = createContext<LogsContextType>({} as any);

function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Log[]>([]);

  const addLog = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, { date: new Date(), message }]);
  };

  return (
    <LogsContext.Provider
      value={{
        logs,
        addLog,
      }}
    >
      {children}
    </LogsContext.Provider>
  );
}

export default LogsProvider;

export function useLogs(): LogsContextType {
  return useContext<LogsContextType>(LogsContext);
}
