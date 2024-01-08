import React, { useState } from "react";

// Create a new context
const StepModalContext = React.createContext();

// This component will wrap your app or components that need to share state
export const StepModalProvider = ({ children }) => {
  const [activeModule, setActiveModule] = useState(null);

  // The shared state and its updater function
  const value = { activeModule, setActiveModule };

  return <StepModalContext.Provider value={value}>{children}</StepModalContext.Provider>;
};

// Custom hook to use the context
export const useStepModalContext = () => {
  return React.useContext(StepModalContext);
};
