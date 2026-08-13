import { useEffect, useRef, useState } from "react";
import { signedUrl, storagePath } from "../../lib/privateStorage";
import { supabase } from "../../lib/supabaseClient";

const isDisplayUrl = (value) => /^(https?:|blob:|data:)/i.test(typeof value === "string" ? value : value?.url || "");

async function resolveImageUrl(bucket, source, preferDownload = false) {
  if (!preferDownload) {
    const url = await signedUrl(bucket, source);
    if (url) return { url, temporary: false };
  }
  const path = storagePath(source, bucket);
  if (!path) return { url: "", temporary: false };
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return { url: "", temporary: false };
  return { url: URL.createObjectURL(data), temporary: true };
}

export default function PrivateStorageImage({ bucket, source, alt, className = "", link = false }) {
  const initialUrl = isDisplayUrl(source) ? (typeof source === "string" ? source : source.url) : "";
  const [displayUrl, setDisplayUrl] = useState(initialUrl);
  const [unavailable, setUnavailable] = useState(false);
  const requestId = useRef(0);
  const retryAttempted = useRef(false);
  const objectUrl = useRef("");

  useEffect(() => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    retryAttempted.current = false;
    const directUrl = isDisplayUrl(source) ? (typeof source === "string" ? source : source.url) : "";
    if (directUrl) return undefined;
    resolveImageUrl(bucket, source).then((result) => {
      if (requestId.current !== currentRequest) return;
      if (result.url) {
        if (result.temporary) objectUrl.current = result.url;
        setDisplayUrl(result.url);
        setUnavailable(false);
      } else {
        setDisplayUrl("");
        setUnavailable(true);
      }
    });
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    };
  }, [bucket, source]);

  const renewAccess = async () => {
    if (retryAttempted.current) {
      setUnavailable(true);
      return;
    }
    retryAttempted.current = true;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setDisplayUrl("");
    const result = await resolveImageUrl(bucket, source, true);
    if (requestId.current !== currentRequest) return;
    if (result.url) {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      if (result.temporary) objectUrl.current = result.url;
      setDisplayUrl(result.url);
      setUnavailable(false);
    } else setUnavailable(true);
  };

  const content = unavailable ? (
    <span role="img" aria-label={`${alt} indisponível`} className={`flex items-center justify-center bg-slate-100 px-2 text-center text-xs text-outline dark:bg-gray-800 ${className}`}>
      Imagem indisponível
    </span>
  ) : displayUrl ? (
    <img src={displayUrl} alt={alt} className={className} onError={renewAccess} />
  ) : (
    <span role="status" aria-label={`Carregando ${alt}`} className={`flex animate-pulse items-center justify-center bg-slate-100 text-outline dark:bg-gray-800 ${className}`}>
      <span className="material-symbols-outlined">image</span>
    </span>
  );

  return link && displayUrl ? <a href={displayUrl} target="_blank" rel="noreferrer" title="Abrir evidência fotográfica">{content}</a> : content;
}
