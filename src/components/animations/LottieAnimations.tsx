import React, { memo, useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Animated, Easing } from 'react-native';

// Custom Lottie-like animations using React Native Animated
// Since we don't have actual Lottie files, we'll create smooth CSS-like animations

interface LoadingAnimationProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const LoadingSpinner = memo<LoadingAnimationProps>(({
  size = 40,
  color = '#007AFF',
  style,
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderColor: `${color}30`,
            borderTopColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  );
});

export const PulsingDot = memo<LoadingAnimationProps>(({
  size = 12,
  color = '#007AFF',
  style,
}) => {
  const scaleValue = useRef(new Animated.Value(0.5)).current;
  const opacityValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 0.5,
            duration: 1000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(animate);
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale: scaleValue }],
          opacity: opacityValue,
        },
        style,
      ]}
    />
  );
});

interface SuccessCheckProps {
  size?: number;
  color?: string;
  duration?: number;
  style?: ViewStyle;
}

export const SuccessCheck = memo<SuccessCheckProps>(({
  size = 60,
  color = '#22C55E',
  duration = 600,
  style,
}) => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const checkValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(checkValue, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          transform: [{ scale: scaleValue }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.successCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.checkMark,
            {
              opacity: checkValue,
              transform: [
                {
                  scale: checkValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.checkMarkLine,
              styles.checkMarkLineShort,
              { backgroundColor: color },
            ]}
          />
          <View
            style={[
              styles.checkMarkLine,
              styles.checkMarkLineLong,
              { backgroundColor: color },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
});

interface HeartBeatProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const HeartBeat = memo<HeartBeatProps>(({
  size = 30,
  color = '#EF4444',
  style,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = () => {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]).start(beat);
    };
    beat();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          transform: [{ scale: scaleValue }],
        },
        style,
      ]}
    >
      <View style={[styles.heart, { width: size, height: size }]}>
        <View
          style={[
            styles.heartLeft,
            {
              width: size * 0.5,
              height: size * 0.8,
              backgroundColor: color,
              borderRadius: size * 0.25,
            },
          ]}
        />
        <View
          style={[
            styles.heartRight,
            {
              width: size * 0.5,
              height: size * 0.8,
              backgroundColor: color,
              borderRadius: size * 0.25,
            },
          ]}
        />
        <View
          style={[
            styles.heartBottom,
            {
              width: size * 0.7,
              height: size * 0.7,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  spinner: {
    borderWidth: 3,
    borderRadius: 20,
  },
  successCircle: {
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMarkLine: {
    position: 'absolute',
  },
  checkMarkLineShort: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }, { translateX: -2 }, { translateY: 2 }],
  },
  checkMarkLineLong: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }, { translateX: 4 }, { translateY: 2 }],
  },
  heart: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartLeft: {
    position: 'absolute',
    left: '25%',
    top: 0,
  },
  heartRight: {
    position: 'absolute',
    right: '25%',
    top: 0,
  },
  heartBottom: {
    position: 'absolute',
    bottom: 0,
    transform: [{ rotate: '45deg' }],
  },
});

// Animated Number Counter
interface CounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  style?: ViewStyle;
}

export const AnimatedCounter = memo<CounterProps>(({
  value,
  duration = 1000,
  formatter = (v) => Math.round(v).toString(),
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    animatedValue.addListener(({ value: animValue }) => {
      setDisplayValue(animValue);
    });

    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeAllListeners();
    };
  }, [value]);

  return (
    <Animated.Text style={style}>
      {formatter(displayValue)}
    </Animated.Text>
  );
});
