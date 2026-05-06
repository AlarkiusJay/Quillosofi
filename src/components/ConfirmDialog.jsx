import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirm' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,14%)] rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white mb-1">Are you sure?</p>
            <p className="text-xs text-[hsl(220,7%,55%)] leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}