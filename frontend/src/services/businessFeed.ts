/**
 * Business Feed Service
 * Handles creating, fetching, and interacting with business posts
 */

import { supabase } from '../lib/supabase';
import { BusinessPost, CreatePostInput, PostComment, PostType } from '../types';

/**
 * Fetch all posts for the feed (for workers and businesses)
 */
export const getFeedPosts = async (limit = 20, offset = 0): Promise<BusinessPost[]> => {
    try {
        const { data, error } = await supabase
            .from('business_posts')
            .select(`
                *,
                profiles!business_id(
                    company_name,
                    logo_url,
                    industry
                )
            `)
            .eq('is_active', true)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[BusinessFeed] Error fetching posts:', error);
            throw error;
        }

        // Transform data to include joined fields
        return (data || []).map((post: any) => ({
            ...post,
            business_name: post.profiles?.company_name,
            business_logo: post.profiles?.logo_url,
            business_industry: post.profiles?.industry,
            // is_verified_business: post.profiles?.is_verified_business, // Column missing in DB
        }));
    } catch (error) {
        console.error('[BusinessFeed] getFeedPosts error:', error);
        return [];
    }
};

/**
 * Fetch trending posts based on engagement (likes + dislikes)
 */
export const getTrendingPosts = async (limit = 10): Promise<BusinessPost[]> => {
    try {
        const { data, error } = await supabase
            .from('business_posts')
            .select(`
                *,
                profiles!business_id(
                    company_name,
                    logo_url,
                    industry
                )
            `)
            .eq('is_active', true)
            .order('likes_count', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((post: any) => ({
            ...post,
            business_name: post.profiles?.company_name,
            business_logo: post.profiles?.logo_url,
            business_industry: post.profiles?.industry,
        }));
    } catch (error) {
        console.error('[BusinessFeed] getTrendingPosts error:', error);
        return [];
    }
};

/**
 * Fetch posts by a specific business
 */
export const getBusinessPosts = async (businessId: string): Promise<BusinessPost[]> => {
    try {
        const { data, error } = await supabase
            .from('business_posts')
            .select(`
                *,
                profiles!business_id(
                    company_name,
                    logo_url,
                    industry
                )
            `)
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((post: any) => ({
            ...post,
            business_name: post.profiles?.company_name,
            business_logo: post.profiles?.logo_url,
            business_industry: post.profiles?.industry,
            // is_verified_business: post.profiles?.is_verified_business, // Column missing in DB
        }));
    } catch (error) {
        console.error('[BusinessFeed] getBusinessPosts error:', error);
        return [];
    }
};

/**
 * Create a new post (for businesses)
 */
export const createPost = async (input: CreatePostInput): Promise<BusinessPost | null> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
            throw new Error('Not authenticated');
        }

        const userId = session.session.user.id;

        // Get business profile ID (same as user ID in unified table)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', userId)
            .single();

        if (!profile) {
            throw new Error('Profile not found');
        }

        if (profile.role !== 'business') {
            // Optional: strict check, though RLS might handle it
            // console.warn('User is not a business role');
        }

        const { data, error } = await supabase
            .from('business_posts')
            .insert({
                business_id: userId, // Profile ID is the Business ID
                author_id: userId,
                post_type: input.post_type,
                title: input.title,
                content: input.content,
                media_urls: input.media_urls,
                likes_count: 0,
                comments_count: 0,
                shares_count: 0,
                is_pinned: false,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[BusinessFeed] createPost error:', error);
        return null;
    }
};

/**
 * Delete a post (soft delete)
 */
export const deletePost = async (postId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('business_posts')
            .update({ is_active: false })
            .eq('id', postId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[BusinessFeed] deletePost error:', error);
        return false;
    }
};

/**
 * Like/Unlike a post
 */
export const toggleLike = async (postId: string): Promise<{ liked: boolean; count: number }> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
            throw new Error('Not authenticated');
        }

        const userId = session.session.user.id;

        // Check if already liked
        const { data: existingLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (existingLike) {
            // Unlike
            await supabase
                .from('post_likes')
                .delete()
                .eq('id', existingLike.id);

            // Decrement count
            await supabase.rpc('decrement_likes', { post_id: postId });

            const { data: post } = await supabase
                .from('business_posts')
                .select('likes_count')
                .eq('id', postId)
                .single();

            return { liked: false, count: post?.likes_count || 0 };
        } else {
            // Like
            await supabase
                .from('post_likes')
                .insert({ post_id: postId, user_id: userId });

            // Increment count
            await supabase.rpc('increment_likes', { post_id: postId });

            const { data: post } = await supabase
                .from('business_posts')
                .select('likes_count')
                .eq('id', postId)
                .single();

            return { liked: true, count: post?.likes_count || 0 };
        }
    } catch (error) {
        console.error('[BusinessFeed] toggleLike error:', error);
        return { liked: false, count: 0 };
    }
};



