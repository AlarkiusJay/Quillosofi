// ParagraphDialog — v0.5.8
//
// Word-faithful Paragraph dialog (the one behind "Format > Paragraph…" or
// the tiny ¶ launcher in the Paragraph ribbon group). Three tabs:
//   1. Indents and Spacing
//   2. Line and Page Breaks
//   3. Asian Typography  (multilingual CJK + other Asian scripts)
//
// Apply scope: current selection if any, else cursor paragraph(s) — Tiptap's
// updateAttributes already handles that semantic.
//
// Active vs disabled — Word has a LOT of knobs we don't have plumbing for
// yet (outline level, widow/orphan, keep-with-next, line numbers, snap to
// grid, mirror indents, tabs sub-dialog). Those render disabled with a
// quiet "Coming in v0.6.0" tooltip so the layout stays visually faithful
// to Word without lying about what works. Active controls write directly
// to the new ParagraphFormat extension's attributes plus, where natural,
// the existing TextAlign / LineHeight extensions.
//
// Props:
//   open      bool
//   editor    Tiptap editor instance (the focused one in the canvas)
//   onClose   () => void

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'spacing', label: 'Indents and Spacing' },
  { id: 'breaks',  label: 'Line and Page Breaks' },
  { id: 'asian',   label: 'Asian Typography' },
];

const ALIGNMENTS = [
  { value: 'left',    label: 'Left' },
  { value: 'center',  label: 'Centered' },
  { value: 'right',   label: 'Right' },
  { value: 'justify', label: 'Justified' },
];

const LINE_SPACING_KINDS = [
  { value: 'single',     label: 'Single',          needsValue: false },
  { value: 'oneAndHalf', label: '1.5 lines',       needsValue: false },
  { value: 'double',     label: 'Double',          needsValue: false },
  { value: 'atLeast',    label: 'At least',        needsValue: true, unit: 'pt' },
  { value: 'exactly',    label: 'Exactly',         needsValue: true, unit: 'pt' },
  { value: 'multiple',   label: 'Multiple',        needsValue: true, unit: '' },
];

const SPECIAL_INDENTS = [
  { value: 'none',      label: '(none)'    },
  { value: 'firstLine', label: 'First line' },
  { value: 'hanging',   label: 'Hanging'    },
];

const VERTICAL_ALIGNS = [
  { value: 'auto',     label: 'Auto'     },
  { value: 'top',      label: 'Top'      },
  { value: 'center',   label: 'Center'   },
  { value: 'baseline', label: 'Baseline' },
  { value: 'bottom',   label: 'Bottom'   },
];

// Convert dialog state into the line-height CSS the live preview uses.
function previewLineHeight(kind, value) {
  if (kind === 'single') return '1.0';
  if (kind === 'oneAndHalf') return '1.5';
  if (kind === 'double') return '2.0';
  if (kind === 'atLeast' || kind === 'exactly') return `${value || 12}pt`;
  if (kind === 'multiple') return String(value || 1);
  return null;
}

// ── Small reusable controls ──────────────────────────────────────────────

function Field({ label, children, hint, disabled }) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-3 text-xs',
        disabled ? 'text-[hsl(220,7%,45%)]' : 'text-[hsl(220,7%,75%)]'
      )}
      title={hint || undefined}
    >
      <span className="min-w-[120px]">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </label>
  );
}

function NumInput({ value, onChange, step = 0.1, min = -22, max = 22, suffix = '', disabled = false, width = 'w-20' }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(null); return; }
          const v = parseFloat(raw);
          if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className={cn(
          width, 'px-2 py-1 text-xs rounded font-mono text-right',
          'bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white',
          'focus:outline-none focus:border-[hsl(var(--chalk-yellow)/0.6)]',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      />
      {suffix && <span className="text-[10px] text-[hsl(220,7%,50%)] w-3">{suffix}</span>}
    </div>
  );
}

function Select({ value, onChange, options, disabled = false, width = 'w-32' }) {
  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        width, 'px-2 py-1 text-xs rounded',
        'bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,28%)] text-white',
        'focus:outline-none focus:border-[hsl(var(--chalk-yellow)/0.6)]',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {options.map((o) => (
        <option key={o.value ?? '__null'} value={o.value ?? ''}>{o.label}</option>
      ))}
    </select>
  );
}

