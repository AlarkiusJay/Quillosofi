import { useState, useRef, useEffect } from 'react';
import CommandPicker from './CommandPicker';
import { MoreVertical } from 'lucide-react';
import { Send, Loader2, Smile } from 'lucide-react';
import { cn } from "@/lib/utils";
import FormattingToolbar from './FormattingToolbar';
import EmojiPicker from '../EmojiPicker';
import ConfirmDialog from './ConfirmDialog';

export default function ChatInput({ onSend, isLoading, placeholder, quotedText, onQuotedTextConsumed }) {
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [rainbowActive, setRainbowActive] = useState(false);
  const rainbowTimerRef = useRef(null);
  const textareaRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  useEffect(() => {
    if (quotedText) {
      setInput(quotedText);
      onQuotedTextConsumed?.();
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const len = quotedText.length;
        textareaRef.current?.setSelectionRange(len, len);
      });
    }
  }, [quotedText]);

  useEffect(() => {
    if (input.toLowerCase().includes('r a i n b o w')) {
      setInput(input.toLowerCase().replace('r a i n b o w', '').trim());
      setRainbowActive(true);
      clearTimeout(rainbowTimerRef.current);
      rainbowTimerRef.current = setTimeout(() => setRainbowActive(false), 180000);
    }
  }, [input]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const MAX_CHARS = 4000;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (input.length > MAX_CHARS) return;
    let message = input.trim();
    if (message === '/tableflip') {
      const FLIP_EMOJIS = [
        '┻━┻ ︵ (╯°□°)╯︵',
        '┻━┻ ︵ (╯ಠ_ಠ)╯︵',
        '┻━┻ ︵ (╯°益°)╯︵',
        '┻━┻ ︵ (ノಥ益ಥ)ノ︵',
        '┻━┻ ︵ (┛◉Д◉)┛︵',
        '┻━┻︵ (╯°□°)╯︵ 💥',
        '┻━┻︵ ┻━┻︵ (╯°□°)╯︵',
        '┻━┻ ︵ヽ(`Д´)ﾉ︵',
        '┻━┻ ︵ヽ(ಠ_ಠ)ﾉ︵',
        '┻━┻ ︵ヽ(°□°ヽ)',
        '┻━┻ ︵＼(`0´)／︵',
        '┻━┻ ︵ヽ(ಠ益ಠ)ﾉ︵ ┻━┻',
        '┻━┻︵ (ノಠ益ಠ)ノ︵',
        '┻━┻ ︵ヽ(ಥ益ಥ)ﾉ︵',
        '┻━┻ ︵ (╯ರ益ರ)╯︵',
        '┻━┻ ︵ (╯ರ~ರ)╯︵',
        '┻━┻ ︵ (╯°Д°)╯︵',
        '┻━┻ ︵ (╯｀□´)╯︵',
        '┻━┻ ︵ (╯°ロ°)╯︵',
        '┻━┻ ︵ (╯>_<)╯︵',
        '┻━┻ ︵ (╯ಠ益ಠ)╯︵',
        '┻━┻ ︵ (╯ಥ_ಥ)╯︵',
        '┻━┻ ︵ (ノ°益°)ノ︵',
        '┻━┻ ︵ (ノ｀Д´)ノ︵',
        '┻━┻ ︵ (ﾉ≧∇≦)ﾉ︵',
        '┻━┻ ︵ (┛ಠДಠ)┛︵',
        '┻━┻ ︵ (┛ಸ_ಸ)┛︵',
        '┻━┻ ︵ (╯•̀ㅂ•́)╯︵',
        '┻━┻ ︵ (╯ರ□ರ)╯︵',
        '┻━┻ ︵ (╯✧益✧)╯︵',
        '┻━┻ ︵ (╯ಠ皿ಠ)╯︵',
        '┻━┻ ︵ (╯`□´)╯︵',
        '(╯°□°)╯︵ ┻━┻',
        '(╯ಠ_ಠ)╯︵ ┻━┻',
        '(╯°益°)╯︵ ┻━┻',
        '(ノಥ益ಥ)ノ︵ ┻━┻',
        '(┛◉Д◉)┛︵ ┻━┻',
        '(╯°Д°)╯︵ ┻━┻',
        '(╯｀□´)╯︵ ┻━┻',
        '(╯°ロ°)╯︵ ┻━┻',
        '(╯>_<)╯︵ ┻━┻',
        '(╯ಠ益ಠ)╯︵ ┻━┻',
        '(╯ಥ_ಥ)╯︵ ┻━┻',
        '(ノ°益°)ノ︵ ┻━┻',
        '(ノ｀Д´)ノ︵ ┻━┻',
        '(ﾉ≧∇≦)ﾉ︵ ┻━┻',
        '(┛ಠДಠ)┛︵ ┻━┻',
        '(╯•̀ㅂ•́)╯︵ ┻━┻',
        '(╯✧益✧)╯︵ ┻━┻',
        '(╯ಠ皿ಠ)╯︵ ┻━┻'
      ];
      message = FLIP_EMOJIS[Math.floor(Math.random() * FLIP_EMOJIS.length)];
    }
    if (message === '/untableflip') {
      const RESTORE_EMOJIS = [
        'ヽ( ゜-゜ノ)︵ ┬─┬',
        'ヽ(・_・ノ)︵ ┬─┬',
        'ヽ(ಠ_ಠノ)︵ ┬─┬',
        'ヽ(￣ー￣ノ)︵ ┬─┬',
        'ヽ(ಥ﹏ಥノ)︵ ┬─┬',
        '︵ヽ(・_・ノ) ┬─┬',
        '︵ヽ( º _ ºノ) ┬─┬',
        '︵ ┬─┬ ヽ(°□°ヽ)',
        '︵ ┬─┬ ヽ(ಠ_ಠヽ)',
        '︵ ┬─┬ ヽ(ಥ﹏ಥヽ)',
        '︵ ┬─┬ ヽ(ಠ益ಠ)ノ',
        'ヽ( ゜-゜ノ) ┬─┬',
        'ヽ(ಠ_ಠノ) ┬─┬',
        'ヽ(・_・ヽ) ┬─┬',
        '︵ヽ(ಠ_ಠノ) ┬─┬',
        'ヽ(°‿°ノ)︵ ┬─┬',
        'ヽ(•‿•ノ)︵ ┬─┬',
        'ヽ(￣ω￣ノ)︵ ┬─┬',
        'ヽ(⌒‿⌒ノ)︵ ┬─┬',
        'ヽ(ಠ‿ಠノ)︵ ┬─┬',
        '︵ヽ(•‿•)ノ ┬─┬',
        '︵ヽ(⌒_⌒)ノ ┬─┬',
        '︵ ┬─┬ ヽ(•̀‿•́ヽ)',
        '︵ ┬─┬ ヽ(￣ヘ￣ヽ)',
        '︵ ┬─┬ ヽ(ಠ‿ಠヽ)',
        'ヽ(°ロ°ノ)︵ ┬─┬',
        'ヽ(≧◡≦ノ)︵ ┬─┬',
        '︵ヽ(°□°)ノ ┬─┬',
        'ヽ(•̀ㅂ•́ノ)︵ ┬─┬',
        '︵ヽ(￣▽￣)ノ ┬─┬',
        '┬─┬ ノ( ゜-゜ノ)',
        '┬─┬ ノ(・_・ノ)',
        '┬─┬ ノ(ಠ_ಠノ)',
        '┬─┬ ノ(￣ー￣ノ)',
        '┬─┬ ノ(ಥ﹏ಥノ)',
        '┬─┬ ノ(°‿°ノ)',
        '┬─┬ ノ(•‿•ノ)',
        '┬─┬ ノ(⌒‿⌒ノ)',
        '┬─┬ ノ(ಠ‿ಠノ)',
        '┬─┬ ノ(•̀‿•́ノ)',
        '┬─┬ ノ(￣ヘ￣ノ)',
        '┬─┬ ノ(°ロ°ノ)',
        '┬─┬ ノ(≧◡≦ノ)',
        '┬─┬ ノ(•̀ㅂ•́ノ)',
        '┬─┬ ノ(￣▽￣ノ)'
      ];
      message = RESTORE_EMOJIS[Math.floor(Math.random() * RESTORE_EMOJIS.length)];
    }
    onSend(message, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newInput = input.slice(0, start) + emoji + input.slice(end);
    setInput(newInput);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
      textarea.focus();
    }, 0);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, { name: file.name, data: reader.result, type: file.type }]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="rounded-lg overflow-hidden" style={{ background: 'hsl(228, 8%, 27%)' }}>
        {rainbowActive && (
          <div className="h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-[length:200%_auto] animate-rainbow-shift" />
        )}
        <FormattingToolbar textareaRef={textareaRef} value={input} onChange={setInput} />
        {attachments.length > 0 && (
          <div className="px-4 pt-2 pb-0 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group">
                {att.type.startsWith('image') ? (
                  <img src={att.data} alt={att.name} className="h-16 w-16 rounded object-cover border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded border border-border bg-secondary/50 flex items-center justify-center text-[10px] text-muted-foreground text-center p-1">
                    {att.name.substring(0, 10)}
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 px-4 py-2.5 relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="shrink-0 h-8 w-8 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-primary hover:bg-secondary transition-all duration-200"
            title="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute bottom-12 left-0 bg-[hsl(220,8%,18%)] border border-[hsl(225,9%,14%)] rounded-lg shadow-lg z-50"
            >
              <button
                onClick={() => {
                  setShowUploadConfirm(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-[hsl(220,7%,65%)] hover:text-white hover:bg-[hsl(228,7%,27%)] transition-colors"
              >
                Upload file
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              setInput(val);
              if (val.startsWith('/')) {
                setCommandQuery(val);
                setShowCommands(true);
              } else {
                setShowCommands(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Message Quillosofi (supports tab commands \"/\")..."}
            rows={1}
            maxLength={4000}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed text-white placeholder:text-[hsl(220,7%,45%)] focus:outline-none py-1 max-h-40"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(true)}
            className="shrink-0 h-8 w-8 rounded flex items-center justify-center text-[hsl(220,7%,55%)] hover:text-primary hover:bg-secondary transition-all duration-200"
            title="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || input.length > 4000}
            className={cn(
              "shrink-0 h-8 w-8 rounded flex items-center justify-center transition-all duration-200",
              input.trim() && !isLoading && input.length <= 4000
                ? "bg-primary text-white hover:bg-primary/90"
                : "text-[hsl(220,7%,40%)] cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {input.length > 3500 && (
          <p className={`text-[10px] text-right pr-1 mt-0.5 ${input.length > 4000 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {input.length}/4000
          </p>
        )}
      </div>
      {showCommands && (
        <CommandPicker
          query={commandQuery}
          onSelect={(cmd) => {
            setInput(cmd + ' ');
            setShowCommands(false);
            textareaRef.current?.focus();
          }}
          onClose={() => setShowCommands(false)}
        />
      )}
      {showEmojiPicker && (
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      {showUploadConfirm && (
        <ConfirmDialog
          message="Every file you upload will be uploaded to a specific chat!"
          onConfirm={() => { fileInputRef.current?.click(); setShowUploadConfirm(false); }}
          onCancel={() => setShowUploadConfirm(false)}
          confirmLabel="Upload File"
        />
      )}
    </form>
  );
}