// Agora Service - Web Stub
// Video/Voice calls are not supported on web platform

import { Alert } from 'react-native';

export interface AgoraCallbacks {
  onUserJoined?: (uid: number) => void;
  onUserOffline?: (uid: number, reason: number) => void;
  onJoinChannelSuccess?: (connection: any, elapsed: number) => void;
  onLeaveChannel?: (connection: any, stats: any) => void;
  onError?: (err: number, msg: string) => void;
  onRemoteVideoStateChanged?: (uid: number, state: number, reason: number) => void;
  onRemoteAudioStateChanged?: (uid: number, state: number, reason: number) => void;
  onConnectionStateChanged?: (state: number, reason: number) => void;
  onLocalVideoStateChanged?: (source: any, state: number, error: number) => void;
}

export interface CallConfig {
  channelName: string;
  uid?: number;
  token?: string;
  isVideoCall: boolean;
}

class AgoraServiceWeb {
  private callbacks: AgoraCallbacks = {};

  isSupported(): boolean {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    console.log('[Agora] Web platform - calls not supported');
    return false;
  }

  async initialize(): Promise<boolean> {
    console.log('[Agora] Web platform - calls not supported');
    return false;
  }

  setCallbacks(callbacks: AgoraCallbacks): void {
    this.callbacks = callbacks;
  }

  async joinChannel(config: CallConfig): Promise<boolean> {
    console.log('[Agora] Web platform - calls not supported');
    this.callbacks.onError?.(0, 'Video/voice calls are only available on mobile devices. Please use the iOS or Android app.');
    return false;
  }

  async leaveChannel(): Promise<void> {
    console.log('[Agora] Web platform - no channel to leave');
  }

  setMicrophoneMute(muted: boolean): void {}
  setVideoEnabled(enabled: boolean): void {}
  setSpeakerphoneEnabled(enabled: boolean): void {}
  switchCamera(): void {}
  startPreview(): void {}
  stopPreview(): void {}

  getEngine(): null {
    return null;
  }

  isReady(): boolean {
    return false;
  }

  getState() {
    return {
      isSupported: false,
      isInitialized: false,
      currentChannel: null,
      isMuted: false,
      isVideoEnabled: false,
      isSpeakerOn: true,
      isFrontCamera: true,
    };
  }

  async destroy(): Promise<void> {}

  static generateChannelName(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `call_${sortedIds[0]}_${sortedIds[1]}_${Date.now()}`;
  }
}

export const agoraService = new AgoraServiceWeb();
export default agoraService;