function Check({ label, checked, onChange, disabled = false, hint }) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 text-xs select-none',
        disabled ? 'text-[hsl(220,7%,45%)] cursor-not-allowed' : 'text-[hsl(220,7%,75%)] cursor-pointer'
      )}
      title={hint || (disabled ? 'Coming in v0.6.0' : undefined)}
    >
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[hsl(var(--chalk-yellow))]"
      />
      <span>{label}</span>
    </label>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[hsl(var(--chalk-yellow)/0.85)] mb-2.5 pb-1.5 border-b border-[hsl(var(--chalk-white-faint)/0.12)]">
      {children}
    </h3>
  );
}

// ── Read current paragraph state from the editor ─────────────────────────

function readCurrent(editor) {
  if (!editor) return blankDraft();
  const para = editor.getAttributes('paragraph') || {};
  const head = editor.getAttributes('heading') || {};
  // Pick whichever is currently active (heading wins if active).
  const isHeading = editor.isActive('heading');
  const a = isHeading ? head : para;

  // Alignment from the existing TextAlign extension.
  let align = 'left';
  if (editor.isActive({ textAlign: 'center' })) align = 'center';
  else if (editor.isActive({ textAlign: 'right' })) align = 'right';
  else if (editor.isActive({ textAlign: 'justify' })) align = 'justify';

  return {
    align,
    indentLeftIn: a.indentLeftIn ? Number(a.indentLeftIn) : 0,
    indentRightIn: a.indentRightIn ? Number(a.indentRightIn) : 0,
    specialIndentKind: a.specialIndentKind || 'none',
    specialIndentIn: a.specialIndentIn ? Number(a.specialIndentIn) : 0.5,
    spaceBeforePt: a.spaceBeforePt ? Number(a.spaceBeforePt) : 0,
    spaceAfterPt: a.spaceAfterPt ? Number(a.spaceAfterPt) : 0,
    lineSpacingKind: a.lineSpacingKind || 'single',
    lineSpacingValue: a.lineSpacingValue ? Number(a.lineSpacingValue) : 12,
    noSpaceWithSameStyle: !!a.noSpaceWithSameStyle,
    pageBreakBefore: !!a.pageBreakBefore,
    noHyphenate: !!a.noHyphenate,
    kinsoku: !!a.kinsoku,
    allowLatinWrap: !!a.allowLatinWrap,
    hangingPunctuation: !!a.hangingPunctuation,
    compressStartPunct: !!a.compressStartPunct,
    autoSpaceLatin: a.autoSpaceLatin == null ? true : !!a.autoSpaceLatin,
    autoSpaceNumeric: a.autoSpaceNumeric == null ? true : !!a.autoSpaceNumeric,
    verticalAlign: a.verticalAlign || 'auto',
  };
}

function blankDraft() {
  return {
    align: 'left',
    indentLeftIn: 0,
    indentRightIn: 0,
    specialIndentKind: 'none',
    specialIndentIn: 0.5,
    spaceBeforePt: 0,
    spaceAfterPt: 0,
    lineSpacingKind: 'single',
    lineSpacingValue: 12,
    noSpaceWithSameStyle: false,
    pageBreakBefore: false,
    noHyphenate: false,
    kinsoku: false,
    allowLatinWrap: false,
    hangingPunctuation: false,
    compressStartPunct: false,
    autoSpaceLatin: true,
    autoSpaceNumeric: true,
    verticalAlign: 'auto',
  };
}

// ── Apply draft → editor ────────────────────────────────────────────────

