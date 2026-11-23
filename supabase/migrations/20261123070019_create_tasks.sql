create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  task_date date not null,
  completed boolean not null default false
);

create index tasks_owner_date_idx on public.tasks (owner_id, task_date, id);

alter table public.tasks enable row level security;
revoke all on public.tasks from public, anon, authenticated;
grant select, delete on public.tasks to authenticated;
grant insert (id, title, task_date), update (title, task_date, completed)
  on public.tasks to authenticated;

create policy "Owners manage their tasks" on public.tasks for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
