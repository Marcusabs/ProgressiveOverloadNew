module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated plugin (must be last)
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Production optimizations (commented out for now to avoid dependency issues)
          // ['transform-remove-console'],
          // ['transform-remove-debugger'],
        ],
      },
    },
  };
};
