-- Initial seed for Finezza_RB
-- Replace <USER_UUID> with your auth.users id.
-- Helper query:
-- select id, email from auth.users order by created_at asc;

insert into public.clinics (name, slug, owner_id)
values ('Finezza RB', 'finezza-rb', '<USER_UUID>');
