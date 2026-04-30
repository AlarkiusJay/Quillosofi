import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, Sparkles, User, Edit2, RefreshCw, GitBranch } from 'lucide-react';
import MessageSpreadsheet from './MessageSpreadsheet';
import SpreadsheetPreview from './SpreadsheetPreview';
import useTypewriter from '../../hooks/useTypewriter';
import { useState } from 'react';
import { cn } from "@/lib/utils";
import MessageCanvas from './MessageCanvas';
import { format } from 'date-fns';

const markdownComponents = ({ isUser }) => ({
  code: ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <pre className={`rounded p-3 overflow-x-auto my-2 text-xs font-mono ${isUser ? 'bg-white/10' : 'bg-[hsl(220,8%,14%)] border border-[hsl(225,9%,12%)]'}`}>
        <code className={className} {...props}>{children}</code>
      </pre>
    ) : (
      <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isUser ? 'bg-white/20 text-white' : 'bg-[hsl(220,8%,14%)] text-[hsl(235,80%,80%)]'}`}>{children}</code>
    );
  },
  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className={`border-l-4 pl-3 my-2 italic ${isUser ? 'border-white/40 text-white/80' : 'border-[hsl(235,86%,65%)] text-[hsl(220,7%,60%)]'}`}>{children}</blockquote>
  ),
  a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className={`hover:underline ${isUser ? 'text-white underline' : 'text-[hsl(235,86%,75%)]'}`}>{children}</a>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  hr: () => <hr className={`my-3 border-0 h-px ${isUser ? 'bg-white/20' : 'bg-[hsl(225,9%,20%)]'}`} />,
  h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
  table: ({ children }) => <div className="overflow-x-auto my-2"><table className={`text-xs border-collapse w-full ${isUser ? 'border-white/20' : 'border-[hsl(225,9%,20%)]'}`}>{children}</table></div>,
  th: ({ children }) => <th className={`border px-2 py-1 font-semibold text-left ${isUser ? 'border-white/20 bg-white/10' : 'border-[hsl(225,9%,20%)] bg-[hsl(220,8%,14%)]'}`}>{children}</th>,
  td: ({ children }) => <td className={`border px-2 py-1 ${isUser ? 'border-white/20' : 'border-[hsl(225,9%,20%)]'}`}>{children}</td>,
});

export default function ChatMessage({ message, userName, onEdit, onRegenerate, onBranch, isNew, autoOpenCanvas, onCanvasSaved, onSpreadsheetSaved }) {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [canvasOpen, setCanvasOpen] = useState(!!autoOpenCanvas || message.content === '/canvas');
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(message.content === '/spreadsheet');
  const [spreadsheetData, setSpreadsheetData] = useState(null);
  const isUser = message.role === 'user';
  const { displayed } = useTypewriter(!isUser && isNew ? message.content : null);
  const renderedContent = !isUser && isNew ? displayed : message.content;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    if (editText === message.content) { setEditMode(false); return; }
    await onEdit(message.id, editText);
    setEditMode(false);
  };

  const timestamp = message.created_date ? format(new Date(message.created_date), 'h:mm aa') : '';
  const displayName = isUser ? (userName || 'You') : 'Quillosofi';

  // ── USER MESSAGE ──────────────────────────────────────────────────
  if (isUser) {
    if (editMode) {
      return (
        <div className="flex items-end justify-end gap-3 px-4 py-1">
          <div className="flex flex-col items-end max-w-[75%] w-full">
            <div className="flex items-baseline gap-2 mb-1">
              {timestamp && <span className="text-[10px] text-[hsl(220,7%,40%)]">{timestamp}</span>}
              <span className="font-semibold text-sm text-[hsl(235,70%,80%)]">{displayName}</span>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-[hsl(228,8%,27%)] text-white text-sm leading-relaxed px-3 py-2 rounded-lg border border-primary/50 focus:outline-none focus:border-primary resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleEditSubmit} className="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary/90 transition-colors">Save</button>
              <button onClick={() => { setEditMode(false); setEditText(message.content); }} className="text-xs px-3 py-1 rounded bg-[hsl(225,9%,20%)] text-[hsl(220,7%,60%)] hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-[hsl(235,50%,50%)] flex items-center justify-center shrink-0 mb-0.5">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      );
    }

    return (
      <div className="group flex items-end justify-end gap-3 px-4 py-1">
        {/* Message bubble + buttons below + canvas */}
        <div className="flex flex-col items-end max-w-[75%] min-w-0 w-full" style={{ maxWidth: '75%' }}>
          <div className="flex items-baseline gap-2 mb-1">
            {timestamp && <span className="text-[10px] text-[hsl(220,7%,40%)]">{timestamp}</span>}
            <span className="font-semibold text-sm text-[hsl(235,70%,80%)]">{displayName}</span>
          </div>
          {message.content !== '/canvas' && message.content !== '/spreadsheet' && (
          <div className="bg-primary text-white text-sm leading-relaxed px-4 py-2.5 rounded-2xl rounded-br-sm">
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.attachments.map((att, idx) => (
                  <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded">
                    📎 {att.name}
                  </span>
                ))}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-invert"
              components={markdownComponents({ isUser: true })}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          )}

          {/* Action buttons — below bubble, right-aligned */}
          <div className="flex items-center gap-0.5 mt-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
            <button onClick={handleCopy} className="text-blue-400 hover:text-blue-300 p-1 rounded" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => setEditMode(true)} className="text-yellow-400 hover:text-yellow-300 p-1 rounded" title="Edit">
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {onBranch && (
              <button onClick={() => onBranch(message.id)} className="text-[hsl(220,7%,50%)] hover:text-white p-1 rounded" title="Branch">
                <GitBranch className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Canvas */}
          {canvasOpen && (
            <div className="w-full mt-1">
              <MessageCanvas message={message} onClose={() => setCanvasOpen(false)} onSave={onCanvasSaved} />
            </div>
          )}

          {/* Spreadsheet */}
          {message.content === '/spreadsheet' && !spreadsheetOpen && (
            <SpreadsheetPreview
              spreadsheet={{ title: 'Spreadsheet', num_rows: 20, num_cols: 10, data: '[]' }}
              onClick={() => setSpreadsheetOpen(true)}
            />
          )}
          {spreadsheetOpen && (
            <div className="w-full mt-1">
              <MessageSpreadsheet message={message} onClose={() => setSpreadsheetOpen(false)} onSave={onSpreadsheetSaved} />
            </div>
          )}
        </div>

        <div className="h-8 w-8 rounded-full bg-[hsl(235,50%,50%)] flex items-center justify-center shrink-0 mb-0.5">
          <User className="h-4 w-4 text-white" />
        </div>
      </div>
    );
  }

  // ── ZETRYL MESSAGE ────────────────────────────────────────────────
  return (
    <div className="group flex items-start gap-3 px-4 py-1 hover:bg-white/[0.02] rounded transition-colors animate-fade-in">
      <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-0.5 bg-[hsl(235,50%,30%)]">
        <img src="https://media.base44.com/images/public/69cec1d94563b236c10d8de7/cf53c7132_QuillosofiICO.svg" alt="Quillosofi" className="h-full w-full object-contain p-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm text-white">Quillosofi</span>
        </div>
        <div className="text-[hsl(220,7%,80%)] text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-invert"
            components={markdownComponents({ isUser: false })}
          >
            {renderedContent}
          </ReactMarkdown>
        </div>

        {/* Action buttons — below message, left-aligned */}
        <div className="flex items-center gap-0.5 mt-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
          <button onClick={handleCopy} className="text-blue-400 hover:text-blue-300 p-1 rounded" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onRegenerate && (
            <button onClick={() => onRegenerate(message.id)} className="text-red-400 hover:text-red-300 p-1 rounded" title="Regenerate">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {onBranch && (
            <button onClick={() => onBranch(message.id)} className="text-[hsl(220,7%,50%)] hover:text-white p-1 rounded" title="Branch">
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}