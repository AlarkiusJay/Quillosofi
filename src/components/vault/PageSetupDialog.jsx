import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAPER_PRESETS, CUSTOM_PRESET_ID, DEFAULT_PAGE_SETUP } from '@/lib/pageSetup';

// PageSetupDialog — Word-style modal with Margins / Paper tabs.
//
// Layout tab from real Word covers headers/footers/section breaks; we don't
// have those yet so we omit it. If/when v0.5.0 adds them, drop a third tab in.
//
// Props:
//   open        bool
//   setup       PageSetup object (current canvas)
//   onApply     (newSetup) => void   — apply to this canvas only
//   onSetDefault (newSetup) => void  — also save as global default
//   onClose     () => void

const TABS = [
  { id: 'margins', label: 'Margins' },
  { id: 'paper',   label: 'Paper' },
];

// Small numeric input that displays inches with 2-decimal precision but
// allows free typing. Used everywhere in this dialog.
function InchInput({ value, onChange, step = 0.05, min = 0, max = 30, disabled = false }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        else if (e.target.value === '') onChange(0);
      }}
      className={cn(
        'w-20 px-2 py-1 text-xs rounded font-mono text-right',
        'bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white',
        'focus:outline-none focus:border-[hsl(var(--chalk-yellow)/0.6)]',
        disabled && 'opacity-40'
      )}
    />
  );
}

function Field({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-[hsl(220,7%,75%)]">
      <span className="min-w-[70px]">{label}</span>
      <div className="flex items-center gap-1">
        {children}
        <span className="text-[10px] text-[hsl(220,7%,50%)] w-3">″</span>
      </div>
    </label>
  );
}

