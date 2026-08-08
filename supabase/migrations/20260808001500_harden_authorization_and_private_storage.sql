begin;

create or replace function public.current_person_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.persons where auth_user_id = auth.uid() and is_active = true and locked_at is null limit 1 $$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public
as $$ select public.current_person_id() is not null $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.persons where auth_user_id = auth.uid() and is_active = true and access_role = 'admin') $$;

create or replace function public.is_reinaldo()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.persons where auth_user_id = auth.uid() and is_active = true and lower(email) = 'reinaldo@iracambi.com') $$;

revoke all on function public.current_person_id() from public, anon;
revoke all on function public.is_active_user() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_reinaldo() from public, anon;
grant execute on function public.current_person_id(), public.is_active_user(), public.is_admin(), public.is_reinaldo() to authenticated;

create or replace function public.protect_person_security_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
    new.auth_user_id is distinct from old.auth_user_id or
    new.access_role is distinct from old.access_role or
    new.is_active is distinct from old.is_active or
    new.email is distinct from old.email or
    new.managed_by is distinct from old.managed_by or
    new.must_change_password is distinct from old.must_change_password or
    new.failed_login_attempts is distinct from old.failed_login_attempts or
    new.locked_at is distinct from old.locked_at
  ) then
    raise exception 'Campos de seguranca do perfil exigem administrador.';
  end if;
  return new;
end $$;
drop trigger if exists protect_person_security_fields on public.persons;
create trigger protect_person_security_fields before update on public.persons
for each row execute function public.protect_person_security_fields();

create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.persons set must_change_password = false, failed_login_attempts = 0, locked_at = null
  where auth_user_id = auth.uid() and is_active = true;
  if not found then raise exception 'Perfil ativo nao encontrado.'; end if;
end $$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on public.app_settings to anon;
grant select on public.persons, public.programs, public.activities, public.activity_logs,
  public.announcements, public.program_files, public.monthly_activity_reports,
  public.expense_reports, public.expense_report_notifications, public.expense_approval_config,
  public.expense_report_approvals, public.app_settings, public.mileage_rates,
  public.vehicles, public.vehicle_bookings, public.management_projects,
  public.management_project_tasks, public.management_project_risks,
  public.management_project_logs, public.management_project_notifications,
  public.activity_notification_reads, public.security_notifications,
  public.user_access_logs, public.system_audit_logs to authenticated;
grant insert, update, delete on public.persons, public.programs, public.activities,
  public.announcements, public.program_files, public.monthly_activity_reports,
  public.expense_reports, public.app_settings, public.mileage_rates, public.vehicles,
  public.vehicle_bookings, public.management_projects, public.management_project_tasks,
  public.management_project_risks, public.management_project_logs to authenticated;
grant insert, update on public.activity_logs, public.expense_report_notifications,
  public.management_project_notifications, public.activity_notification_reads,
  public.security_notifications to authenticated;

do $drop_policies$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'persons','programs','activities','activity_logs','announcements','program_files',
      'monthly_activity_reports','expense_reports','expense_report_notifications','app_settings',
      'mileage_rates','vehicles','vehicle_bookings','management_projects','management_project_tasks',
      'management_project_risks','management_project_logs','management_project_notifications',
      'activity_notification_reads','security_notifications','user_access_logs','system_audit_logs'
    ])
  loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $drop_policies$;

create policy app_settings_public_read on public.app_settings for select to anon
using (key in ('launch_modes','translation_settings'));
create policy app_settings_authenticated_read on public.app_settings for select to authenticated using (public.is_active_user());
create policy app_settings_admin_write on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy persons_active_read on public.persons for select to authenticated using (public.is_active_user());
create policy persons_own_or_admin_update on public.persons for update to authenticated
using (id = public.current_person_id() or public.is_admin()) with check (id = public.current_person_id() or public.is_admin());
create policy persons_admin_insert on public.persons for insert to authenticated with check (public.is_admin());
create policy persons_admin_delete on public.persons for delete to authenticated using (public.is_admin());

