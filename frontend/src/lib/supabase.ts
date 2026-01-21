import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 環境変数が設定されているかチェック
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: sessionStorage,
    },
  });
} else {
  console.error(
    'Supabase環境変数が未設定です。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。'
  );
}

// supabaseを使用する際は isSupabaseConfigured をチェックすること
export const supabase = supabaseClient as SupabaseClient;

export type { Session, User } from '@supabase/supabase-js';
