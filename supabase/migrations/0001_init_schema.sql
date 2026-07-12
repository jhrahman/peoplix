-- Peoplix initial schema
-- Enums

create type user_role as enum ('admin', 'hr', 'employee');
create type leave_type as enum ('casual', 'sick', 'annual');
create type leave_status as enum ('pending', 'approved', 'rejected');

-- profiles (extends auth.users)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  department text,
  designation text,
  role user_role not null default 'employee',
  joined_date date not null default current_date,
  avatar_url text,
  manager_id uuid references public.profiles (id) on delete set null
);

-- leave_requests

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint leave_requests_date_order check (end_date >= start_date)
);

-- leave_balances

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  year int not null,
  casual_total int not null default 10,
  casual_used int not null default 0,
  sick_total int not null default 14,
  sick_used int not null default 0,
  annual_total int not null default 15,
  annual_used int not null default 0,
  unique (employee_id, year)
);

-- holidays

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  is_recurring boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null
);

-- attendance

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  unique (employee_id, date)
);

-- Auto-create a profile row whenever a user is created via the Supabase Admin API.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'employee')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
