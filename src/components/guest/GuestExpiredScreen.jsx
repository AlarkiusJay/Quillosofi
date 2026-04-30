import { LogIn } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GuestExpiredScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-xl font-bold text-white mb-2">Your guest session has expired</h2>
      <p className="text-sm text-[hsl(220,7%,55%)] max-w-sm mb-6">
        Your 14-day guest window has ended. Create a free account to keep chatting and save your data permanently.
      </p>
      <button
        onClick={() => base44.auth.redirectToLogin()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        <LogIn className="h-4 w-4" />
        Sign Up / Log In
      </button>
      <p className="text-xs text-[hsl(220,7%,40%)] mt-4">
        Note: Guest data older than 14 days is automatically removed.
      </p>
    </div>
  );
}