alter table public.tasks
  alter column owner_id drop not null,
  alter column owner_id drop default;

drop policy "Owners manage their tasks" on public.tasks;

grant select, delete on public.tasks to anon;
grant insert (id, title, task_date), update (title, task_date, completed)
  on public.tasks to anon;

create policy "Allow shared test task access" on public.tasks
  for all to anon, authenticated using (true) with check (true);
