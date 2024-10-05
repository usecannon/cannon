import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export type Log = {
  date: Date;
  type: 'info' | 'warn' | 'error';
  message: string;
};

export type LogsContextType = {
  logs: Log[];
  addLog: (type: Log['type'], message: string) => void;
};

const LogsContext = createContext<LogsContextType>({} as any);

function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Log[]>([]);

  const addLog = (type: Log['type'], message: string) => {
    const date = new Date();
    setLogs((prevLogs) => {
      const res = [...prevLogs];
      if (prevLogs.length === 0) {
        res.push({ date, type, message: 'Cannon Initialized' });
      }
      res.push({ date, type, message });
      return res;
    });
  };

  useEffect(() => {
    setLogs((prevLogs) => {
      const res = [...prevLogs];
      if (prevLogs.length === 0) {
        res.push({
          date: new Date(),
          type: 'info',
          message: 'Cannon Initialized',
        });
      }
      return res;
    });
  }, []);

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
