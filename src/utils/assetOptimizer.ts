import { Image, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Image optimization utilities
export const imageOptimizer = {
  // Get optimal image size based on screen dimensions
  getOptimalImageSize(originalWidth: number, originalHeight: number, maxWidth?: number, maxHeight?: number) {
    const targetWidth = maxWidth || screenWidth;
    const targetHeight = maxHeight || screenHeight;
    
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;
    
    if (width > targetWidth) {
      width = targetWidth;
      height = width / aspectRatio;
    }
    
    if (height > targetHeight) {
      height = targetHeight;
      width = height * aspectRatio;
    }
    
    return { width: Math.round(width), height: Math.round(height) };
  },

  // Preload critical images
  async preloadImages(imageSources: any[]) {
    const preloadPromises = imageSources.map(source => 
      Image.prefetch(typeof source === 'string' ? source : Image.resolveAssetSource(source).uri)
    );
    
    try {
      await Promise.all(preloadPromises);
      console.log('Images preloaded successfully');
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  },

  // Get responsive image props
  getResponsiveImageProps(source: any, aspectRatio: number = 1) {
    const optimalSize = this.getOptimalImageSize(
      screenWidth,
      screenWidth / aspectRatio,
      screenWidth * 0.8,
      screenHeight * 0.4
    );
    
    return {
      source,
      style: {
        width: optimalSize.width,
        height: optimalSize.height,
      },
      resizeMode: 'cover' as const,
    };
  },
};

// Bundle optimization utilities
export const bundleOptimizer = {
  // Lazy load heavy dependencies
  async loadHeavyDependency<T>(importFn: () => Promise<T>): Promise<T> {
    try {
      return await importFn();
    } catch (error) {
      console.error('Failed to load dependency:', error);
      throw error;
    }
  },

  // Dynamic import with error handling
  async dynamicImport<T>(modulePath: string): Promise<T> {
    try {
      const module = await import(modulePath);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to import ${modulePath}:`, error);
      throw error;
    }
  },
};

// Memory optimization utilities
export const memoryOptimizer = {
  // Cleanup function for components
  cleanup(cleanupFns: Array<() => void>) {
    cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },

  // Debounce function calls
  debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    }) as T;
  },
};

// Performance monitoring
export const performanceMonitor = {
  // Measure component render time
  measureRenderTime(componentName: string, renderFn: () => void) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    
    const renderTime = end - start;
    if (renderTime > 16.67) { // 60fps = 16.67ms per frame
      console.warn(`${componentName} render time: ${renderTime.toFixed(2)}ms (may cause frame drops)`);
    }
    
    return renderTime;
  },

  // Log memory usage (iOS/Android specific)
  logMemoryUsage() {
    if (__DEV__) {
      // This would be platform-specific memory monitoring
      console.log('Memory monitoring would be implemented here for production');
    }
  },
};
