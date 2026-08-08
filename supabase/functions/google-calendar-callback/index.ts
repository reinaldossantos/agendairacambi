// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Parâmetros inválidos', { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // 1. Recupera o state salvo
  const { data: stateData, error: stateError } = await supabaseAdmin
    .from('oauth_states')
    .select('user_id, return_url, expires_at')
    .eq('id', state)
    .single();

  if (stateError || !stateData || new Date(stateData.expires_at) <= new Date()) {
    console.error('State inválido:', stateError);
    return new Response('State inválido ou expirado', { status: 400 });
  }

  const personId = stateData.user_id;
  const returnUrl = stateData.return_url;
  await supabaseAdmin.from('oauth_states').delete().eq('id', state);

  // 2. Troca o código por tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error('Erro ao trocar código:', tokens);
    throw new Error('Falha na troca do código');
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

  // 3. Salva os tokens
  const { error: upsertError } = await supabaseAdmin
    .from('integrations_token')
    .upsert({
      user_id: personId,
      provider: 'google_calendar',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: expiresAt,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id, provider' });

  if (upsertError) {
    console.error('Erro ao salvar token:', upsertError);
    return new Response('Erro ao salvar token', { status: 500 });
  }

  // 5. Redireciona de volta com sucesso
  const successUrl = new URL(returnUrl);
  successUrl.searchParams.set('google_sync', 'connected');
  return Response.redirect(successUrl.toString(), 302);
});
