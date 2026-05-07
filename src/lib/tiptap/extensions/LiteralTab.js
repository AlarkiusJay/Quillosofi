// LiteralTab — Tab inserts a literal \t at the cursor (matching Word/Quillosofi
// v0.4.34 behavior). Shift-Tab deletes the preceding \t if any. Lists and code
// blocks keep their default Tab handling (the StarterKit list-keymap extension
// nests bullets, code-block lets Tab insert real spaces).
//
// Mounted with high priority so this fires BEFORE list-keymap when not in a
// list/code-block.

import { Extension } from '@tiptap/react';

export const LiteralTab = Extension.create({
  name: 'literalTab',

  addKeyboardShortcuts() {
    const tabHandler = ({ editor }) => {
      // Skip if we're inside a list or code block — let their handlers run.
      if (
        editor.isActive('bulletList') ||
        editor.isActive('orderedList') ||
        editor.isActive('codeBlock') ||
        editor.isActive('listItem')
      ) {
        return false;
      }
      editor.chain().focus().insertContent('\t').run();
      return true;
    };

    const shiftTabHandler = ({ editor }) => {
      if (
        editor.isActive('bulletList') ||
        editor.isActive('orderedList') ||
        editor.isActive('codeBlock') ||
        editor.isActive('listItem')
      ) {
        return false;
      }
      const { state } = editor;
      const { from } = state.selection;
      if (from < 1) return false;
      const prevChar = state.doc.textBetween(from - 1, from, '\n');
      if (prevChar === '\t') {
        editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
        return true;
      }
      return false;
    };

    return {
      Tab: tabHandler,
      'Shift-Tab': shiftTabHandler,
    };
  },
});

export default LiteralTab;
