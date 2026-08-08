// supabase/functions/cleanup-old-files/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const objectPath = (value: unknown, bucket: string) => {
  if (value && typeof value === 'object' && 'path' in value) return String((value as { path: unknown }).path);
  const raw = typeof value === 'string' ? value : (value as { url?: string } | null)?.url;
  if (!raw) return '';
  const marker = `/${bucket}/`;
  const index = raw.indexOf(marker);
  return index >= 0 ? decodeURIComponent(raw.slice(index + marker.length).split('?')[0]) : raw;
};

serve(async (request) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const { data: authData } = await supabaseAdmin.auth.getUser(token);
  const { data: profile } = await supabaseAdmin.from('persons').select('access_role,is_active,locked_at').eq('auth_user_id', authData.user?.id).maybeSingle();
  if (profile?.access_role !== 'admin' || !profile.is_active || profile.locked_at) return new Response('Não autorizado', { status: 403 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Buscar atividades com mais de 30 dias
  const { data: oldActivities, error: fetchError } = await supabaseAdmin
    .from('activities')
    .select('id, images, files, updated_at')
    .lt('updated_at', thirtyDaysAgo.toISOString());

  if (fetchError) {
    console.error('Erro ao buscar atividades antigas:', fetchError);
    return new Response('Erro', { status: 500 });
  }

  let totalDeleted = 0;

  for (const activity of oldActivities) {
    let updated = false;
    let newImages = activity.images;
    let newFiles = activity.files;

    // Limpar fotos
    if (activity.images && activity.images.length > 0) {
      const pathsToDelete = activity.images.map((url: unknown) => objectPath(url, 'activity-attachments')).filter(Boolean);
      if (pathsToDelete.length > 0) {
        const { error } = await supabaseAdmin.storage
          .from('activity-attachments')
          .remove(pathsToDelete);
        if (!error) {
          newImages = [];
          updated = true;
          totalDeleted += pathsToDelete.length;
        }
      }
    }

    // Limpar arquivos
    if (activity.files && activity.files.length > 0) {
      const pathsToDelete = activity.files.map((file: unknown) => objectPath(file, 'activity-files')).filter(Boolean);
      if (pathsToDelete.length > 0) {
        const { error } = await supabaseAdmin.storage
          .from('activity-files')
          .remove(pathsToDelete);
        if (!error) {
          newFiles = [];
          updated = true;
          totalDeleted += pathsToDelete.length;
        }
      }
    }

    if (updated) {
      await supabaseAdmin
        .from('activities')
        .update({ images: newImages, files: newFiles })
        .eq('id', activity.id);
    }
  }

  return new Response(JSON.stringify({ message: `Limpeza concluída. ${totalDeleted} arquivos removidos.` }), { status: 200 });
});
