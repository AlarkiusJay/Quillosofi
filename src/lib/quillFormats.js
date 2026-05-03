// Registers extra Quill formats Quillosofi needs beyond the defaults.
//   - size:        explicit px values (12 / 14 / 16 / 18 / 20 / 24 / 32 / 48)
//   - align:       L / C / R / J (already defaults but we whitelist it explicitly)
//   - indent:      indent levels (already defaults; just exposed)
//   - line-height: custom block-level attributor for line spacing
//
// This file imports react-quill which gives us the same Quill instance the
// editor uses. Importing once at app boot is enough — the registrations are
// global on the Quill class.

import ReactQuill from 'react-quill';

const Quill = ReactQuill.Quill;

// ---- Font size ------------------------------------------------------------
const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = [
  '12px', '14px', '16px', '18px', '20px', '24px', '32px', '48px',
];
Quill.register(SizeStyle, true);

// ---- Line height ----------------------------------------------------------
// Block-level attributor; applies to <p>, <h1>..., <li> nodes.
const Parchment = Quill.import('parchment');
const lineHeightConfig = {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3'],
};
const LineHeightStyle = new Parchment.Attributor.Style('line-height', 'line-height', lineHeightConfig);
Quill.register(LineHeightStyle, true);

// ---- First-line indent (Word-style) --------------------------------------
// Top ruler wedge drives this. Stored as `text-indent: <em>em` on the block.
// Positive = first line indented further than rest (default Word behavior).
// Negative = hanging indent (first line outdented from the rest).
const TextIndentStyle = new Parchment.Attributor.Style('text-indent', 'text-indent', {
  scope: Parchment.Scope.BLOCK,
});
Quill.register(TextIndentStyle, true);

// ---- Right indent (Word-style) -------------------------------------------
// Right ruler wedge drives this. Stored as `padding-right: <px>px` on the
// block, so it shrinks the paragraph's right edge. Persists in HTML output.
const PaddingRightStyle = new Parchment.Attributor.Style('padding-right', 'padding-right', {
  scope: Parchment.Scope.BLOCK,
});
Quill.register(PaddingRightStyle, true);

// Re-export the Quill instance so callers can be sure they've awaited
// registration before mounting <ReactQuill />.
export default Quill;
