import { useEffect, useState } from 'react';
import { app } from '@/api/localClient';

export default function AuthCallback() {
  const [status, setStatus] = useState('checking'); // checking | logging_in | success

  useEffect(() => {
    const run = async () => {
      const isAuthed = await app.auth.isAuthenticated();
      if (isAuthed) {
        setStatus('success');
        // Notify the opener tab
        try { localStorage.setItem('zetryl_auth_done', Date.now().toString()); } catch {}
        // Auto close after 3s
        setTimeout(() => window.close(), 3000);
      } else {
        setStatus('logging_in');
        app.auth.redirectToLogin(window.location.href);
      }
    };
    run();
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'hsl(228, 7%, 20%)' }}>
      <div className="text-center space-y-4">
        {status === 'checking' && (
          <div className="w-8 h-8 border-4 border-slate-600 border-t-primary rounded-full animate-spin mx-auto" />
        )}
        {status === 'logging_in' && (
          <div className="w-8 h-8 border-4 border-slate-600 border-t-primary rounded-full animate-spin mx-auto" />
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold text-lg">Logged in!</p>
            <p className="text-[hsl(220,7%,55%)] text-sm">This tab will close automatically…</p>
          </>
        )}
      </div>
    </div>
  );
}