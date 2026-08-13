import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

type MediaValue = string | { path?: string; url?: string; name?: string };
type Activity = { id: string; title: string | null; due_date: string; images: MediaValue[] | null; files: MediaValue[] | null };
type StoredObject = { name: string; id?: string | null; metadata?: { size?: number } | null };

function storagePath(value: MediaValue, bucket: string) {
  if (value && typeof value === "object" && value.path) return String(value.path).replace(new RegExp(`^${bucket}/`), "");
  const raw = typeof value === "string" ? value : value?.url;
  if (!raw) return "";
  const clean = raw.split("?")[0];
  for (const marker of [`/object/sign/${bucket}/`, `/object/public/${bucket}/`, `/object/${bucket}/`, `/${bucket}/`]) {
    const index = clean.indexOf(marker);
    if (index >= 0) return decodeURIComponent(clean.slice(index + marker.length));
  }
  return decodeURIComponent(clean).replace(new RegExp(`^${bucket}/`), "");
}

async function allRows(client: ReturnType<typeof createClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function storageSizes(client: ReturnType<typeof createClient>, bucket: string, prefix = "", sizes = new Map<string, number>()) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    const entries = (data || []) as StoredObject[];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) sizes.set(path, Number(entry.metadata?.size || 0));
      else await storageSizes(client, bucket, path, sizes);
    }
    if (entries.length < 1000) break;
  }
  return sizes;
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = request.headers.get("authorization")?.replace("Bearer ", "") || "";
    const { data: authData } = await admin.auth.getUser(token);
    const { data: profile } = await admin.from("persons").select("id,name,access_role,is_active,locked_at").eq("auth_user_id", authData.user?.id).maybeSingle();
    if (profile?.access_role !== "admin" || !profile.is_active || profile.locked_at) return json({ error: "Acesso restrito ao administrador." }, 403);

    const body = await request.json();
    const mode = body.mode === "execute" ? "execute" : "preview";
    const mediaType = ["images", "files", "both"].includes(body.media_type) ? body.media_type : "both";
    const cutoffDate = String(body.cutoff_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) return json({ error: "Informe uma data de corte válida." }, 400);
    if (mode === "execute" && body.confirmation !== "APAGAR MIDIAS") return json({ error: "Confirmação inválida." }, 400);

    const rows = await allRows(admin, "activities", "id,title,due_date,images,files") as unknown as Activity[];
    const selected = rows.filter((row) => row.due_date < cutoffDate && (
      (mediaType !== "files" && (row.images?.length || 0) > 0) || (mediaType !== "images" && (row.files?.length || 0) > 0)
    ));
    const selectedIds = new Set(selected.map((row) => row.id));
    const selectedPaths = { images: new Set<string>(), files: new Set<string>() };
    const protectedPaths = { images: new Set<string>(), files: new Set<string>() };
    for (const row of rows) {
      const target = selectedIds.has(row.id) ? selectedPaths : protectedPaths;
      if (mediaType !== "files") for (const item of row.images || []) { const path = storagePath(item, "activity-attachments"); if (path) target.images.add(path); }
      if (mediaType !== "images") for (const item of row.files || []) { const path = storagePath(item, "activity-files"); if (path) target.files.add(path); }
    }
    const removableImages = [...selectedPaths.images].filter((path) => !protectedPaths.images.has(path));
    const removableFiles = [...selectedPaths.files].filter((path) => !protectedPaths.files.has(path));
    const [imageSizes, fileSizes] = await Promise.all([
      mediaType === "files" ? new Map<string, number>() : storageSizes(admin, "activity-attachments"),
      mediaType === "images" ? new Map<string, number>() : storageSizes(admin, "activity-files"),
    ]);
    const storageSize = removableImages.reduce((sum, path) => sum + (imageSizes.get(path) || 0), 0)
      + removableFiles.reduce((sum, path) => sum + (fileSizes.get(path) || 0), 0);
    const result = {
      preview: mode === "preview", cutoff_date: cutoffDate, media_type: mediaType,
      activities: selected.length,
      image_references: mediaType === "files" ? 0 : selected.reduce((sum, row) => sum + (row.images?.length || 0), 0),
      file_references: mediaType === "images" ? 0 : selected.reduce((sum, row) => sum + (row.files?.length || 0), 0),
      storage_objects: removableImages.length + removableFiles.length,
      storage_size_bytes: storageSize, storage_size_label: sizeLabel(storageSize),
      sample: selected.slice(0, 20).map(({ id, title, due_date }) => ({ id, title, due_date })),
    };
    if (mode === "preview") return json(result);

    // Primeiro remove os objetos; somente referências removidas com sucesso são retiradas do banco.
    for (let index = 0; index < removableImages.length; index += 100) {
      const { error } = await admin.storage.from("activity-attachments").remove(removableImages.slice(index, index + 100));
      if (error) return json({ error: `Fotos: ${error.message}`, partial: true }, 500);
    }
    for (let index = 0; index < removableFiles.length; index += 100) {
      const { error } = await admin.storage.from("activity-files").remove(removableFiles.slice(index, index + 100));
      if (error) return json({ error: `Documentos: ${error.message}`, partial: true }, 500);
    }

    for (const row of selected) {
      const changes: Record<string, unknown> = {};
      if (mediaType !== "files") changes.images = [];
      if (mediaType !== "images") changes.files = [];
      const { error } = await admin.from("activities").update(changes).eq("id", row.id);
      if (error) return json({ error: `Atividade ${row.id}: ${error.message}`, partial: true }, 500);
    }

    // Evita miniaturas quebradas nos relatórios mensais já salvos.
    const reports = await allRows(admin, "monthly_activity_reports", "id,activity_snapshot");
    for (const report of reports) {
      const snapshot = Array.isArray(report.activity_snapshot) ? report.activity_snapshot as Record<string, unknown>[] : [];
      let changed = false;
      const next = snapshot.map((item) => {
        if (!selectedIds.has(String(item.id || item.activity_id || ""))) return item;
        changed = true;
        const updated = { ...item };
        if (mediaType !== "files") { updated.images = []; updated.selected_images = []; }
        if (mediaType !== "images") updated.files = [];
        return updated;
      });
      if (changed) {
        const { error } = await admin.from("monthly_activity_reports").update({ activity_snapshot: next }).eq("id", report.id);
        if (error) return json({ error: `Relatório mensal ${report.id}: ${error.message}`, partial: true }, 500);
      }
    }

    await admin.from("system_audit_logs").insert({
      table_name: "legacy_media_maintenance", action: "DELETE", actor_id: profile.id, actor_name: profile.name,
      changed_fields: ["images", "files"].filter((field) => mediaType === "both" || field === mediaType),
      old_data: result, new_data: { removed_storage_objects: result.storage_objects }, request_path: "/admin/maintenance",
    });
    return json({ ...result, preview: false, success: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha na manutenção das mídias." }, 500);
  }
});
