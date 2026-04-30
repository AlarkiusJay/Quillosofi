import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';

const CHECK_INTERVAL = 60 * 1000;

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialEtag = useRef(null);

  useEffect(() => {
    const checkForUpdate = async () => {
      const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
      const etag = res.headers.get('etag') || res.headers.get('last-modified');
      if (!etag) return;
      if (initialEtag.current === null) {
        initialEtag.current = etag;
      } else if (initialEtag.current !== etag) {
        setUpdateAvailable(true);
      }
    };
    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-full shadow-2xl border border-green-500/40 bg-[hsl(220,8%,16%)] text-sm font-semibold text-white animate-fade-in whitespace-nowrap">
      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
      <span className="text-green-300 text-xs md:text-sm">Update available!</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 hover:bg-green-400 text-white text-xs font-bold transition-colors shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Update</span>
      </button>
      <button
        onClick={() => setUpdateAvailable(false)}
        className="text-[hsl(220,7%,50%)] hover:text-white transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}