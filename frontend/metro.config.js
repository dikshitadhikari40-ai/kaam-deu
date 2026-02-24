const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs');

// Platform-specific file resolution
// This ensures .web.ts files are used on web and .native.ts on iOS/Android
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle react-native-agora - block it on web
  if (platform === 'web' && moduleName === 'react-native-agora') {
    return {
      type: 'empty',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
