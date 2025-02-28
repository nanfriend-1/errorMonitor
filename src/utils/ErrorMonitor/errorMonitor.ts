import { defaultMonitor } from "./constant";
import { ErrorData, ReportMethod } from "./type";

interface MonitorConfig {
  recordScreen?: boolean; // 是否开启录屏
  reportMethod?: ReportMethod; // 上报方式
  reportUrl?: string; // 上报地址
  dedupe?: boolean; // 去重
  canReport?: boolean; // 是否需要上报
  customReporter?: (data: ErrorData[]) => void; // 自定义上报方式
}

export class ErrorMonitor {
  private config: MonitorConfig; // 配置项
  private errorQueue: ErrorData[]; // 错误队列
  private errorCache: Set<string>; // 错误hash缓存
  private recorder: any;
  private screenEvents: any[] = []; // 录屏事件
  private timer?: NodeJS.Timeout; // 定时器

  constructor(config: MonitorConfig) {
    // 合并默认配置
    this.config = {
      recordScreen: false, // 默认不开启录屏
      reportMethod: "request", // 默认为request上报
      reportUrl: "",
      dedupe: true,
      canReport: true,
      ...config,
    };

    this.errorQueue = [];
    this.errorCache = new Set();
    this.initialize();
  }

  private initialize() {
    this.initErrorListeners();
    this.initScreenRecording();
    this.loadFromLocalStorage();
    this.initPageHideHandler();
  }

