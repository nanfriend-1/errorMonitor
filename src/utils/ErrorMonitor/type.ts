// 错误类型
export type ErrorType = 'js' | 'promise' | 'resource' | 'react';

// 上报方式类型
export type ReportMethod = 'request' | 'image' | 'navigator' | 'custom';

// 错误数据类型
export interface ErrorData {
  type: ErrorType;
  message: string;
  stack?: string;
  componentStack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  tag?: string;
  url?: string;
  timestamp?: number;
  screenData?: any[];
}