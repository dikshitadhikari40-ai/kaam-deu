// Agora Service - Voice/Video calls for Kaam Deu
// Uses react-native-agora SDK for real-time communication
// Note: Video calls only work on iOS/Android. Web shows a "coming soon" message.

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Constants from 'expo-constants';

// Get App ID from environment variables
const AGORA_APP_ID = Constants.expoConfig?.extra?.agoraAppId ||
  process.env.EXPO_PUBLIC_AGORA_APP_ID ||
  '';

// Check if we're on a platform that supports Agora
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Dynamic import types - will be loaded on native platforms only
let createAgoraRtcEngine: any = null;
let ChannelProfileType: any = null;
let ClientRoleType: any = null;
let RtcConnection: any = null;

// Conditionally import Agora SDK only on native platforms
if (IS_NATIVE) {
  try {
    const agoraModule = require('react-native-agora');
    createAgoraRtcEngine = agoraModule.default || agoraModule.createAgoraRtcEngine;
    ChannelProfileType = agoraModule.ChannelProfileType;
    ClientRoleType = agoraModule.ClientRoleType;
    RtcConnection = agoraModule.RtcConnection;
  } catch (error) {
    console.log('[Agora] Native module not available:', error);
  }
}

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

class AgoraService {
  private engine: any = null;
  private callbacks: AgoraCallbacks = {};
  private isInitialized: boolean = false;
  private currentChannel: string | null = null;
  private isMuted: boolean = false;
  private isVideoEnabled: boolean = true;
  private isSpeakerOn: boolean = true;
  private isFrontCamera: boolean = true;

  // Check if Agora is supported on current platform
  isSupported(): boolean {
    return IS_NATIVE && createAgoraRtcEngine !== null;
  }

