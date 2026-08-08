import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = { en: "English", es: "Spanish" };
const encoder = new TextEncoder();

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Autenticação necessária." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) return jsonResponse({ error: "Sessão inválida." }, 401);

    const { texts, targetLanguage } = await request.json();
    if (!languageNames[targetLanguage]) return jsonResponse({ error: "Idioma de destino inválido." }, 400);
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > 50) {
      return jsonResponse({ error: "Envie entre 1 e 50 textos por solicitação." }, 400);
    }

    const cleanTexts = texts.map((value) => String(value || "").trim());
    if (cleanTexts.some((text) => !text || text.length > 2000) || cleanTexts.join("").length > 15000) {
      return jsonResponse({ error: "O conteúdo excede o limite permitido." }, 400);
    }

    const sourceHashes = await Promise.all(cleanTexts.map(sha256));
    const cacheKeys = await Promise.all(sourceHashes.map((hash) => sha256(`${targetLanguage}:${hash}`)));
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: cached, error: cacheError } = await admin.from("dynamic_translations")
      .select("cache_key,translated_text").in("cache_key", cacheKeys);
    if (cacheError) throw cacheError;

    const cachedMap = new Map((cached || []).map((row) => [row.cache_key, row.translated_text]));
    const missingIndexes = cacheKeys.map((key, index) => cachedMap.has(key) ? -1 : index).filter((index) => index >= 0);
    const provider = "azure-translator-v3";

    if (missingIndexes.length) {
      const translatorKey = Deno.env.get("AZURE_TRANSLATOR_KEY");
      const translatorRegion = Deno.env.get("AZURE_TRANSLATOR_REGION");
      const translatorEndpoint = (Deno.env.get("AZURE_TRANSLATOR_ENDPOINT") || "https://api.cognitive.microsofttranslator.com").replace(/\/$/, "");
      if (!translatorKey) throw new Error("AZURE_TRANSLATOR_KEY não configurada nos segredos do Supabase.");
      const pendingTexts = missingIndexes.map((index) => cleanTexts[index]);
      const azureHeaders: Record<string, string> = {
        "Ocp-Apim-Subscription-Key": translatorKey,
        "Content-Type": "application/json",
      };
      if (translatorRegion) azureHeaders["Ocp-Apim-Subscription-Region"] = translatorRegion;
      const azureResponse = await fetch(`${translatorEndpoint}/translate?api-version=3.0&to=${targetLanguage}`, {
        method: "POST",
        headers: azureHeaders,
        body: JSON.stringify(pendingTexts.map((text) => ({ Text: text }))),
      });
      const azurePayload = await azureResponse.json();
      if (!azureResponse.ok) throw new Error(azurePayload?.error?.message || "Falha no Azure Translator.");
      const translated = azurePayload.map((item: { translations?: Array<{ text?: string }> }) => item.translations?.[0]?.text);
      if (translated.some((text: string | undefined) => !text) || translated.length !== pendingTexts.length) {
        throw new Error("O serviço retornou uma tradução incompleta.");
      }

      const rows = missingIndexes.map((sourceIndex, translatedIndex) => ({
        cache_key: cacheKeys[sourceIndex],
        source_hash: sourceHashes[sourceIndex],
        source_language: "auto",
        target_language: targetLanguage,
        source_text: cleanTexts[sourceIndex],
        translated_text: String(translated[translatedIndex]),
        model: provider,
      }));
      const { error: saveError } = await admin.from("dynamic_translations").upsert(rows, { onConflict: "cache_key" });
      if (saveError) throw saveError;
      rows.forEach((row) => cachedMap.set(row.cache_key, row.translated_text));
    }

    return jsonResponse({ translations: cacheKeys.map((key) => cachedMap.get(key)), cached: missingIndexes.length === 0 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro inesperado na tradução." }, 400);
  }
});
