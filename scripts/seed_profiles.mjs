import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cdtgfeuinoqqxagutnlu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdGdmZXVpbm9xcXhhZ3V0bmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Nzk4ODcsImV4cCI6MjA4MjI1NTg4N30.X2o34RDH39M9ZrAGF4IAiI-m1X7meKLs0URnYAxKJLs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const workers = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'ram@test.com',
        role: 'worker',
        name: 'Ram Bahadur',
        is_profile_complete: true,
        verified: true,
        job_title: 'Plumber',
        bio: 'Experienced plumber with 10 years in residential work.',
        skills: ['Plumbing', 'Pipe fitting'],
        experience_years: 10,
        expected_salary_min: 15000,
        expected_salary_max: 45000,
        current_location: 'Kathmandu, Nepal',
        photos: ['https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800']
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'sita@test.com',
        role: 'worker',
        name: 'Sita Kumari',
        is_profile_complete: true,
        verified: true,
        job_title: 'Content Writer',
        bio: 'Creative content writer specialized in tech.',
        skills: ['Copywriting', 'SEO'],
        experience_years: 4,
        expected_salary_min: 30000,
        expected_salary_max: 60000,
        current_location: 'Lalitpur, Nepal',
        photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800']
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'hari@test.com',
        role: 'worker',
        name: 'Hari Prasad',
        is_profile_complete: true,
        job_title: 'Delivery Rider',
        bio: 'Reliable rider with own bike.',
        skills: ['Driving', 'Navigation'],
        experience_years: 2,
        expected_salary_min: 12000,
        expected_salary_max: 25000,
        current_location: 'Bhaktapur, Nepal',
        photos: ['https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=800']
    },
    {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'anisha@test.com',
        role: 'worker',
        name: 'Anisha Thapa',
        is_profile_complete: true,
        verified: true,
        job_title: 'Graphic Designer',
        bio: 'UI/UX enthusiast.',
        skills: ['Figma', 'Photoshop'],
        experience_years: 6,
        expected_salary_min: 40000,
        expected_salary_max: 85000,
        current_location: 'Pokhara, Nepal',
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a428c40?q=80&w=800']
    },
    {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'binod@test.com',
        role: 'worker',
        name: 'Binod Chaudhary',
        is_profile_complete: true,
        verified: true,
        job_title: 'Senior Developer',
        bio: 'Full stack engineer.',
        skills: ['React', 'Node.js'],
        experience_years: 8,
        expected_salary_min: 150000,
        expected_salary_max: 300000,
        current_location: 'Kathmandu, Nepal',
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800']
    }
];

const businesses = [
    {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'hr@techhub.com',
        role: 'business',
        company_name: 'TechHub Nepal',
        industry: 'IT Services',
        is_profile_complete: true,
        is_verified_business: true,
        description: 'Leading software dev house.',
        logo_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=400'
    },
    {
        id: '00000000-0000-0000-0000-000000000007',
        email: 'jobs@hamro-hotel.com',
        role: 'business',
        company_name: 'Hamro Hotel',
        industry: 'Hospitality',
        is_profile_complete: true,
        is_verified_business: true,
        description: '5-star luxury hotel.',
        logo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400'
    },
    {
        id: '00000000-0000-0000-0000-000000000008',
        email: 'info@nepal-builders.com',
        role: 'business',
        company_name: 'Nepal Builders',
        industry: 'Construction',
        is_profile_complete: true,
        is_verified_business: false,
        description: 'Major infrastructure projects.',
        logo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=400'
    }
];

async function seed() {
    console.log('Seeding profiles via insert (ignoring triggers)...');
    for (const p of [...workers, ...businesses]) {
        // We try to use a dummy UUID that exists if possible, but the schema has a FK to auth.users.
        // Since we are an agent, we can't easily create auth.users records without a secret key.
        // However, if RLS is off or if we use the service role key, we could bypass FK checks if the DB is locally hosted.
        // But this is a hosted Supabase instance.

        // I will attempt to upsert without the FK check by omitting the ID OR using a valid existing ID if I had one.
        // Wait, if I use the anon key, I AM bound by FKs.

        console.log(`Attempting ${p.email}...`);
        const { error } = await supabase.from('profiles').upsert({
            ...p,
            id: undefined // Let DB generate ID if possible? (No, id is PK and of type UUID)
        });

        if (error) {
            console.error(`Error Upserting ${p.email}:`, error.message);
        } else {
            console.log(`Seeded ${p.email}`);
        }
    }
    console.log('Done!');
}

seed();
