import { supabase } from "./supabaseClient";

export function storagePath(value, bucket) {
  if (!value) return "";
  if (typeof value === "object" && value.path) return value.path;
  const raw = typeof value === "string" ? value : value.url;
  if (!raw) return "";
  if (!raw.includes("/")) return raw;
  const marker = `/${bucket}/`;
  const index = raw.indexOf(marker);
  return index >= 0 ? decodeURIComponent(raw.slice(index + marker.length).split("?")[0]) : "";
}

export async function signedUrl(bucket, value, expiresIn = 3600) {
  const path = storagePath(value, bucket);
  if (!path) return typeof value === "string" ? value : value?.url || "";
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return error ? "" : data.signedUrl;
}

export async function signImages(images = [], bucket = "activity-attachments") {
  return Promise.all(images.map((image) => signedUrl(bucket, image)));
}

export async function signFiles(files = [], bucket = "activity-files") {
  return Promise.all(files.map(async (file) => ({
    ...(typeof file === "object" ? file : {}),
    name: file?.name || storagePath(file, bucket).split("/").pop(),
    path: storagePath(file, bucket),
    url: await signedUrl(bucket, file),
  })));
}

