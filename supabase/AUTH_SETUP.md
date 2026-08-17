# Ativação da autenticação

## 1. Banco de dados

Execute `user_authentication.sql` no SQL Editor do Supabase. Faça isso antes de publicar a nova versão do site, pois o script remove o acesso anônimo às tabelas.

## 2. Funções de servidor

Defina um segredo forte e exclusivo para o provisionamento inicial:

```powershell
supabase secrets set AUTH_SETUP_SECRET="SUBSTITUA_POR_UM_SEGREDO_FORTE"
```

Publique as funções. Login e provisionamento precisam aceitar chamadas sem sessão; ambos fazem sua própria validação no servidor.

```powershell
supabase functions deploy auth-login --no-verify-jwt
supabase functions deploy provision-users --no-verify-jwt
supabase functions deploy admin-reset-password --no-verify-jwt
supabase functions deploy delete-expense-report --no-verify-jwt
```

## 3. Criar as contas iniciais

Invoque `provision-users` uma única vez, enviando o mesmo segredo no cabeçalho `x-setup-secret`. A função cria as contas vinculadas às pessoas que possuem e-mail, confirma os e-mails e gera uma senha temporária aleatória e diferente para cada conta. Copie as senhas retornadas uma única vez e entregue-as individualmente por um canal seguro.

Depois do provisionamento, remova o segredo e opcionalmente apague/despublique a função `provision-users`:

```powershell
supabase secrets unset AUTH_SETUP_SECRET
supabase functions delete provision-users
```

## 4. Recuperação de senha

No painel do Supabase, em **Authentication > URL Configuration**, cadastre a URL pública do sistema e acrescente `/reset-password` à lista de URLs de redirecionamento permitidas.

Em **Authentication > Email Templates**, revise o modelo de recuperação de senha e o remetente antes de liberar o sistema.

## 5. Conferência

1. Acesse com `reinaldo@iracambi.com` e a senha temporária aleatória retornada pelo provisionamento.
2. Confirme que a troca de senha é exigida.
3. Confirme que Reinaldo vê Pessoas, histórico de acessos e o botão de reset de senha.
4. Teste uma conta comum e confirme que as áreas administrativas não aparecem.
5. Em uma conta de teste, erre a senha três vezes e confirme o bloqueio e a notificação para Reinaldo.
6. Confirme os aliases `robin` → `iracambi@iracambi.com` e `deivid` → `viveiro@iracambi.com`.
7. Como administrador, redefina uma senha e confirme que a senha temporária aparece uma única vez, o bloqueio é removido e a troca é exigida no próximo acesso.
