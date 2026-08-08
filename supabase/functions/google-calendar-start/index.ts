// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  const { data: profile } = await supabaseAdmin.from('persons').select('id,is_active,locked_at').eq('auth_user_id', authData.user?.id).maybeSingle();
  if (!profile?.is_active || profile.locked_at) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
  const personId = profile.id;
  const appUrl = Deno.env.get('APP_URL') || 'https://agendairacambi.vercel.app';
  const requestedReturn = url.searchParams.get('return_url') || `${appUrl}/settings`;
  const returnUrl = new URL(requestedReturn, appUrl).origin === new URL(appUrl).origin ? requestedReturn : `${appUrl}/settings`;

  const state = crypto.randomUUID();
  const { error: stateError } = await supabaseAdmin
    .from('oauth_states')
    .insert({
      id: state,
      user_id: personId,
      return_url: returnUrl,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

  if (stateError) {
    console.error('Erro ao salvar state:', stateError);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
});
