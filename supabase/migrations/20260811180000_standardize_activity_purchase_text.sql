-- Garante no banco o padrão: primeira letra maiúscula e restante minúsculo.

create or replace function public.sentence_case_text(value text)
returns text
language sql
immutable
strict
as $$
  select case
    when trim(value) = '' then ''
    else upper(left(lower(trim(value)), 1)) || substr(lower(trim(value)), 2)
  end
$$;

create or replace function public.standardize_activity_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.title := public.sentence_case_text(new.title);
  new.description := public.sentence_case_text(new.description);
  return new;
end;
$$;

drop trigger if exists standardize_activity_text on public.activities;
create trigger standardize_activity_text
before insert or update of title, description on public.activities
for each row execute function public.standardize_activity_text();

create or replace function public.standardize_purchase_request_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.title := public.sentence_case_text(new.title);
  new.justification := public.sentence_case_text(new.justification);
  if new.edital_name is not null then new.edital_name := public.sentence_case_text(new.edital_name); end if;
  if new.funding_source is not null then new.funding_source := public.sentence_case_text(new.funding_source); end if;
  if new.beneficiary_description is not null then new.beneficiary_description := public.sentence_case_text(new.beneficiary_description); end if;
  if new.supplier_suggestion is not null then new.supplier_suggestion := public.sentence_case_text(new.supplier_suggestion); end if;
  if new.delivery_location is not null then new.delivery_location := public.sentence_case_text(new.delivery_location); end if;

  select coalesce(jsonb_agg(
    item || jsonb_build_object(
      'description', public.sentence_case_text(coalesce(item->>'description', '')),
      'specification', public.sentence_case_text(coalesce(item->>'specification', ''))
    ) order by ordinal
  ), '[]'::jsonb)
  into new.items
  from jsonb_array_elements(new.items) with ordinality as entries(item, ordinal);
  return new;
end;
$$;

drop trigger if exists standardize_purchase_request_text on public.purchase_requests;
create trigger standardize_purchase_request_text
before insert or update on public.purchase_requests
for each row execute function public.standardize_purchase_request_text();
