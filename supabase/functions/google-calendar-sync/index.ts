// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Apenas POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  const { activity_id } = await req.json();
  if (!activity_id) return new Response(JSON.stringify({ error: 'activity_id é obrigatório' }), { status: 400 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  const { data: profile } = await supabaseAdmin.from('persons').select('id,is_active,locked_at').eq('auth_user_id', authData.user?.id).maybeSingle();
  if (!profile?.is_active || profile.locked_at) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
  const person_id = profile.id;

  // 1. Busca token ativo do usuário
  const { data: tokenData, error: tokenError } = await supabaseAdmin
    .from('integrations_token')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', person_id)
    .eq('provider', 'google_calendar')
    .eq('status', 'active')
    .single();

  if (tokenError || !tokenData) {
    return new Response(JSON.stringify({ error: 'Usuário não conectado ao Google Calendar' }), { status: 401 });
  }

  let accessToken = tokenData.access_token;
  const expiresAt = new Date(tokenData.token_expires_at);

  // 2. Renova token se expirado
  if (expiresAt <= new Date()) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshData = await refreshResponse.json();
    if (!refreshResponse.ok) {
      console.error('Erro ao renovar token:', refreshData);
      return new Response(JSON.stringify({ error: 'Falha ao renovar token' }), { status: 401 });
    }
    accessToken = refreshData.access_token;
    await supabaseAdmin
      .from('integrations_token')
      .update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', person_id)
      .eq('provider', 'google_calendar');
  }

  // 3. Busca dados da atividade
  const { data: activity, error: activityError } = await supabaseAdmin
    .from('activities')
    .select('title, description, due_date, week_start, programs(name), persons(name)')
    .eq('id', activity_id)
    .single();

  if (activityError || !activity) {
    return new Response(JSON.stringify({ error: 'Atividade não encontrada' }), { status: 404 });
  }

  // Define horário (ex: 9h às 10h)
  const startDateTime = new Date(activity.due_date);
  startDateTime.setHours(9, 0, 0);
  const endDateTime = new Date(activity.due_date);
  endDateTime.setHours(10, 0, 0);

  const event = {
    summary: activity.title,
    description: `${activity.description || ''}\n\nPrograma: ${activity.programs?.name || 'N/D'}\nResponsável: ${activity.persons?.name || 'N/D'}`,
    start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Sao_Paulo' },
  };

  // 4. Cria evento no Google Calendar
  const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  const calendarData = await calendarResponse.json();
  if (!calendarResponse.ok) {
    console.error('Erro Google Calendar:', calendarData);
    return new Response(JSON.stringify({ error: 'Erro ao criar evento no Google' }), { status: 500 });
  }

  // 5. Salva referência local
  await supabaseAdmin
    .from('integrations_calendar_events')
    .insert({
      user_id: person_id,
      google_event_id: calendarData.id,
      activity_id: activity_id,
      title: activity.title,
      description: activity.description,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: 'synced',
    });

  return new Response(JSON.stringify({ success: true, event_id: calendarData.id }), { status: 200 });
});
