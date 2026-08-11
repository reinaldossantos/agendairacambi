-- Corrige o registro legado criado antes da padronização automática.
-- O trigger de padronização mantém a primeira letra maiúscula e as demais minúsculas.
update public.purchase_requests
   set title = public.sentence_case_text(title)
 where lower(trim(title)) = 'pg manutenção kombi'
   and title is distinct from public.sentence_case_text(title);
