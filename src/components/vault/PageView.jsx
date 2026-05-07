// PageView — v0.5.0
// Thin chalkboard-background wrapper around the new TiptapPagedEditor.
// The Tiptap editor handles its own page rendering and (in side-to-side
// mode) its own spread navigation. PageView just supplies the dark
// surface and a centered scrollable column for vertical mode.
//
// Pre-v0.5.0, this file was a hefty layout component that owned phantom
// pages and side-to-side spread state. All of that is now redundant —
// TiptapPagedEditor renders both modes natively.

export default function PageView({ setup, children }) {
  // Side-to-side mode: TiptapPagedEditor renders its own full spread + nav,
  // so we just hand it the chalkboard frame and get out of the way.
  if (setup.pageMovement === 'side-to-side') {
    return (
      <div className="flex-1 overflow-hidden flex" style={{ background: 'hsl(220, 12%, 9%)' }}>
        {children}
      </div>
    );
  }

  // Vertical mode: scrollable chalkboard, zoomed in place.
  return (
    <div
      className="flex-1 overflow-auto"
      style={{ background: 'hsl(220, 12%, 9%)' }}
    >
      <div
        className="flex flex-col items-center gap-6 py-8 px-12 mx-auto"
        style={{
          transform: `scale(${setup.zoom})`,
          transformOrigin: 'top center',
          width: 'fit-content',
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
