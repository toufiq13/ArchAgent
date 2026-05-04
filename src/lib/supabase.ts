import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'CRITICAL: Supabase environment variables are missing.\n' +
    'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your project Secrets.\n' +
    'Current URL: ' + (supabaseUrl ? 'Set' : 'Missing') + '\n' +
    'Current Key: ' + (supabaseAnonKey ? 'Set' : 'Missing')
  );
}

// Client for use in the browser/frontend
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
