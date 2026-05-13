// InlineRename — v0.6.65-Alpha2
//
// Tiny controlled input wrapper that handles the Enter/Esc/blur dance for
// inline renaming. Used by:
//   • QuillscriptSidebar entries (double-click to rename)
//   • QuillscriptEditor title (single-click stays editable — only need
//     keyboard handlers there)
//
// Behaviour matches Notion/Finder:
//   • Enter        → commit (calls onCommit with trimmed value)
//   • Escape       → cancel (calls onCancel, value reverts in parent)
//   • blur         → commit if changed, else cancel
//   • empty value  → commits as parent's empty fallback (parent decides)

import { useEffect, useRef } from 'react';

export default function InlineRename({
  value,
  onChange,
  onCommit,
  onCancel,
  className = '',
  placeholder = '',
  autoSelect = true,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && autoSelect) {
      ref.current.focus();
      ref.current.select();
    }
  }, [autoSelect]);

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit?.(value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel?.();
        }
        // Swallow other keys from bubbling up to parent shortcuts.
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => onCommit?.(value)}
      className={className}
    />
  );
}
