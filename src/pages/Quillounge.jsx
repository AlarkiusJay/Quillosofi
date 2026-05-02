/*
 * Quillounge — Quillosofi v0.4 home page.
 *
 * Drag-and-drop subgrid of widgets. Per-widget opacity + theme. Time-aware
 * greeting + name input. Default widgets per spec:
 *   - Greeting (full width, top)
 *   - Today's Prompt + Fun Fact
 *   - To Do
 *   - Pinned / Recent / Writing Stats
 *
 * Layout, widget visual settings, and per-widget data persist to localStorage.
 */

import { useState, useEffect, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

import {
  loadLayout, saveLayout, resetLayout,
  loadWidgetState, saveWidgetState,
  loadCustomizedFlags, saveCustomizedFlags,
  deriveLayoutFromLg,
  BREAKPOINTS, BREAKPOINT_COLS,
  DEFAULT_LAYOUT,
} from '@/components/quillounge/widgets';
import QuilloungeWidget from '@/components/quillounge/QuilloungeWidget';
import GreetingWidget from '@/components/quillounge/widgets/GreetingWidget';
import TodoWidget from '@/components/quillounge/widgets/TodoWidget';
import PinnedRecentWidget from '@/components/quillounge/widgets/PinnedRecentWidget';
import PromptFactWidget from '@/components/quillounge/widgets/PromptFactWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_REGISTRY = {
  greeting:     { title: 'Hello', component: GreetingWidget },
  todaysPrompt: { title: "Today's Prompt", component: PromptFactWidget },
  todo:         { title: 'To Do', component: TodoWidget },
  pinnedRecent: { title: 'Pinned · Recent · Stats', component: PinnedRecentWidget },
};

// Custom CSS to skin react-grid-layout to match Quillosofi's dark palette.
const gridStyles = `
  .quillounge-grid .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top, width, height;
  }
  .quillounge-grid .react-grid-item.react-grid-placeholder {
    background: hsl(258, 80%, 70%) !important;
    opacity: 0.18;
    border-radius: 16px;
  }
  .quillounge-grid .react-grid-item.cssTransforms {
    transition-property: transform, width, height;
  }
  .quillounge-grid .react-grid-item.resizing {
    z-index: 30;
  }
  .quillounge-grid .react-grid-item.react-draggable-dragging {
    z-index: 40;
  }
  .quillounge-grid .react-resizable-handle {
    background-image: none;
  }
  .quillounge-grid.editing .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 5px;
    bottom: 5px;
    width: 8px;
    height: 8px;
    border-right: 2px solid hsl(258, 70%, 65%);
    border-bottom: 2px solid hsl(258, 70%, 65%);
    border-bottom-right-radius: 2px;
    opacity: 0.8;
  }
`;

