import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AgoraVideoViewProps {
    uid: number;
    channelId: string;
    style?: any;
    zOrderMediaOverlay?: boolean;
}

export const AgoraVideoView: React.FC<AgoraVideoViewProps> = ({ style }) => {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.text}>Video not supported on Web</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    text: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
        padding: 8,
    },
});
