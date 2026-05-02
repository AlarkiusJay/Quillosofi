import { useEffect, useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { loadTodos, saveTodos } from '../widgets';

export default function TodoWidget() {
  const [todos, setTodos] = useState(loadTodos);
  const [draft, setDraft] = useState('');

  useEffect(() => { saveTodos(todos); }, [todos]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [{ id: Date.now().toString(36), text, done: false }, ...prev]);
    setDraft('');
  };

  const toggle = (id) =>
    setTodos((prev) => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const remove = (id) =>
    setTodos((prev) => prev.filter(t => t.id !== id));

  const remaining = todos.filter(t => !t.done).length;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task..."
          className="flex-1 bg-ink-soft border border-ink-faint rounded-lg px-2.5 py-1.5 text-xs ink-text placeholder:text-[hsl(var(--sticky-ink)/0.45)] focus:outline-none focus:border-[hsl(var(--sticky-ink)/0.4)]"
        />
        <button onClick={add} className="h-7 w-7 rounded-lg bg-[hsl(var(--sticky-ink))] text-[hsl(var(--paper))] flex items-center justify-center hover:opacity-90 transition-opacity">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-1 min-h-0">
        {todos.length === 0 ? (
          <p className="text-xs ink-muted text-center py-6">Nothing on the list yet.</p>
        ) : (
          todos.map(t => (
            <div key={t.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-ink-soft transition-colors">
              <button
                onClick={() => toggle(t.id)}
                className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${t.done ? 'bg-[hsl(var(--sticky-ink))] border-[hsl(var(--sticky-ink))]' : 'border-[hsl(var(--sticky-ink)/0.35)] hover:border-[hsl(var(--sticky-ink)/0.7)]'}`}
              >
                {t.done && <Check className="h-2.5 w-2.5" style={{ color: 'hsl(var(--paper))' }} />}
              </button>
              <span className={`flex-1 text-xs ${t.done ? 'line-through ink-faint' : 'ink-text'}`}>{t.text}</span>
              <button
                onClick={() => remove(t.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded ink-faint hover:text-[hsl(var(--chalk-red))] flex items-center justify-center"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] ink-muted mt-2 pt-2 border-t border-ink-faint">
        {remaining} remaining · {todos.length - remaining} done
      </p>
    </div>
  );
}
