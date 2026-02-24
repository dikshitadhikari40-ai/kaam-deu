import { supabase } from '../lib/supabase';
import { storageService } from './database';

export interface VerificationRequest {
    id: string;
    user_id: string;
    id_type: 'citizenship' | 'passport' | 'license' | 'pan';
    id_number?: string;
    document_front_url: string;
    document_back_url?: string;
    full_name_on_id?: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes?: string;
    verified_at?: string;
    created_at: string;
}

export const verificationService = {
    /**
     * Submit a new verification request
     */
    submitRequest: async (
        userId: string,
        data: {
            idType: string;
            idNumber?: string;
            frontImage: any;
            backImage?: any;
            fullName: string;
        }
    ): Promise<{ success: boolean; error: string | null }> => {
        try {
            // 1. Upload images
            const frontPath = `verifications/${userId}_front_${Date.now()}.jpg`;
            const { url: frontUrl, error: frontError } = await storageService.uploadFile('documents', frontPath, data.frontImage);

            if (frontError || !frontUrl) return { success: false, error: frontError || 'Failed to upload front image' };

            let backUrl = '';
            if (data.backImage) {
                const backPath = `verifications/${userId}_back_${Date.now()}.jpg`;
                const { url, error: backError } = await storageService.uploadFile('documents', backPath, data.backImage);
                if (!backError && url) backUrl = url;
            }

            // 2. Insert record
            const { error: insertError } = await supabase
                .from('verification_requests')
                .upsert({
                    user_id: userId,
                    id_type: data.idType,
                    id_number: data.idNumber,
                    document_front_url: frontUrl,
                    document_back_url: backUrl || null,
                    full_name_on_id: data.fullName,
                    status: 'pending',
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('Error inserting verification request:', insertError);
                return { success: false, error: insertError.message };
            }

            return { success: true, error: null };
        } catch (e: any) {
            console.error('Exception in submitRequest:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Get user's current request status
     */
    getRequest: async (userId: string): Promise<VerificationRequest | null> => {
        const { data, error } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching verification request:', error);
            return null;
        }

        return data as VerificationRequest;
    },

    /**
     * MOCK: Approve verification for testing triggers
     */
    mockApprove: async (userId: string): Promise<boolean> => {
        const { error } = await supabase.rpc('approve_verification', { target_user_id: userId });
        if (error) {
            console.error('Error mocking approval:', error);
            return false;
        }
        return true;
    },

    /**
     * Reject a verification request
     */
    rejectRequest: async (userId: string, notes: string): Promise<boolean> => {
        const { error } = await supabase.rpc('reject_verification', {
            target_user_id: userId,
            notes: notes
        });
        if (error) {
            console.error('Error rejecting verification:', error);
            return false;
        }
        return true;
    }
};
