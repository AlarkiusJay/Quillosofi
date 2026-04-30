import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Download, Upload, Plus, Trash2, Filter, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function SpreadsheetToolbar({ onFormat, onExport, onImport, onAddRow, onAddCol, onDeleteRow, onCellType, onToggleCF, showCFPanel }) {
  const [showExport, setShowExport] = useState(false);
  const [showCellType, setShowCellType] = useState(false);

  const Btn = ({ icon: Icon, title, onClick, active, label }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick?.(); }}
      className={`h-6 px-1 rounded flex items-center gap-0.5 transition-colors text-[10px] min-w-6 justify-center
        ${active ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)]'}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label && <span>{label}</span>}
    </button>
  );

  const Divider = () => <div className="w-px h-4 bg-[hsl(225,9%,22%)] mx-0.5" />;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[hsl(225,9%,15%)] flex-wrap bg-[hsl(220,8%,15%)]">
      <Btn icon={Bold} title="Bold" onClick={() => onFormat?.('bold')} />
      <Btn icon={Italic} title="Italic" onClick={() => onFormat?.('italic')} />
      <Btn icon={Underline} title="Underline" onClick={() => onFormat?.('underline')} />
      <Divider />
      <Btn icon={AlignLeft} title="Align Left" onClick={() => onFormat?.('align', 'left')} />
      <Btn icon={AlignCenter} title="Align Center" onClick={() => onFormat?.('align', 'center')} />
      <Btn icon={AlignRight} title="Align Right" onClick={() => onFormat?.('align', 'right')} />
      <Divider />

      {/* Text color */}
      <label className="h-6 w-6 rounded flex items-center justify-center cursor-pointer hover:bg-[hsl(228,7%,30%)] transition-colors relative" title="Text Color">
        <span className="text-[11px] font-bold text-violet-400">A</span>
        <input type="color" className="absolute opacity-0 w-0 h-0 pointer-events-none" onChange={e => onFormat?.('color', e.target.value)} tabIndex={-1} />
        <div className="absolute inset-0" onClick={() => {}} />
      </label>
      {/* BG color */}
      <label className="h-6 w-6 rounded flex items-center justify-center cursor-pointer hover:bg-[hsl(228,7%,30%)] transition-colors relative" title="Cell Background">
        <div className="w-3.5 h-3.5 rounded-sm border border-[hsl(225,9%,30%)]" style={{ background: '#2d3748' }} />
        <input type="color" className="absolute opacity-0 w-0 h-0 pointer-events-none" onChange={e => onFormat?.('bg', e.target.value)} tabIndex={-1} />
        <div className="absolute inset-0" onClick={() => {}} />
      </label>

      <Divider />

      {/* Cell type */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setShowCellType(v => !v); }}
          className="h-6 px-1.5 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-[10px]"
          title="Cell Type"
        >
          Type <ChevronDown className="h-2.5 w-2.5" />
        </button>
        {showCellType && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowCellType(false)} />
            <div className="absolute top-full left-0 mt-1 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-lg shadow-lg z-50 min-w-28 overflow-hidden">
              {['none', 'text', 'checkbox', 'date', 'dropdown'].map(t => (
                <button
                  key={t}
                  onMouseDown={(e) => { e.preventDefault(); onCellType?.(t); setShowCellType(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-[hsl(220,7%,70%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors capitalize"
                >
                  {t === 'none' ? 'Default' : t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Conditional formatting */}
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onToggleCF?.(); }}
        className={`h-6 px-1.5 rounded flex items-center gap-1 transition-colors text-[10px] ${showCFPanel ? 'bg-primary/20 text-primary' : 'text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)]'}`}
        title="Conditional Formatting"
      >
        <Filter className="h-3 w-3" /> CF
      </button>

      <Divider />

      <Btn icon={Plus} title="Add Row" onClick={onAddRow} label="Row" />
      <Btn icon={Plus} title="Add Column" onClick={onAddCol} label="Col" />
      <Btn icon={Trash2} title="Delete Row" onClick={onDeleteRow} />

      <Divider />

      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onImport?.(); }}
        className="h-6 px-1.5 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-[10px]"
      >
        <Upload className="h-3 w-3" /> Import
      </button>

      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setShowExport(v => !v); }}
          className="h-6 px-1.5 rounded flex items-center gap-1 text-[hsl(220,7%,55%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-colors text-[10px]"
        >
          <Download className="h-3 w-3" /> Export
        </button>
        {showExport && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
            <div className="absolute top-full left-0 mt-1 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-lg shadow-lg z-50 min-w-20 overflow-hidden">
              {['CSV', 'JSON', 'XLSX'].map(fmt => (
                <button
                  key={fmt}
                  onMouseDown={(e) => { e.preventDefault(); onExport?.(fmt); setShowExport(false); }}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-[hsl(220,7%,70%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors"
                >
                  {fmt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}