export default function Quillounge() {
  // Stored shape: { lg: [...], md: [...], sm: [...] } — per-breakpoint so
  // RGL doesn't clobber lg positions when the user briefly visits md/sm.
  const [layouts, setLayouts] = useState(loadLayout);
  const [widgetState, setWidgetState] = useState(loadWidgetState);
  const [editing, setEditing] = useState(false);

  // Active breakpoint reported by RGL. Used to decide which breakpoint a user
  // edit should mark as "customised" — only the one they're actually looking
  // at and dragging in.
  const [activeBreakpoint, setActiveBreakpoint] = useState('lg');

  // Per-breakpoint customisation flags. md/sm stay derived-from-lg until the
  // user manually edits at that breakpoint, at which point they become sticky.
  const [customized, setCustomized] = useState(loadCustomizedFlags);

  useEffect(() => { saveWidgetState(widgetState); }, [widgetState]);
  useEffect(() => { saveCustomizedFlags(customized); }, [customized]);

  // RGL signature: onLayoutChange(currentLayout, allLayouts). Strategy:
  //   - Always trust the active breakpoint's layout (that's what the user sees
  //     and may have just dragged).
  //   - For *non*-active breakpoints, only honour what RGL/storage sent if
  //     that breakpoint has been customised. Otherwise re-derive from the
  //     latest lg so a maximised edit cascades into windowed mode.
  //   - Mark the active breakpoint customised on real edits (drag/resize),
  //     not on mount/hydration emissions.
  const handleLayoutChange = (_current, all) => {
    if (!all || typeof all !== 'object') return;
    const lg = Array.isArray(all.lg) && all.lg.length > 0 ? all.lg : layouts.lg;
    const next = {
      lg,
      md: customized.md && Array.isArray(all.md) ? all.md : deriveLayoutFromLg(lg, 'md'),
      sm: customized.sm && Array.isArray(all.sm) ? all.sm : deriveLayoutFromLg(lg, 'sm'),
    };
    setLayouts(next);
    saveLayout(next);
  };

  // RGL fires onDragStop/onResizeStop only after a user-initiated edit, so
  // these are the safe hooks to flip the customised flag without false
  // positives from initial-render layout emissions.
  const markActiveCustomized = () => {
    if (!customized[activeBreakpoint]) {
      setCustomized(prev => ({ ...prev, [activeBreakpoint]: true }));
    }
  };

  const handleBreakpointChange = (bp) => {
    setActiveBreakpoint(bp);
  };

  const updateWidgetSettings = (id, patch) => {
    setWidgetState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const handleReset = () => {
    if (!confirm('Reset Quillounge to the default layout?')) return;
    resetLayout();
    const lg = DEFAULT_LAYOUT.map(l => ({ ...l }));
    setLayouts({
      lg,
      md: deriveLayoutFromLg(lg, 'md'),
      sm: deriveLayoutFromLg(lg, 'sm'),
    });
    setCustomized({ lg: false, md: false, sm: false });
  };

  // Filter to only render widgets we have layout entries for. Prefer lg as
  // the source of truth for which widgets exist; fall back through md/sm.
  const visibleWidgets = useMemo(() => {
    const lay = layouts.lg || layouts.md || layouts.sm || [];
    return lay.filter(l => WIDGET_REGISTRY[l.i]).map(l => l.i);
  }, [layouts]);

  return (
    // v0.4.20: chalkboard surface. The body's background-image (set in
    // index.css) shows through because we don't paint over it here.
    <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, background: 'transparent' }}>
      <style>{gridStyles}</style>

      {/* Header — chalk-on-board masthead. Oldenburg shows up here when the
          user picks it from the font selector; falls back to whatever font
          they've chosen. The QUILLOUNGE label is rendered as if chalked. */}
      <div className="px-5 md:px-8 pt-6 md:pt-8 pb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] chalk-yellow font-semibold">Quillounge</p>
          <p className="font-instrument text-[15px] chalk-text mt-1 italic opacity-90">
            {editing ? 'Drag headers to reorder · drag the corner to resize' : 'Your home base for writing.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs chalk-muted hover:chalk-text border transition-colors"
              style={{ borderColor: 'hsl(var(--chalk-white-faint) / 0.5)' }}
              title="Reset layout"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          <button
            onClick={() => setEditing(v => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors"
            style={editing ? {
              background: 'hsl(var(--chalk-yellow))',
              color: 'hsl(var(--chalk-deep))',
            } : {
              background: 'hsl(var(--chalk-board-alt))',
              color: 'hsl(var(--chalk-white))',
              border: '1px solid hsl(var(--chalk-white-faint) / 0.5)',
            }}
          >
            {editing ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {editing ? 'Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-3 md:px-5 pb-8">
        <ResponsiveGridLayout
          className={`quillounge-grid ${editing ? 'editing' : ''}`}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={BREAKPOINT_COLS}
          rowHeight={56}
          margin={[12, 12]}
          containerPadding={[8, 12]}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle="[data-widget-handle]"
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          onDragStop={markActiveCustomized}
          onResizeStop={markActiveCustomized}
          compactType="vertical"
        >
          {visibleWidgets.map((id) => {
            const def = WIDGET_REGISTRY[id];
            const WidgetComponent = def.component;
            return (
              <div key={id}>
                <QuilloungeWidget
                  id={id}
                  title={def.title}
                  settings={widgetState[id] || {}}
                  onSettingsChange={(patch) => updateWidgetSettings(id, patch)}
                  editing={editing}
                >
                  <WidgetComponent />
                </QuilloungeWidget>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