  // 初始化全局的错误监听
  private initErrorListeners() {
    // JS 错误
    window.addEventListener("error", (event) => {
      if (event.target === window) {
        this.handleError({
          type: "js",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: Date.now(),
        });
      }
    });

    // 资源加载错误
    window.addEventListener(
      "error",
      (event) => {
        if (event.target !== window) {
          const target = event.target as HTMLElement;
          this.handleError({
            type: "resource",
            message: event.message,
            tag: target.tagName,
            url:
              (target as HTMLScriptElement).src ||
              (target as HTMLLinkElement).href,
            timestamp: Date.now(),
          });
        }
      },
      true
    );

    // Promise错误
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError({
        type: "promise",
        message: event.reason?.message || String(event.reason),
        timestamp: Date.now(),
      });
    });
  }

  // 初始化录屏
  private initScreenRecording() {
    if (!this.config.recordScreen) {
      return;
    }

    // 动态引入
    import("rrweb").then(({ record }) => {
      this.recorder = record({
        emit: (event, isCheckout) => {
          this.screenEvents.push(event);
          // 保留最近30秒数据（假设每秒6个事件）
          if (this.screenEvents.length > 200) {
            this.screenEvents.shift();
          }
        },
      });
    });
  }

  // 错误处理的核心方法
  private handleError(data: ErrorData) {
    const errorData: ErrorData = {
      ...data,
      timestamp: data.timestamp ?? Date.now(), // 补充时间
    };

    // 关联录屏数据
    if (this.config.recordScreen) {
      errorData.screenData = this.screenEvents;
      this.screenEvents = []; // 清空录屏数据
    }

    // 生成错误指纹
    const hash = this.createHash(errorData);

    // 去重检查
    if (this.config.dedupe && this.errorCache.has(hash)) {
      return;
    }

    // 将hash加入缓存中
    this.errorCache.add(hash);

    // 加入错误队列
    this.errorQueue.push(errorData);

    if (this.config.canReport) {
      // 处理队列
      this.processQueue();
    } else {
      // 持久化到本地
      this.saveToLocalStorage();
    }
  }

  // 生成错误指纹
  private createHash(data: ErrorData) {
    const coreData = {
      message: data.message,
      stack: data.stack,
      lineno: data.lineno,
      colno: data.colno,
      filename: data.filename,
    };
    return JSON.stringify(coreData);
  }

  // 处理上报队列
  private processQueue() {
    switch (this.config.reportMethod) {
      case "request":
        this.scheduleBatchReport();
        break;
      case "image":
      case "navigator":
      case "custom":
        this.immediateReport();
        break;
    }
  }

  // 异步上报中开启定时批量上报
  private scheduleBatchReport() {
    // 没有定时器生成一个定时器
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.batchReport();
        // 上报后清空定时器
        this.timer = undefined;
      }, 3000); // 定时时间设置为5秒
    }
  }

  // 立即上报
  private immediateReport() {
    while (this.errorQueue.length > 0) {
      const data = this.errorQueue.shift();
      if (!data) continue;

      switch (this.config.reportMethod) {
        case "image":
          this.reportViaImage(data);
          break;
        case "navigator":
          this.reportViaNavigator([data]);
          break;
        case "custom":
          this.config.customReporter?.([data]);
          break;
      }
    }
  }

  // 批量上报
  private batchReport() {
    // 无错误数据或者无上报地址时直接中断上报
    if (this.errorQueue.length === 0 || !this.config.reportUrl) {
      return;
    }

    // 检查网络状态
    if (!navigator.onLine) {
      this.saveToLocalStorage();
      return;
    }

    // 截取队列的前10项
    const batchData = this.errorQueue.splice(0, 10);

    fetch(this.config.reportUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchData),
    })
      .then(() => {
        this.clearLocalStorage();
      })
      .catch(() => {
        // 上报失败后，还原错误队列
        this.errorQueue.unshift(...batchData);
        this.saveToLocalStorage();
      });
  }

  // 图片打点上报
  private reportViaImage(data: ErrorData) {
    const query = new URLSearchParams({
      data: JSON.stringify(data),
      timestamp: Date.now().toString(),
    });
    new Image().src = `${this.config.reportUrl}?${query.toString()}`;
  }

  // Beacon上报
  private reportViaNavigator(data: ErrorData[]) {
    if (!this.config.reportUrl) {
      return;
    }
    const success = navigator.sendBeacon(
      this.config.reportUrl,
      JSON.stringify(data)
    );
    if (!success) {
      // 上报失败后还原数据
      this.errorQueue.unshift(...data);
      this.saveToLocalStorage();
    }
  }

  // 本地持久化存储
  private saveToLocalStorage() {
    const stored = localStorage.getItem("errorQueue");
    const currentData = stored ? JSON.parse(stored) : [];
    localStorage.setItem(
      "errorQueue",
      JSON.stringify([...currentData, ...this.errorQueue])
    );
  }

  // 尝试获取本地错误缓存并添加到队列中
  private loadFromLocalStorage() {
    const stored = localStorage.getItem("errorQueue");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.errorQueue.push(...data);
        localStorage.removeItem("errorQueue");
      } catch (e) {
        console.error("Failed to load error queue from localStorage:", e);
      }
    }
  }

  // 清空本地缓存
  private clearLocalStorage() {
    localStorage.removeItem("errorQueue");
  }

  // 页面关闭的前置处理，将错误队列及时上报，防止数据丢失
  private initPageHideHandler() {
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flushQueue();
      }
    });

    window.addEventListener("beforeunload", () => {
      this.flushQueue();
    });
  }

  private flushQueue() {
    if (this.errorQueue.length === 0) {
      return;
    }

    switch (this.config.reportMethod) {
      case "request":
        this.reportViaNavigator(this.errorQueue);
        break;
      case "navigator":
        this.reportViaNavigator(this.errorQueue);
        break;
      case "image":
        this.errorQueue.forEach((data) => this.reportViaImage(data));
        break;
      case "custom":
        this.config.customReporter?.(this.errorQueue);
        break;
    }

    this.errorQueue = [];
  }

  // 自动上报错误
  public manualReport(error: Error, componentStack?: string) {
    this.handleError({
      type: "react",
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: Date.now(),
    });
  }

  public getErrorQueue(){
    return this.errorQueue;
  }
}

export const errorMonitor = new ErrorMonitor(defaultMonitor);
