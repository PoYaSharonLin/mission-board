-- Drop the foreign key constraint tying profiles.id to auth.users
-- This is required since we no longer use Supabase Auth.
alter table profiles drop constraint if exists profiles_id_fkey;

-- Disable RLS since we are using localStorage-based identity (no Supabase Auth)
alter table profiles disable row level security;
alter table tasks disable row level security;
alter table guesses disable row level security;

-- Enable Realtime for these tables
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table guesses;
