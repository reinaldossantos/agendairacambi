-- Reinicia a numeração dos relatórios mensais após a exclusão dos dados de teste.
-- Por segurança, o comando é interrompido se ainda existir algum relatório cadastrado.
do $$
declare
  report_sequence regclass;
begin
  if exists (select 1 from public.monthly_activity_reports) then
    raise exception 'A numeração não foi reiniciada porque ainda existem relatórios mensais cadastrados.';
  end if;

  report_sequence := pg_get_serial_sequence('public.monthly_activity_reports', 'report_number')::regclass;

  if report_sequence is null then
    raise exception 'Não foi possível localizar a sequência de numeração dos relatórios mensais.';
  end if;

  perform setval(report_sequence, 1, false);
end;
$$;
