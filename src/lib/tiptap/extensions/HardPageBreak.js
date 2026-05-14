// HardPageBreak — v0.6.95-Alpha3
//
// Tiptap extension that lets the user insert an explicit page break in
// Quillginate mode with Mod-Enter (Ctrl+Enter on Windows/Linux, Cmd+Enter
// on macOS).
//
// The marker is an HTMLElement: <hr class="hard-page-break" data-hard-break>.
// Visually it's a dashed chalkboard rule with the word "PAGE BREAK" in
// small caps — readable in Quillscript too, so users see where they've
// committed to a break even when paginated layout is off.
//
// The paginator's overflow controller in TiptapPagedEditor.jsx checks
// for `<hr class="hard-page-break">` markers as part of its rebalance
// pass and forces a split at that boundary. Blocks before the marker
// stay on the current page; blocks after the marker move to the next.
//
// Architecture note (Alaria-locked, v0.6 cycle):
//   "Hard page break is opt-in writer control, layered on top of the
//    auto overflow controller — it never fights with it. The overflow
//    pass treats the marker as a forced-break hint, not a measurement."

import { Node, mergeAttributes } from '@tiptap/core';

export const HardPageBreak = Node.create({
  name: 'hardPageBreak',
  group: 'block',
  selectable: true,
  draggable: false,
  atom: true,

  parseHTML() {
    // priority MUST beat StarterKit's HorizontalRule (default 50). When
    // Tiptap's chain().insertContent() round-trips a hardPageBreak through
    // HTML, the generic `tag: 'hr'` rule from HorizontalRule would otherwise
    // win and the node would be reborn as a plain HR.
    return [
      {
        tag: 'hr.hard-page-break',
        priority: 100,
      },
      {
        tag: 'hr[data-hard-break]',
        priority: 100,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(HTMLAttributes, {
        class: 'hard-page-break',
        'data-hard-break': 'true',
      }),
    ];
  },

  // v0.6.95-Alpha3 fix — ProseMirror atom nodes have a bug where the
  // node-decoration class (ProseMirror-selectednode) REPLACES the
  // serialized HTMLAttributes class on the live DOM element, wiping our
  // "hard-page-break" class and breaking both the styling and the
  // paginator's regex-based marker detection. Sidestep that by owning
  // the DOM via a NodeView: we render a stable <hr> with our class
  // permanently set, and ProseMirror will add its `ProseMirror-selectednode`
  // class as a SECOND class token rather than overwriting ours.
  addNodeView() {
    return () => {
      const dom = document.createElement('hr');
      dom.className = 'hard-page-break';
      dom.setAttribute('data-hard-break', 'true');
      dom.setAttribute('contenteditable', 'false');
      return {
        dom,
        // No update method: this node has no editable content.
        ignoreMutation: () => true,
        // Take ownership of selection styling. By default ProseMirror's
        // atom-selection path overwrites our className with
        // 'ProseMirror-selectednode' (it sets className, not classList).
        // Implement these and toggle the class ourselves so our base
        // 'hard-page-break' class is preserved.
        selectNode() {
          dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode() {
          dom.classList.remove('ProseMirror-selectednode');
        },
      };
    };
  },

  addCommands() {
    return {
      insertHardPageBreak:
        () =>
        ({ chain }) => {
          // Insert the marker AND an empty paragraph right after, so the
          // caret has somewhere to land on the new page. Without the
          // trailing paragraph the caret could end up wedged inside an
          // atom node and feel "stuck".
          return chain()
            .insertContent([
              { type: 'hardPageBreak' },
              { type: 'paragraph' },
            ])
            .focus()
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertHardPageBreak(),
    };
  },
});

export default HardPageBreak;
