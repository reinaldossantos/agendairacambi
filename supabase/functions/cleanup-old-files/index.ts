import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type StoredObject = { name: string; id?: string | null; created_at?: string | null };

const objectPath = (value: unknown, bucket: string) => {
  if (value && typeof value === "object" && "path" in value) return String((value as { path: unknown }).path).replace(new RegExp(`^${bucket}/`), "");
  const raw = typeof value === "string" ? value : (value as { url?: string } | null)?.url;
  if (!raw) return "";
  const clean = raw.split("?")[0];
  for (const marker of [`/object/sign/${bucket}/`, `/object/public/${bucket}/`, `/object/${bucket}/`, `/${bucket}/`]) {
    const index = clean.indexOf(marker);
    if (index >= 0) return decodeURIComponent(clean.slice(index + marker.length));
  }
  return decodeURIComponent(clean).replace(new RegExp(`^${bucket}/`), "");
};

const addReferences = (target: Set<string>, values: unknown[], bucket: string) => {
  for (const value of values || []) {
    const path = objectPath(value, bucket);
    if (path) target.add(path);
  }
};

async function listObjects(client: ReturnType<typeof createClient>, bucket: string, prefix = ""): Promise<Array<StoredObject & { path: string }>> {
  const found: Array<StoredObject & { path: string }> = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const entries = (data || []) as StoredObject[];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) found.push({ ...entry, path });
      else found.push(...await listObjects(client, bucket, path));
    }
    if (entries.length < 1000) break;
    offset += entries.length;
  }
  return found;
}

serve(async (request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, { auth: { persistSession: false } });
  const token = request.headers.get("authorization")?.replace("Bearer ", "") || "";
  if (token !== serviceKey) {
    const { data: authData } = await client.auth.getUser(token);
    const { data: profile } = await client.from("persons").select("access_role,is_active,locked_at").eq("auth_user_id", authData.user?.id).maybeSingle();
    if (profile?.access_role !== "admin" || !profile.is_active || profile.locked_at) return new Response("Não autorizado", { status: 403 });
  }

  const [activities, programFiles, projects, projectTasks, reports, monthlyReports, persons, purchaseSteps] = await Promise.all([
    client.from("activities").select("images,files"),
    client.from("program_files").select("file_url"),
    client.from("management_projects").select("attachments"),
    client.from("management_project_tasks").select("attachments"),
    client.from("expense_reports").select("expense_items"),
    client.from("monthly_activity_reports").select("activity_snapshot"),
    client.from("persons").select("avatar_url"),
    client.from("purchase_request_steps").select("attachments"),
  ]);
  const queryError = [activities.error, programFiles.error, projects.error, projectTasks.error, reports.error, monthlyReports.error, persons.error, purchaseSteps.error].find(Boolean);
  if (queryError) return new Response(JSON.stringify({ error: queryError.message }), { status: 500, headers: { "content-type": "application/json" } });

  const referenced: Record<string, Set<string>> = {
    "activity-attachments": new Set(), "activity-files": new Set(), "program-files": new Set(), "profile-photos": new Set(),
  };
  for (const activity of activities.data || []) {
    addReferences(referenced["activity-attachments"], activity.images || [], "activity-attachments");
    addReferences(referenced["activity-files"], activity.files || [], "activity-files");
  }
  for (const row of programFiles.data || []) addReferences(referenced["program-files"], [row.file_url], "program-files");
  for (const project of projects.data || []) addReferences(referenced["activity-files"], project.attachments || [], "activity-files");
  for (const task of projectTasks.data || []) addReferences(referenced["activity-files"], task.attachments || [], "activity-files");
  for (const report of reports.data || []) for (const item of report.expense_items || []) addReferences(referenced["activity-files"], item.attachments || [], "activity-files");
  for (const report of monthlyReports.data || []) for (const activity of report.activity_snapshot || []) {
    addReferences(referenced["activity-attachments"], activity.images || [], "activity-attachments");
    addReferences(referenced["activity-attachments"], activity.selected_images || [], "activity-attachments");
    addReferences(referenced["activity-files"], activity.files || [], "activity-files");
  }
  for (const person of persons.data || []) addReferences(referenced["profile-photos"], [person.avatar_url], "profile-photos");
  for (const step of purchaseSteps.data || []) addReferences(referenced["activity-files"], step.attachments || [], "activity-files");

  // A carência protege uploads em andamento; objetos sem referência após esse prazo são órfãos.
  const graceLimit = Date.now() - 24 * 60 * 60 * 1000;
  const deleted: Record<string, string[]> = {};
  for (const bucket of Object.keys(referenced)) {
    const objects = await listObjects(client, bucket);
    const orphanPaths = objects
      .filter((object) => object.name !== ".emptyFolderPlaceholder")
      .filter((object) => !referenced[bucket].has(object.path))
      .filter((object) => !object.created_at || new Date(object.created_at).getTime() < graceLimit)
      .map((object) => object.path);
    deleted[bucket] = [];
    for (let index = 0; index < orphanPaths.length; index += 100) {
      const paths = orphanPaths.slice(index, index + 100);
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) return new Response(JSON.stringify({ error: error.message, bucket, deleted }), { status: 500, headers: { "content-type": "application/json" } });
      deleted[bucket].push(...paths);
    }
  }

  return new Response(JSON.stringify({ message: "Reconciliação concluída.", deleted, total: Object.values(deleted).reduce((sum, paths) => sum + paths.length, 0) }), {
    status: 200, headers: { "content-type": "application/json" },
  });
});
