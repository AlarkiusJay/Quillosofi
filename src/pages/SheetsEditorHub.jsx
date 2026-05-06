import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { app } from '@/api/localClient';
import { Plus, Table2, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEditorTabs } from '@/lib/editorTabs';
import TabStrip from '@/components/editors/TabStrip';
import SpreadsheetEditor from '@/components/sheets/SpreadsheetEditor';

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 10;

function emptyData() {
  return Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(''));
}

// SheetsEditorHub — full-page editor hub for spreadsheets.
//   /sheets         → landing
//   /sheets/:id     → editor (with tab strip across the top)
//
// Tabs persist via quillosofi:sheets:openTabs / quillosofi:sheets:lastOpen.
export default function SheetsEditorHub() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { tabs, activeId, openTab, closeTab, setActiveId, pruneTabs } = useEditorTabs('sheets');
  const [allSheets, setAllSheets] = useState([]);
  const [sheetMap, setSheetMap] = useState({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await app.entities.Spreadsheet.list('-updated_date', 200);
    setAllSheets(data);
    const map = Object.fromEntries(data.map(s => [s.id, s]));
    setSheetMap(prev => ({ ...prev, ...map }));
    pruneTabs(data.map(s => s.id));
    setLoading(false);
  }, [pruneTabs]);

  useEffect(() => { reload(); }, [reload]);

  // URL ↔ active tab sync. Single effect, route is source of truth.
  // (Splitting into two effects caused a ping-pong loop when mounting at
  // /sheets/:id with a stale lastOpen in localStorage — see CanvasEditorHub.)
  useEffect(() => {
    if (routeId) {
      if (routeId !== activeId) openTab(routeId);
    } else if (activeId) {
      navigate(`/sheets/${activeId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, activeId]);

  const handleNew = async () => {
    const s = await app.entities.Spreadsheet.create({
      title: 'Untitled Sheet',
      data: JSON.stringify(emptyData()),
      num_rows: DEFAULT_ROWS,
      num_cols: DEFAULT_COLS,
      // No message_id — this sheet was created from the hub.
    });
    setAllSheets(prev => [s, ...prev]);
    setSheetMap(prev => ({ ...prev, [s.id]: s }));
    openTab(s.id);
  };

  const handleOpen = (id) => openTab(id);

  // Close + URL sync (mirrors CanvasEditorHub fix — prevents reopen loop).
  const handleCloseTab = useCallback((id) => {
    const idx = tabs.indexOf(id);
    const next = tabs.filter(t => t !== id);
    closeTab(id);
    if (id === routeId) {
      const fallback = next[idx] || next[idx - 1] || null;
      navigate(fallback ? `/sheets/${fallback}` : '/sheets', { replace: true });
    }
  }, [tabs, routeId, closeTab, navigate]);

  // Refresh title in tabs after the user renames inside the editor.
  const handleSheetSaved = useCallback(async (idOrMsgId) => {
    // The save callback receives an id — could be sheet id (hub) or message id (chat).
    // Reload the matching sheet to keep the tab title fresh.
    const sheet = await app.entities.Spreadsheet.get?.(idOrMsgId).catch(() => null);
    if (sheet) {
      setAllSheets(prev => prev.map(s => s.id === sheet.id ? sheet : s));
      setSheetMap(prev => ({ ...prev, [sheet.id]: sheet }));
    } else {
      // Fall back to refetching the active list — cheap (≤200 rows).
      const data = await app.entities.Spreadsheet.list('-updated_date', 200);
      setAllSheets(data);
      setSheetMap(Object.fromEntries(data.map(s => [s.id, s])));
    }
  }, []);

  const tabDescriptors = useMemo(() => tabs.map(id => {
    const s = sheetMap[id] || allSheets.find(x => x.id === id);
    return { id, title: s?.title || 'Untitled', icon: '📊' };
  }), [tabs, sheetMap, allSheets]);

  const activeSheet = activeId ? (sheetMap[activeId] || allSheets.find(s => s.id === activeId)) : null;

  const recent = useMemo(() => {
    const openSet = new Set(tabs);
    return allSheets.filter(s => !openSet.has(s.id)).slice(0, 12);
  }, [allSheets, tabs]);

  const lastOpenCard = useMemo(() => tabs.length > 0 ? null : (allSheets[0] || null), [allSheets, tabs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[hsl(220,8%,13%)]">
      <TabStrip
        tabs={tabDescriptors}
        activeId={activeId}
        onSelect={setActiveId}
        onClose={handleCloseTab}
        onNew={handleNew}
        placeholder="No sheets open — pick one below or hit + to start fresh"
      />

      {activeSheet ? (
        <SpreadsheetEditor
          key={activeSheet.id}
          sheet={activeSheet}
          embedded
          onSave={handleSheetSaved}
        />
      ) : (
        <Landing
          loading={loading}
          lastOpenCard={lastOpenCard}
          recent={recent}
          onOpen={handleOpen}
          onNew={handleNew}
          navigate={navigate}
        />
      )}
    </div>
  );
}

function Landing({ loading, lastOpenCard, recent, onOpen, onNew, navigate }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Table2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-white">Sheets</h1>
          </div>
          <p className="text-xs text-[hsl(220,7%,55%)]">Numbers, formulas, and tabular data — your structured workspace.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            onClick={onNew}
            className="group flex items-center gap-3 px-5 py-4 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 hover:border-primary/50 transition-all text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">New Blank Sheet</p>
              <p className="text-[11px] text-[hsl(220,7%,55%)]">20 × 10 grid, ready for data.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/quillibrary')}
            className="group flex items-center gap-3 px-5 py-4 rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] hover:bg-[hsl(228,7%,20%)] hover:border-[hsl(225,9%,30%)] transition-all text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-[hsl(228,7%,22%)] flex items-center justify-center text-[hsl(220,7%,70%)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Open from Quillibrary</p>
              <p className="text-[11px] text-[hsl(220,7%,55%)]">Browse your full library.</p>
            </div>
          </button>
        </div>

        {lastOpenCard && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-3.5 w-3.5 text-[hsl(220,7%,50%)]" />
              <span className="text-[11px] font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider">Resume Last</span>
            </div>
            <button
              onClick={() => onOpen(lastOpenCard.id)}
              className="w-full text-left rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] hover:bg-[hsl(228,7%,20%)] hover:border-primary/40 transition-all overflow-hidden"
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>📊</span>
                  <p className="text-sm font-semibold text-white truncate">{lastOpenCard.title}</p>
                </div>
                <p className="text-[11px] text-[hsl(220,7%,55%)]">
                  {lastOpenCard.num_rows || 0} rows × {lastOpenCard.num_cols || 0} cols · last edited {lastOpenCard.updated_date ? format(new Date(lastOpenCard.updated_date), 'MMM d, yyyy') : 'recently'}
                </p>
              </div>
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[hsl(220,7%,50%)] uppercase tracking-wider">Recent</span>
            {recent.length > 0 && (
              <button onClick={() => navigate('/quillibrary')} className="text-[11px] text-primary hover:text-primary/80 transition-colors">View all →</button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(225,9%,22%)] py-12 text-center">
              <span className="text-3xl mb-2 block">📊</span>
              <p className="text-sm text-white mb-1">No sheets yet</p>
              <p className="text-xs text-[hsl(220,7%,50%)]">Start with a blank sheet above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent.map(s => (
                <button
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className={cn(
                    'group rounded-xl border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)]',
                    'hover:bg-[hsl(228,7%,20%)] hover:border-primary/40 transition-all overflow-hidden text-left'
                  )}
                >
                  <div className="px-4 py-4 min-h-[110px] flex flex-col gap-1">
                    {[...Array(4)].map((_, ri) => (
                      <div key={ri} className="flex gap-1">
                        {[...Array(5)].map((_, ci) => (
                          <div key={ci} className={cn('h-3 rounded-sm flex-1', ri === 0 ? 'bg-primary/20' : 'bg-[hsl(225,9%,22%)]')} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[hsl(225,9%,15%)]">
                    <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                    <p className="text-[10px] text-[hsl(220,7%,40%)] mt-0.5">
                      {(s.num_rows || 0)} × {(s.num_cols || 0)} · {s.updated_date ? format(new Date(s.updated_date), 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
