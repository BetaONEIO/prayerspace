import { useState, useEffect } from 'react';
import { getSignedUrl } from '@/lib/storage';

export function useSignedUrl(path: string | null | undefined, fallback: string): string {
  const getInitial = () => {
    if (!path) return fallback;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return fallback;
  };

  const [url, setUrl] = useState<string>(getInitial);

  useEffect(() => {
    if (!path) {
      setUrl(fallback);
      return;
    }
    if (path.startsWith('data:') || path.startsWith('http')) {
      setUrl(path);
      return;
    }
    let cancelled = false;
    getSignedUrl(path).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl ?? fallback);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path, fallback]);

  return url;
}
