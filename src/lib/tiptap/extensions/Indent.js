// Indent — paragraph/heading block attribute storing left-indent in steps,
// rendered as `padding-left: <Nem>`. Mirrors Quill's `.ql-indent-N` classes
// (which the legacy CSS still has 1..8). For Tiptap we use a single
// indentLevel attribute (0..8). Used by CanvasRuler's drag-to-set-indent and
// by the toolbar's outdent/indent buttons.

import { Extension } from '@tiptap/react';

export const MAX_INDENT = 8;
const STEP_EM = 3; // matches .ql-indent-1 padding-left

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return { types: ['paragraph', 'heading'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (el) => {
              const cls = el.className || '';
              const m = cls.match(/(?:^|\s)ql-indent-(\d)/);
              if (m) return parseInt(m[1], 10);
              const pad = parseFloat(el.style.paddingLeft || '');
              if (!isNaN(pad) && pad > 0) {
                // "3em" → 1, "6em" → 2, etc. Snap to closest STEP_EM.
                return Math.min(MAX_INDENT, Math.round(pad / STEP_EM));
              }
              return 0;
            },
            renderHTML: (attrs) => {
              const lvl = parseInt(attrs.indentLevel || 0, 10);
              if (!lvl) return {};
              return { style: `padding-left: ${lvl * STEP_EM}em` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ commands, editor }) => {
          const types = this.options.types;
          let ok = false;
          for (const type of types) {
            const lvl = parseInt(editor.getAttributes(type).indentLevel || 0, 10);
            const next = Math.min(MAX_INDENT, lvl + 1);
            ok = commands.updateAttributes(type, { indentLevel: next }) || ok;
          }
          return ok;
        },
      outdent:
        () =>
        ({ commands, editor }) => {
          const types = this.options.types;
          let ok = false;
          for (const type of types) {
            const lvl = parseInt(editor.getAttributes(type).indentLevel || 0, 10);
            const next = Math.max(0, lvl - 1);
            ok = commands.updateAttributes(type, { indentLevel: next }) || ok;
          }
          return ok;
        },
      setIndent:
        (level) =>
        ({ commands }) => {
          const lvl = Math.max(0, Math.min(MAX_INDENT, parseInt(level, 10) || 0));
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { indentLevel: lvl })
          );
        },
    };
  },
});

export default Indent;
