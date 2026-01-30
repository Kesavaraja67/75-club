-- Run this in your Supabase SQL Editor

create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  code text,
  type text default 'Theory',
  total_hours integer default 0,
  hours_present integer default 0,
  threshold integer default 75,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table subjects enable row level security;

-- Policy: Users can only see their own subjects
create policy "Users can view own subjects"
  on subjects for select
  using (auth.uid() = user_id);

-- Policy: Users can insert their own subjects
create policy "Users can insert own subjects"
  on subjects for insert
  with check (auth.uid() = user_id);

-- Policy: Users can update their own subjects
create policy "Users can update own subjects"
  on subjects for update
  using (auth.uid() = user_id);

-- Policy: Users can delete their own subjects
create policy "Users can delete own subjects"
  on subjects for delete
  using (auth.uid() = user_id);