/**
 * Dislike/Undislike a post
 */
export const toggleDislike = async (postId: string): Promise<{ disliked: boolean; count: number }> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
            throw new Error('Not authenticated');
        }

        const userId = session.session.user.id;

        // Check if already disliked
        const { data: existingDislike } = await supabase
            .from('post_dislikes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (existingDislike) {
            // Remove dislike
            await supabase
                .from('post_dislikes')
                .delete()
                .eq('id', existingDislike.id);

            // Decrement count
            await supabase.rpc('decrement_dislikes', { post_id: postId });

            const { data: post } = await supabase
                .from('business_posts')
                .select('dislikes_count')
                .eq('id', postId)
                .single();

            return { disliked: false, count: post?.dislikes_count || 0 };
        } else {
            // Add dislike
            await supabase
                .from('post_dislikes')
                .insert({ post_id: postId, user_id: userId });

            // Increment count
            await supabase.rpc('increment_dislikes', { post_id: postId });

            const { data: post } = await supabase
                .from('business_posts')
                .select('dislikes_count')
                .eq('id', postId)
                .single();

            return { disliked: true, count: post?.dislikes_count || 0 };
        }
    } catch (error) {
        console.error('[BusinessFeed] toggleDislike error:', error);
        return { disliked: false, count: 0 };
    }
};

/**
 * Check if user has liked a post
 */
export const hasUserLiked = async (postId: string): Promise<boolean> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) return false;

        const { data } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', session.session.user.id)
            .single();

        return !!data;
    } catch {
        return false;
    }
};

/**
 * Check if user has disliked a post
 */
export const hasUserDisliked = async (postId: string): Promise<boolean> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) return false;

        const { data } = await supabase
            .from('post_dislikes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', session.session.user.id)
            .single();

        return !!data;
    } catch {
        return false;
    }
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<PostComment[]> => {
    try {
        const { data, error } = await supabase
            .from('post_comments')
            .select(`
                *,
                profiles!user_id(name, company_name, profile_pic, logo_url, role)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map((comment: any) => ({
            ...comment,
            user_name: comment.profiles?.name || comment.profiles?.company_name,
            user_photo: comment.profiles?.profile_pic || comment.profiles?.logo_url,
            user_role: comment.profiles?.role,
        }));
    } catch (error) {
        console.error('[BusinessFeed] getComments error:', error);
        return [];
    }
};

/**
 * Add a comment to a post
 */
export const addComment = async (postId: string, content: string): Promise<PostComment | null> => {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
            throw new Error('Not authenticated');
        }

        const userId = session.session.user.id;

        const { data, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: userId,
                content: content,
            })
            .select()
            .single();

        if (error) throw error;

        // Increment comments count
        await supabase.rpc('increment_comments', { post_id: postId });

        return data;
    } catch (error) {
        console.error('[BusinessFeed] addComment error:', error);
        return null;
    }
};

/**
 * Get post type display info
 */
export const getPostTypeInfo = (type: PostType): { label: string; color: string; icon: string } => {
    const typeMap: Record<PostType, { label: string; color: string; icon: string }> = {
        update: { label: 'Update', color: '#3B82F6', icon: 'edit-3' },
        job_highlight: { label: 'Job Highlight', color: '#10B981', icon: 'briefcase' },
        company_news: { label: 'Company News', color: '#8B5CF6', icon: 'globe' },
        hiring_event: { label: 'Hiring Event', color: '#F59E0B', icon: 'calendar' },
        achievement: { label: 'Achievement', color: '#EC4899', icon: 'award' },
    };
    return typeMap[type] || typeMap.update;
};

export const businessFeedService = {
    getFeedPosts,
    getBusinessPosts,
    createPost,
    deletePost,
    toggleLike,
    hasUserLiked,
    toggleDislike,
    hasUserDisliked,
    getComments,
    addComment,
    getPostTypeInfo,
};
