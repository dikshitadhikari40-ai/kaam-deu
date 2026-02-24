require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', url ? url : 'MISSING');
console.log('Supabase Key:', key ? (key.substring(0, 5) + '...') : 'MISSING');
