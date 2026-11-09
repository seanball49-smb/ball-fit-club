-- Ball Fit Club database
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- It is safe to run more than once.

-- 1. Tables ---------------------------------------------------------------

-- The two people using the app. id is 'a' (Sean) or 'b' (partner).
create table if not exists public.profiles (
  id           text primary key check (id in ('a','b')),
  name         text not null,
  goal         text not null check (goal in ('gain','lose')),
  start_weight numeric,
  goal_weight  numeric,
  calories     integer,
  protein      integer,
  water_goal   integer default 8,
  updated_at   timestamptz default now()
);

-- Workout plans you write. assignee is 'a', 'b' or 'both'.
-- weekday is 'any' or '0'-'6' (0 = Sunday).
create table if not exists public.plans (
  id         text primary key default gen_random_uuid()::text,
  title      text not null,
  assignee   text not null check (assignee in ('a','b','both')),
  weekday    text not null default 'any',
  exercises  jsonb not null default '[]'::jsonb,
  notes      text default '',
  created_at timestamptz default now()
);

-- One row per person per day: food, water, weight, workouts done, etc.
-- id looks like 'a_2026-11-08'.
create table if not exists public.days (
  id         text primary key,
  who        text not null check (who in ('a','b')),
  date       date not null,
  foods      jsonb not null default '[]'::jsonb,
  water      integer not null default 0,
  weight     numeric,
  done       jsonb not null default '{}'::jsonb,
  workouts   jsonb not null default '[]'::jsonb,
  quests     jsonb not null default '[]'::jsonb,
  extra      jsonb not null default '[]'::jsonb,
  cheers     integer not null default 0,
  updated_at timestamptz default now()
);
create index if not exists days_date_idx on public.days (date desc);

-- 2. Access ---------------------------------------------------------------
-- No sign-in: the app's public key can read and write these three tables.
-- Anyone who has your app's web address AND your key could change this data,
-- so keep the Vercel link to yourselves.

alter table public.profiles enable row level security;
alter table public.plans    enable row level security;
alter table public.days     enable row level security;

drop policy if exists "open access" on public.profiles;
drop policy if exists "open access" on public.plans;
drop policy if exists "open access" on public.days;
create policy "open access" on public.profiles for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.plans    for all to anon, authenticated using (true) with check (true);
create policy "open access" on public.days     for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.profiles, public.plans, public.days to anon, authenticated;

-- 3. Live updates (so each phone sees the other's changes instantly) --------
do $$
begin
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.plans;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.days;     exception when duplicate_object then null; end;
end $$;

-- 4. Starter workout plans (edit or delete them in the app) ----------------
insert into public.plans (id, title, assignee, weekday, exercises, notes) values
('starter-push', 'Push Day', 'a', '1',
 '[{"n":"Bench press","s":"4","r":"6-8","w":""},{"n":"Overhead press","s":"3","r":"8","w":""},{"n":"Incline dumbbell press","s":"3","r":"10","w":""},{"n":"Dips","s":"3","r":"10","w":""},{"n":"Tricep pushdown","s":"3","r":"12","w":""}]',
 'Heavy and controlled. Rest 2 minutes on the big lifts. Add weight once you hit the top of the rep range.'),
('starter-legs', 'Leg Day', 'a', '3',
 '[{"n":"Back squat","s":"4","r":"6-8","w":""},{"n":"Romanian deadlift","s":"3","r":"8","w":""},{"n":"Leg press","s":"3","r":"12","w":""},{"n":"Walking lunges","s":"3","r":"10 each","w":""},{"n":"Calf raises","s":"4","r":"15","w":""}]',
 'Eat a big meal within 2 hours after.'),
('starter-pull', 'Pull Day', 'a', '5',
 '[{"n":"Deadlift","s":"3","r":"5","w":""},{"n":"Pull-ups or lat pulldown","s":"4","r":"8","w":""},{"n":"Barbell row","s":"3","r":"8","w":""},{"n":"Face pulls","s":"3","r":"15","w":""},{"n":"Bicep curls","s":"3","r":"12","w":""}]',
 ''),
('starter-glutes', 'Glutes & Legs', 'b', '1',
 '[{"n":"Hip thrusts","s":"4","r":"12","w":""},{"n":"Goblet squats","s":"3","r":"12","w":""},{"n":"Reverse lunges","s":"3","r":"10 each","w":""},{"n":"Cable kickbacks","s":"3","r":"15 each","w":""},{"n":"Incline treadmill walk","s":"1","r":"15 min","w":""}]',
 'Pick a weight where the last 2 reps feel tough. Rest 45-60 seconds to keep your heart rate up.'),
('starter-upper', 'Upper Body Sculpt', 'b', '3',
 '[{"n":"Dumbbell shoulder press","s":"3","r":"12","w":""},{"n":"Lat pulldown","s":"3","r":"12","w":""},{"n":"Dumbbell rows","s":"3","r":"12 each","w":""},{"n":"Push-ups (knees ok)","s":"3","r":"10","w":""},{"n":"Plank","s":"3","r":"40 sec","w":""}]',
 ''),
('starter-together', 'Saturday Sweat Together', 'both', '6',
 '[{"n":"Jumping jacks","s":"3","r":"45 sec","w":""},{"n":"Bodyweight squats","s":"3","r":"20","w":""},{"n":"Partner high-five push-ups","s":"3","r":"10","w":""},{"n":"Mountain climbers","s":"3","r":"30 sec","w":""},{"n":"Walk or bike ride","s":"1","r":"30 min","w":""}]',
 'Face each other for the push-ups and high-five at the top of each rep.')
on conflict (id) do nothing;
