import { logger } from './logger';
import React from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private readonly maxMetrics = 1000;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string): void {
    if (this.metrics.size >= this.maxMetrics) {
      this.clearOldMetrics();
    }

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  endMeasure(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`計測 "${name}" が見つかりません`);
      return undefined;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    logger.debug(`パフォーマンス計測: ${name}`, {
      duration: metric.duration,
      startTime: metric.startTime,
      endTime: metric.endTime,
    });

    return metric.duration;
  }

  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  private clearOldMetrics(): void {
    const oldestMetric = Array.from(this.metrics.entries())
      .sort(([, a], [, b]) => a.startTime - b.startTime)[0];
    if (oldestMetric) {
      this.metrics.delete(oldestMetric[0]);
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// パフォーマンス計測用のデコレータ
export function measure(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startMeasure(name);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endMeasure(name);
        return result;
      } catch (error) {
        performanceMonitor.endMeasure(name);
        throw error;
      }
    };

    return descriptor;
  };
}

// コンポーネントのレンダリング時間を計測するHOC
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithPerformanceMonitoring(props: P) {
    const startTime = performance.now();

    const result = React.createElement(WrappedComponent, props);

    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.debug(`コンポーネントレンダリング: ${componentName}`, {
      duration,
      startTime,
      endTime,
    });

    return result;
  };
}

/**
 * 関数の実行時間を計測し、ログに記録します
 * @param functionName 関数名
 * @param startTime 開始時間
 */
export const monitorPerformance = (functionName: string, startTime: number): void => {
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  // 実行時間が100msを超える場合は警告ログを出力
  if (executionTime > 100) {
    console.warn(`Performance warning: ${functionName} took ${executionTime.toFixed(2)}ms to execute`);
  }
  
  // 実行時間をログに記録
  console.log(`Performance: ${functionName} - ${executionTime.toFixed(2)}ms`);
}; 