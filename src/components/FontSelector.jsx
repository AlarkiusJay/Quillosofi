import { useState, useEffect } from 'react';
import { app } from '@/api/localClient';
import { Type } from 'lucide-react';

const FONTS = [
  { id: 'inter', label: 'Inter', className: 'font-inter' },
  { id: 'poppins', label: 'Poppins', className: 'font-poppins' },
  { id: 'roboto', label: 'Roboto', className: 'font-roboto' },
  { id: 'playfair', label: 'Playfair Display', className: 'font-playfair' },
  { id: 'lora', label: 'Lora', className: 'font-lora' },
  { id: 'georgia', label: 'Georgia', className: 'font-georgia' },
  { id: 'fira', label: 'Fira Sans', className: 'font-fira' },
  { id: 'system', label: 'System Font', className: 'font-system' },
];

export default function FontSelector() {
  const [selectedFont, setSelectedFont] = useState('inter');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    app.auth.me().then(user => {
      if (user?.preferred_font) {
        setSelectedFont(user.preferred_font);
        document.documentElement.classList.remove(...FONTS.map(f => f.className));
        document.documentElement.classList.add(FONTS.find(f => f.id === user.preferred_font)?.className || 'font-inter');
      }
    });
  }, []);

  const handleFontChange = async (fontId) => {
    setSelectedFont(fontId);
    setLoading(true);
    await app.auth.updateMe({ preferred_font: fontId });
    const fontObj = FONTS.find(f => f.id === fontId);
    document.documentElement.classList.remove(...FONTS.map(f => f.className));
    document.documentElement.classList.add(fontObj.className);
    setLoading(false);
  };

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2 mb-2">
        <Type className="h-4 w-4 text-muted-foreground" />
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Font</label>
      </div>
      <select
        value={selectedFont}
        onChange={(e) => handleFontChange(e.target.value)}
        disabled={loading}
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 cursor-pointer"
      >
        {FONTS.map(font => (
          <option key={font.id} value={font.id}>{font.label}</option>
        ))}
      </select>
    </div>
  );
}