// Build a single editor.chain() that writes every Paragraph Settings
// attribute. Reused for both the active-editor path (cursor / single
// selection) and the fan-out path (apply to every page editor when the
// user has done a cross-page Select-All in spread or vertical+multiple).
function buildParagraphChain(editor, d, { focus }) {
  const chain = focus ? editor.chain().focus() : editor.chain();

  // Alignment goes through the existing TextAlign extension.
  chain.setTextAlign(d.align);

  chain.setParagraphFormat({
    indentLeftIn: d.indentLeftIn ? d.indentLeftIn : null,
    indentRightIn: d.indentRightIn ? d.indentRightIn : null,
    specialIndentKind: d.specialIndentKind === 'none' ? null : d.specialIndentKind,
    specialIndentIn: d.specialIndentKind === 'none' ? null : d.specialIndentIn,
    spaceBeforePt: d.spaceBeforePt ? d.spaceBeforePt : null,
    spaceAfterPt: d.spaceAfterPt ? d.spaceAfterPt : null,
    lineSpacingKind: d.lineSpacingKind === 'single' ? null : d.lineSpacingKind,
    lineSpacingValue: d.lineSpacingKind === 'single' ? null
      : (LINE_SPACING_KINDS.find(k => k.value === d.lineSpacingKind)?.needsValue
          ? d.lineSpacingValue : null),
    noSpaceWithSameStyle: d.noSpaceWithSameStyle || null,
    pageBreakBefore: d.pageBreakBefore || null,
    noHyphenate: d.noHyphenate || null,
    kinsoku: d.kinsoku || null,
    allowLatinWrap: d.allowLatinWrap || null,
    hangingPunctuation: d.hangingPunctuation || null,
    compressStartPunct: d.compressStartPunct || null,
    autoSpaceLatin: d.autoSpaceLatin || null,
    autoSpaceNumeric: d.autoSpaceNumeric || null,
    verticalAlign: d.verticalAlign === 'auto' ? null : d.verticalAlign,
  });

  // Mirror lineSpacing → existing LineHeight extension so the dropdown
  // stays in sync (single=clear, oneAndHalf=1.5, double=2, multiple=value,
  // exactly/atLeast=Npt). Keeps reading the current line spacing back
  // through getFormat() consistent.
  const lhCss = previewLineHeight(d.lineSpacingKind, d.lineSpacingValue);
  if (lhCss) chain.setLineHeight(lhCss); else chain.unsetLineHeight();

  return chain;
}

// True when EVERY editor in the list has a full-document selection (the
// signature of a cross-page Cmd/Ctrl+A in paginated mode). Tiptap's empty
// Selection still returns from===to and gets the format applied to the
// cursor paragraph, so we only fan out when *all* editors are wholly
// selected — partial selections stay scoped to the active editor.
function allEditorsFullySelected(editors) {
  if (!editors || editors.length < 2) return false;
  return editors.every((ed) => {
    if (!ed || ed.isDestroyed) return false;
    try {
      const { from, to } = ed.state.selection;
      const docSize = ed.state.doc.content.size;
      // ProseMirror's full-doc selection is from=0..docSize (or 1..docSize-1
      // depending on schema). Accept any selection that covers all but the
      // outer document node boundaries.
      return to - from >= Math.max(0, docSize - 2) && to - from > 0;
    } catch {
      return false;
    }
  });
}

function applyDraftToEditor(editor, d, allEditors = null) {
  if (!editor) return;

  // v0.5.81 — Fan-out across pages when the user has done a cross-page
  // Select-All. Each page editor gets the same paragraph format applied to
  // its current selection (which spans the whole page after our Mod-A
  // interceptor). Only the originally-focused editor receives a focus()
  // chain so we don't yank focus mid-fan-out.
  if (allEditors && allEditorsFullySelected(allEditors)) {
    allEditors.forEach((ed) => {
      if (!ed || ed.isDestroyed) return;
      const chain = buildParagraphChain(ed, d, { focus: ed === editor });
      try { chain.run(); } catch { /* skip a page that errored */ }
    });
    return;
  }

  buildParagraphChain(editor, d, { focus: true }).run();
}

// ── Live preview pane ───────────────────────────────────────────────────

