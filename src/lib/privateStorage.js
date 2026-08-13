import { supabase } from "./supabaseClient";

export function storagePath(value, bucket) {
  if (!value) return "";
  if (typeof value === "object" && value.path) return storagePath(value.path, bucket);
  const raw = (typeof value === "string" ? value : value.url)?.trim();
  if (!raw) return "";
  const decodePath = (path) => {
    try { return decodeURIComponent(path); } catch { return path; }
  };
  const withoutQuery = raw.split(/[?#]/)[0].replace(/^\/+/, "");
  if (!withoutQuery.includes("/")) return decodePath(withoutQuery);

  // Accept permanent paths, old public URLs and expired signed URLs. Some
  // historical rows include the bucket prefix and others contain it encoded.
  const decoded = decodePath(withoutQuery);
  const prefix = `${bucket}/`;
  if (decoded.startsWith(prefix)) return decoded.slice(prefix.length);
  if (!/^https?:\/\//i.test(raw) && !decoded.startsWith("storage/v1/")) return decoded;
  const marker = `/${bucket}/`;
  const index = decoded.indexOf(marker);
  return index >= 0 ? decoded.slice(index + marker.length) : "";
}

export async function signedUrl(bucket, value, expiresIn = 3600) {
  const path = storagePath(value, bucket);
  if (!path) return typeof value === "string" ? value : value?.url || "";
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (!error && data?.signedUrl) return data.signedUrl;
  const { data: fallback, error: fallbackError } = await supabase.functions.invoke("sign-private-files", { body: { bucket, values: [path] } });
  if (fallbackError || !fallback?.urls?.[0]?.url) {
    console.error(`Não foi possível renovar o acesso ao arquivo em ${bucket}:`, fallbackError?.message || fallback?.urls?.[0]?.error || error?.message);
    return "";
  }
  return fallback.urls[0].url;
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