create policy programs_active_read on public.programs for select to authenticated using (public.is_active_user());
create policy programs_admin_write on public.programs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy activities_active_read on public.activities for select to authenticated using (public.is_active_user());
create policy activities_active_insert on public.activities for insert to authenticated with check (public.is_active_user());
create policy activities_owner_write on public.activities for update to authenticated
using (public.is_admin() or created_by = public.current_person_id() or responsible_id = public.current_person_id() or public.current_person_id() = any(coalesce(involved_ids,'{}'::uuid[])))
with check (public.is_admin() or created_by = public.current_person_id() or responsible_id = public.current_person_id() or public.current_person_id() = any(coalesce(involved_ids,'{}'::uuid[])));
create policy activities_owner_delete on public.activities for delete to authenticated
using (public.is_admin() or created_by = public.current_person_id() or responsible_id = public.current_person_id());

create policy activity_logs_active_read on public.activity_logs for select to authenticated using (public.is_active_user());
create policy activity_logs_active_insert on public.activity_logs for insert to authenticated with check (public.is_active_user());
create policy activity_logs_own_update on public.activity_logs for update to authenticated
using (person_id = public.current_person_id() or public.is_admin()) with check (person_id = public.current_person_id() or public.is_admin());

create policy announcements_active_read on public.announcements for select to authenticated using (public.is_active_user());
create policy announcements_active_write on public.announcements for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
create policy program_files_active_read on public.program_files for select to authenticated using (public.is_active_user());
create policy program_files_active_insert on public.program_files for insert to authenticated with check (uploader_id = public.current_person_id());
create policy program_files_owner_write on public.program_files for update to authenticated using (uploader_id = public.current_person_id() or public.is_admin()) with check (uploader_id = public.current_person_id() or public.is_admin());
create policy program_files_owner_delete on public.program_files for delete to authenticated using (uploader_id = public.current_person_id() or public.is_admin());

create policy monthly_reports_active_read on public.monthly_activity_reports for select to authenticated using (public.is_active_user());
create policy monthly_reports_owner_insert on public.monthly_activity_reports for insert to authenticated with check (person_id = public.current_person_id() or public.is_admin());
create policy monthly_reports_owner_update on public.monthly_activity_reports for update to authenticated using (person_id = public.current_person_id() or public.is_admin()) with check (person_id = public.current_person_id() or public.is_admin());
create policy monthly_reports_owner_delete on public.monthly_activity_reports for delete to authenticated using (person_id = public.current_person_id() or public.is_admin());

create policy expense_reports_scoped_read on public.expense_reports for select to authenticated using (
  person_id = public.current_person_id() or public.is_admin() or exists(select 1 from public.expense_report_approvals a where a.report_id = id and a.approver_id = public.current_person_id()));
create policy expense_reports_owner_insert on public.expense_reports for insert to authenticated with check (person_id = public.current_person_id());
create policy expense_reports_scoped_update on public.expense_reports for update to authenticated using (
  public.is_admin() or (person_id = public.current_person_id() and status in ('draft','changes_requested')) or exists(select 1 from public.expense_approval_config c where c.person_id = public.current_person_id() and c.is_active))
with check (public.is_admin() or person_id = public.current_person_id() or exists(select 1 from public.expense_approval_config c where c.person_id = public.current_person_id() and c.is_active));
create policy expense_reports_owner_delete on public.expense_reports for delete to authenticated using (public.is_admin() or (person_id = public.current_person_id() and status = 'draft'));

create policy expense_notifications_own_read on public.expense_report_notifications for select to authenticated using (recipient_id = public.current_person_id() or actor_id = public.current_person_id() or public.is_admin());
create policy expense_notifications_active_insert on public.expense_report_notifications for insert to authenticated with check (actor_id = public.current_person_id());
create policy expense_notifications_own_update on public.expense_report_notifications for update to authenticated using (recipient_id = public.current_person_id()) with check (recipient_id = public.current_person_id());

create policy mileage_active_read on public.mileage_rates for select to authenticated using (public.is_active_user());
create policy mileage_admin_write on public.mileage_rates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy vehicles_active_read on public.vehicles for select to authenticated using (public.is_active_user());
create policy vehicles_admin_write on public.vehicles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy bookings_active_read on public.vehicle_bookings for select to authenticated using (public.is_active_user());
create policy bookings_own_insert on public.vehicle_bookings for insert to authenticated with check (person_id = public.current_person_id() or public.is_admin());
create policy bookings_own_update on public.vehicle_bookings for update to authenticated using (person_id = public.current_person_id() or public.is_admin()) with check (person_id = public.current_person_id() or public.is_admin());
create policy bookings_own_delete on public.vehicle_bookings for delete to authenticated using (person_id = public.current_person_id() or public.is_admin());

