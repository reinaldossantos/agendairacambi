import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "./context";
import { useTranslationSettings } from "../context/TranslationSettingsContext";

const originalText = new WeakMap();
const translatedText = new WeakMap();
const sessionCache = new Map();
const excludedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "INPUT", "TEXTAREA"]);

function isEligible(node) {
  const parent = node.parentElement;
  const value = node.nodeValue?.trim();
  if (!parent || !value || value.length < 2 || value.length > 2000 || !/\p{L}/u.test(value)) return false;
  if (excludedTags.has(parent.tagName) || parent.closest("[data-no-translate], .material-symbols-outlined, [contenteditable='true']")) return false;
  if (/^(https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+)$/i.test(value)) return false;
  if (/^[\d\s.,:/()+%R$€$#-]+$/u.test(value)) return false;
  return true;
}

function collectTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (isEligible(node)) nodes.push(node);
    node = walker.nextNode();
  }
  return nodes;
}

function restoreOriginals(root) {
  collectTextNodes(root).forEach((node) => {
    const original = originalText.get(node);
    if (original !== undefined && node.nodeValue !== original) node.nodeValue = original;
    translatedText.delete(node);
  });
}

export default function AutomaticTranslationLayer() {
  const { locale } = useLanguage();
  const { automaticTranslationEnabled, loading: settingLoading } = useTranslationSettings();
  const generation = useRef(0);
  const translating = useRef(false);
  const wasActive = useRef(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    generation.current += 1;
    const activeGeneration = generation.current;
    let debounceTimer;
    let observer;

    if (!automaticTranslationEnabled || settingLoading) {
      if (wasActive.current) restoreOriginals(root);
      wasActive.current = false;
      return undefined;
    }
    if (locale === "pt" || showOriginal) {
      if (wasActive.current) restoreOriginals(root);
      return undefined;
    }
    wasActive.current = true;

    async function translateVisibleContent() {
      if (translating.current || activeGeneration !== generation.current) return;
      const nodes = collectTextNodes(root);
      const pendingNodes = nodes.filter((node) => {
        if (!originalText.has(node)) originalText.set(node, node.nodeValue);
        const translated = translatedText.get(node);
        return !translated || translated.locale !== locale || node.nodeValue !== translated.value;
      });
      if (!pendingNodes.length) return;

      translating.current = true;
      setStatus("translating");
      setError("");
      try {
        const byOriginal = new Map();
        pendingNodes.forEach((node) => {
          const original = originalText.get(node)?.trim();
          if (original) byOriginal.set(original, [...(byOriginal.get(original) || []), node]);
        });
        const originals = [...byOriginal.keys()];

        for (let start = 0; start < originals.length; start += 50) {
          if (activeGeneration !== generation.current) return;
          const batch = originals.slice(start, start + 50);
          const results = new Array(batch.length);
          const missing = [];
          const missingIndexes = [];
          batch.forEach((text, index) => {
            const cached = sessionCache.get(`${locale}:${text}`);
            if (cached) results[index] = cached;
            else { missing.push(text); missingIndexes.push(index); }
          });

          if (missing.length) {
            const { data, error: invokeError } = await supabase.functions.invoke("translate-content", {
              body: { texts: missing, targetLanguage: locale },
            });
            if (invokeError || !Array.isArray(data?.translations)) {
              throw new Error(data?.error || invokeError?.message || "Não foi possível traduzir o conteúdo.");
            }
            data.translations.forEach((translation, index) => {
              const value = String(translation || missing[index]);
              results[missingIndexes[index]] = value;
              sessionCache.set(`${locale}:${missing[index]}`, value);
            });
          }

          batch.forEach((text, index) => {
            const value = results[index] || text;
            (byOriginal.get(text) || []).forEach((node) => {
              if (!node.isConnected || activeGeneration !== generation.current) return;
              node.nodeValue = node.nodeValue.replace(text, value);
              translatedText.set(node, { locale, value: node.nodeValue });
            });
          });
        }
        setStatus("ready");
      } catch (translationError) {
        setStatus("error");
        setError(translationError.message);
      } finally {
        translating.current = false;
      }
    }

    const scheduleTranslation = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(translateVisibleContent, 180);
    };
    observer = new MutationObserver(scheduleTranslation);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    scheduleTranslation();

    return () => {
      window.clearTimeout(debounceTimer);
      observer?.disconnect();
    };
  }, [automaticTranslationEnabled, locale, settingLoading, showOriginal]);

  if (!automaticTranslationEnabled || settingLoading || locale === "pt") return null;
  if (showOriginal || status === "ready") return <button type="button" data-no-translate onClick={() => setShowOriginal((value) => !value)} className="fixed bottom-20 left-1/2 z-[1100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-200 bg-white/95 px-4 py-2 text-xs font-bold text-primary shadow-lg backdrop-blur hover:bg-emerald-50 md:bottom-5"><span className="material-symbols-outlined text-[18px]">translate</span>{showOriginal ? "Mostrar tradução" : "Ver texto original"}</button>;
  if (status === "idle") return null;
  return <div data-no-translate role="status" aria-live="polite" className={`fixed bottom-20 left-1/2 z-[1100] flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-xl backdrop-blur md:bottom-5 ${status === "error" ? "border-red-200 bg-red-50/95 text-red-700" : "border-blue-200 bg-white/95 text-primary"}`}>
    <span className={`material-symbols-outlined text-[18px] ${status === "translating" ? "animate-spin" : ""}`}>{status === "translating" ? "progress_activity" : "translate"}</span>
    {status === "error" ? `Tradução automática indisponível: ${error}` : "Traduzindo conteúdo cadastrado…"}
  </div>;
}
