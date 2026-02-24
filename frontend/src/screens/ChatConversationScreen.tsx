import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    ActivityIndicator,
    Keyboard,
    Alert,
    Modal,
    ScrollView,
    Linking,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import {
    messageService,
    Message,
    blockService,
    typingService,
    presenceService,
    MessageType,
} from '../services/database';
import { theme } from '../theme';
import ReportModal from '../components/ReportModal';
import EmojiModal from '../components/EmojiModal';

const { width: screenWidth } = Dimensions.get('window');

// Quick reply templates based on role
const WORKER_QUICK_REPLIES = [
    "I'm interested!",
    "When can we meet?",
    "What's the salary?",
    "I'm available now",
    "Can you share more details?",
];

const BUSINESS_QUICK_REPLIES = [
    "Let's schedule an interview",
    "Can you share your experience?",
    "Are you available tomorrow?",
    "Position filled, thanks!",
    "What's your expected salary?",
];

export default function ChatConversationScreen({ navigation, route }: any) {
    const { matchId, matchName, matchImage, matchUserId } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [otherUserOnline, setOtherUserOnline] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Get quick replies based on user role
    const quickReplies = user?.role === 'business' ? BUSINESS_QUICK_REPLIES : WORKER_QUICK_REPLIES;

    // Handle quick reply selection
    const handleQuickReply = (text: string) => {
        setInputText(text);
        setShowQuickReplies(false);
    };

    // Handle emoji selection
    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
        // Don't close picker for multi-select convenience? Or close it? Let's keep it open or user preference.
        // User requested "emoji is not enableed it need to be added"
        // setShowEmojiPicker(false); 
    };

    // Handle key press (Enter to send)
    const handleKeyPress = (e: any) => {
        if (Platform.OS === 'web') {
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        }
    };

    // Handle typing indicator
    const handleTextChange = (text: string) => {
        setInputText(text);

        // Send typing indicator
        if (text.length > 0) {
            typingService.setTyping(matchId, true);

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                typingService.setTyping(matchId, false);
            }, 2000);
        } else {
            typingService.setTyping(matchId, false);
        }
    };

    // Handle block user
    const handleBlockUser = () => {
        setShowMenu(false);
        Alert.alert(
            'Block User',
            `Are you sure you want to block ${matchName}? They won't be able to contact you anymore.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await blockService.blockUser(matchUserId);
                        if (result.success) {
                            Alert.alert('Blocked', `${matchName} has been blocked.`);
                            navigation.goBack();
                        } else {
                            Alert.alert('Error', result.error || 'Failed to block user');
                        }
                    },
                },
            ]
        );
    };

    // Handle report user
    const handleReportUser = () => {
        setShowMenu(false);
        setShowReportModal(true);
    };

    // View user profile
    const handleViewProfile = () => {
        setShowMenu(false);
        navigation.navigate('Profile', { userId: matchUserId });
    };

    // Handle user blocked from report modal
    const handleUserBlocked = () => {
        navigation.goBack();
    };

    // Load messages from Supabase
    const loadMessages = useCallback(async () => {
        try {
            const msgs = await messageService.getMessages(matchId);
            setMessages(msgs);

            // Mark messages as read
            await messageService.markAsRead(matchId);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        loadMessages();

        // Update presence - user is in this chat
        presenceService.updatePresence(true, matchId);

        // Subscribe to real-time messages
        const messageSubscription = messageService.subscribeToMessages(matchId, (payload) => {
            if (payload.eventType === 'INSERT') {
                const newMessage = payload.new as Message;
                // Only add if it's from the other user (our messages are added immediately)
                if (newMessage.sender_id !== user?.id) {
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                    // Mark as read
                    messageService.markAsRead(matchId);
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedMessage = payload.new as Message;
                setMessages(prev => prev.map(msg =>
                    msg.id === updatedMessage.id ? updatedMessage : msg
                ));
            }
        });

        // Subscribe to typing indicators
        const typingSubscription = typingService.subscribeToTyping(matchId, (userId, isTyping) => {
            if (userId !== user?.id) {
                setIsOtherTyping(isTyping);
            }
        });

        // Subscribe to other user's presence
        const presenceSubscription = presenceService.subscribeToPresence(matchUserId, (isOnline) => {
            setOtherUserOnline(isOnline);
        });

        // Get initial presence
        presenceService.getPresence(matchUserId).then((presence) => {
            if (presence) {
                setOtherUserOnline(presence.isOnline);
            }
        });

        // Cleanup on unmount
        return () => {
            messageSubscription?.unsubscribe();
            typingSubscription?.unsubscribe();
            presenceSubscription?.unsubscribe();
            typingService.setTyping(matchId, false);
            presenceService.updatePresence(true); // Still online, just left this chat
        };
    }, [loadMessages, matchId, matchUserId, user?.id]);

    // Format timestamp
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    // Format file size
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Send text message
    const handleSend = async () => {
        if (!inputText.trim() || sending) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);
        Keyboard.dismiss();
        typingService.setTyping(matchId, false);

        try {
            const newMessage = await messageService.sendMessage(matchId, messageText);
            if (newMessage) {
                setMessages(prev => [...prev, newMessage]);
                setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setInputText(messageText);
        } finally {
            setSending(false);
        }
    };

    // Pick image from gallery
    const handlePickImage = async () => {
        setShowAttachMenu(false);

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await sendImageMessage(result.assets[0].uri, result.assets[0].width, result.assets[0].height);
        }
    };

    // Take photo with camera
    const handleTakePhoto = async () => {
        setShowAttachMenu(false);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your camera.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            await sendImageMessage(result.assets[0].uri, result.assets[0].width, result.assets[0].height);
        }
    };

    // Send image message
    const sendImageMessage = async (uri: string, width?: number, height?: number) => {
        setUploadingMedia(true);
        try {
            const uploadResult = await messageService.uploadChatAttachment(
                matchId,
                uri,
                'image/jpeg',
                'photo.jpg'
            );

            if (uploadResult) {
                const newMessage = await messageService.sendMediaMessage(
                    matchId,
                    'image',
                    uploadResult.url,
                    {
                        thumbnailUrl: uploadResult.thumbnailUrl,
                        width,
                        height,
                        fileType: 'image/jpeg',
                    }
                );

                if (newMessage) {
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error sending image:', error);
            Alert.alert('Error', 'Failed to send image. Please try again.');
        } finally {
            setUploadingMedia(false);
        }
    };

    // Pick document
    const handlePickDocument = async () => {
        setShowAttachMenu(false);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const doc = result.assets[0];
                await sendDocumentMessage(doc.uri, doc.name, doc.size, doc.mimeType);
            }
        } catch (error) {
            console.error('Error picking document:', error);
        }
    };

    // Send document message
    const sendDocumentMessage = async (uri: string, name: string, size?: number, mimeType?: string) => {
        setUploadingMedia(true);
        try {
            const uploadResult = await messageService.uploadChatAttachment(
                matchId,
                uri,
                mimeType || 'application/pdf',
                name
            );

            if (uploadResult) {
                const newMessage = await messageService.sendMediaMessage(
                    matchId,
                    'document',
                    uploadResult.url,
                    {
                        fileName: name,
                        fileSize: size,
                        fileType: mimeType,
                    }
                );

                if (newMessage) {
                    setMessages(prev => [...prev, newMessage]);
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error sending document:', error);
            Alert.alert('Error', 'Failed to send document. Please try again.');
        } finally {
            setUploadingMedia(false);
        }
    };

    // Handle voice call
    const handleVoiceCall = () => {
        navigation.navigate('Call', {
            matchId,
            matchName,
            matchImage,
            matchUserId,
            callType: 'voice',
            isIncoming: false,
        });
    };

    // Handle video call
    const handleVideoCall = () => {
        navigation.navigate('Call', {
            matchId,
            matchName,
            matchImage,
            matchUserId,
            callType: 'video',
            isIncoming: false,
        });
    };

    // Open document/image
    const handleOpenMedia = (url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open the file.');
        });
    };

    // Check if message is from current user
    const isMyMessage = (message: Message) => {
        return message.sender_id === user?.id;
    };

    // Render message content based on type
    const renderMessageContent = (item: Message, isMine: boolean) => {
        const messageType = item.message_type || 'text';

        switch (messageType) {
            case 'image':
                return (
                    <TouchableOpacity
                        onPress={() => item.media_url && setSelectedImage(item.media_url)}
                        activeOpacity={0.9}
                    >
                        <Image
                            source={{ uri: item.media_url || item.media_thumbnail_url }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                        {item.content && (
                            <Text style={[styles.messageText, isMine && styles.myMessageText, { marginTop: 8 }]}>
                                {item.content}
                            </Text>
                        )}
                    </TouchableOpacity>
                );

            case 'document':
                return (
                    <TouchableOpacity
                        style={styles.documentContainer}
                        onPress={() => item.media_url && handleOpenMedia(item.media_url)}
                    >
                        <View style={styles.documentIcon}>
                            <Feather name="file-text" size={24} color={theme.colors.accent} />
                        </View>
                        <View style={styles.documentInfo}>
                            <Text style={styles.documentName} numberOfLines={1}>
                                {item.file_name || 'Document'}
                            </Text>
                            <Text style={styles.documentSize}>
                                {formatFileSize(item.file_size)} • Tap to open
                            </Text>
                        </View>
                        <Feather name="download" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                );

            case 'voice':
                return (
                    <TouchableOpacity style={styles.voiceContainer}>
                        <Feather name="play-circle" size={32} color={isMine ? '#fff' : theme.colors.accent} />
                        <View style={styles.voiceWaveform}>
                            {[...Array(15)].map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.voiceBar,
                                        { height: Math.random() * 20 + 5 },
                                        isMine && styles.voiceBarMine,
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={[styles.voiceDuration, isMine && styles.voiceDurationMine]}>
                            {item.media_duration ? `${Math.floor(item.media_duration / 60)}:${(item.media_duration % 60).toString().padStart(2, '0')}` : '0:00'}
                        </Text>
                    </TouchableOpacity>
                );

            default:
                return (
                    <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                        {item.content}
                    </Text>
                );
        }
    };

    // Render message bubble
    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMine = isMyMessage(item);
        const showAvatar = !isMine && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
        const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender_id !== item.sender_id;
        const isMediaMessage = item.message_type === 'image' || item.message_type === 'document' || item.message_type === 'voice';

        return (
            <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                {!isMine && (
                    <View style={styles.avatarContainer}>
                        {showAvatar ? (
                            <Image source={{ uri: matchImage }} style={styles.messageAvatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder} />
                        )}
                    </View>
                )}
                <View
                    style={[
                        styles.messageBubble,
                        isMine ? styles.myMessage : styles.theirMessage,
                        isLastInGroup && (isMine ? styles.myMessageLast : styles.theirMessageLast),
                        isMediaMessage && styles.mediaBubble,
                    ]}
                >
                    {renderMessageContent(item, isMine)}
                    <View style={styles.messageFooter}>
                        <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                            {formatTime(item.created_at)}
                        </Text>
                        {isMine && (
                            <Feather
                                name={item.is_read ? "check-circle" : "check"}
                                size={12}
                                color={item.is_read ? theme.colors.accent : 'rgba(255,255,255,0.5)'}
                                style={styles.readReceipt}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyImageContainer}>
                <Image source={{ uri: matchImage }} style={styles.emptyAvatar} />
            </View>
            <Text style={styles.emptyTitle}>You matched with {matchName}!</Text>
            <Text style={styles.emptySubtitle}>
                Start the conversation by sending a message
            </Text>
        </View>
    );

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{matchName}</Text>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerProfile}>
                    <View style={styles.headerAvatarContainer}>
                        <Image source={{ uri: matchImage }} style={styles.headerAvatar} />
                        {otherUserOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{matchName}</Text>
                        <Text style={styles.headerStatus}>
                            {isOtherTyping ? 'typing...' : otherUserOnline ? 'Online' : 'Tap to view profile'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.callButton} onPress={handleVoiceCall}>
                        <Feather name="phone" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.callButton} onPress={handleVideoCall}>
                        <Feather name="video" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setShowMenu(true)}
                    >
                        <Feather name="more-vertical" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Menu Modal */}
            <Modal
                visible={showMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={styles.menuContainer}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleViewProfile}
                        >
                            <Feather name="user" size={20} color={theme.colors.text} />
                            <Text style={styles.menuItemText}>View Profile</Text>
                        </TouchableOpacity>
                        <View style={styles.menuSeparator} />
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleReportUser}
                        >
                            <Feather name="flag" size={20} color={theme.colors.text} />
                            <Text style={styles.menuItemText}>Report</Text>
                        </TouchableOpacity>
                        <View style={styles.menuSeparator} />
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={handleBlockUser}
                        >
                            <Feather name="user-x" size={20} color={theme.colors.error} />
                            <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Block</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Attachment Menu Modal */}
            <Modal
                visible={showAttachMenu}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAttachMenu(false)}
            >
                <TouchableOpacity
                    style={styles.attachOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAttachMenu(false)}
                >
                    <View style={styles.attachContainer}>
                        <View style={styles.attachHeader}>
                            <Text style={styles.attachTitle}>Share</Text>
                            <TouchableOpacity onPress={() => setShowAttachMenu(false)}>
                                <Feather name="x" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.attachOptions}>
                            <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
                                <View style={[styles.attachIcon, { backgroundColor: '#4CAF50' }]}>
                                    <Feather name="image" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
                                <View style={[styles.attachIcon, { backgroundColor: '#2196F3' }]}>
                                    <Feather name="camera" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
                                <View style={[styles.attachIcon, { backgroundColor: '#FF9800' }]}>
                                    <Feather name="file" size={24} color="#fff" />
                                </View>
                                <Text style={styles.attachLabel}>Document</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.imagePreviewOverlay}>
                    <TouchableOpacity
                        style={styles.imagePreviewClose}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Feather name="x" size={28} color="#fff" />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imagePreview}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Report Modal */}
            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                userId={matchUserId}
                userName={matchName}
                onBlocked={handleUserBlocked}
            />

            {/* Emoji Picker */}
            <EmojiModal
                visible={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={handleEmojiSelect}
            />

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.messagesList,
                        messages.length === 0 && styles.emptyList,
                    ]}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        if (messages.length > 0) {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }
                    }}
                />

                {/* Typing Indicator */}
                {isOtherTyping && (
                    <View style={styles.typingContainer}>
                        <Image source={{ uri: matchImage }} style={styles.typingAvatar} />
                        <View style={styles.typingBubble}>
                            <View style={styles.typingDots}>
                                <View style={[styles.typingDot, styles.typingDot1]} />
                                <View style={[styles.typingDot, styles.typingDot2]} />
                                <View style={[styles.typingDot, styles.typingDot3]} />
                            </View>
                        </View>
                    </View>
                )}

                {/* Quick Replies */}
                {showQuickReplies && messages.length === 0 && (
                    <View style={styles.quickRepliesContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickRepliesScroll}
                        >
                            {quickReplies.map((reply, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.quickReplyChip}
                                    onPress={() => handleQuickReply(reply)}
                                >
                                    <Text style={styles.quickReplyText}>{reply}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Upload Progress */}
                {uploadingMedia && (
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                        <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={() => setShowAttachMenu(true)}
                    >
                        <Feather name="plus" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={inputText}
                            onChangeText={handleTextChange}
                            multiline
                            onKeyPress={handleKeyPress}
                        />
                        <TouchableOpacity
                            style={styles.emojiButton}
                            onPress={() => setShowEmojiPicker(true)}
                        >
                            <Feather name="smile" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!inputText.trim() && !uploadingMedia) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() && !uploadingMedia}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Feather name="send" size={20} color="#fff" />
                        )}

                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surface,
        backgroundColor: theme.colors.surface,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerProfile: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    headerStatus: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    callButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButton: {
        padding: 8,
    },
    headerRight: {
        width: 40,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 100,
        paddingRight: 16,
    },
    menuContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '500',
    },
    menuSeparator: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginHorizontal: 12,
    },
    attachOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    attachContainer: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    attachHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    attachTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    attachOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 24,
    },
    attachOption: {
        alignItems: 'center',
    },
    attachIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1,
        padding: 8,
    },
    imagePreview: {
        width: screenWidth,
        height: screenWidth,
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'flex-end',
    },
    messageRowMine: {
        justifyContent: 'flex-end',
    },
    avatarContainer: {
        width: 32,
        marginRight: 8,
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    avatarPlaceholder: {
        width: 28,
        height: 28,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    mediaBubble: {
        padding: 4,
        overflow: 'hidden',
    },
    myMessage: {
        backgroundColor: theme.colors.accent,
        borderBottomRightRadius: 6,
    },
    myMessageLast: {
        borderBottomRightRadius: 20,
        marginBottom: 8,
    },
    theirMessage: {
        backgroundColor: theme.colors.card,
        borderBottomLeftRadius: 6,
    },
    theirMessageLast: {
        borderBottomLeftRadius: 20,
        marginBottom: 8,
    },
    messageText: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 20,
    },
    myMessageText: {
        color: theme.colors.text,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    messageTime: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    readReceipt: {
        marginLeft: 4,
    },
    mediaImage: {
        width: 200,
        height: 200,
        borderRadius: 16,
    },
    documentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        minWidth: 200,
    },
    documentIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    documentSize: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    voiceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 180,
        padding: 8,
    },
    voiceWaveform: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        marginHorizontal: 12,
        gap: 2,
    },
    voiceBar: {
        width: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 2,
    },
    voiceBarMine: {
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    voiceDuration: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    voiceDurationMine: {
        color: 'rgba(255,255,255,0.9)',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    typingAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
    },
    typingBubble: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.textSecondary,
    },
    typingDot1: {
        opacity: 0.4,
    },
    typingDot2: {
        opacity: 0.7,
    },
    typingDot3: {
        opacity: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyImageContainer: {
        marginBottom: 20,
    },
    emptyAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: theme.colors.accent,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
    },
    uploadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    attachButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        maxHeight: 100,
        paddingVertical: 4,
    },
    emojiButton: {
        padding: 4,
        marginLeft: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: theme.colors.accent,
    },
    quickRepliesContainer: {
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    quickRepliesScroll: {
        paddingHorizontal: 12,
        gap: 8,
    },
    quickReplyChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.accent,
        marginRight: 8,
    },
    quickReplyText: {
        fontSize: 14,
        color: theme.colors.accent,
        fontWeight: '500',
    },
    sendButtonDisabled: {
        backgroundColor: theme.colors.textMuted,
        opacity: 0.5,
    },
});