create policy projects_active_read on public.management_projects for select to authenticated using (public.is_active_user());
create policy projects_active_insert on public.management_projects for insert to authenticated with check (created_by = public.current_person_id());
create policy projects_member_update on public.management_projects for update to authenticated using (public.is_admin() or created_by = public.current_person_id() or manager_id = public.current_person_id() or public.current_person_id() = any(coalesce(team_ids,'{}'::uuid[]))) with check (public.is_active_user());
create policy projects_admin_delete on public.management_projects for delete to authenticated using (public.is_admin());

create policy tasks_active_read on public.management_project_tasks for select to authenticated using (public.is_active_user());
create policy tasks_member_write on public.management_project_tasks for all to authenticated using (public.is_admin() or responsible_id = public.current_person_id() or exists(select 1 from public.management_projects p where p.id = project_id and (p.created_by = public.current_person_id() or p.manager_id = public.current_person_id() or public.current_person_id() = any(coalesce(p.team_ids,'{}'::uuid[]))))) with check (public.is_active_user());
create policy risks_active_read on public.management_project_risks for select to authenticated using (public.is_active_user());
create policy risks_member_write on public.management_project_risks for all to authenticated using (public.is_admin() or owner_id = public.current_person_id() or exists(select 1 from public.management_projects p where p.id = project_id and (p.created_by = public.current_person_id() or p.manager_id = public.current_person_id() or public.current_person_id() = any(coalesce(p.team_ids,'{}'::uuid[]))))) with check (public.is_active_user());
create policy project_logs_active_read on public.management_project_logs for select to authenticated using (public.is_active_user());
create policy project_logs_active_insert on public.management_project_logs for insert to authenticated with check (actor_id = public.current_person_id());

create policy project_notifications_own_read on public.management_project_notifications for select to authenticated using (recipient_id = public.current_person_id());
create policy project_notifications_active_insert on public.management_project_notifications for insert to authenticated with check (actor_id = public.current_person_id());
create policy project_notifications_own_update on public.management_project_notifications for update to authenticated using (recipient_id = public.current_person_id()) with check (recipient_id = public.current_person_id());
create policy notification_reads_own_all on public.activity_notification_reads for all to authenticated using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());
create policy security_notifications_own_read on public.security_notifications for select to authenticated using (recipient_id = public.current_person_id());
create policy security_notifications_own_update on public.security_notifications for update to authenticated using (recipient_id = public.current_person_id()) with check (recipient_id = public.current_person_id());
create policy access_logs_reinaldo_read on public.user_access_logs for select to authenticated using (public.is_reinaldo());
create policy audit_logs_reinaldo_read on public.system_audit_logs for select to authenticated using (public.is_reinaldo());

update storage.buckets set public = false where id in ('activity-attachments','activity-files','program-files');
drop policy if exists activity_storage_public_read on storage.objects;
drop policy if exists activity_storage_authenticated_read on storage.objects;
create policy activity_storage_authenticated_read on storage.objects for select to authenticated
using (bucket_id in ('activity-attachments','activity-files','program-files') and public.is_active_user());
drop policy if exists activity_storage_authenticated_insert on storage.objects;
drop policy if exists activity_storage_authenticated_update on storage.objects;
drop policy if exists activity_storage_authenticated_delete on storage.objects;
create policy private_storage_active_insert on storage.objects for insert to authenticated
with check (bucket_id in ('activity-attachments','activity-files','program-files') and public.is_active_user());
create policy private_storage_owner_update on storage.objects for update to authenticated
using (bucket_id in ('activity-attachments','activity-files','program-files') and (owner_id = auth.uid()::text or public.is_admin()))
with check (bucket_id in ('activity-attachments','activity-files','program-files') and (owner_id = auth.uid()::text or public.is_admin()));
create policy private_storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id in ('activity-attachments','activity-files','program-files') and (owner_id = auth.uid()::text or public.is_admin()));

commit;
