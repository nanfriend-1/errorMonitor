import { createContext } from "react";
import { ErrorMonitor, errorMonitor } from "../../utils/ErrorMonitor/errorMonitor";

export const ErrorMonitorContext = createContext<ErrorMonitor | null>(null);

export const ErrorMonitorProvider = ({ children }: any) => {
  return (
    <ErrorMonitorContext.Provider value={errorMonitor}>
      {children}
    </ErrorMonitorContext.Provider>
  );
};