import { useState } from 'react';
import { Download, X, AlertTriangle } from 'lucide-react';
import { exportAllGuestData } from './GuestExportData';

export default function GuestBanner({ daysRemaining, onDismiss }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    await exportAllGuestData();
    setExporting(false);
    setExported(true);
  };

  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className="mx-3 my-2 rounded-xl p-3.5"
      style={{
        background: isUrgent ? 'hsl(0,80%,50%,0.10)' : 'hsl(38,90%,50%,0.10)',
        border: `1px solid ${isUrgent ? 'hsl(0,80%,50%,0.35)' : 'hsl(38,90%,50%,0.30)'}`,
      }}
    >
      {/* Top row: icon + title + dismiss */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
          <span className={`text-xs font-bold tracking-wide ${isUrgent ? 'text-red-300' : 'text-amber-300'}`}>
            {daysRemaining === 1 ? 'Last day!' : `${daysRemaining} days left`}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-white/20 hover:text-white/50 transition-colors mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body text */}
      <p className="text-[11px] text-white/50 leading-relaxed mb-3">
        You're in guest mode. Your data will be lost when the trial expires — export it to keep a copy.
      </p>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          exported
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : isUrgent
            ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        {exporting ? 'Exporting…' : exported ? 'Data Exported!' : 'Export My Data'}
      </button>
    </div>
  );
}