export default function PageSetupDialog({ open, setup, onApply, onSetDefault, onClose }) {
  const [tab, setTab] = useState('margins');
  const [draft, setDraft] = useState(setup);

  // Reset draft whenever the dialog opens with a fresh setup.
  useEffect(() => {
    if (open) setDraft(setup);
  }, [open, setup]);

  if (!open) return null;

  const updateMargin = (key, value) => {
    setDraft((d) => ({ ...d, margins: { ...d.margins, [key]: value } }));
  };
  const setOrientation = (orientation) => setDraft((d) => ({ ...d, orientation }));
  const setMirror = (mirrorMargins) => setDraft((d) => ({ ...d, mirrorMargins }));
  const setPreset = (id) => {
    if (id === CUSTOM_PRESET_ID) {
      setDraft((d) => ({ ...d, paperPresetId: CUSTOM_PRESET_ID }));
      return;
    }
    const p = PAPER_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setDraft((d) => ({ ...d, paperPresetId: id, paperWidth: p.width, paperHeight: p.height }));
  };
  const setPaperWidth = (v) => setDraft((d) => ({ ...d, paperPresetId: CUSTOM_PRESET_ID, paperWidth: v }));
  const setPaperHeight = (v) => setDraft((d) => ({ ...d, paperPresetId: CUSTOM_PRESET_ID, paperHeight: v }));

  const apply = () => { onApply?.(draft); onClose?.(); };
  const setAsDefault = () => { onSetDefault?.(draft); onApply?.(draft); onClose?.(); };
  const reset = () => setDraft({ ...DEFAULT_PAGE_SETUP });

  // Visual mini-preview reflecting current draft.
  const preview = (
    <PagePreview setup={draft} />
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[hsl(var(--chalk-white-faint)/0.2)] bg-[hsl(var(--chalk-deep)/0.97)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--chalk-white-faint)/0.15)]">
          <h2 className="text-sm font-semibold text-white">Page Setup</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[hsl(var(--chalk-white-faint)/0.15)] px-2 pt-1.5 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-t border-b-2 transition-colors',
                tab === t.id
                  ? 'text-[hsl(var(--chalk-yellow))] border-[hsl(var(--chalk-yellow))] bg-[hsl(220,8%,18%)]'
                  : 'text-[hsl(220,7%,55%)] border-transparent hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {tab === 'margins' && (
            <>
              <section>
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(220,7%,55%)] mb-2">Margins</h3>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                  <Field label="Top">
                    <InchInput value={draft.margins.top} onChange={(v) => updateMargin('top', v)} />
                  </Field>
                  <Field label="Bottom">
                    <InchInput value={draft.margins.bottom} onChange={(v) => updateMargin('bottom', v)} />
                  </Field>
                  <Field label={draft.mirrorMargins ? 'Inside' : 'Left'}>
                    <InchInput value={draft.margins.inside} onChange={(v) => updateMargin('inside', v)} />
                  </Field>
                  <Field label={draft.mirrorMargins ? 'Outside' : 'Right'}>
                    <InchInput value={draft.margins.outside} onChange={(v) => updateMargin('outside', v)} />
                  </Field>
                  <Field label="Gutter">
                    <InchInput value={draft.margins.gutter} onChange={(v) => updateMargin('gutter', v)} disabled={!draft.mirrorMargins} />
                  </Field>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(220,7%,55%)] mb-2">Orientation</h3>
                <div className="flex gap-2">
                  {['portrait', 'landscape'].map((o) => (
                    <button
                      key={o}
                      onClick={() => setOrientation(o)}
                      className={cn(
                        'flex-1 px-3 py-2 text-xs rounded border capitalize transition-all',
                        draft.orientation === o
                          ? 'border-[hsl(var(--chalk-yellow))] bg-[hsl(var(--chalk-yellow)/0.12)] text-[hsl(var(--chalk-yellow))]'
                          : 'border-[hsl(225,9%,25%)] text-[hsl(220,7%,65%)] hover:border-[hsl(225,9%,40%)]'
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(220,7%,55%)] mb-2">Pages</h3>
                <label className="flex items-center justify-between gap-3 text-xs text-[hsl(220,7%,75%)]">
                  <span>Multiple pages</span>
                  <select
                    value={draft.mirrorMargins ? 'mirror' : 'normal'}
                    onChange={(e) => setMirror(e.target.value === 'mirror')}
                    className="px-2 py-1 text-xs rounded bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white focus:outline-none focus:border-[hsl(var(--chalk-yellow)/0.6)]"
                  >
                    <option value="normal">Normal</option>
                    <option value="mirror">Mirror margins</option>
                  </select>
                </label>
              </section>
            </>
          )}

          {tab === 'paper' && (
            <>
              <section>
                <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(220,7%,55%)] mb-2">Paper size</h3>
                <select
                  value={draft.paperPresetId}
                  onChange={(e) => setPreset(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white focus:outline-none focus:border-[hsl(var(--chalk-yellow)/0.6)] mb-3"
                >
                  {PAPER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                  <option value={CUSTOM_PRESET_ID}>Custom size</option>
                </select>

                <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                  <Field label="Width">
                    <InchInput value={draft.paperWidth} onChange={setPaperWidth} step={0.01} min={0.5} max={30} />
                  </Field>
                  <Field label="Height">
                    <InchInput value={draft.paperHeight} onChange={setPaperHeight} step={0.01} min={0.5} max={30} />
                  </Field>
                </div>
              </section>
            </>
          )}

          {/* Preview — same in both tabs */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[hsl(220,7%,55%)] mb-2">Preview</h3>
            <div className="flex items-center justify-center py-3 rounded bg-[hsl(220,8%,11%)] border border-[hsl(225,9%,18%)]">
              {preview}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[hsl(var(--chalk-white-faint)/0.15)] bg-[hsl(220,8%,11%)]">
          <button
            onClick={reset}
            className="text-[11px] text-[hsl(220,7%,55%)] hover:text-white transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={setAsDefault}
              className="px-3 py-1.5 text-xs rounded border border-[hsl(225,9%,25%)] text-[hsl(220,7%,75%)] hover:text-white hover:border-[hsl(225,9%,40%)] transition-colors"
            >
              Set As Default
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded text-[hsl(220,7%,55%)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              className="px-4 py-1.5 text-xs rounded bg-[hsl(var(--chalk-yellow))] text-[hsl(220,30%,12%)] font-semibold hover:bg-[hsl(var(--chalk-yellow)/0.9)] transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mini-preview — two facing pages if mirror, otherwise one page. Shows
// margin lines and orientation.
function PagePreview({ setup }) {
  const w = setup.orientation === 'landscape' ? setup.paperHeight : setup.paperWidth;
  const h = setup.orientation === 'landscape' ? setup.paperWidth : setup.paperHeight;
  const SCALE = 8; // px per inch in the preview
  const pw = Math.round(w * SCALE);
  const ph = Math.round(h * SCALE);

  const renderPage = (isVerso) => {
    // verso = left of spread, recto = right of spread
    const m = setup.mirrorMargins
      ? {
          top: setup.margins.top,
          bottom: setup.margins.bottom,
          left: isVerso ? setup.margins.outside : (setup.margins.inside + setup.margins.gutter),
          right: isVerso ? (setup.margins.inside + setup.margins.gutter) : setup.margins.outside,
        }
      : {
          top: setup.margins.top,
          bottom: setup.margins.bottom,
          left: setup.margins.inside,
          right: setup.margins.outside,
        };
    return (
      <div
        style={{
          position: 'relative',
          width: pw,
          height: ph,
          background: 'hsl(0, 0%, 96%)',
          border: '1px solid hsl(220,8%,40%)',
        }}
      >
        {/* Margin frame */}
        <div
          style={{
            position: 'absolute',
            top: m.top * SCALE,
            bottom: m.bottom * SCALE,
            left: m.left * SCALE,
            right: m.right * SCALE,
            border: '1px dashed hsl(220,8%,55%)',
          }}
        />
      </div>
    );
  };

  if (setup.mirrorMargins) {
    return (
      <div className="flex gap-0.5">
        {renderPage(true)}
        {renderPage(false)}
      </div>
    );
  }
  return renderPage(false);
}
