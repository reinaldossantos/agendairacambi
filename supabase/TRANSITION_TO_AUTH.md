# Transição da versão convencional para a versão autenticada

Estes procedimentos mantêm o site antigo funcionando enquanto a nova versão é testada localmente. Nenhum dos dois scripts apaga dados, relatórios, anexos ou contas do Supabase Auth.

## Agora: manter o site convencional

1. Faça um backup do banco no Supabase.
2. Abra **SQL Editor > New query**.
3. Copie todo o conteúdo de `enable_legacy_temporary_access.sql`.
4. Execute uma única vez.
5. No resultado final, confirme:
   - `can_read_activities = true`;
   - `can_read_persons = true`;
   - `can_read_access_logs = false`;
   - `can_read_security_notifications = false`.
6. Atualize o site online e teste criação, edição e conclusão de uma atividade, anexos, notificações, despesas e relatórios.

O script pode ser executado novamente sem duplicar políticas. Não execute `activate_authenticated_access.sql` enquanto os usuários ainda dependerem da versão convencional.

## Antes da publicação definitiva

- Confirme que todas as pessoas possuem o e-mail correto e uma conta vinculada no Supabase Auth.
- Teste localmente o login de Reinaldo e de pelo menos um usuário comum.
- Teste a troca obrigatória da senha temporária.
- Teste “Esqueceu a senha?” e a rota `/reset-password`.
- Teste os aliases `robin` e `deivid`, que devem autenticar nas contas `iracambi@iracambi.com` e `viveiro@iracambi.com`.
- Publique `auth-login`, `admin-reset-password` e `delete-expense-report` com `--no-verify-jwt`; cada função continua validando a sessão e as permissões internamente.
- Teste o bloqueio após três erros e a notificação administrativa.
- Execute `npm run build` e mantenha um backup recente do banco.
- Defina uma janela curta de publicação, preferencialmente quando ninguém estiver usando o sistema.

## No dia da publicação

1. Avise os usuários sobre a indisponibilidade breve e interrompa novos lançamentos.
2. Publique a nova versão do frontend com as variáveis corretas do Supabase.
3. No Supabase, configure **Authentication > URL Configuration**:
   - **Site URL**: endereço público da aplicação;
   - **Redirect URLs**: endereço público e endereço público seguido de `/reset-password`.
4. No SQL Editor, execute todo o conteúdo de `activate_authenticated_access.sql`.
5. Confirme que os quatro resultados finais são `false`.
6. Abra uma janela anônima do navegador e confirme que o sistema direciona para o login.
7. Entre como Reinaldo, troque a senha se solicitado e valide o painel.
8. Teste um usuário comum e confirme que ele não acessa as áreas administrativas.
9. Libere o sistema para os usuários.

## Plano de contingência

Se o novo frontend apresentar um problema grave durante a janela de publicação:

1. Volte temporariamente o frontend para a versão convencional.
2. Execute novamente `enable_legacy_temporary_access.sql`.
3. Teste o site antigo antes de liberar o acesso.

Essa reversão restaura apenas a forma temporária de acesso. Ela não remove nenhuma estrutura da autenticação e não perde os dados registrados.

## Observação de segurança

Durante a compatibilidade, as tabelas operacionais listadas no script voltam a aceitar a chave pública sem login, como acontecia na versão antiga. Mantenha esse período o mais curto possível. As tabelas `user_access_logs`, `security_notifications`, `activity_notification_reads` e `system_audit_logs` permanecem bloqueadas para o papel anônimo.
