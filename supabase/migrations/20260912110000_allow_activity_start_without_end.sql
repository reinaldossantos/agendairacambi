alter table public.activities drop constraint if exists activities_valid_schedule;
alter table public.activities add constraint activities_valid_schedule check (
  due_date is not null
  and (end_datetime is null or (start_datetime is not null and end_datetime > start_datetime))
) not valid;
