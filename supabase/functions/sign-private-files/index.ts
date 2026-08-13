import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const allowedBuckets = new Set(["activity-attachments", "activity-files", "program-files"]);

function objectPath(value: unknown, bucket: string) {
  const candidate = value && typeof value === "object" ? (value as { path?: string; url?: string }).path || (value as { url?: string }).url : value;
  const raw = typeof candidate === "string" ? candidate.trim() : "";
  if (!raw) return "";
  let decoded = raw.split(/[?#]/)[0].replace(/^\/+/, "");
  try { decoded = decodeURIComponent(decoded); } catch { /* keep the original legacy value */ }
  const prefix = `${bucket}/`;
  if (decoded.startsWith(prefix)) return decoded.slice(prefix.length);
  const marker = `/${bucket}/`;
  const index = decoded.indexOf(marker);
  return index >= 0 ? decoded.slice(index + marker.length) : decoded;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authorization = request.headers.get("authorization") || "";
  const service = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } });
  const { data: authData } = await service.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!authData.user) return Response.json({ error: "Sessão inválida." }, { status: 401, headers: corsHeaders });
  const { data: profile } = await service.from("persons").select("id,is_active,locked_at").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!profile?.is_active || profile.locked_at) return Response.json({ error: "Usuário sem acesso ativo." }, { status: 403, headers: corsHeaders });

  const body = await request.json().catch(() => ({}));
  const bucket = typeof body.bucket === "string" ? body.bucket : "";
  const values = Array.isArray(body.values) ? body.values.slice(0, 50) : [];
  if (!allowedBuckets.has(bucket) || !values.length) return Response.json({ error: "Solicitação inválida." }, { status: 400, headers: corsHeaders });

  const urls = await Promise.all(values.map(async (value: unknown) => {
    const path = objectPath(value, bucket);
    if (!path) return { path: "", url: "", error: "Caminho ausente." };
    const { data, error } = await service.storage.from(bucket).createSignedUrl(path, 3600);
    return { path, url: data?.signedUrl || "", error: error?.message || null };
  }));
  return Response.json({ urls }, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
