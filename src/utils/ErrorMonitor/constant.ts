// 上报方式枚举
export enum ReportMethodEnum {
  Request =  'request',     // 请求批量上报
  Image =  'image',         // 图片打点上报
  Navigator =  'navigator', // navigator.sendBeacon
  Custom =  'custom'        // 自定义上报方法
}

export const defaultMonitor = {
  recordScreen: true,
  reportMethod: ReportMethodEnum.Request,
  reportUrl: 'https://gmnError',
  dedupe: true,
};

// 自定义上报示例
// const wsMonitor = new ErrorMonitor({
//   reportMethod: 'custom',
//   customReporter: (data) => {
//     WebSocketManager.send('error-report', data);
//   }
// });