  // Request necessary permissions for audio/video
  async requestPermissions(): Promise<boolean> {
    if (!IS_NATIVE) {
      console.log('[Agora] Web platform - permissions not required');
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const audioGranted = results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const cameraGranted = results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!audioGranted || !cameraGranted) {
          console.warn('[Agora] Some permissions were not granted');
          return false;
        }

        console.log('[Agora] All permissions granted');
        return true;
      } catch (error) {
        console.error('[Agora] Permission request failed:', error);
        return false;
      }
    }

    // iOS handles permissions differently - they're requested when needed
    return true;
  }

  // Initialize the Agora engine
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[Agora] Not supported on this platform');
      return false;
    }

    if (this.isInitialized && this.engine) {
      console.log('[Agora] Already initialized');
      return true;
    }

    if (!AGORA_APP_ID) {
      console.error('[Agora] App ID is not configured');
      Alert.alert(
        'Configuration Error',
        'Agora App ID is not configured. Please set EXPO_PUBLIC_AGORA_APP_ID in your .env file.'
      );
      return false;
    }

    try {
      // Request permissions first
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn('[Agora] Permissions not granted, some features may not work');
      }

      // Create the RTC engine
      this.engine = createAgoraRtcEngine();

      // Initialize with App ID
      this.engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType?.ChannelProfileCommunication || 0,
      });

      // Register event handlers
      this.registerEventHandlers();

      // Enable video by default
      this.engine.enableVideo();
      this.engine.enableAudio();

      // Set default audio route to speaker
      this.engine.setDefaultAudioRouteToSpeakerphone(true);

      this.isInitialized = true;
      console.log('[Agora] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Agora] Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Register event handlers for Agora callbacks
  private registerEventHandlers(): void {
    if (!this.engine) return;

    const eventHandler = {
      onJoinChannelSuccess: (connection: any, elapsed: number) => {
        console.log('[Agora] Joined channel:', connection?.channelId);
        this.currentChannel = connection?.channelId || null;
        this.callbacks.onJoinChannelSuccess?.(connection, elapsed);
      },

      onLeaveChannel: (connection: any, stats: any) => {
        console.log('[Agora] Left channel');
        this.currentChannel = null;
        this.callbacks.onLeaveChannel?.(connection, stats);
      },

      onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
        console.log('[Agora] Remote user joined:', remoteUid);
        this.callbacks.onUserJoined?.(remoteUid);
      },

      onUserOffline: (connection: any, remoteUid: number, reason: number) => {
        console.log('[Agora] Remote user offline:', remoteUid, 'reason:', reason);
        this.callbacks.onUserOffline?.(remoteUid, reason);
      },

      onError: (err: number, msg: string) => {
        console.error('[Agora] Error:', err, msg);
        this.callbacks.onError?.(err, msg);
      },

      onConnectionStateChanged: (connection: any, state: number, reason: number) => {
        console.log('[Agora] Connection state changed:', state, 'reason:', reason);
        this.callbacks.onConnectionStateChanged?.(state, reason);
      },

      onRemoteVideoStateChanged: (connection: any, remoteUid: number, state: number, reason: number, elapsed: number) => {
        console.log('[Agora] Remote video state changed:', remoteUid, state);
        this.callbacks.onRemoteVideoStateChanged?.(remoteUid, state, reason);
      },

      onRemoteAudioStateChanged: (connection: any, remoteUid: number, state: number, reason: number, elapsed: number) => {
        console.log('[Agora] Remote audio state changed:', remoteUid, state);
        this.callbacks.onRemoteAudioStateChanged?.(remoteUid, state, reason);
      },

      onLocalVideoStateChanged: (source: any, state: number, error: number) => {
        console.log('[Agora] Local video state changed:', state, error);
        this.callbacks.onLocalVideoStateChanged?.(source, state, error);
      },
    };

    this.engine.registerEventHandler(eventHandler);
  }

  // Set callbacks for call events
  setCallbacks(callbacks: AgoraCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Join a channel for a call
  async joinChannel(config: CallConfig): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[Agora] Calls not supported on web platform');
      this.callbacks.onError?.(0, 'Video/voice calls are only available on mobile devices');
      return false;
    }

    if (!this.isInitialized || !this.engine) {
      console.log('[Agora] Not initialized, attempting to initialize...');
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }

    try {
      const { channelName, uid = 0, token, isVideoCall } = config;

      // Set client role
      this.engine.setClientRole(ClientRoleType?.ClientRoleBroadcaster || 1);

      // Enable/disable video based on call type
      if (isVideoCall) {
        this.engine.enableVideo();
        this.engine.startPreview();
        this.isVideoEnabled = true;
      } else {
        this.engine.disableVideo();
        this.isVideoEnabled = false;
      }

      // Join the channel
      // Note: For production, you should use a token generated by your server
      // For testing, you can use null/empty string if token authentication is disabled in Agora Console
      this.engine.joinChannel(token || '', channelName, uid, {
        clientRoleType: ClientRoleType?.ClientRoleBroadcaster || 1,
        publishMicrophoneTrack: true,
        publishCameraTrack: isVideoCall,
        autoSubscribeAudio: true,
        autoSubscribeVideo: isVideoCall,
      });

      console.log('[Agora] Joining channel:', channelName);
      return true;
    } catch (error) {
      console.error('[Agora] Failed to join channel:', error);
      return false;
    }
  }

  // Leave the current channel
  async leaveChannel(): Promise<void> {
    if (!this.engine) return;

    try {
      this.engine.leaveChannel();
      this.currentChannel = null;
      console.log('[Agora] Left channel');
    } catch (error) {
      console.error('[Agora] Failed to leave channel:', error);
    }
  }

  // Mute/unmute local microphone
  setMicrophoneMute(muted: boolean): void {
    if (!this.engine) return;
    this.engine.muteLocalAudioStream(muted);
    this.isMuted = muted;
    console.log('[Agora] Microphone muted:', muted);
  }

  // Enable/disable local video
  setVideoEnabled(enabled: boolean): void {
    if (!this.engine) return;

    if (enabled) {
      this.engine.enableVideo();
      this.engine.muteLocalVideoStream(false);
      this.engine.startPreview();
    } else {
      this.engine.muteLocalVideoStream(true);
      this.engine.stopPreview();
    }

    this.isVideoEnabled = enabled;
    console.log('[Agora] Video enabled:', enabled);
  }

  // Enable/disable speaker
  setSpeakerphoneEnabled(enabled: boolean): void {
    if (!this.engine) return;
    this.engine.setEnableSpeakerphone(enabled);
    this.isSpeakerOn = enabled;
    console.log('[Agora] Speakerphone enabled:', enabled);
  }

  // Switch between front and back camera
  switchCamera(): void {
    if (!this.engine) return;
    this.engine.switchCamera();
    this.isFrontCamera = !this.isFrontCamera;
    console.log('[Agora] Camera switched, now front:', this.isFrontCamera);
  }

  // Start local video preview
  startPreview(): void {
    if (!this.engine) return;
    this.engine.startPreview();
    console.log('[Agora] Preview started');
  }

  // Stop local video preview
  stopPreview(): void {
    if (!this.engine) return;
    this.engine.stopPreview();
    console.log('[Agora] Preview stopped');
  }

  // Get the Agora RTC engine instance
  getEngine(): any {
    return this.engine;
  }

  // Check if the service is ready
  isReady(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  // Get current state
  getState() {
    return {
      isSupported: this.isSupported(),
      isInitialized: this.isInitialized,
      currentChannel: this.currentChannel,
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
      isSpeakerOn: this.isSpeakerOn,
      isFrontCamera: this.isFrontCamera,
    };
  }

  // Destroy the engine and clean up
  async destroy(): Promise<void> {
    if (!this.engine) return;

    try {
      await this.leaveChannel();
      this.engine.unregisterEventHandler({});
      this.engine.release();
      this.engine = null;
      this.isInitialized = false;
      this.callbacks = {};
      console.log('[Agora] Engine destroyed');
    } catch (error) {
      console.error('[Agora] Failed to destroy engine:', error);
    }
  }

  // Generate a unique channel name for a call between two users
  static generateChannelName(userId1: string, userId2: string): string {
    // Sort IDs to ensure consistent channel name regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    return `call_${sortedIds[0]}_${sortedIds[1]}_${Date.now()}`;
  }
}

export const agoraService = new AgoraService();
export default agoraService;
