import { Platform, Text, View, StyleSheet } from 'react-native';
import React from 'react';
import { Feather as FeatherIcon, MaterialCommunityIcons as MaterialIcon } from '@expo/vector-icons';

// Emoji fallback mappings for common icons
const ICON_FALLBACKS: Record<string, string> = {
    // Feather icons
    'check-circle': '✓',
    'arrow-right': '→',
    'arrow-left': '←',
    'user': '👤',
    'settings': '⚙',
    'heart': '❤',
    'x': '✕',
    'star': '★',
    'message-circle': '💬',
    'layers': '☰',
    'briefcase': '💼',
    'mail': '✉',
    'lock': '🔒',
    'eye': '👁',
    'eye-off': '👁',
    'camera': '📷',
    'edit': '✎',
    'trash': '🗑',
    'plus': '+',
    'minus': '-',
    'search': '🔍',
    'menu': '☰',
    'home': '🏠',
    'bell': '🔔',
    'calendar': '📅',
    'clock': '⏰',
    'map-pin': '📍',
    'phone': '📞',
    'info': 'ℹ',
    'alert-circle': '⚠',
    'check': '✓',
    'chevron-right': '›',
    'chevron-left': '‹',
    'chevron-down': '⌄',
    'chevron-up': '⌃',
    'log-out': '↪',
    'upload': '↑',
    'download': '↓',
    'share': '↗',
    'copy': '📋',
    'filter': '⚙',
    'refresh-cw': '↻',
    // Material Community icons
    'account-hard-hat': '👷',
    'domain': '🏢',
    'google': 'G',
    'linkedin': 'in',
    'facebook': 'f',
    'twitter': '𝕏',
    'shield-check': '🛡',
    'crown': '👑',
    'fire': '🔥',
    'diamond': '💎',
    'rocket': '🚀',
    'lightning-bolt': '⚡',
};

// Web fallback component with better styling
export const IconFallback = ({ name, size = 24, color = '#666', style }: any) => {
    const fallback = ICON_FALLBACKS[name] || '○';
    return (
        <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
            <Text style={{ fontSize: size * 0.7, color, textAlign: 'center', lineHeight: size }}>
                {fallback}
            </Text>
        </View>
    );
};

// Wrapper component that uses real icons with fallback on error
const createIconComponent = (IconComponent: any) => {
    return React.forwardRef((props: any, ref: any) => {
        const { name, size = 24, color = '#666', style, ...rest } = props;

        // On web, try to use the icon font, it should work if fonts loaded
        try {
            return <IconComponent ref={ref} name={name} size={size} color={color} style={style} {...rest} />;
        } catch (error) {
            // Fallback to emoji if icon font fails
            return <IconFallback name={name} size={size} color={color} style={style} />;
        }
    });
};

// Export the icon components - they use the real fonts loaded in App.tsx
export const Feather = FeatherIcon;
export const MaterialCommunityIcons = MaterialIcon;
