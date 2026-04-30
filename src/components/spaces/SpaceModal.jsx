import { useState, useRef, useEffect } from 'react';
import { guestStorage } from '../../utils/guestStorage';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Link as LinkIcon, Brain, FileText, Settings, Upload, Smile, File } from 'lucide-react';
import ConfirmDialog from '../chat/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EMOJIS = ['📁', '🚀', '💡', '🎯', '📝', '🧠', '💼', '🎨', '🔬', '📊', '🌟', '⚡'];
const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'instructions', label: 'Instructions', icon: FileText },
  { id: 'sources', label: 'Sources', icon: LinkIcon },
  { id: 'files', label: 'Files', icon: File },
  { id: 'memory', label: 'Memory', icon: Brain },
];

export default function SpaceModal({ initialSpace, onClose, onSave }) {
  const isEdit = !!initialSpace;
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState({
    name: initialSpace?.name || '',
    description: initialSpace?.description || '',
    emoji: initialSpace?.emoji || '📁',
    system_prompt: initialSpace?.system_prompt || '',
    links: initialSpace?.links || [],
    space_memory: initialSpace?.space_memory || '',
    memory_enabled: initialSpace?.memory_enabled !== false,
  });
  const [spaceFiles, setSpaceFiles] = useState([]);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emojiInput, setEmojiInput] = useState('');
  const fileInputRef = useRef(null);
  const spaceFileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      base44.entities.SpaceFile.filter({ space_id: initialSpace.id }).then(setSpaceFiles);
    }
  }, [isEdit, initialSpace?.id]);

  const handleUploadIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('emoji', file_url);
    setUploading(false);
  };

  const isImageUrl = (val) => val && (val.startsWith('http') || val.startsWith('/'));

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addLink = () => {
    if (!newLink.url.trim()) return;
    const url = newLink.url.startsWith('http') ? newLink.url : 'https://' + newLink.url;
    set('links', [...form.links, { title: newLink.title || url, url }]);
    setNewLink({ title: '', url: '' });
  };

  const removeLink = (i) => set('links', form.links.filter((_, idx) => idx !== i));

  const handleUploadSpaceFile = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const spaceFile = await base44.entities.SpaceFile.create({
        space_id: initialSpace.id,
        name: file.name,
        file_url,
        file_type: file.type,
        size: file.size,
      });
      setSpaceFiles(prev => [...prev, spaceFile]);
      setUploading(false);
    }
    if (spaceFileInputRef.current) spaceFileInputRef.current.value = '';
  };

  const deleteSpaceFile = async (fileId) => {
    await base44.entities.SpaceFile.delete(fileId);
    setSpaceFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const isAuthed = await base44.auth.isAuthenticated();
    let result;
    if (isEdit) {
      if (isAuthed) await base44.entities.ProjectSpace.update(initialSpace.id, form);
      else guestStorage.updateSpace(initialSpace.id, form);
      result = { ...initialSpace, ...form };
    } else {
      if (isAuthed) result = await base44.entities.ProjectSpace.create(form);
      else result = guestStorage.createSpace(form);
    }
    onSave(result);
    setSaving(false);
  };

  const handleDelete = () => setConfirmDelete(true);

  const doDelete = async () => {
    setConfirmDelete(false);
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) {
      guestStorage.deleteSpace(initialSpace.id);
    } else {
      await base44.entities.ProjectSpace.delete(initialSpace.id);
    }
    onSave({ deleted: true });
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message="Delete this space? Conversations in it will move to Direct Messages."
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
          confirmLabel="Delete"
        />
      )}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <h2 className="font-semibold text-sm">{isEdit ? 'Edit Space' : 'New Project Space'}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                  tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto flex-1">
            {tab === 'general' && (
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
                    placeholder="e.g. Work Projects, Research..."
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Description</label>
                  <input value={form.description} onChange={e => set('description', e.target.value)}
                    placeholder="What is this space for?"
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>
              </div>
            )}

            {tab === 'instructions' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">These instructions are injected into every chat in this space, giving the AI a custom context or role.</p>
                <textarea value={form.system_prompt} onChange={e => set('system_prompt', e.target.value)}
                  placeholder="e.g. Always respond in the context of software engineering. Keep answers technical and precise."
                  rows={8}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
              </div>
            )}

            {tab === 'files' && (
             <div className="space-y-4">
               <p className="text-xs text-muted-foreground">Upload files to share with all chats in this space.</p>
               {isEdit ? (
                 <>
                   <input ref={spaceFileInputRef} type="file" multiple onChange={handleUploadSpaceFile} className="hidden" />
                   <Button size="sm" onClick={() => spaceFileInputRef.current?.click()} disabled={uploading || !isEdit}>
                     <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? 'Uploading...' : 'Upload Files'}
                   </Button>
                   {spaceFiles.length === 0 ? (
                     <p className="text-xs text-muted-foreground text-center py-6">No files uploaded yet.</p>
                   ) : (
                     <div className="space-y-2">
                       {spaceFiles.map(f => (
                         <div key={f.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border">
                           <File className="h-4 w-4 text-muted-foreground shrink-0" />
                           <div className="flex-1 min-w-0">
                             <p className="text-xs font-medium truncate">{f.name}</p>
                             <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                           </div>
                           <button onClick={() => deleteSpaceFile(f.id)} className="p-1 rounded hover:text-destructive transition-colors">
                             <Trash2 className="h-3.5 w-3.5" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </>
               ) : (
                 <p className="text-xs text-muted-foreground text-center py-6">Save the space first to upload files.</p>
               )}
             </div>
            )}

            {tab === 'sources' && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Add reference links and sources. These will be listed in the space for quick access.</p>
                <div className="space-y-2">
                  <input value={newLink.title} onChange={e => setNewLink(l => ({ ...l, title: e.target.value }))}
                    placeholder="Title (optional)"
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                  <div className="flex gap-2">
                    <input value={newLink.url} onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
                      placeholder="https://..."
                      onKeyDown={e => e.key === 'Enter' && addLink()}
                      className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    <Button size="sm" onClick={addLink} disabled={!newLink.url.trim()}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
                {form.links.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No sources added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.links.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
                        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{link.title}</p>
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline truncate block">{link.url}</a>
                        </div>
                        <button onClick={() => removeLink(i)} className="p-1 rounded hover:text-destructive transition-colors shrink-0">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'memory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Space Memory</p>
                    <p className="text-xs text-muted-foreground">Inject space-specific context into every chat.</p>
                  </div>
                  <button
                    onClick={() => set('memory_enabled', !form.memory_enabled)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors shrink-0",
                      form.memory_enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      form.memory_enabled ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
                <div className={cn("transition-opacity", !form.memory_enabled && "opacity-40 pointer-events-none")}>
                  <p className="text-xs text-muted-foreground mb-2">Write any persistent context, facts, or notes that should always be available in chats within this space.</p>
                  <textarea value={form.space_memory} onChange={e => set('space_memory', e.target.value)}
                    placeholder="e.g. This space is for my startup Acme Corp. Tech stack: React, Node.js, PostgreSQL. Team size: 5 engineers."
                    rows={7}
                    className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
                </div>
              </div>
            )}
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