const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize bundle size
config.resolver.assetExts.push(
  // Add support for additional asset types
  'db',
  'mp3',
  'ttf',
  'otf',
  'woff',
  'woff2'
);

// Optimize JavaScript transformations
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Enable advanced minification
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
    },
    output: {
      ascii_only: true,
      quote_keys: false,
      wrap_iife: true,
    },
    sourceMap: false,
    toplevel: false,
    warnings: false,
  },
};

// Optimize resolver
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  alias: {
    // Add aliases for better tree shaking
    '@': './src',
    '@components': './src/components',
    '@screens': './src/screens',
    '@stores': './src/stores',
    '@utils': './src/utils',
    '@types': './src/types',
  },
};

// Optimize watchman
config.watchFolders = [
  ...config.watchFolders || [],
];

// Optimize caching
config.cacheStores = [
  ...config.cacheStores || [],
];

module.exports = config;
