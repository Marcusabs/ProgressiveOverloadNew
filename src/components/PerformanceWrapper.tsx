import React, { memo, useEffect, useRef, ReactNode } from 'react';
import { performanceMonitor } from '../utils/assetOptimizer';

interface PerformanceWrapperProps {
  children: ReactNode;
  componentName: string;
  measureRender?: boolean;
  logSlowRenders?: boolean;
}

const PerformanceWrapper = memo<PerformanceWrapperProps>(({
  children,
  componentName,
  measureRender = false,
  logSlowRenders = true,
}) => {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    if (measureRender) {
      const renderTime = performance.now();
      renderTimes.current.push(renderTime);
      renderCount.current += 1;

      if (logSlowRenders && renderTime > 16.67) {
        console.warn(
          `${componentName} slow render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
        );
      }

      // Log average render time every 10 renders
      if (renderCount.current % 10 === 0) {
        const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
        console.log(
          `${componentName} avg render time (${renderCount.current} renders): ${avgRenderTime.toFixed(2)}ms`
        );
        
        // Keep only last 10 render times
        renderTimes.current = renderTimes.current.slice(-10);
      }
    }
  });

  return <>{children}</>;
});

PerformanceWrapper.displayName = 'PerformanceWrapper';

export default PerformanceWrapper;

// HOC for wrapping components with performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = memo((props: P) => (
    <PerformanceWrapper 
      componentName={componentName || Component.displayName || Component.name || 'UnknownComponent'}
      measureRender={__DEV__}
    >
      <Component {...props} />
    </PerformanceWrapper>
  ));

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
