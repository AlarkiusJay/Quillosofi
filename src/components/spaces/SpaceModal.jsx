import { useState, useRef } from 'react';
import { guestStorage } from '../../utils/guestStorage';
import { app } from '@/api/localClient';
import { X, Trash2, Upload, Smile } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// v0.4.49 — The Instructions / Sources / Files / Memory tabs are gone.
// They were AI-era features (system prompt injection, RAG sources, knowledge
// files, persistent memory). Spaces are now a pure writing organisation
// concept — just an icon, a name, and a description. Existing saved data on
// older spaces (system_prompt, links, etc.) is preserved by passing it
// through unchanged on save, in case a future writing-flavoured version of
// the Space page wants to keep displaying it.

const EMOJIS = ['📁', '🚀', '💡', '🎯', '📝', '🧠', '💼', '🎨', '🔬', '📊', '🌟', '⚡'];

export default function SpaceModal({ initialSpace, onClose, onSave }) {
  const isEdit = !!initialSpace;
  const [form, setForm] = useState({
    name: initialSpace?.name || '',
    description: initialSpace?.description || '',
    emoji: initialSpace?.emoji || '📁',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiInput, setEmojiInput] = useState('');
  const fileInputRef = useRef(null);

  const handleUploadIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await app.integrations.Core.UploadFile({ file });
      set('emoji', file_url);
    } catch {}
    setUploading(false);
  };

  const isImageUrl = (val) => val && (val.startsWith('http') || val.startsWith('/'));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    let isAuthed = false;
    try { isAuthed = await app.auth.isAuthenticated(); } catch {}
    let result;
    if (isEdit) {
      // Pass through any legacy fields (system_prompt, links, etc.) so we
      // don't accidentally erase data when editing an older space.
      const merged = { ...initialSpace, ...form };
      if (isAuthed) await app.entities.ProjectSpace.update(initialSpace.id, merged);
      else guestStorage.updateSpace?.(initialSpace.id, merged);
      result = merged;
    } else {
      if (isAuthed) result = await app.entities.ProjectSpace.create(form);
      else result = guestStorage.createSpace?.(form) || form;
    }
    onSave(result);
    setSaving(false);
  };

  const handleDelete = () => setConfirmDelete(true);

  const doDelete = async () => {
    setConfirmDelete(false);
    let isAuthed = false;
    try { isAuthed = await app.auth.isAuthenticated(); } catch {}
    if (!isAuthed) guestStorage.deleteSpace?.(initialSpace.id);
    else await app.entities.ProjectSpace.delete(initialSpace.id);
    onSave({ deleted: true });
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this space? Canvases inside it won't be deleted, but they'll lose their space."
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
          confirmLabel="Delete"
        />
      )}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <h2 className="font-semibold text-sm">{isEdit ? 'Edit Space' : 'New Space'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-2 block">Icon</label>

                {/* Quick emoji grid */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => set('emoji', e)}
                      className={cn("text-xl w-9 h-9 rounded-lg flex items-center justify-center border transition-all",
                        form.emoji === e ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30')}>
                      {e}
                    </button>
                  ))}
                </div>

                {/* Custom emoji input + upload */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Smile className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={emojiInput}
                      onChange={e => { setEmojiInput(e.target.value); if (e.target.value) set('emoji', e.target.value); }}
                      placeholder="Type or paste any emoji…"
                      className="w-full text-sm bg-background border border-border rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadIcon} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-primary/40 bg-background text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>

                {isImageUrl(form.emoji) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={form.emoji} alt="icon" className="w-9 h-9 rounded-lg object-cover border border-border" />
                    <span className="text-xs text-muted-foreground">Custom image selected</span>
                    <button onClick={() => set('emoji', '📁')} className="text-xs text-destructive hover:underline ml-auto">Remove</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Space Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Hibrythian Saga, Music Drafts…"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="What is this space for?"
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-5 border-t border-border shrink-0">
            {isEdit && (
              <Button variant="destructive" onClick={handleDelete} className="mr-auto">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Space
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Space'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
