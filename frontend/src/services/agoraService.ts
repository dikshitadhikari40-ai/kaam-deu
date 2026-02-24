// Agora Service - Platform-specific exports
// Metro bundler handles platform resolution + react-native-agora blocked on web

import { Platform } from 'react-native';

// Re-export types (these are safe for all platforms)
export type { AgoraCallbacks, CallConfig } from './agoraService.web';

// Import web version (always safe)
import { agoraService as webService } from './agoraService.web';

// For web, use the web service
// For native, dynamically require the native version
let agoraServiceInstance: typeof webService;

if (Platform.OS === 'web') {
  agoraServiceInstance = webService;
} else {
  // On native platforms, load the full implementation
  // This require is only evaluated at runtime on native
  try {
    agoraServiceInstance = require('./agoraService.native').agoraService;
  } catch (e) {
    console.log('[Agora] Native module not available, using web fallback');
    agoraServiceInstance = webService;
  }
}

export const agoraService = agoraServiceInstance;
export default agoraService;