function PreviewPane({ draft }) {
  const lh = previewLineHeight(draft.lineSpacingKind, draft.lineSpacingValue) || '1.5';

  // First-line / hanging indent only shows on the sample line itself.
  let textIndent = 0;
  let extraPaddingLeft = 0;
  if (draft.specialIndentKind === 'firstLine') {
    textIndent = draft.specialIndentIn;
  } else if (draft.specialIndentKind === 'hanging') {
    textIndent = -draft.specialIndentIn;
    extraPaddingLeft = draft.specialIndentIn;
  }

  const sample = {
    textAlign: draft.align,
    paddingLeft: `${(draft.indentLeftIn || 0) + extraPaddingLeft}in`,
    paddingRight: `${draft.indentRightIn || 0}in`,
    textIndent: `${textIndent}in`,
    marginTop: `${draft.spaceBeforePt || 0}pt`,
    marginBottom: `${draft.spaceAfterPt || 0}pt`,
    lineHeight: lh,
    hyphens: draft.noHyphenate ? 'none' : 'auto',
    wordBreak: draft.allowLatinWrap ? 'break-all' : 'normal',
    hangingPunctuation: draft.hangingPunctuation ? 'allow-end last' : 'none',
    fontFamily: "'Oldenburg', serif",
    color: 'hsl(220, 30%, 12%)',
    fontSize: '11px',
  };

  const filler = {
    color: 'hsl(220, 12%, 38%)',
    fontSize: '11px',
    fontFamily: "'Oldenburg', serif",
    margin: 0,
  };

  return (
    <div
      className="rounded border border-[hsl(225,9%,22%)] p-3 overflow-hidden"
      style={{ minHeight: 110, maxHeight: 130, background: 'hsl(220, 6%, 78%)' }}
    >
      <p style={filler}>Previous paragraph previous paragraph previous paragraph previous paragraph.</p>
      <p style={sample}>
        Sample text sample text sample text sample text sample text sample text サンプルテキスト 示例文本 샘플 텍스트 sample text sample text sample text.
      </p>
      <p style={filler}>Following paragraph following paragraph following paragraph following paragraph.</p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export default function ParagraphDialog({ open, editor, getAllEditors, onClose }) {
  const [tab, setTab] = useState('spacing');
  const [draft, setDraft] = useState(blankDraft);

  // Reload draft from editor every time we open.
  useEffect(() => {
    if (open) {
      setDraft(readCurrent(editor));
      setTab('spacing');
    }
  }, [open, editor]);

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const lineSpacingKindObj = useMemo(
    () => LINE_SPACING_KINDS.find((k) => k.value === draft.lineSpacingKind) || LINE_SPACING_KINDS[0],
    [draft.lineSpacingKind]
  );

  if (!open) return null;

  const apply = () => {
    const all = getAllEditors ? getAllEditors() : null;
    applyDraftToEditor(editor, draft, all);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[520px] rounded-2xl border border-[hsl(var(--chalk-white-faint)/0.2)] bg-[hsl(var(--chalk-deep)/0.97)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--chalk-white-faint)/0.15)]">
          <h2 className="text-sm font-semibold text-white">Paragraph Settings</h2>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-white transition-colors"
            title="Close"
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
        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          {tab === 'spacing' && (
            <>
              <section>
                <SectionTitle>General</SectionTitle>
                <div className="grid grid-cols-1 gap-y-2.5">
                  <Field label="Alignment">
                    <Select
                      value={draft.align}
                      onChange={(v) => setField('align', v)}
                      options={ALIGNMENTS}
                    />
                  </Field>
                  <Field label="Outline level" disabled hint="Coming in v0.6.0">
                    <Select value="" onChange={() => {}} disabled options={[{ value: '', label: 'Body Text' }]} />
                  </Field>
                  <Check
                    label="Collapsed by default"
                    checked={false}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Indentation</SectionTitle>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                  <Field label="Left">
                    <NumInput
                      value={draft.indentLeftIn}
                      onChange={(v) => setField('indentLeftIn', v ?? 0)}
                      step={0.01} min={0} max={22} suffix="″"
                    />
                  </Field>
                  <Field label="Right">
                    <NumInput
                      value={draft.indentRightIn}
                      onChange={(v) => setField('indentRightIn', v ?? 0)}
                      step={0.01} min={0} max={22} suffix="″"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mt-2.5">
                  <Field label="Special">
                    <Select
                      value={draft.specialIndentKind}
                      onChange={(v) => setField('specialIndentKind', v)}
                      options={SPECIAL_INDENTS}
                      width="w-28"
                    />
                  </Field>
                  <Field label="By">
                    <NumInput
                      value={draft.specialIndentIn}
                      onChange={(v) => setField('specialIndentIn', v ?? 0)}
                      step={0.01} min={0} max={22} suffix="″"
                      disabled={draft.specialIndentKind === 'none'}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Check
                    label="Mirror indents"
                    checked={false}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Spacing</SectionTitle>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                  <Field label="Before">
                    <NumInput
                      value={draft.spaceBeforePt}
                      onChange={(v) => setField('spaceBeforePt', v ?? 0)}
                      step={1} min={0} max={1584} suffix="pt"
                    />
                  </Field>
                  <Field label="After">
                    <NumInput
                      value={draft.spaceAfterPt}
                      onChange={(v) => setField('spaceAfterPt', v ?? 0)}
                      step={1} min={0} max={1584} suffix="pt"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 mt-2.5">
                  <Field label="Line spacing">
                    <Select
                      value={draft.lineSpacingKind}
                      onChange={(v) => setField('lineSpacingKind', v)}
                      options={LINE_SPACING_KINDS}
                      width="w-28"
                    />
                  </Field>
                  <Field label="At">
                    <NumInput
                      value={draft.lineSpacingValue}
                      onChange={(v) => setField('lineSpacingValue', v ?? 0)}
                      step={lineSpacingKindObj.unit === 'pt' ? 0.5 : 0.01}
                      min={0} max={1584}
                      suffix={lineSpacingKindObj.unit || ''}
                      disabled={!lineSpacingKindObj.needsValue}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Check
                    label="Don't add space between paragraphs of the same style"
                    checked={draft.noSpaceWithSameStyle}
                    onChange={(v) => setField('noSpaceWithSameStyle', v)}
                  />
                </div>
              </section>
            </>
          )}

          {tab === 'breaks' && (
            <>
              <section>
                <SectionTitle>Pagination</SectionTitle>
                <div className="space-y-2">
                  <Check label="Widow/Orphan control" checked={false} onChange={() => {}} disabled />
                  <Check label="Keep with next" checked={false} onChange={() => {}} disabled />
                  <Check label="Keep lines together" checked={false} onChange={() => {}} disabled />
                  <Check
                    label="Page break before"
                    checked={draft.pageBreakBefore}
                    onChange={(v) => setField('pageBreakBefore', v)}
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Formatting Exceptions</SectionTitle>
                <div className="space-y-2">
                  <Check label="Suppress line numbers" checked={false} onChange={() => {}} disabled />
                  <Check
                    label="Don't hyphenate"
                    checked={draft.noHyphenate}
                    onChange={(v) => setField('noHyphenate', v)}
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Textbox Options</SectionTitle>
                <div className="space-y-2">
                  <Check label="Tight wrap (around floating images)" checked={false} onChange={() => {}} disabled />
                </div>
              </section>
            </>
          )}

          {tab === 'asian' && (
            <>
              <section>
                <SectionTitle>Asian Typography</SectionTitle>
                <p className="text-[10px] text-[hsl(220,7%,55%)] mb-2 leading-relaxed">
                  Applies to CJK (Chinese · Japanese · Korean) and other Asian
                  scripts. Browser handles the language-specific rules
                  natively for whatever script the text is written in.
                </p>
                <div className="space-y-2">
                  <Check
                    label="Use Asian rules for first/last chars on a line (kinsoku)"
                    checked={draft.kinsoku}
                    onChange={(v) => setField('kinsoku', v)}
                  />
                  <Check
                    label="Allow Latin text to wrap mid-word"
                    checked={draft.allowLatinWrap}
                    onChange={(v) => setField('allowLatinWrap', v)}
                  />
                  <Check
                    label="Hanging punctuation"
                    checked={draft.hangingPunctuation}
                    onChange={(v) => setField('hangingPunctuation', v)}
                  />
                  <Check
                    label="Compress start-of-line punctuation"
                    checked={draft.compressStartPunct}
                    onChange={(v) => setField('compressStartPunct', v)}
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Character Spacing</SectionTitle>
                <div className="space-y-2">
                  <Check
                    label="Auto-space between Asian and Latin text"
                    checked={draft.autoSpaceLatin}
                    onChange={(v) => setField('autoSpaceLatin', v)}
                  />
                  <Check
                    label="Auto-space between Asian text and numbers"
                    checked={draft.autoSpaceNumeric}
                    onChange={(v) => setField('autoSpaceNumeric', v)}
                  />
                </div>
              </section>

              <section>
                <SectionTitle>Vertical Alignment</SectionTitle>
                <div className="grid grid-cols-1 gap-y-2.5">
                  <Field label="Text alignment" hint="Used in vertical writing modes">
                    <Select
                      value={draft.verticalAlign}
                      onChange={(v) => setField('verticalAlign', v)}
                      options={VERTICAL_ALIGNS}
                      width="w-28"
                    />
                  </Field>
                </div>
              </section>
            </>
          )}

          {/* Live preview */}
          <section>
            <SectionTitle>Preview</SectionTitle>
            <PreviewPane draft={draft} />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[hsl(var(--chalk-white-faint)/0.15)] bg-[hsl(220,8%,11%)]">
          <div className="flex items-center gap-2">
            <button
              disabled
              title="Coming in v0.6.0"
              className="px-3 py-1.5 text-[11px] rounded text-[hsl(220,7%,40%)] cursor-not-allowed"
            >
              Tabs…
            </button>
            <button
              disabled
              title="Saved in v0.5.9+"
              className="px-3 py-1.5 text-[11px] rounded text-[hsl(220,7%,40%)] cursor-not-allowed"
            >
              Set As Default
            </button>
          </div>
          <div className="flex items-center gap-2">
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
