import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

const CONDITIONS = ['equals', 'not equals', 'greater than', 'less than', 'contains', 'is empty'];
const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

export default function ConditionalFormatPanel({ rules, onChange, onClose }) {
  const [rules_, setRules] = useState(rules || []);

  const update = (newRules) => { setRules(newRules); onChange(newRules); };

  const addRule = () => update([...rules_, { condition: 'greater than', value: '', color: '#22c55e', bg: '' }]);

  const updateRule = (i, field, val) => {
    const r = rules_.map((r, ri) => ri === i ? { ...r, [field]: val } : r);
    update(r);
  };

  const deleteRule = (i) => update(rules_.filter((_, ri) => ri !== i));

  return (
    <div className="absolute top-8 right-0 z-50 bg-[hsl(220,8%,15%)] border border-[hsl(225,9%,14%)] rounded-lg shadow-2xl w-80 p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-white">Conditional Formatting</p>
        <button onClick={onClose} className="text-[hsl(220,7%,50%)] hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {rules_.length === 0 && <p className="text-[10px] text-[hsl(220,7%,45%)] text-center py-2">No rules yet</p>}
        {rules_.map((rule, i) => (
          <div key={i} className="bg-[hsl(220,8%,20%)] rounded-lg p-2 space-y-1.5">
            <div className="flex items-center gap-1">
              <select
                value={rule.condition}
                onChange={e => updateRule(i, 'condition', e.target.value)}
                className="flex-1 bg-[hsl(228,8%,27%)] text-[10px] text-white rounded px-1.5 py-1 border border-[hsl(225,9%,20%)] focus:outline-none"
              >
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={() => deleteRule(i)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
            </div>
            {rule.condition !== 'is empty' && (
              <input
                value={rule.value}
                onChange={e => updateRule(i, 'value', e.target.value)}
                placeholder="Value..."
                className="w-full bg-[hsl(228,8%,27%)] text-[10px] text-white rounded px-1.5 py-1 border border-[hsl(225,9%,20%)] focus:outline-none"
              />
            )}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[hsl(220,7%,45%)]">Text:</span>
              <div className="flex gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateRule(i, 'color', c)}
                    className={`h-4 w-4 rounded-full border-2 ${rule.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" value={rule.color || '#ffffff'} onChange={e => updateRule(i, 'color', e.target.value)} className="h-4 w-4 rounded cursor-pointer" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[hsl(220,7%,45%)]">BG:</span>
              <div className="flex gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateRule(i, 'bg', c)}
                    className={`h-4 w-4 rounded-full border-2 ${rule.bg === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" value={rule.bg || '#000000'} onChange={e => updateRule(i, 'bg', e.target.value)} className="h-4 w-4 rounded cursor-pointer" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRule}
        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-[hsl(225,9%,25%)] text-[10px] text-[hsl(220,7%,50%)] hover:text-white hover:border-primary/40 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add Rule
      </button>
    </div>
  );
}