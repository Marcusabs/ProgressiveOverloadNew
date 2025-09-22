import React, { memo, ReactNode, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Layout as LayoutSystem } from '../../design/DesignSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
const getDeviceType = () => {
  if (screenWidth < LayoutSystem.breakpoints.sm) return 'mobile';
  if (screenWidth < LayoutSystem.breakpoints.md) return 'tablet';
  return 'desktop';
};

// Container Component
interface ContainerProps {
  children: ReactNode;
  maxWidth?: keyof typeof LayoutSystem.container | number;
  padding?: keyof typeof Spacing | number;
  centered?: boolean;
  style?: ViewStyle;
}

export const Container = memo<ContainerProps>(({
  children,
  maxWidth = 'lg',
  padding = 4,
  centered = true,
  style,
}) => {
  const containerStyles = useMemo(() => [
    styles.container,
    {
      maxWidth: typeof maxWidth === 'number' ? maxWidth : LayoutSystem.container[maxWidth],
      paddingHorizontal: typeof padding === 'number' ? padding : Spacing[padding],
    },
    centered && styles.centered,
    style,
  ], [maxWidth, padding, centered, style]);

  return <View style={containerStyles}>{children}</View>;
});

// Grid System
interface GridProps {
  children: ReactNode;
  columns?: number;
  spacing?: keyof typeof Spacing | number;
  style?: ViewStyle;
}

export const Grid = memo<GridProps>(({
  children,
  columns = 2,
  spacing = 4,
  style,
}) => {
  const spacingValue = typeof spacing === 'number' ? spacing : Spacing[spacing];
  
  return (
    <View style={[styles.grid, { margin: -spacingValue / 2 }, style]}>
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: `${100 / columns}%`,
              padding: spacingValue / 2,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
});

// Flex Components
interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  wrap?: boolean;
  gap?: keyof typeof Spacing | number;
  style?: ViewStyle;
}

export const Flex = memo<FlexProps>(({
  children,
  direction = 'row',
  justify = 'flex-start',
  align = 'center',
  wrap = false,
  gap = 0,
  style,
}) => {
  const gapValue = typeof gap === 'number' ? gap : Spacing[gap];
  
  return (
    <View
      style={[
        {
          flexDirection: direction,
          justifyContent: justify,
          alignItems: align,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: gapValue,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

// Safe Area Layout
interface SafeAreaLayoutProps {
  children: ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
}

export const SafeAreaLayout = memo<SafeAreaLayoutProps>(({
  children,
  edges = ['top', 'bottom'],
  style,
}) => {
  const insets = useSafeAreaInsets();

  const safeAreaStyle = useMemo(() => ({
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  }), [insets, edges]);

  return (
    <View style={[safeAreaStyle, style]}>
      {children}
    </View>
  );
});

// Screen Layout
interface ScreenLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showTabBar?: boolean;
  backgroundColor?: string;
  scrollable?: boolean;
  style?: ViewStyle;
}

export const ScreenLayout = memo<ScreenLayoutProps>(({
  children,
  showHeader = true,
  showTabBar = true,
  backgroundColor = Colors.neutral[50],
  scrollable = true,
  style,
}) => {
  const insets = useSafeAreaInsets();
  
  const screenStyle = useMemo(() => [
    styles.screen,
    {
      backgroundColor,
      paddingTop: showHeader ? 0 : insets.top,
      paddingBottom: showTabBar ? 0 : insets.bottom,
    },
    style,
  ], [backgroundColor, showHeader, showTabBar, insets, style]);

  if (scrollable) {
    return (
      <ScrollView
        style={screenStyle}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={screenStyle}>{children}</View>;
});

// Responsive hooks
export const useResponsive = () => {
  const deviceType = useMemo(() => getDeviceType(), []);
  
  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    screenWidth,
    screenHeight,
  };
};

export const useOrientation = () => {
  const [orientation, setOrientation] = React.useState(
    screenWidth > screenHeight ? 'landscape' : 'portrait'
  );

  React.useEffect(() => {
    const updateOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setOrientation(width > height ? 'landscape' : 'portrait');
    };

    const subscription = Dimensions.addEventListener('change', updateOrientation);
    return () => subscription?.remove();
  }, []);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
};

// Adaptive spacing hook
export const useAdaptiveSpacing = () => {
  const { isMobile } = useResponsive();
  
  return {
    xs: isMobile ? Spacing[1] : Spacing[2],
    sm: isMobile ? Spacing[2] : Spacing[3],
    md: isMobile ? Spacing[3] : Spacing[4],
    lg: isMobile ? Spacing[4] : Spacing[6],
    xl: isMobile ? Spacing[6] : Spacing[8],
  };
};

// Card Grid Component
interface CardGridProps {
  children: ReactNode;
  minCardWidth?: number;
  spacing?: keyof typeof Spacing | number;
  style?: ViewStyle;
}

export const CardGrid = memo<CardGridProps>(({
  children,
  minCardWidth = 280,
  spacing = 4,
  style,
}) => {
  const { screenWidth: width } = useResponsive();
  const spacingValue = typeof spacing === 'number' ? spacing : Spacing[spacing];
  
  const columns = useMemo(() => {
    const availableWidth = width - (spacingValue * 2);
    return Math.max(1, Math.floor(availableWidth / minCardWidth));
  }, [width, minCardWidth, spacingValue]);

  return (
    <Grid columns={columns} spacing={spacing} style={style}>
      {children}
    </Grid>
  );
});

// Masonry Layout (for Pinterest-like layouts)
interface MasonryProps {
  children: ReactNode[];
  columns?: number;
  spacing?: keyof typeof Spacing | number;
  style?: ViewStyle;
}

export const Masonry = memo<MasonryProps>(({
  children,
  columns = 2,
  spacing = 4,
  style,
}) => {
  const spacingValue = typeof spacing === 'number' ? spacing : Spacing[spacing];
  
  const columnArrays = useMemo(() => {
    const cols: ReactNode[][] = Array.from({ length: columns }, () => []);
    
    children.forEach((child, index) => {
      const columnIndex = index % columns;
      cols[columnIndex].push(child);
    });
    
    return cols;
  }, [children, columns]);

  return (
    <View style={[styles.masonry, { gap: spacingValue }, style]}>
      {columnArrays.map((columnChildren, columnIndex) => (
        <View
          key={columnIndex}
          style={[styles.masonryColumn, { gap: spacingValue }]}
        >
          {columnChildren}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    marginHorizontal: 'auto',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    flexShrink: 0,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  masonry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },
});
