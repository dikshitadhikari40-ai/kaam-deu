import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { agoraService, AgoraCallbacks } from '../services/agoraService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AgoraVideoView } from '../components/AgoraVideoView';

const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Note: Video rendering components are only available on native platforms
// On web, we show a placeholder. Video views are rendered via the engine on native.

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CallScreenProps {
  navigation: any;
  route: {
    params: {
      matchId: string;
      matchName: string;
      matchImage: string;
      matchUserId: string;
      callType: 'voice' | 'video';
      isIncoming?: boolean;
      activeCallId?: string;
      channelName?: string;
    };
  };
}

type CallState = 'connecting' | 'ringing' | 'connected' | 'ended';

export default function CallScreen({ navigation, route }: CallScreenProps) {
  const { matchId, matchName, matchImage, matchUserId, callType, isIncoming, activeCallId, channelName: providedChannel } = route.params;
  const { user } = useAuth();

  // State
  const [callState, setCallState] = useState<CallState>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isLocalVideoReady, setIsLocalVideoReady] = useState(false);

  // Refs
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelNameRef = useRef<string>('');
  const callIdRef = useRef<string | null>(activeCallId || null);

  // Initialize call
  useEffect(() => {
    initializeCall();

    return () => {
      cleanupCall();
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  const initializeCall = async () => {
    try {
      // Set up Agora callbacks
      const callbacks: AgoraCallbacks = {
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('[Call] Joined channel successfully');
          if (isIncoming) {
            setCallState('connected');
          } else {
            setCallState('ringing');
          }
        },
        onUserJoined: (uid) => {
          console.log('[Call] Remote user joined:', uid);
          setRemoteUid(uid);
          setCallState('connected');
        },
        onUserOffline: (uid, reason) => {
          console.log('[Call] Remote user left:', uid);
          setRemoteUid(null);
          endCall('Remote user ended the call');
        },
        onError: (err, msg) => {
          console.error('[Call] Error:', err, msg);
          Alert.alert('Call Error', msg || 'An error occurred during the call');
        },
        onLocalVideoStateChanged: (source, state, error) => {
          if (state === 1) { // Local video capturing
            setIsLocalVideoReady(true);
          }
        },
      };

      agoraService.setCallbacks(callbacks);

      // Initialize Agora
      const initialized = await agoraService.initialize();
      if (!initialized) {
        Alert.alert('Error', 'Failed to initialize call service');
        navigation.goBack();
        return;
      }

      // Generate or use provided channel name
      if (providedChannel) {
        channelNameRef.current = providedChannel;
      } else {
        channelNameRef.current = agoraService.constructor.prototype.constructor.name === 'AgoraService'
          ? `call_${[user?.id, matchUserId].sort().join('_')}_${Date.now()}`
          : `call_${Date.now()}`;
      }

      // Create call record in database (for outgoing calls)
      if (!isIncoming && user?.id) {
        await createCallRecord();
      }

      // Join the channel
      const joined = await agoraService.joinChannel({
        channelName: channelNameRef.current,
        isVideoCall: callType === 'video',
      });

      if (!joined) {
        Alert.alert('Error', 'Failed to join call');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[Call] Init error:', error);
      Alert.alert('Error', 'Failed to start call');
      navigation.goBack();
    }
  };

  const createCallRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('active_calls')
        .insert({
          caller_id: user?.id,
          callee_id: matchUserId,
          match_id: matchId,
          channel_name: channelNameRef.current,
          call_type: callType,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;
      callIdRef.current = data.id;
    } catch (error) {
      console.error('[Call] Failed to create call record:', error);
    }
  };

  const updateCallStatus = async (status: string) => {
    if (!callIdRef.current) return;

    try {
      await supabase
        .from('active_calls')
        .update({
          status,
          ended_at: status === 'ended' ? new Date().toISOString() : null,
          duration_seconds: status === 'ended' ? callDuration : null,
        })
        .eq('id', callIdRef.current);
    } catch (error) {
      console.error('[Call] Failed to update call status:', error);
    }
  };

  const cleanupCall = async () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    await agoraService.leaveChannel();
    await updateCallStatus('ended');
  };

  const endCall = async (reason?: string) => {
    setCallState('ended');
    await cleanupCall();

    if (reason) {
      Alert.alert('Call Ended', reason, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      navigation.goBack();
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    agoraService.setMicrophoneMute(newMuted);
    setIsMuted(newMuted);
  };

  const toggleVideo = () => {
    const newEnabled = !isVideoEnabled;
    agoraService.setVideoEnabled(newEnabled);
    setIsVideoEnabled(newEnabled);
  };

  const toggleSpeaker = () => {
    const newEnabled = !isSpeakerOn;
    agoraService.setSpeakerphoneEnabled(newEnabled);
    setIsSpeakerOn(newEnabled);
  };

  const switchCamera = () => {
    agoraService.switchCamera();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return isIncoming ? 'Incoming call...' : 'Calling...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  const engine = agoraService.getEngine();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Video Views */}
      {callType === 'video' && (
        <View style={styles.videoContainer}>
          {/* Remote Video */}
          {IS_NATIVE && remoteUid !== null ? (
            <AgoraVideoView
              uid={remoteUid}
              channelId={channelNameRef.current}
              style={styles.remoteVideo}
            />
          ) : (
            <View style={styles.avatarOverlay}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: matchImage }} style={styles.avatar} />
              </View>
              <Text style={styles.callerName}>{matchName}</Text>
              <Text style={styles.statusText}>{getStatusText()}</Text>
              {!IS_NATIVE && (
                <Text style={styles.webNotice}>
                  Video calls are only available on mobile devices
                </Text>
              )}
            </View>
          )}

          {/* Local Video (PIP) */}
          {IS_NATIVE && isVideoEnabled && (
            <View style={styles.localVideoContainer}>
              <AgoraVideoView
                uid={0}
                channelId={channelNameRef.current}
                style={styles.localVideo}
                zOrderMediaOverlay={true}
              />
            </View>
          )}

          {/* Camera switch button for native */}
          {IS_NATIVE && isVideoEnabled && (
            <TouchableOpacity
              style={styles.floatingSwitchCamera}
              onPress={switchCamera}
            >
              <Feather name="refresh-cw" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Voice Call UI */}
      {callType === 'voice' && (
        <View style={styles.voiceCallContainer}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: matchImage }} style={styles.avatar} />
            {callState === 'connecting' && (
              <ActivityIndicator
                style={styles.connectingIndicator}
                size="large"
                color={theme.colors.accent}
              />
            )}
          </View>
          <Text style={styles.callerName}>{matchName}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {callState === 'connected' && (
            <View style={styles.audioWaveContainer}>
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.audioWaveBar,
                    { height: 20 + Math.random() * 30 }
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Feather
              name={isMuted ? 'mic-off' : 'mic'}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlLabel}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {/* Speaker Button (Voice call only) */}
          {callType === 'voice' && (
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
            >
              <Feather
                name={isSpeakerOn ? 'volume-2' : 'volume-x'}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          )}

          {/* Video Toggle (Video call only) */}
          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Feather
                name={isVideoEnabled ? 'video' : 'video-off'}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlLabel}>
                {isVideoEnabled ? 'Stop Video' : 'Start Video'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={() => endCall()}
        >
          <Feather name="phone-off" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
  },
  switchCameraButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  voiceCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  connectingIndicator: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  webNotice: {
    fontSize: 14,
    color: theme.colors.accent,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connectedNotice: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 16,
    textAlign: 'center',
  },
  floatingSwitchCamera: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 25,
  },
  audioWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 6,
  },
  audioWaveBar: {
    width: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  controlsContainer: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginBottom: 30,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 6,
  },
  endCallButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
