import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { captureError } from '../services/errorReporting';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });

        // Send to error reporting service (Sentry)
        captureError(error, {
            severity: 'fatal',
            tags: { type: 'react_error_boundary' },
            extra: { componentStack: errorInfo.componentStack },
        });
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Feather name="alert-triangle" size={48} color="#F59E0B" />
                        </View>
                        <Text style={styles.title}>Oops! Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We're sorry for the inconvenience. Please try again.
                        </Text>
                        <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                            <Feather name="refresh-cw" size={18} color="#fff" />
                            <Text style={styles.retryText}>Try Again</Text>
                        </TouchableOpacity>
                        {__DEV__ && this.state.error && (
                            <Text style={styles.debugText}>
                                {this.state.error.toString()}
                            </Text>
                        )}
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

// Network Error Display Component
interface NetworkErrorProps {
    message?: string;
    onRetry?: () => void;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
    message = 'Unable to connect. Please check your internet connection.',
    onRetry,
}) => (
    <View style={styles.networkErrorContainer}>
        <Feather name="wifi-off" size={48} color="#64748B" />
        <Text style={styles.networkErrorTitle}>No Connection</Text>
        <Text style={styles.networkErrorMessage}>{message}</Text>
        {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Feather name="refresh-cw" size={18} color="#fff" />
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        )}
    </View>
);

// Empty State Component
interface EmptyStateProps {
    icon?: keyof typeof Feather.glyphMap;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox',
    title,
    message,
    actionLabel,
    onAction,
}) => (
    <View style={styles.emptyStateContainer}>
        <View style={styles.emptyIconContainer}>
            <Feather name={icon} size={48} color="#64748B" />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        {message && <Text style={styles.emptyMessage}>{message}</Text>}
        {actionLabel && onAction && (
            <TouchableOpacity style={styles.emptyActionButton} onPress={onAction}>
                <Text style={styles.emptyActionText}>{actionLabel}</Text>
            </TouchableOpacity>
        )}
    </View>
);

// Loading State Component
interface LoadingStateProps {
    message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = 'Loading...',
}) => (
    <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner}>
            <Feather name="loader" size={32} color="#C9A962" />
        </View>
        <Text style={styles.loadingText}>{message}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#05050a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#8b8b9e',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C9A962',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    debugText: {
        fontSize: 10,
        color: '#666',
        marginTop: 20,
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    // Network Error styles
    networkErrorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#05050a',
    },
    networkErrorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginTop: 16,
        marginBottom: 8,
    },
    networkErrorMessage: {
        fontSize: 14,
        color: '#8b8b9e',
        textAlign: 'center',
        marginBottom: 24,
    },
    // Empty State styles
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        color: '#8b8b9e',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyActionButton: {
        backgroundColor: '#C9A962',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    emptyActionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Loading State styles
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingSpinner: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 14,
        color: '#8b8b9e',
    },
});
