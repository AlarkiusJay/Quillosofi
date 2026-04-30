import { useState, useEffect } from 'react';
import { Palette, Moon, Sun } from 'lucide-react';
import { cn } from "@/lib/utils";

const themePresets = [
  {
    id: 'default-dark',
    name: 'Default Dark',
    description: 'Clean dark theme with neutral tones',
    colors: {
      background: '220 13% 24%',
      primary: '220 90% 56%',
      card: '220 13% 28%',
      secondary: '220 13% 32%',
      border: '220 13% 36%',
    }
  },
  {
    id: 'discord-dark',
    name: 'Discord Dark',
    description: 'Deep blue-gray with soft accents',
    colors: {
      background: '228 7% 20%',
      primary: '235 60% 55%',
      card: '220 8% 18%',
      secondary: '228 7% 23%',
      border: '225 9% 12%',
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Pure black with soft cyan',
    colors: {
      background: '0 0% 5%',
      primary: '180 60% 48%',
      card: '0 0% 10%',
      secondary: '0 0% 15%',
      border: '0 0% 20%',
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Dark with muted purple tones',
    colors: {
      background: '270 20% 15%',
      primary: '280 55% 52%',
      card: '270 20% 20%',
      secondary: '270 15% 25%',
      border: '270 10% 30%',
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Dark green with soft emerald',
    colors: {
      background: '150 30% 12%',
      primary: '150 50% 48%',
      card: '150 30% 18%',
      secondary: '150 25% 23%',
      border: '150 20% 28%',
    }
  },
];

export default function ThemeCustomizer() {
  const [activeTheme, setActiveTheme] = useState('discord-dark');
  const [customColors, setCustomColors] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('theme-preset');
    if (saved) setActiveTheme(saved);
  }, []);

  const applyTheme = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('theme-preset', themeId);
    
    const theme = themePresets.find(t => t.id === themeId);
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    }
  };

  const handleColorChange = (colorKey, value) => {
    const updated = { ...customColors, [colorKey]: value };
    setCustomColors(updated);
    
    const root = document.documentElement;
    root.style.setProperty(`--${colorKey}`, value);
    localStorage.setItem('theme-custom', JSON.stringify(updated));
  };

  const handleResetCustom = () => {
    setCustomColors({});
    localStorage.removeItem('theme-custom');
    applyTheme(activeTheme);
  };

  return (
    <div className="py-4 space-y-6">
      {/* Theme Presets */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Theme Presets</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyTheme(preset.id)}
              className={cn(
                "p-4 rounded-xl border transition-all text-left",
                activeTheme === preset.id
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:border-primary/30 bg-card"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", activeTheme === preset.id && "text-primary")}>
                    {preset.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <div className="flex gap-1">
                  {Object.values(preset.colors).slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded border border-white/10"
                      style={{ backgroundColor: `hsl(${color})` }}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Picker */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Custom Colors</h3>
          {Object.keys(customColors).length > 0 && (
            <button
              onClick={handleResetCustom}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {['background', 'primary', 'card', 'secondary', 'border'].map((colorKey) => (
            <div key={colorKey} className="flex items-center gap-3">
              <label className="text-xs font-medium capitalize w-20">{colorKey}</label>
              <input
                type="color"
                defaultValue="#000000"
                onChange={(e) => {
                  // Convert hex to HSL (simplified)
                  handleColorChange(colorKey, e.target.value);
                }}
                className="h-8 w-12 rounded cursor-pointer border border-border"
              />
              <span className="text-xs text-muted-foreground">
                {customColors[colorKey] || 'Default'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Info */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">💡 Theme Tips</p>
        <p className="text-xs text-muted-foreground">
          Theme changes are applied instantly and saved to your browser. Presets override custom colors.
        </p>
      </div>
    </div>
  );
}