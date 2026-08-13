import { useEffect, useRef, useState } from "react";
import { signedUrl } from "../../lib/privateStorage";

export default function PrivateStorageImage({ bucket, source, alt, className = "", link = false }) {
  const [displayUrl, setDisplayUrl] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const requestId = useRef(0);
  const retryAttempted = useRef(false);

  useEffect(() => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    retryAttempted.current = false;
    signedUrl(bucket, source).then((url) => {
      if (requestId.current !== currentRequest) return;
      if (url) {
        setDisplayUrl(url);
        setUnavailable(false);
      } else {
        setDisplayUrl("");
        setUnavailable(true);
      }
    });
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
    const url = await signedUrl(bucket, source);
    if (requestId.current !== currentRequest) return;
    if (url) setDisplayUrl(url);
    else setUnavailable(true);
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
