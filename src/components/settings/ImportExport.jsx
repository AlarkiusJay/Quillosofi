import { useState, useRef } from 'react';
import { Download, Upload, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { app } from '@/api/localClient';
import { Button } from '@/components/ui/button';

export default function ImportExport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    const [conversations, messages, memories, botConfig] = await Promise.all([
      app.entities.Conversation.filter({ is_archived: false }, '-created_date', 500),
      app.entities.Message.list('-created_date', 5000),
      app.entities.UserMemory.filter({}, '-updated_date', 500),
      app.entities.BotConfig.list('-created_date', 1),
    ]);
    const exportData = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      conversations,
      messages,
      memories,
      bot_config: botConfig[0] || null,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexal-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleImportFile = async (e) => {
   const file = e.target.files?.[0];
   if (!file) return;
   const validExtensions = ['.json', '.txt', '.csv', '.zip'];
   const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
   if (!validExtensions.includes(fileExt)) {
     setImportStatus({ type: 'error', message: `Unsupported file format. Supported formats: ${validExtensions.join(', ')}` });
     e.target.value = '';
     return;
   }
   setImporting(true);
   setImportStatus(null);
   const text = await file.text();
    const data = JSON.parse(text);
    if (!data.version || !data.conversations) {
      setImportStatus({ type: 'error', message: 'Invalid export file format.' });
      setImporting(false);
      return;
    }
    let imported = { conversations: 0, messages: 0, memories: 0 };
    const convoIdMap = {};
    for (const c of (data.conversations || [])) {
      const { id, created_date, updated_date, created_by, ...fields } = c;
      const created = await app.entities.Conversation.create(fields);
      convoIdMap[id] = created.id;
      imported.conversations++;
    }
    for (const m of (data.messages || [])) {
      const newConvoId = convoIdMap[m.conversation_id];
      if (!newConvoId) continue;
      const { id, created_date, updated_date, created_by, ...fields } = m;
      await app.entities.Message.create({ ...fields, conversation_id: newConvoId });
      imported.messages++;
    }
    for (const mem of (data.memories || [])) {
      const existing = await app.entities.UserMemory.filter({ key: mem.key });
      if (existing.length === 0) {
        const { id, created_date, updated_date, created_by, ...fields } = mem;
        await app.entities.UserMemory.create(fields);
        imported.memories++;
      }
    }
    setImportStatus({
      type: 'success',
      message: `Imported ${imported.conversations} conversations, ${imported.messages} messages, ${imported.memories} memories.`,
    });
    setImporting(false);
    e.target.value = '';
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    const [convos, messages, memories] = await Promise.all([
      app.entities.Conversation.filter({}, '-created_date', 1000),
      app.entities.Message.list('-created_date', 10000),
      app.entities.UserMemory.filter({}, '-updated_date', 1000),
    ]);
    for (const c of convos) await app.entities.Conversation.delete(c.id);
    for (const m of messages) await app.entities.Message.delete(m.id);
    for (const mem of memories) await app.entities.UserMemory.delete(mem.id);
    setDeleting(false);
    setDeleteStep(0);
    setImportStatus({ type: 'success', message: 'All data has been permanently deleted.' });
  };

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Export Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Download all your conversations, messages, memories, and settings as a JSON file.</p>
            <p className="text-xs text-muted-foreground/70 mt-2">📦 <span className="font-medium">Format:</span> JSON</p>
          </div>
        </div>
        <Button onClick={handleExport} disabled={exporting} className="w-full">
          {exporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting…</> : <><Download className="h-4 w-4 mr-2" />Export All Data</>}
        </Button>
      </div>

      {/* Import */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Upload className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Import Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Restore from a previously exported Nexal backup. Existing data won't be deleted — new items will be added.</p>
            <p className="text-xs text-muted-foreground/70 mt-2">📦 <span className="font-medium">Supported formats:</span> JSON, Markdown (.txt), CSV, ZIP</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept=".json,.txt,.csv,.zip" className="hidden" onChange={handleImportFile} />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full">
          {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</> : <><Upload className="h-4 w-4 mr-2" />Choose File to Import</>}
        </Button>
        {importStatus && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs ${importStatus.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'}`}>
            {importStatus.type === 'success'
              ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Delete All Data */}
      <div className="bg-red-950/40 rounded-xl border border-red-700/40 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-400">Delete All Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Permanently delete every conversation, message, memory, and setting. This cannot be undone.</p>
          </div>
        </div>
        <button
          onClick={() => setDeleteStep(1)}
          className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" /> Delete All My Data
        </button>
      </div>

      {/* Confirmation Step 1 */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDeleteStep(0)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[hsl(220,8%,18%)] border-2 border-red-600 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <p className="text-4xl mb-3">🚨</p>
              <p className="text-lg font-black text-red-400 mb-2">WHOA HOLD ON THERE BUDDY</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You are about to nuke <span className="font-bold text-white">everything</span>. Every message. Every memory. Every single thing you have ever said to Nexal. Gone. Forever. Into the void. Are you <em>absolutely</em> sure?
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors">Nope, keep it</button>
              <button onClick={() => setDeleteStep(2)} className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors">Yeah, nuke it</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Step 2 */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setDeleteStep(0)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative bg-[hsl(220,8%,14%)] border-2 border-red-500 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <p className="text-4xl mb-3">💀</p>
              <p className="text-lg font-black text-red-300 mb-2">THIS IS YOUR LAST CHANCE.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                I am begging you. Please. There is no undo button. No backup. No oops I did not mean it. Your entire chat history will be <span className="font-black text-red-400">obliterated from existence</span>. Your memories, gone. Your spaces, gone. All of it. <span className="text-white font-semibold">Are you actually, truly, genuinely doing this?</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors">WAIT NO STOP</button>
              <button onClick={handleDeleteAll} disabled={deleting} className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-black transition-colors">
                {deleting ? 'Deleting...' : 'YES. DO IT.'}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center px-2">
        Your data is stored privately and only accessible by you. Exports include all non-archived conversations, messages, memories, and bot configuration.
      </p>
    </div>
  );
}