// FontSize — Tiptap mark extension that stores font-size as a CSS attribute on
// the existing TextStyle mark (from @tiptap/extension-text-style). Mirrors
// what Quill called `size` in v0.4.x. Saved as inline style="font-size:14px".
//
// Usage:
//   editor.chain().focus().setFontSize('14px').run();
//   editor.chain().focus().unsetFontSize().run();
//   editor.isActive('textStyle', { fontSize: '14px' });

import { Extension } from '@tiptap/react';

export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return { types: ['textStyle'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

export default FontSize;
