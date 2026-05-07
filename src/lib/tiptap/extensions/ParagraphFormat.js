// ParagraphFormat — v0.5.8
//
// Adds Word-faithful paragraph-level attributes that the new ParagraphDialog
// drives. Each attribute round-trips through the editor HTML (data-attrs +
// inline style) so canvases save/load correctly through the existing
// content pipeline.
//
// Why this lives next to (not on top of) Indent.js / LineHeight.js:
//   - Indent.js owns `indentLevel` (0–8), used by Tab/Shift-Tab + the
//     toolbar in/out buttons. We leave that alone.
//   - LineHeight.js owns the simple `lineHeight` numeric ratio used by the
//     line-spacing dropdown. We leave that alone too.
//   - The Word dialog needs richer per-paragraph state (left/right indents
//     in inches, hanging/first-line, spacing in points, "at least"/
//     "exactly"/"multiple" line-spacing modes, page-break-before, hyphens,
//     kinsoku/burasagari/autospace toggles). It reads/writes its own
//     namespaced attrs so the existing simpler extensions keep working
//     unmodified.
//
// All attributes are optional (default null) — when null, nothing is
// rendered and the paragraph behaves exactly like before v0.5.8.

import { Extension } from '@tiptap/react';

const TYPES = ['paragraph', 'heading'];

