import { useContext } from "react";
import { ErrorMonitorContext } from "./Provider";

// 自定义 Hook 方便获取 errorMonitor 实例
export const useErrorMonitor = () => {
  const context = useContext(ErrorMonitorContext);
  if (!context) {
    throw new Error("useErrorMonitor must be used within an ErrorMonitorProvider");
  }
  return context;
};