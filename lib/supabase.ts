import { createClient } from '@supabase/supabase-js';

// Both values are public browser credentials. Keep the deployment usable even
// when a hosting provider does not expose NEXT_PUBLIC_* variables at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  || 'https://bwkpnqsnvdjqkwriniiy.supabase.co';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || 'sb_publishable_0hqROxE2d7JL8Ip71lhxsA_ovuJ7l94';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
