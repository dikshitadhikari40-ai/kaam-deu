require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    console.log('Testing connection to:', url);
    console.log('Fetching profiles...');

    const start = Date.now();
    try {
        // Try to fetch any profile to test connection
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
            .single(); // Use single even if empty just to test query

        const duration = Date.now() - start;
        console.log(`Query took ${duration}ms`);

        if (error) {
            console.error('Error fetching profiles:', error);
            if (error.code === 'PGRST116') {
                console.log('Connection successful (PGRST116 just means no rows returned for single)');
            }
        } else {
            console.log('Success! Data:', data);
        }
    } catch (err) {
        console.error('Exception during fetch:', err);
    }
}

testConnection();
