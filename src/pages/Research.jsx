import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Microscope, Send, Loader2, Library, Sparkles, Plus, Search, AlertCircle, Trash2, ExternalLink, Download } from 'lucide-react';
import { runResearch, domainFromUrl } from '@/lib/research';
import { base44 } from '@/api/base44Client';
import CitedAnswer from '@/components/research/CitedAnswer';
import SourceCard from '@/components/research/SourceCard';
import Tooltip from '@/components/Tooltip';

/*
 * Research & Cite page.
 *
 * Two sub-tabs:
 *   - "New Research"   \u2014 ask a question, get a cited answer
 *   - "Sources Vault"  \u2014 browse / manage saved sources
 *
 * A research session is a single Q\u2192A pair (we keep it simple for v1; can
 * grow into multi-turn later). Every session is auto-saved to the
 * `Research` entity. The user can save individual sources from a session
 * into the Sources Vault (`Source` entity).
 */

const TAB_NEW = 'new';
const TAB_VAULT = 'vault';

export default function Research() {
  const { researchId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState(researchId ? TAB_NEW : TAB_NEW);
  const [history, setHistory] = useState([]); // past Research entities
  const [vault, setVault] = useState([]);     // saved Source entities

  // Active session state
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState('quick');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // { id, query, answer, sources, followups, depth, created_date }
  const [highlightedSource, setHighlightedSource] = useState(null);
  const [vaultQuery, setVaultQuery] = useState('');

  // Load history + vault on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, s] = await Promise.all([
          base44.entities.Research.list('-created_date', 50),
          base44.entities.Source.list('-created_date', 200),
        ]);
        if (cancelled) return;
        setHistory(Array.isArray(r) ? r : []);
        setVault(Array.isArray(s) ? s : []);
      } catch (e) {
        console.warn('Failed to load research data', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load a specific research by ID from URL.
  useEffect(() => {
    if (!researchId) { setActive(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await base44.entities.Research.get(researchId);
        if (!cancelled && r) {
          setActive(r);
          setTab(TAB_NEW);
        }
      } catch (e) { console.warn(e); }
    })();
    return () => { cancelled = true; };
  }, [researchId]);

  // Tick the elapsed-time counter while a research is running.
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [running]);

  const vaultUrlSet = useMemo(() => new Set(vault.map((s) => s.url)), [vault]);

  // ---------- Handlers ----------
  const handleRun = useCallback(async () => {
    const q = query.trim();
    if (!q || running) return;
    setRunning(true);
    setError(null);
    try {
      const result = await runResearch({ query: q, depth });
      // Persist as a Research entity.
      const saved = await base44.entities.Research.create({
        query: q,
        depth,
        answer: result.answer,
        sources: result.sources,
        followups: result.followups,
      });
      setActive(saved);
      setHistory((h) => [saved, ...h.filter((x) => x.id !== saved.id)]);
      setQuery('');
      navigate(`/research/${saved.id}`, { replace: true });
    } catch (e) {
      setError(e?.message || 'Something went wrong while researching.');
    } finally {
      setRunning(false);
    }
  }, [query, depth, running, navigate]);

  const handleSubmitKey = useCallback((e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun();
  }, [handleRun]);

  const handleSaveSource = useCallback(async (source) => {
    if (!source?.url || vaultUrlSet.has(source.url)) return;
    const saved = await base44.entities.Source.create({
      url: source.url,
      title: source.title,
      snippet: source.snippet,
      publisher: source.publisher || domainFromUrl(source.url),
      published_at: source.published_at || '',
      from_research_id: active?.id || null,
      from_query: active?.query || '',
    });
    setVault((v) => [saved, ...v]);
  }, [vaultUrlSet, active]);

  const handleRemoveFromVault = useCallback(async (source) => {
    if (!source?.id) return;
    await base44.entities.Source.delete(source.id);
    setVault((v) => v.filter((x) => x.id !== source.id));
  }, []);

  const handleCiteClick = useCallback((n) => {
    setHighlightedSource(n);
    const el = document.querySelector(`[data-source-n="${n}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // clear highlight after a beat
    setTimeout(() => setHighlightedSource(null), 1800);
  }, []);

  const handleDeleteResearch = useCallback(async (id) => {
    if (!id) return;
    if (!confirm('Delete this research session? Saved sources stay in your vault.')) return;
    await base44.entities.Research.delete(id);
    setHistory((h) => h.filter((x) => x.id !== id));
    if (active?.id === id) {
      setActive(null);
      navigate('/research', { replace: true });
    }
  }, [active, navigate]);

  const handleExportBibliography = useCallback(() => {
    if (!active?.sources?.length) return;
    const lines = [
      `# Sources for: ${active.query}`,
      `# Generated by Quillosofi on ${new Date().toLocaleDateString()}`,
      '',
      ...active.sources.map((s) => {
        const pub = s.publisher || domainFromUrl(s.url);
        const date = s.published_at ? `, ${s.published_at}` : '';
        return `[${s.n}] ${s.title}. ${pub}${date}. ${s.url}`;
      }),
    ];
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliography-${active.id || 'research'}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [active]);

  // ---------- Render ----------
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Sub-tab bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Microscope className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-white">Research & Cite</h1>
        </div>
        <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-border">
          <button
            onClick={() => setTab(TAB_NEW)}
            className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
              tab === TAB_NEW
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            New Research
          </button>
          <button
            onClick={() => setTab(TAB_VAULT)}
            className={`text-xs px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              tab === TAB_VAULT
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Library className="h-3 w-3" />
            Sources Vault
            {vault.length > 0 && (
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">
                {vault.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === TAB_NEW ? (
          <NewResearchView
            query={query}
            setQuery={setQuery}
            depth={depth}
            setDepth={setDepth}
            running={running}
            elapsed={elapsed}
            error={error}
            active={active}
            history={history}
            vaultUrlSet={vaultUrlSet}
            highlightedSource={highlightedSource}
            onRun={handleRun}
            onSubmitKey={handleSubmitKey}
            onCiteClick={handleCiteClick}
            onSaveSource={handleSaveSource}
            onJumpToHistory={(r) => { setActive(r); navigate(`/research/${r.id}`, { replace: true }); }}
            onNew={() => { setActive(null); navigate('/research', { replace: true }); setQuery(''); setError(null); }}
            onDelete={handleDeleteResearch}
            onExport={handleExportBibliography}
            onFollowup={(q) => setQuery(q)}
          />
        ) : (
          <VaultView
            vault={vault}
            vaultQuery={vaultQuery}
            setVaultQuery={setVaultQuery}
            onRemove={handleRemoveFromVault}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================
// New Research view
// =============================================================
function NewResearchView({
  query, setQuery, depth, setDepth, running, elapsed, error,
  active, history, vaultUrlSet, highlightedSource,
  onRun, onSubmitKey, onCiteClick, onSaveSource, onJumpToHistory, onNew, onDelete, onExport, onFollowup,
}) {
  return (
    <div className="grid h-full grid-cols-1 lg:[grid-template-columns:220px_minmax(0,1fr)_300px] xl:[grid-template-columns:240px_minmax(0,1fr)_320px] overflow-y-auto lg:overflow-hidden">
      {/* History sidebar */}
      <div className="border-b lg:border-b-0 lg:border-r border-border lg:overflow-y-auto p-3 bg-card/30 max-h-48 lg:max-h-none overflow-y-auto">
        <button
          onClick={onNew}
          className="w-full mb-3 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-white font-medium hover:brightness-110 transition"
        >
          <Plus className="h-3.5 w-3.5" />
          New Research
        </button>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent</p>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Your research sessions will appear here.</p>
        ) : (
          <div className="space-y-1">
            {history.map((r) => (
              <div
                key={r.id}
                className={`group relative rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  active?.id === r.id ? 'bg-primary/15 text-white' : 'hover:bg-card text-[hsl(220,7%,75%)]'
                }`}
                onClick={() => onJumpToHistory(r)}
              >
                <p className="text-xs font-medium line-clamp-2 leading-snug">{r.query}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {r.depth === 'deep' ? 'Deep' : 'Quick'} \u00b7 {r.sources?.length || 0} sources
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main column */}
      <div className="flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!active ? (
            <EmptyState />
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {active.depth === 'deep' ? 'Deep Research' : 'Quick Research'}
                </p>
                <h2 className="text-xl font-semibold text-white leading-snug">{active.query}</h2>
              </div>
              <CitedAnswer
                answer={active.answer}
                sources={active.sources || []}
                onCiteClick={onCiteClick}
              />
              {active.followups?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested follow-ups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {active.followups.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => onFollowup(f)}
                        className="text-xs px-2.5 py-1 rounded-full bg-card border border-border text-[hsl(220,7%,80%)] hover:border-primary hover:text-white transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card/40 px-4 py-3 shrink-0">
          {error && (
            <div className="mb-2 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2.5 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <div className="flex-1">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSubmitKey}
                rows={2}
                placeholder="Ask anything \u2014 I'll search the web and cite my sources."
                disabled={running}
                className="w-full resize-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                <Tooltip text="Quick: 1 web pass, ~5 sources, fastest">
                  <button
                    onClick={() => setDepth('quick')}
                    className={`px-2 py-0.5 rounded-full border transition ${
                      depth === 'quick'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    \u26a1 Quick
                  </button>
                </Tooltip>
                <Tooltip text="Deep: multi-angle synthesis, 8-15 sources, slower">
                  <button
                    onClick={() => setDepth('deep')}
                    className={`px-2 py-0.5 rounded-full border transition ${
                      depth === 'deep'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <Sparkles className="inline h-3 w-3 mr-0.5" />
                    Deep
                  </button>
                </Tooltip>
                <span className="ml-auto opacity-70">\u2318/Ctrl + Enter to send</span>
              </div>
            </div>
            <button
              onClick={onRun}
              disabled={running || !query.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {elapsed >= 3 ? `${elapsed}s` : 'Working\u2026'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Research
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sources panel */}
      <div className="border-t lg:border-t-0 lg:border-l border-border lg:overflow-y-auto bg-card/30">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-10">
          <div className="flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold text-white">Sources</p>
            {active?.sources?.length > 0 && (
              <span className="text-[10px] text-muted-foreground">({active.sources.length})</span>
            )}
          </div>
          {active?.sources?.length > 0 && (
            <Tooltip text="Export as bibliography (.md)">
              <button
                onClick={onExport}
                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="p-3 space-y-2">
          {!active?.sources?.length ? (
            <p className="text-xs text-muted-foreground px-1">Sources for the current research will appear here.</p>
          ) : (
            active.sources.map((s) => (
              <SourceCard
                key={`${s.n}-${s.url}`}
                source={s}
                saved={vaultUrlSet.has(s.url)}
                onSave={() => onSaveSource(s)}
                highlight={highlightedSource === s.n}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-center px-6">
      <div className="max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
          <Microscope className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1.5">Research with citations</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ask any question and Quillosofi will search the web, cite every claim
          with a numbered source, and let you save the ones worth keeping to
          your Sources Vault.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <ExampleChip>What's the latest research on creatine and cognition?</ExampleChip>
          <ExampleChip>Compare the philosophies of Stoicism and Buddhism.</ExampleChip>
          <ExampleChip>Who first proposed the multiverse theory?</ExampleChip>
          <ExampleChip>How are LLMs evaluated for hallucination?</ExampleChip>
        </div>
      </div>
    </div>
  );
}

function ExampleChip({ children }) {
  return (
    <div className="text-xs text-[hsl(220,7%,70%)] bg-card border border-border rounded-lg px-3 py-2 leading-snug">
      {children}
    </div>
  );
}

// =============================================================
// Sources Vault view
// =============================================================
function VaultView({ vault, vaultQuery, setVaultQuery, onRemove }) {
  const filtered = useMemo(() => {
    const q = vaultQuery.trim().toLowerCase();
    if (!q) return vault;
    return vault.filter((s) =>
      [s.title, s.url, s.snippet, s.publisher, s.from_query].some((f) =>
        String(f || '').toLowerCase().includes(q)
      )
    );
  }, [vault, vaultQuery]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={vaultQuery}
            onChange={(e) => setVaultQuery(e.target.value)}
            placeholder="Search your sources\u2026"
            className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filtered.length} of {vault.length} sources
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {vault.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-sm">
              <Library className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">No sources yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you save sources from a research session they'll show up
                here for easy reuse and citation.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-10">
            No sources match \u201c{vaultQuery}\u201d.
          </p>
        ) : (
          <div className="grid gap-2 max-w-3xl mx-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtered.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                showNumber={false}
                onRemove={() => onRemove(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
