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

import { useState, useEffect, useMemo, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

import {
  loadLayout, saveLayout, resetLayout,
  loadWidgetState, saveWidgetState,
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
  const [layouts, setLayouts] = useState(() => ({ lg: loadLayout() }));
  const [widgetState, setWidgetState] = useState(loadWidgetState);
  const [editing, setEditing] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => { saveWidgetState(widgetState); }, [widgetState]);

  const handleLayoutChange = (current /* , all */) => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLayouts({ lg: current });
    saveLayout(current);
  };

  const updateWidgetSettings = (id, patch) => {
    setWidgetState((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const handleReset = () => {
    if (!confirm('Reset Quillounge to the default layout?')) return;
    resetLayout();
    setLayouts({ lg: DEFAULT_LAYOUT.map(l => ({ ...l })) });
  };

  // Filter to only render widgets we have layout entries for.
  const visibleWidgets = useMemo(() => {
    const lay = layouts.lg || [];
    return lay.filter(l => WIDGET_REGISTRY[l.i]).map(l => l.i);
  }, [layouts]);

  return (
    <div className="flex-1 overflow-y-auto bg-[hsl(228,7%,16%)]" style={{ minHeight: 0 }}>
      <style>{gridStyles}</style>

      {/* Header */}
      <div className="px-5 md:px-8 pt-5 md:pt-6 pb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[hsl(220,7%,45%)] font-semibold">Quillounge</p>
          <p className="text-xs text-[hsl(220,7%,55%)] mt-0.5">{editing ? 'Drag headers to reorder · drag the corner to resize' : 'Your home base for writing'}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-[hsl(220,7%,65%)] hover:text-white border border-[hsl(225,9%,22%)] hover:border-primary/40 transition-colors"
              title="Reset layout"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
          <button
            onClick={() => setEditing(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${editing ? 'bg-primary text-white' : 'bg-[hsl(220,8%,20%)] text-[hsl(220,7%,70%)] hover:text-white border border-[hsl(225,9%,22%)]'}`}
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
          breakpoints={{ lg: 1100, md: 760, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={56}
          margin={[12, 12]}
          containerPadding={[8, 12]}
          isDraggable={editing}
          isResizable={editing}
          draggableHandle="[data-widget-handle]"
          onLayoutChange={handleLayoutChange}
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