// Helper — combine an array of [attr, css] pairs into a single inline style
// string for renderHTML. Skips falsy values.
function joinStyle(pairs) {
  return pairs.filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}: ${v}`).join('; ');
}

// Attribute factory — boolean stored as data-* + style, rendered via cssWhenTrue.
function boolDataAttr(name, dataKey, cssWhenTrue) {
  return {
    [name]: {
      default: null,
      parseHTML: (el) => (el.getAttribute(`data-${dataKey}`) === '1' ? true : null),
      renderHTML: (attrs) => {
        if (!attrs[name]) return {};
        const out = { [`data-${dataKey}`]: '1' };
        if (cssWhenTrue) out.style = cssWhenTrue;
        return out;
      },
    },
  };
}

// Attribute factory — string/number stored as data-* with optional style.
function valueDataAttr(name, dataKey, toStyle) {
  return {
    [name]: {
      default: null,
      parseHTML: (el) => el.getAttribute(`data-${dataKey}`) || null,
      renderHTML: (attrs) => {
        const v = attrs[name];
        if (v == null || v === '') return {};
        const out = { [`data-${dataKey}`]: String(v) };
        if (toStyle) {
          const s = toStyle(v);
          if (s) out.style = s;
        }
        return out;
      },
    },
  };
}

export const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',

  addOptions() {
    return { types: TYPES };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          // ── Tab 1 — Indents and Spacing ────────────────────────────────
          // Left indent in inches (0.01 increments). Rendered as padding-left.
          ...valueDataAttr('indentLeftIn', 'indent-left-in',
            (v) => `padding-left: ${v}in`),
          // Right indent in inches.
          ...valueDataAttr('indentRightIn', 'indent-right-in',
            (v) => `padding-right: ${v}in`),
          // Special indent: 'firstLine' | 'hanging' | null
          // Stored as data-* only — the CSS lives on `specialIndentIn` (below)
          // because that's where we know the magnitude. The renderer needs
          // both attributes set, which Tiptap handles by merging the
          // attribute-level renderHTML maps before painting.
          ...valueDataAttr('specialIndentKind', 'special-indent-kind', null),
          // Special indent value in inches. Renders text-indent (positive
          // for First line, negative for Hanging) plus the matching extra
          // padding-left for hanging so the runover lines align.
          // v0.5.81 — hanging-indent renderer combines its own padding-left
          // with any explicit `indentLeftIn` so the two don't clobber each
          // other in mergeAttributes (which dedupes same-property style
          // declarations to last-write-wins).
          specialIndentIn: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-special-indent-in') || null,
            renderHTML: (attrs) => {
              const v = attrs.specialIndentIn;
              if (v == null || v === '') return {};
              const out = { 'data-special-indent-in': String(v) };
              const kind = attrs.specialIndentKind;
              if (kind === 'firstLine') {
                out.style = `text-indent: ${v}in`;
              } else if (kind === 'hanging') {
                const baseLeft = parseFloat(attrs.indentLeftIn) || 0;
                const total = baseLeft + parseFloat(v);
                out.style = `text-indent: -${v}in; padding-left: ${total}in`;
              }
              return out;
            },
          },

          // Spacing before in points.
          ...valueDataAttr('spaceBeforePt', 'space-before-pt',
            (v) => `margin-top: ${v}pt`),
          // Spacing after in points.
          ...valueDataAttr('spaceAfterPt', 'space-after-pt',
            (v) => `margin-bottom: ${v}pt`),

          // Line spacing kind: 'single' | 'oneAndHalf' | 'double' |
          //                    'atLeast' | 'exactly' | 'multiple'
          // (Renders to CSS line-height — separate from LineHeight.js so
          //  the dropdown keeps working without colliding.)
          ...valueDataAttr('lineSpacingKind', 'line-spacing-kind', null),
          // Line spacing value (interpretation depends on kind).
          ...valueDataAttr('lineSpacingValue', 'line-spacing-value', null),

          // Don't add space between paragraphs of same style.
          ...boolDataAttr('noSpaceWithSameStyle', 'no-space-same-style', null),

          // ── Tab 2 — Line and Page Breaks ───────────────────────────────
          // Page break before. The pagination controller respects this;
          // the CSS hint is harmless inside our block flow.
          ...boolDataAttr('pageBreakBefore', 'page-break-before',
            'break-before: page'),
          // Don't hyphenate.
          ...boolDataAttr('noHyphenate', 'no-hyphenate', 'hyphens: none'),

          // ── Tab 3 — Asian Typography (multilingual CJK + other) ────────
          // Use Asian rules for first/last chars on a line (kinsoku).
          ...boolDataAttr('kinsoku', 'kinsoku', 'line-break: strict'),
          // Allow Latin text to wrap mid-word.
          ...boolDataAttr('allowLatinWrap', 'allow-latin-wrap',
            'word-break: break-all'),
          // Hanging punctuation (burasagari).
          ...boolDataAttr('hangingPunctuation', 'hanging-punct',
            'hanging-punctuation: allow-end last'),
          // Compress start-of-line punctuation.
          ...boolDataAttr('compressStartPunct', 'compress-start-punct',
            'text-spacing-trim: space-first'),
          // Auto-space between Asian and Latin / numeric. v0.5.81 — these
          // both wrote to the same `text-autospace` CSS property so only one
          // ever stuck. The numeric attribute below combines both flags into
          // a single declaration so they coexist correctly.
          ...boolDataAttr('autoSpaceLatin', 'auto-space-latin', null),
          autoSpaceNumeric: {
            default: null,
            parseHTML: (el) => (el.getAttribute('data-auto-space-numeric') === '1' ? true : null),
            renderHTML: (attrs) => {
              const out = {};
              if (attrs.autoSpaceNumeric) out['data-auto-space-numeric'] = '1';
              const flags = [];
              if (attrs.autoSpaceLatin) flags.push('ideograph-alpha');
              if (attrs.autoSpaceNumeric) flags.push('ideograph-numeric');
              if (flags.length) out.style = `text-autospace: ${flags.join(' ')}`;
              return out;
            },
          },
          // Vertical alignment for vertical writing modes.
          // 'auto' | 'top' | 'center' | 'baseline' | 'bottom'
          ...valueDataAttr('verticalAlign', 'vertical-align',
            (v) => (v === 'auto' ? '' : `vertical-align: ${v}`)),
        },
      },
    ];
  },

  addCommands() {
    return {
      // Apply a partial set of paragraph attributes to the current block(s).
      // Tiptap's updateAttributes only writes the keys you pass — anything
      // omitted stays as-is, so the dialog can patch one tab without
      // touching settings from another.
      setParagraphFormat:
        (attrs) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, attrs)
          );
        },
      // Reset every paragraph-format attribute on the current block(s).
      // Used by the dialog's (future) "Reset" button — leaves indentLevel,
      // lineHeight, and textAlign alone since those aren't ours.
      clearParagraphFormat:
        () =>
        ({ commands }) => {
          const keys = [
            'indentLeftIn', 'indentRightIn', 'specialIndentKind',
            'specialIndentIn', 'spaceBeforePt', 'spaceAfterPt',
            'lineSpacingKind', 'lineSpacingValue', 'noSpaceWithSameStyle',
            'pageBreakBefore', 'noHyphenate', 'kinsoku', 'allowLatinWrap',
            'hangingPunctuation', 'compressStartPunct', 'autoSpaceLatin',
            'autoSpaceNumeric', 'verticalAlign',
          ];
          return this.options.types.every((type) =>
            keys.every((k) => commands.resetAttributes(type, k))
          );
        },
    };
  },
});

export default ParagraphFormat;
