import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Upload, File, Image, FileText, X, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function getFileIcon(fileType) {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('text/') || fileType.includes('pdf')) return FileText;
  return File;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function LibraryPanel({ spaces, onUpload }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    const data = await app.entities.SpaceFile.list('-created_date', 100);
    setFiles(data);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || selectedSpace === 'all') return;
    setUploading(true);
    const { file_url } = await app.integrations.Core.UploadFile({ file });
    await app.entities.SpaceFile.create({
      space_id: selectedSpace,
      name: file.name,
      file_url,
      file_type: file.type,
      size: file.size,
    });
    await loadFiles();
    if (onUpload) onUpload();
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    await app.entities.SpaceFile.delete(id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const filtered = selectedSpace === 'all' ? files : files.filter(f => f.space_id === selectedSpace);

  // Group by space
  const grouped = spaces.reduce((acc, s) => {
    const spaceFiles = filtered.filter(f => f.space_id === s.id);
    if (spaceFiles.length > 0 || selectedSpace === s.id) acc.push({ space: s, files: spaceFiles });
    return acc;
  }, []);
  const unassigned = filtered.filter(f => !spaces.find(s => s.id === f.space_id));

  return (
    <div className="flex flex-col h-full">
      {/* Space filter */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedSpace('all')}
            className={cn(
              'text-[10px] px-2 py-1 rounded font-medium transition-colors',
              selectedSpace === 'all'
                ? 'bg-primary text-white'
                : 'bg-[hsl(228,7%,27%)] text-[hsl(220,7%,60%)] hover:text-white'
            )}
          >All</button>
          {spaces.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSpace(s.id)}
              className={cn(
                'text-[10px] px-2 py-1 rounded font-medium transition-colors',
                selectedSpace === s.id
                  ? 'bg-primary text-white'
                  : 'bg-[hsl(228,7%,27%)] text-[hsl(220,7%,60%)] hover:text-white'
              )}
            >{s.emoji} {s.name}</button>
          ))}
        </div>
      </div>

      {/* Upload button */}
      {selectedSpace !== 'all' && (
        <div className="px-3 pb-2">
          <label className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-colors text-xs font-medium',
            uploading
              ? 'border-primary/30 text-primary/50'
              : 'border-[hsl(225,9%,22%)] text-[hsl(220,7%,55%)] hover:border-primary/40 hover:text-primary'
          )}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading...' : 'Upload file'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[hsl(220,7%,45%)]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[hsl(220,7%,45%)] text-center py-8">No files yet</p>
        ) : (
          <>
            {grouped.map(({ space, files: sf }) => (
              <div key={space.id}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-1.5 flex items-center gap-1">
                  <span>{space.emoji}</span> {space.name}
                </p>
                <div className="space-y-1">
                  {sf.length === 0 && <p className="text-[11px] text-[hsl(220,7%,40%)] px-1">No files</p>}
                  {sf.map(f => <FileRow key={f.id} file={f} onDelete={handleDelete} />)}
                </div>
              </div>
            ))}
            {unassigned.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(220,7%,50%)] mb-1.5">Other</p>
                <div className="space-y-1">
                  {unassigned.map(f => <FileRow key={f.id} file={f} onDelete={handleDelete} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ file, onClose }) {
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const isImage = file.file_type?.startsWith('image/');
  const isPDF = file.file_type === 'application/pdf' || file.name?.endsWith('.pdf');
  const isText = file.file_type?.startsWith('text/') || /\.(txt|md|csv|json|js|ts|jsx|tsx|html|css|xml|yaml|yml)$/i.test(file.name);

  useEffect(() => {
    if (isText) {
      setLoading(true);
      fetch(file.file_url)
        .then(r => r.text())
        .then(t => { setTextContent(t); setLoading(false); })
        .catch(() => { setTextContent('Could not load file content.'); setLoading(false); });
    }
  }, [file.file_url, isText]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative bg-[hsl(220,8%,18%)] rounded-xl border border-[hsl(225,9%,15%)] shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(225,9%,15%)] shrink-0">
          <p className="text-sm font-medium text-white truncate flex-1 mr-2">{file.name}</p>
          <div className="flex items-center gap-1">
            <a href={file.file_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] text-[hsl(220,7%,55%)] hover:text-white transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-[hsl(228,7%,27%)] text-[hsl(220,7%,55%)] hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0">
          {isImage && (
            <img src={file.file_url} alt={file.name} className="max-w-full max-h-full rounded object-contain" />
          )}
          {isPDF && (
            <iframe src={file.file_url} title={file.name} className="w-full rounded" style={{ height: '60vh' }} />
          )}
          {isText && (
            loading
              ? <Loader2 className="h-5 w-5 animate-spin text-[hsl(220,7%,45%)]" />
              : <pre className="text-xs text-[hsl(220,7%,80%)] whitespace-pre-wrap font-mono w-full overflow-auto max-h-[60vh] bg-[hsl(220,8%,14%)] rounded p-3">{textContent}</pre>
          )}
          {!isImage && !isPDF && !isText && (
            <div className="text-center">
              <File className="h-12 w-12 text-[hsl(220,7%,40%)] mx-auto mb-3" />
              <p className="text-sm text-[hsl(220,7%,55%)] mb-3">Preview not available</p>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline">Open file ↗</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, onDelete }) {
  const [previewing, setPreviewing] = useState(false);
  const Icon = getFileIcon(file.file_type);
  const isImage = file.file_type?.startsWith('image/');

  return (
    <>
      <div className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[hsl(228,7%,24%)] transition-colors">
        <button onClick={() => setPreviewing(true)} className="shrink-0">
          {isImage ? (
            <img src={file.file_url} alt={file.name} className="h-7 w-7 rounded object-cover bg-[hsl(228,7%,27%)] hover:opacity-80 transition-opacity" />
          ) : (
            <div className="h-7 w-7 rounded bg-[hsl(228,7%,27%)] flex items-center justify-center hover:bg-[hsl(228,7%,32%)] transition-colors">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={() => setPreviewing(true)}
            className="text-xs text-[hsl(220,7%,75%)] hover:text-white truncate block leading-tight text-left w-full">
            {file.name}
          </button>
          <p className="text-[10px] text-[hsl(220,7%,40%)]">
            {formatSize(file.size)}{file.created_date ? ` · ${format(new Date(file.created_date), 'MMM d')}` : ''}
          </p>
        </div>
        <button onClick={() => onDelete(file.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 text-[hsl(220,7%,50%)] transition-all">
          <X className="h-3 w-3" />
        </button>
      </div>
      {previewing && <PreviewModal file={file} onClose={() => setPreviewing(false)} />}
    </>
  );
}