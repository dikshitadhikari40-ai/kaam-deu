/**
 * Job Applications Service
 *
 * Handles job application CRUD operations with Supabase.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface JobApplication {
  id: string;
  job_id: string;
  worker_id: string;
  cover_letter?: string;
  resume_url?: string;
  status: 'pending' | 'viewed' | 'shortlisted' | 'rejected' | 'hired' | 'withdrawn';
  applied_at: string;
  updated_at: string;
  notes?: string;
  // Joined fields
  job_title?: string;
  job_description?: string;
  job_location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  job_status?: string;
  company_name?: string;
  logo_url?: string;
  // Worker fields (for business viewing applications)
  worker_name?: string;
  worker_job_title?: string;
  experience_years?: number;
  skills?: string[];
  images?: string[];
  worker_location?: string;
  worker_bio?: string;
}

export interface ApplyToJobParams {
  jobId: string;
  coverLetter?: string;
  resumeUrl?: string;
}

export const jobApplicationService = {
  /**
   * Apply to a job (workers only)
   */
  async applyToJob(params: ApplyToJobParams): Promise<JobApplication> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already applied
    const { data: existing } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', params.jobId)
      .eq('worker_id', user.id)
      .single();

    if (existing) {
      throw new Error('You have already applied to this job');
    }

    // Create application
    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: params.jobId,
        worker_id: user.id,
        cover_letter: params.coverLetter || null,
        resume_url: params.resumeUrl || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Apply to job error:', error);
      throw new Error(error.message);
    }

    // Increment applications count on job
    await supabase.rpc('increment_job_applications', { job_id: params.jobId });

    return data;
  },

  /**
   * Check if current user has applied to a job
   */
  async hasApplied(jobId: string): Promise<{ hasApplied: boolean; application?: JobApplication }> {
    if (!isSupabaseConfigured()) {
      return { hasApplied: false };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { hasApplied: false };

    const { data, error } = await supabase
      .from('job_applications')
      .select('id, job_id, worker_id, status, applied_at, updated_at')
      .eq('job_id', jobId)
      .eq('worker_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Check application error:', error);
    }

    return {
      hasApplied: !!data,
      application: data || undefined,
    };
  },

  /**
   * Get all applications for the current worker
   */
  async getMyApplications(status?: string): Promise<JobApplication[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('job_applications')
      .select(`
        *,
        job_posts (
          title,
          description,
          location,
          salary_min,
          salary_max,
          salary_type,
          status,
          business_id,
          profiles!job_posts_business_id_fkey (
            company_name,
            logo_url
          )
        )
      `)
      .eq('worker_id', user.id)
      .order('applied_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get my applications error:', error);
      throw new Error(error.message);
    }

    // Flatten the nested data
    return (data || []).map((app: any) => ({
      ...app,
      job_title: app.job_posts?.title,
      job_description: app.job_posts?.description,
      job_location: app.job_posts?.location,
      salary_min: app.job_posts?.salary_min,
      salary_max: app.job_posts?.salary_max,
      salary_type: app.job_posts?.salary_type,
      job_status: app.job_posts?.status,
      company_name: app.job_posts?.profiles?.company_name,
      logo_url: app.job_posts?.profiles?.logo_url,
    }));
  },

  /**
   * Get applications for a specific job (business owner only)
   */
  async getJobApplications(jobId: string, status?: string): Promise<JobApplication[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('job_applications')
      .select(`
        *,
        profiles!job_applications_worker_id_fkey (
          name,
          job_title,
          experience_years,
          skills,
          photos,
          current_location,
          bio
        )
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get job applications error:', error);
      throw new Error(error.message);
    }

    // Flatten the nested data
    return (data || []).map((app: any) => ({
      ...app,
      worker_name: app.profiles?.name,
      worker_job_title: app.profiles?.job_title,
      experience_years: app.profiles?.experience_years,
      skills: app.profiles?.skills || [],
      images: app.profiles?.photos || [],
      worker_location: app.profiles?.current_location,
      worker_bio: app.profiles?.bio,
    }));
  },

  /**
   * Update application status (business owner only)
   */
  async updateApplicationStatus(
    applicationId: string,
    status: JobApplication['status'],
    notes?: string
  ): Promise<JobApplication> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('job_applications')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (error) {
      console.error('Update application error:', error);
      throw new Error(error.message);
    }

    // If hired, update job status to filled
    if (status === 'hired') {
      await supabase
        .from('job_posts')
        .update({ status: 'filled' })
        .eq('id', data.job_id);
    }

    return data;
  },

  /**
   * Withdraw an application (worker only)
   */
  async withdrawApplication(applicationId: string, jobId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check ownership
    const { data: app } = await supabase
      .from('job_applications')
      .select('worker_id, status')
      .eq('id', applicationId)
      .single();

    if (!app || app.worker_id !== user.id) {
      throw new Error('You can only withdraw your own applications');
    }

    if (app.status === 'hired') {
      throw new Error('Cannot withdraw a hired application');
    }

    // Update to withdrawn
    const { error } = await supabase
      .from('job_applications')
      .update({
        status: 'withdrawn',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (error) {
      console.error('Withdraw application error:', error);
      throw new Error(error.message);
    }

    // Decrement applications count
    await supabase.rpc('decrement_job_applications', { job_id: jobId });
  },

  /**
   * Get application status display info
   */
  getStatusDisplay(status: JobApplication['status']): { label: string; color: string } {
    const statusMap: Record<JobApplication['status'], { label: string; color: string }> = {
      pending: { label: 'Pending', color: '#F59E0B' },
      viewed: { label: 'Viewed', color: '#3B82F6' },
      shortlisted: { label: 'Shortlisted', color: '#10B981' },
      rejected: { label: 'Not Selected', color: '#EF4444' },
      hired: { label: 'Hired', color: '#8B5CF6' },
      withdrawn: { label: 'Withdrawn', color: '#6B7280' },
    };
    return statusMap[status] || { label: status, color: '#6B7280' };
  },
};

export default jobApplicationService;
