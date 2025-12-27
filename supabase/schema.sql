-- Finezza_RB Supabase schema (initial)
create extension if not exists "pgcrypto";

do $$
begin
  create type public.member_role as enum (
    'owner',
    'admin',
    'dentist',
    'assistant',
    'reception'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum (
    'active',
    'invited',
    'suspended'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.patient_gender as enum (
    'female',
    'male',
    'other',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.appointment_status as enum (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invoice_status as enum (
    'draft',
    'issued',
    'paid',
    'void',
    'overdue'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_severity as enum (
    'info',
    'success',
    'warning',
    'danger',
    'highlight'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum (
    'card',
    'pix',
    'cash',
    'bank_transfer',
    'insurance'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.procedure_category as enum (
    'estetica',
    'clinica',
    'ortodontia',
    'cirurgia',
    'preventivo'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.chair_status as enum (
    'available',
    'occupied',
    'maintenance'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users on delete restrict,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.member_role not null default 'dentist',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  gender public.patient_gender not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chairs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  name text not null,
  status public.chair_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  patient_id uuid not null references public.patients on delete restrict,
  chair_id uuid references public.chairs on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  source text default 'manual',
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (end_at > start_at)
);

create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  name text not null,
  category public.procedure_category not null default 'clinica',
  price_base numeric(10,2) not null default 0,
  duration_min integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create table if not exists public.appointment_procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  appointment_id uuid not null references public.appointments on delete cascade,
  procedure_id uuid not null references public.procedures on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null default 0,
  total numeric(10,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  constraint appointment_procedures_quantity_check check (quantity > 0)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  patient_id uuid not null references public.patients on delete restrict,
  appointment_id uuid references public.appointments on delete set null,
  status public.invoice_status not null default 'draft',
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  issued_at timestamptz,
  due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_total_check check (total >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  invoice_id uuid not null references public.invoices on delete cascade,
  amount numeric(10,2) not null,
  method public.payment_method not null default 'pix',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payments_amount_check check (amount > 0)
);

create table if not exists public.revenue_entries (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  description text not null,
  category text,
  amount numeric(10,2) not null,
  received_at timestamptz not null default now(),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revenue_entries_amount_check check (amount > 0)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  description text not null,
  category text,
  vendor text,
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_check check (amount > 0)
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  category text not null,
  monthly_limit numeric(10,2) not null default 0,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, category),
  constraint budgets_limit_check check (monthly_limit >= 0)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  name text not null,
  unit text,
  stock integer not null default 0,
  minimum_stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_stock_check check (stock >= 0),
  constraint inventory_minimum_check check (minimum_stock >= 0),
  unique (clinic_id, name)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  item_id uuid not null references public.inventory_items on delete cascade,
  delta integer not null,
  reason text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_movement_delta_check check (delta <> 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  user_id uuid references auth.users on delete set null,
  title text not null,
  body text,
  severity public.notification_severity not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.google_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics on delete cascade,
  user_id uuid references auth.users on delete set null,
  access_token text not null,
  refresh_token text,
  scope text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id)
);

create index if not exists clinic_members_user_idx on public.clinic_members (user_id);
create index if not exists patients_clinic_idx on public.patients (clinic_id);
create index if not exists appointments_clinic_idx on public.appointments (clinic_id);
create index if not exists appointments_start_idx on public.appointments (start_at);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create index if not exists procedures_clinic_idx on public.procedures (clinic_id);
create index if not exists invoices_clinic_idx on public.invoices (clinic_id);
create index if not exists payments_clinic_idx on public.payments (clinic_id);
create index if not exists revenue_entries_clinic_idx on public.revenue_entries (clinic_id);
create index if not exists revenue_entries_received_at_idx on public.revenue_entries (received_at);
create index if not exists expenses_clinic_idx on public.expenses (clinic_id);
create index if not exists expenses_paid_at_idx on public.expenses (paid_at);
create index if not exists budgets_clinic_idx on public.budgets (clinic_id);
create index if not exists inventory_items_clinic_idx on public.inventory_items (clinic_id);
create index if not exists inventory_movements_item_idx on public.inventory_movements (item_id);
create index if not exists notifications_clinic_idx on public.notifications (clinic_id);
create index if not exists google_calendar_tokens_user_idx on public.google_calendar_tokens (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_clinics on public.clinics;
create trigger set_updated_at_clinics
before update on public.clinics
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_clinic_members on public.clinic_members;
create trigger set_updated_at_clinic_members
before update on public.clinic_members
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_patients on public.patients;
create trigger set_updated_at_patients
before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_chairs on public.chairs;
create trigger set_updated_at_chairs
before update on public.chairs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_appointments on public.appointments;
create trigger set_updated_at_appointments
before update on public.appointments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_procedures on public.procedures;
create trigger set_updated_at_procedures
before update on public.procedures
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_invoices on public.invoices;
create trigger set_updated_at_invoices
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_revenue_entries on public.revenue_entries;
create trigger set_updated_at_revenue_entries
before update on public.revenue_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_expenses on public.expenses;
create trigger set_updated_at_expenses
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_budgets on public.budgets;
create trigger set_updated_at_budgets
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_google_calendar_tokens on public.google_calendar_tokens;
create trigger set_updated_at_google_calendar_tokens
before update on public.google_calendar_tokens
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_inventory_items on public.inventory_items;
create trigger set_updated_at_inventory_items
before update on public.inventory_items
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_clinic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.clinic_members (clinic_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_clinic_created on public.clinics;
create trigger on_clinic_created
after insert on public.clinics
for each row execute function public.handle_new_clinic();

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inventory_items
  set stock = stock + new.delta,
      updated_at = now()
  where id = new.item_id;
  return new;
end;
$$;

drop trigger if exists on_inventory_movement on public.inventory_movements;
create trigger on_inventory_movement
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

create or replace function public.is_clinic_owner(clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinics c
    where c.id = clinic_id
      and c.owner_id = auth.uid()
  );
$$;

create or replace function public.is_clinic_member(clinic_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = clinic_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients enable row level security;
alter table public.chairs enable row level security;
alter table public.appointments enable row level security;
alter table public.procedures enable row level security;
alter table public.appointment_procedures enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.revenue_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.notifications enable row level security;
alter table public.google_calendar_tokens enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Clinics are viewable by members" on public.clinics;
create policy "Clinics are viewable by members"
on public.clinics for select
using (public.is_clinic_member(id) or owner_id = auth.uid());

drop policy if exists "Clinics are insertable by owner" on public.clinics;
create policy "Clinics are insertable by owner"
on public.clinics for insert
with check (owner_id = auth.uid());

drop policy if exists "Clinics are updatable by owner" on public.clinics;
create policy "Clinics are updatable by owner"
on public.clinics for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Clinics are deletable by owner" on public.clinics;
create policy "Clinics are deletable by owner"
on public.clinics for delete
using (owner_id = auth.uid());

drop policy if exists "Clinic members are viewable by member" on public.clinic_members;
create policy "Clinic members are viewable by member"
on public.clinic_members for select
using (user_id = auth.uid() or public.is_clinic_owner(clinic_id));

drop policy if exists "Clinic members are insertable by owner" on public.clinic_members;
create policy "Clinic members are insertable by owner"
on public.clinic_members for insert
with check (public.is_clinic_owner(clinic_id));

drop policy if exists "Clinic members are updatable by owner" on public.clinic_members;
create policy "Clinic members are updatable by owner"
on public.clinic_members for update
using (public.is_clinic_owner(clinic_id))
with check (public.is_clinic_owner(clinic_id));

drop policy if exists "Clinic members are deletable by owner" on public.clinic_members;
create policy "Clinic members are deletable by owner"
on public.clinic_members for delete
using (public.is_clinic_owner(clinic_id));

drop policy if exists "Patients are managed by members" on public.patients;
create policy "Patients are managed by members"
on public.patients for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Chairs are managed by members" on public.chairs;
create policy "Chairs are managed by members"
on public.chairs for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Appointments are managed by members" on public.appointments;
create policy "Appointments are managed by members"
on public.appointments for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Procedures are managed by members" on public.procedures;
create policy "Procedures are managed by members"
on public.procedures for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Appointment procedures are managed by members" on public.appointment_procedures;
create policy "Appointment procedures are managed by members"
on public.appointment_procedures for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Invoices are managed by members" on public.invoices;
create policy "Invoices are managed by members"
on public.invoices for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Payments are managed by members" on public.payments;
create policy "Payments are managed by members"
on public.payments for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Revenue entries are managed by members" on public.revenue_entries;
create policy "Revenue entries are managed by members"
on public.revenue_entries for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Expenses are managed by members" on public.expenses;
create policy "Expenses are managed by members"
on public.expenses for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Budgets are managed by members" on public.budgets;
create policy "Budgets are managed by members"
on public.budgets for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Inventory items are managed by members" on public.inventory_items;
create policy "Inventory items are managed by members"
on public.inventory_items for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Inventory movements are managed by members" on public.inventory_movements;
create policy "Inventory movements are managed by members"
on public.inventory_movements for all
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

drop policy if exists "Notifications are viewable by members" on public.notifications;
create policy "Notifications are viewable by members"
on public.notifications for select
using (
  public.is_clinic_member(clinic_id)
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists "Notifications are insertable by members" on public.notifications;
create policy "Notifications are insertable by members"
on public.notifications for insert
with check (
  public.is_clinic_member(clinic_id)
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists "Google tokens are managed by owner" on public.google_calendar_tokens;
create policy "Google tokens are managed by owner"
on public.google_calendar_tokens for all
using (public.is_clinic_owner(clinic_id))
with check (public.is_clinic_owner(clinic_id));

drop view if exists public.v_finance_monthly;
create view public.v_finance_monthly as
with revenue as (
  select
    clinic_id,
    date_trunc('month', paid_at)::date as month,
    sum(amount)::numeric(10,2) as total
  from public.payments
  group by clinic_id, date_trunc('month', paid_at)
),
manual_revenue as (
  select
    clinic_id,
    date_trunc('month', received_at)::date as month,
    sum(amount)::numeric(10,2) as total
  from public.revenue_entries
  group by clinic_id, date_trunc('month', received_at)
),
expenses as (
  select
    clinic_id,
    date_trunc('month', paid_at)::date as month,
    sum(amount)::numeric(10,2) as total
  from public.expenses
  group by clinic_id, date_trunc('month', paid_at)
),
revenue_union as (
  select clinic_id, month, total from revenue
  union all
  select clinic_id, month, total from manual_revenue
),
revenue_totals as (
  select clinic_id, month, sum(total)::numeric(10,2) as total
  from revenue_union
  group by clinic_id, month
)
select
  coalesce(revenue_totals.clinic_id, expenses.clinic_id) as clinic_id,
  coalesce(revenue_totals.month, expenses.month) as month,
  coalesce(revenue_totals.total, 0)::numeric(10,2) as revenue,
  coalesce(expenses.total, 0)::numeric(10,2) as expenses
from revenue_totals
full join expenses
  on revenue_totals.clinic_id = expenses.clinic_id
  and revenue_totals.month = expenses.month;
