import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

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
    const date = new Date();
    console.log(message);
    setLogs((prevLogs) => {
      const res = [...prevLogs];
      if (prevLogs.length === 0) {
        res.push({ date, message: 'Cannon Initialized' });
      }
      res.push({ date, message });
      return res;
    });
  };

  useEffect(() => {
    setLogs((prevLogs) => {
      const res = [...prevLogs];
      if (prevLogs.length === 0) {
        res.push({ date: new Date(), message: 'Cannon Initialized' });
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
