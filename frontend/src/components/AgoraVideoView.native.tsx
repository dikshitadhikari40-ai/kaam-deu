import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RtcSurfaceView } from 'react-native-agora';

interface AgoraVideoViewProps {
    uid: number;
    channelId: string;
    style?: any;
    zOrderMediaOverlay?: boolean;
}

export const AgoraVideoView: React.FC<AgoraVideoViewProps> = ({
    uid,
    channelId,
    style,
    zOrderMediaOverlay = false
}) => {
    return (
        <RtcSurfaceView
            style={style}
            zOrderMediaOverlay={zOrderMediaOverlay}
            canvas={{ uid }}
            connection={{ channelId }}
        />
    );
};
