import React, { memo, useEffect, useRef } from 'react';
import {
  Animated,
  ViewStyle,
  TextStyle,
  Easing,
  Dimensions,
} from 'react-native';
import { Animations } from '../../design/DesignSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Fade In Animation
interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const FadeIn = memo<FadeInProps>(({
  children,
  duration = Animations.duration.normal,
  delay = 0,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
});

// Slide In Animation
interface SlideInProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export const SlideIn = memo<SlideInProps>(({
  children,
  direction = 'up',
  duration = Animations.duration.normal,
  delay = 0,
  distance = 50,
  style,
}) => {
  const translateX = useRef(new Animated.Value(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  )).current;
  const translateY = useRef(new Animated.Value(
    direction === 'up' ? distance : direction === 'down' ? -distance : 0
  )).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX }, { translateY }],
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Scale In Animation
interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
}

export const ScaleIn = memo<ScaleInProps>(({
  children,
  duration = Animations.duration.normal,
  delay = 0,
  initialScale = 0.8,
  style,
}) => {
  const scale = useRef(new Animated.Value(initialScale)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Staggered Animation Container
interface StaggeredContainerProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animationType?: 'fadeIn' | 'slideIn' | 'scaleIn';
  direction?: 'up' | 'down' | 'left' | 'right';
  style?: ViewStyle;
}

export const StaggeredContainer = memo<StaggeredContainerProps>(({
  children,
  staggerDelay = 100,
  animationType = 'fadeIn',
  direction = 'up',
  style,
}) => {
  return (
    <Animated.View style={style}>
      {React.Children.map(children, (child, index) => {
        const delay = index * staggerDelay;
        
        switch (animationType) {
          case 'slideIn':
            return (
              <SlideIn key={index} delay={delay} direction={direction}>
                {child}
              </SlideIn>
            );
          case 'scaleIn':
            return (
              <ScaleIn key={index} delay={delay}>
                {child}
              </ScaleIn>
            );
          default:
            return (
              <FadeIn key={index} delay={delay}>
                {child}
              </FadeIn>
            );
        }
      })}
    </Animated.View>
  );
});

// Pulse Animation
interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  minScale?: number;
  maxScale?: number;
  style?: ViewStyle;
}

export const Pulse = memo<PulseProps>(({
  children,
  duration = 1000,
  minScale = 0.95,
  maxScale = 1.05,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: minScale,
          duration: duration / 2,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(animate);
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Shake Animation
interface ShakeProps {
  children: React.ReactNode;
  trigger: boolean;
  duration?: number;
  intensity?: number;
  style?: ViewStyle;
}

export const Shake = memo<ShakeProps>(({
  children,
  trigger,
  duration = 500,
  intensity = 10,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger) {
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: intensity,
          duration: duration / 8,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -intensity,
          duration: duration / 8,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: intensity,
          duration: duration / 8,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -intensity,
          duration: duration / 8,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [trigger]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Progress Bar Animation
interface AnimatedProgressBarProps {
  progress: number; // 0 to 1
  duration?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export const AnimatedProgressBar = memo<AnimatedProgressBarProps>(({
  progress,
  duration = Animations.duration.normal,
  color = '#007AFF',
  backgroundColor = '#E5E5EA',
  height = 4,
  style,
}) => {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: progress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
          width: width.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp',
          }),
        }}
      />
    </Animated.View>
  );
});

// Floating Action Button Animation
interface FloatingActionButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}

export const FloatingActionButton = memo<FloatingActionButtonProps>(({
  children,
  onPress,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      rotate.setValue(0);
    });
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale },
            {
              rotate: rotate.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '15deg'],
              }),
            },
          ],
        },
        style,
      ]}
    >
      <Animated.View
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={handlePressOut}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
});
