import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Use Service Role Key for Admin usage (bypassing RLS triggers if needed, but we use signUp so trigger runs)
// If you don't have SERVICE_ROLE_KEY, the script might fail to delete users without RLS policies allowing it.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const WORKER_COUNT = 5;
const BUSINESS_COUNT = 5;

const seedUsers = async () => {
    console.log('🌱 Starting Seed Process...');
    console.log(`Target: ${WORKER_COUNT} Workers, ${BUSINESS_COUNT} Businesses`);

    // 1. Create Workers
    for (let i = 1; i <= WORKER_COUNT; i++) {
        const email = `worker${i}@example.com`;
        const password = 'password123';
        const name = `Worker ${i}`;

        console.log(`Creating worker: ${email}`);

        // Check if exists (optional, signUp handles existing users by returning specific error/data)
        // We try to sign up.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'worker',
                    full_name: name,
                }
            }
        });

        if (error) {
            console.error(`❌ Error creating ${email}:`, error.message);
        } else if (data.user) {
            console.log(`✅ Created ${email} (ID: ${data.user.id})`);
            // Optional: Add extra profile data directly if trigger is basic
            // await supabase.from('profiles').update({ ... }).eq('id', data.user.id);
        }
    }

    // 2. Create Businesses
    for (let i = 1; i <= BUSINESS_COUNT; i++) {
        const email = `business${i}@example.com`;
        const password = 'password123';
        const name = `Business ${i} Inc.`;

        console.log(`Creating business: ${email}`);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'business',
                    full_name: name,
                }
            }
        });

        if (error) {
            console.error(`❌ Error creating ${email}:`, error.message);
        } else if (data.user) {
            console.log(`✅ Created ${email} (ID: ${data.user.id})`);
        }
    }

    console.log('✨ Seeding complete.');
};

seedUsers().catch(console.error);
