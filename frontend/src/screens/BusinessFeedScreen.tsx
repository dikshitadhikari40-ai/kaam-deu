import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Modal,
    ScrollView,
    Dimensions,
    Alert,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { BusinessPost, PostType, CreatePostInput } from '../types';
import { businessFeedService } from '../services/businessFeed';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { storageService } from '../services/database';

const { width } = Dimensions.get('window');

// Theme colors
const colors = {
    background: '#05050a',
    surface: '#0a0a14',
    card: '#12121c',
    border: '#1a1a2e',
    gold: '#f1d38b',
    goldDark: '#c9a962',
    text: '#ffffff',
    textSecondary: '#8b8b9e',
    success: '#4ade80',
    error: '#ff6b6b',
    blue: '#3B82F6',
    purple: '#8B5CF6',
};

// Post Type Options
const POST_TYPES: { type: PostType; label: string; icon: string; color: string }[] = [
    { type: 'update', label: 'Update', icon: 'edit-3', color: '#3B82F6' },
    { type: 'job_highlight', label: 'Job Highlight', icon: 'briefcase', color: '#10B981' },
    { type: 'company_news', label: 'Company News', icon: 'globe', color: '#8B5CF6' },
    { type: 'hiring_event', label: 'Hiring Event', icon: 'calendar', color: '#F59E0B' },
    { type: 'achievement', label: 'Achievement', icon: 'award', color: '#EC4899' },
];

// Post Card Component
const PostCard: React.FC<{
    post: BusinessPost;
    onLike: (postId: string) => void;
    onDislike: (postId: string) => void;
    onComment: (postId: string) => void;
    onShare: (postId: string) => void;
    likedPosts: Set<string>;
    dislikedPosts: Set<string>;
}> = ({ post, onLike, onDislike, onComment, onShare, likedPosts, dislikedPosts }) => {
    const typeInfo = businessFeedService.getPostTypeInfo(post.post_type);
    const isLiked = likedPosts.has(post.id);
    const isDisliked = dislikedPosts.has(post.id);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <View style={styles.postCard}>
            {/* Header */}
            <View style={styles.postHeader}>
                <View style={styles.postAuthor}>
                    {post.business_logo ? (
                        <Image source={{ uri: post.business_logo }} style={styles.authorAvatar} />
                    ) : (
                        <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
                            <Feather name="briefcase" size={18} color={colors.gold} />
                        </View>
                    )}
                    <View style={styles.authorInfo}>
                        <View style={styles.authorNameRow}>
                            <Text style={styles.authorName}>{post.business_name || 'Business'}</Text>
                            {post.is_verified_business && (
                                <MaterialCommunityIcons
                                    name="check-decagram"
                                    size={16}
                                    color={colors.blue}
                                    style={styles.verifiedBadge}
                                />
                            )}
                        </View>
                        <View style={styles.postMeta}>
                            <Text style={styles.postTime}>{formatTimeAgo(post.created_at)}</Text>
                            <View style={styles.postTypeBadge}>
                                <Feather name={typeInfo.icon as any} size={10} color={typeInfo.color} />
                                <Text style={[styles.postTypeText, { color: typeInfo.color }]}>
                                    {typeInfo.label}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.postContent}>
                {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
                <Text style={styles.postText}>{post.content}</Text>

                {/* Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.mediaContainer}
                    >
                        {post.media_urls.map((url, index) => (
                            <Image
                                key={index}
                                source={{ uri: url }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Stats */}
            <View style={styles.postStats}>
                <Text style={styles.statsText}>
                    {post.likes_count} agrees · {post.dislikes_count || 0} disagrees · {post.comments_count} comments
                </Text>
            </View>

            {/* Actions */}
            <View style={styles.postActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onLike(post.id);
                    }}
                >
                    <Feather
                        name={isLiked ? 'thumbs-up' : 'thumbs-up'}
                        size={20}
                        color={isLiked ? colors.success : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, isLiked && { color: colors.success }]}>
                        Agree
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onDislike(post.id);
                    }}
                >
                    <Feather
                        name={isDisliked ? 'thumbs-down' : 'thumbs-down'}
                        size={20}
                        color={isDisliked ? colors.error : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, isDisliked && { color: colors.error }]}>
                        Disagree
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onComment(post.id)}
                >
                    <Feather name="message-circle" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post.id)}>
                    <Feather name="share-2" size={20} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Create Post Modal
const CreatePostModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSubmit: (input: CreatePostInput) => void;
}> = ({ visible, onClose, onSubmit }) => {
    const [postType, setPostType] = useState<PostType>('update');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0].uri) {
                setSelectedImages([...selectedImages, result.assets[0].uri]);
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                alert('Error: Failed to pick image');
            } else {
                Alert.alert('Error', 'Failed to pick image');
            }
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content.trim() && selectedImages.length === 0) {
            if (Platform.OS === 'web') {
                alert('Error: Please write something or add an image');
            } else {
                Alert.alert('Error', 'Please write something or add an image');
            }
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload images first
            const uploadedUrls: string[] = [];
            for (const uri of selectedImages) {
                // Determine if we need to upload (local file) or keep (already remote - though here all are local)
                const url = await storageService.uploadJobImage(uri); // Using job bucket for now
                if (url) {
                    uploadedUrls.push(url);
                }
            }

            await onSubmit({
                post_type: postType,
                title: title.trim() || undefined,
                content: content.trim(),
                media_urls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            });

            // Reset form
            setTitle('');
            setContent('');
            setPostType('update');
            setSelectedImages([]);
        } catch (error) {
            console.error('Submit error:', error);
            if (Platform.OS === 'web') {
                alert('Error: Failed to create post');
            } else {
                Alert.alert('Error', 'Failed to create post');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Create Post</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                        {isSubmitting ? (
                            <>
                                <ActivityIndicator size="small" color={colors.gold} />
                                <Text style={styles.modalPost}>Posting...</Text>
                            </>
                        ) : (
                            <Text
                                style={[
                                    styles.modalPost,
                                    (!content.trim() && selectedImages.length === 0) && styles.modalPostDisabled,
                                ]}
                            >
                                Post
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    {/* Post Type Selector */}
                    <Text style={styles.inputLabel}>Post Type</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.typeSelector}
                    >
                        {POST_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.type}
                                style={[
                                    styles.typeOption,
                                    postType === type.type && {
                                        borderColor: type.color,
                                        backgroundColor: `${type.color}15`,
                                    },
                                ]}
                                onPress={() => setPostType(type.type)}
                            >
                                <Feather
                                    name={type.icon as any}
                                    size={16}
                                    color={postType === type.type ? type.color : colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.typeOptionText,
                                        postType === type.type && { color: type.color },
                                    ]}
                                >
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Title Input */}
                    <Text style={styles.inputLabel}>Title (optional)</Text>
                    <TextInput
                        style={styles.titleInput}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Add a title..."
                        placeholderTextColor={colors.textSecondary}
                        maxLength={100}
                    />

                    {/* Content Input */}
                    <Text style={styles.inputLabel}>What's happening?</Text>
                    <TextInput
                        style={styles.contentInput}
                        value={content}
                        onChangeText={setContent}
                        placeholder="Share an update with your followers..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={1000}
                        textAlignVertical="top"
                    />

                    <Text style={styles.charCount}>{content.length}/1000</Text>

                    {/* Image Previews */}
                    {selectedImages.length > 0 && (
                        <ScrollView horizontal style={styles.previewContainer}>
                            {selectedImages.map((uri, index) => (
                                <View key={index} style={styles.previewWrapper}>
                                    <Image source={{ uri }} style={styles.previewImage} />
                                    <TouchableOpacity
                                        style={styles.removePreviewButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <Feather name="x" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                        <Feather name="image" size={20} color={colors.gold} />
                        <Text style={styles.addImageText}>Add Photo</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

// Main Business Feed Screen
export default function BusinessFeedScreen() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<BusinessPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [dislikedPosts, setDislikedPosts] = useState<Set<string>>(new Set());

    const isBusiness = user?.role === 'business';

    // Load posts
    const loadPosts = useCallback(async () => {
        try {
            const feedPosts = await businessFeedService.getFeedPosts();
            setPosts(feedPosts);

            // Check which posts user has liked/disliked
            const likes = new Set<string>();
            const dislikes = new Set<string>();

            for (const post of feedPosts) {
                const hasLiked = await businessFeedService.hasUserLiked(post.id);
                if (hasLiked) likes.add(post.id);

                const hasDisliked = await businessFeedService.hasUserDisliked(post.id);
                if (hasDisliked) dislikes.add(post.id);
            }
            setLikedPosts(likes);
            setDislikedPosts(dislikes);
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPosts();
        setRefreshing(false);
    };

    const handleLike = async (postId: string) => {
        // If already disliked, remove dislike first (optional logic, but good UX)
        if (dislikedPosts.has(postId)) {
            await handleDislike(postId);
        }

        const result = await businessFeedService.toggleLike(postId);
        if (result.liked) {
            setLikedPosts((prev) => new Set(prev).add(postId));
        } else {
            setLikedPosts((prev) => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
            });
        }

        // Update post in list
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId ? { ...p, likes_count: result.count } : p
            )
        );
    };

    const handleDislike = async (postId: string) => {
        // If already liked, remove like first
        if (likedPosts.has(postId)) {
            await handleLike(postId);
        }

        const result = await businessFeedService.toggleDislike(postId);
        if (result.disliked) {
            setDislikedPosts((prev) => new Set(prev).add(postId));
        } else {
            setDislikedPosts((prev) => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
            });
        }

        // Update post in list
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId ? { ...p, dislikes_count: result.count } : p
            )
        );
    };

    const handleComment = (postId: string) => {
        Alert.alert('Comments', 'Comments feature coming soon!');
    };

    const handleShare = (postId: string) => {
        Alert.alert('Share', 'Sharing feature coming soon!');
    };

    const handleCreatePost = async (input: CreatePostInput) => {
        const newPost = await businessFeedService.createPost(input);
        if (newPost) {
            setShowCreateModal(false);
            await loadPosts();
            if (Platform.OS === 'web') {
                alert('Success: Your post has been shared!');
            } else {
                Alert.alert('Success', 'Your post has been shared!');
            }
        } else {
            if (Platform.OS === 'web') {
                alert('Error: Failed to create post. Please try again.');
            } else {
                Alert.alert('Error', 'Failed to create post. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={styles.loadingText}>Loading feed...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Business Feed</Text>
                    <Text style={styles.subtitle}>
                        {isBusiness ? 'Share updates with workers' : 'See what companies are posting'}
                    </Text>
                </View>
                {isBusiness && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Feather name="plus" size={20} color={colors.background} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Posts List */}
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        onComment={handleComment}
                        onShare={handleShare}
                        likedPosts={likedPosts}
                        dislikedPosts={dislikedPosts}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold}
                    />
                }
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Feather name="file-text" size={40} color={colors.gold} />
                        </View>
                        <Text style={styles.emptyTitle}>No posts yet</Text>
                        <Text style={styles.emptySubtitle}>
                            {isBusiness
                                ? 'Be the first to share an update!'
                                : 'Companies will share updates here soon.'}
                        </Text>
                        {isBusiness && (
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Text style={styles.emptyButtonText}>Create First Post</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Create Post Modal */}
            <CreatePostModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreatePost}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: colors.textSecondary,
        marginTop: 12,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    createButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 16,
    },
    separator: {
        height: 12,
    },
    postCard: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 12,
    },
    postAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    authorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    authorInfo: {
        flex: 1,
    },
    authorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    verifiedBadge: {
        marginLeft: 4,
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    postTime: {
        fontSize: 12,
        color: colors.textSecondary,
        marginRight: 8,
    },
    postTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    postTypeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    moreButton: {
        padding: 8,
    },
    postContent: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    postTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    postText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    mediaContainer: {
        marginTop: 12,
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    mediaImage: {
        width: width - 80,
        height: 200,
        borderRadius: 12,
        marginRight: 8,
    },
    postStats: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statsText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    postActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    actionText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: colors.gold,
        borderRadius: 10,
    },
    emptyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.background,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalCancel: {
        fontSize: 15,
        color: colors.textSecondary,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    modalPost: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.gold,
    },
    modalPostDisabled: {
        opacity: 0.4,
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    typeSelector: {
        flexDirection: 'row',
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        gap: 6,
    },
    typeOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    titleInput: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    contentInput: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 150,
    },
    charCount: {
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'right',
        marginTop: 4,
    },
    previewContainer: {
        marginTop: 16,
        flexDirection: 'row',
    },
    previewWrapper: {
        marginRight: 10,
        position: 'relative',
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removePreviewButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: colors.error,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.card,
    },
    addImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
        backgroundColor: `${colors.gold}15`,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    addImageText: {
        marginLeft: 8,
        color: colors.gold,
        fontWeight: '600',
        fontSize: 14,
    },
});
