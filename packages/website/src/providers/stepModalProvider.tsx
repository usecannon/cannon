import React, { useState, ReactNode, Context, useContext } from 'react';

type StepModalContextType = {
  activeModule: string | null;
  setActiveModule: React.Dispatch<React.SetStateAction<string | null>>;
};

const StepModalContext: Context<StepModalContextType | undefined> =
  React.createContext<StepModalContextType | undefined>(undefined);

type StepModalProviderProps = {
  children: ReactNode;
};

export const StepModalProvider: React.FC<StepModalProviderProps> = ({
  children,
}) => {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const value = { activeModule, setActiveModule };

  return (
    <StepModalContext.Provider value={value}>
      {children}
    </StepModalContext.Provider>
  );
};

export const useStepModalContext = (): StepModalContextType => {
  const context = useContext(StepModalContext);
  if (context === undefined) {
    throw new Error(
      'useStepModalContext must be used within a StepModalProvider'
    );
  }
  return context;
};
