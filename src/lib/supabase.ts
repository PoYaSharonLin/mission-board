import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on the database schema
export type Profile = {
  id: string;
  real_name: string;
  nickname: string;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  task_text: string;
  is_completed: boolean;
  completed_at: string | null;
};

export type Guess = {
  id: string;
  guesser_id: string;
  guessed_user_id: string;
  guessed_task_text: string;
  created_at: string;
  is_correct: boolean | null;
  is_half_correct: boolean | null;
};
