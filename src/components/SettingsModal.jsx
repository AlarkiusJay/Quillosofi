import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Brain, Trash2, Sparkles, Pin, PinOff, Pencil, Check, X, Bot, Sliders, Shield, User, Upload, Plus, Palette, RefreshCw, Key } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import BotCustomization from './settings/BotCustomization';
import AppUpdate from './settings/AppUpdate';
import BotPersona from './settings/BotPersona';
import ImportExport from './settings/ImportExport';
import DataSecurity from './settings/DataSecurity';
import ThemeCustomizer from './settings/ThemeCustomizer';
import UpgradeTab from './settings/UpgradeTab';
import ApiKeyTab from './settings/ApiKeyTab';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categoryColors = {
  personal: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  preference: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  context: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  interest: 'bg-green-500/10 text-green-400 border-green-500/20'
};

const categoryLabels = {
  personal: 'Personal',
  preference: 'Preference',
  context: 'Context',
  interest: 'Interest'
};

function MemoryRow({ memory, onDelete, onPin, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(memory.key);
  const [editValue, setEditValue] = useState(memory.value);
  const [editCategory, setEditCategory] = useState(memory.category);

  const handleSave = () => {
    onEdit(memory.id, { key: editKey, value: editValue, category: editCategory });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="space-y-2">
          <input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="Key"
          className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40" />
          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Value" rows={2}
          className="w-full text-sm bg-card border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 text-xs"><Check className="h-3 w-3 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs"><X className="h-3 w-3 mr-1" />Cancel</Button>
          </div>
        </div>
      </div>);

  }

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 group hover:bg-secondary/50 transition-colors border-b border-border last:border-0", memory.is_pinned && "bg-primary/5")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {memory.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
          <span className="text-xs font-medium truncate">{memory.key}</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0", categoryColors[memory.category] || 'bg-muted text-muted-foreground border-border')}>
            {categoryLabels[memory.category] || memory.category}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{memory.value}</p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={() => onPin(memory.id, !memory.is_pinned)} className="p-1 rounded transition-colors text-muted-foreground hover:text-primary">
          {memory.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button onClick={() => setEditing(true)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
        <button onClick={() => onDelete(memory.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>);

}

export default function SettingsModal({ onClose, initialTab = 'general', onDataUpdate, updateCount = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [memories, setMemories] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [addressEditing, setAddressEditing] = useState(false);
  const [configId, setConfigId] = useState(null);
  const [profilePicture, setProfilePicture] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [userBio, setUserBio] = useState('');
  const [socials, setSocials] = useState([]);
  const [aiDataRetention, setAiDataRetention] = useState(true);
  const [tempProfilePicture, setTempProfilePicture] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const isAuthed = await base44.auth.isAuthenticated();
        if (!isAuthed) {
          setIsLoading(false);
          return;
        }
        const [mems, me, configs] = await Promise.all([
        base44.entities.UserMemory.filter({}, '-updated_date', 100),
        base44.auth.me(),
        base44.entities.BotConfig.list('-created_date', 1)]
        );
        setMemories(mems);
        setUser(me);
        if (configs.length > 0) {
          setUserAddress(configs[0].user_address || '');
          setProfilePicture(configs[0].profile_picture || '');
          setUserBio(configs[0].user_bio || '');
          setSocials(configs[0].socials || []);
          setAiDataRetention(configs[0].ai_data_retention !== false);
          setConfigId(configs[0].id);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleAddressSave = async () => {
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { user_address: userAddress });
      } else {
        const created = await base44.entities.BotConfig.create({ user_address: userAddress });
        setConfigId(created.id);
      }
      setAddressEditing(false);
    } catch (error) {
      console.error('Error saving address:', error);
    }
  };

  const handleUploadPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTempProfilePicture(file_url);
    } catch (error) {
      console.error('Error uploading picture:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!tempProfilePicture) return;
    try {
      setProfilePicture(tempProfilePicture);
      if (configId) {
        await base44.entities.BotConfig.update(configId, { profile_picture: tempProfilePicture });
      } else {
        const created = await base44.entities.BotConfig.create({ profile_picture: tempProfilePicture });
        setConfigId(created.id);
      }
      setTempProfilePicture('');
      onDataUpdate?.();
    } catch (error) {
      console.error('Error saving picture:', error);
    }
  };

  const handleBioSave = async () => {
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { user_bio: userBio });
      } else {
        const created = await base44.entities.BotConfig.create({ user_bio: userBio });
        setConfigId(created.id);
      }
      onDataUpdate?.();
    } catch (error) {
      console.error('Error saving bio:', error);
    }
  };

  const handleAiDataRetentionChange = async (enabled) => {
    setAiDataRetention(enabled);
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { ai_data_retention: enabled });
      } else {
        const created = await base44.entities.BotConfig.create({ ai_data_retention: enabled });
        setConfigId(created.id);
      }
    } catch (error) {
      console.error('Error updating data retention:', error);
    }
  };

  const handleAddLink = async () => {
    if (socials.length >= 15) return;
    const updated = [...socials, { title: '', url: '' }];
    setSocials(updated);
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { socials: updated });
      } else {
        const created = await base44.entities.BotConfig.create({ socials: updated });
        setConfigId(created.id);
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleUpdateLink = async (idx, field, value) => {
    const updated = [...socials];
    updated[idx] = { ...updated[idx], [field]: value };
    setSocials(updated);
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { socials: updated });
      }
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const handleRemoveLink = async (idx) => {
    const updated = socials.filter((_, i) => i !== idx);
    setSocials(updated);
    try {
      if (configId) {
        await base44.entities.BotConfig.update(configId, { socials: updated });
      }
    } catch (error) {
      console.error('Error removing link:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.UserMemory.delete(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const handlePin = async (id, pinned) => {
    try {
      await base44.entities.UserMemory.update(id, { is_pinned: pinned });
      setMemories((prev) => {
        const updated = prev.map((m) => m.id === id ? { ...m, is_pinned: pinned } : m);
        return [...updated.filter((m) => m.is_pinned), ...updated.filter((m) => !m.is_pinned)];
      });
    } catch (error) {
      console.error('Error pinning memory:', error);
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await base44.entities.UserMemory.update(id, data);
      setMemories((prev) => prev.map((m) => m.id === id ? { ...m, ...data } : m));
    } catch (error) {
      console.error('Error editing memory:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      for (const m of memories) await base44.entities.UserMemory.delete(m.id);
      setMemories([]);
      setConfirmClear(false);
    } catch (error) {
      console.error('Error clearing memories:', error);
    }
  };

  const pinned = memories.filter((m) => m.is_pinned);
  const unpinned = memories.filter((m) => !m.is_pinned);

  if (isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[80vh] z-50 flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
        style={{ background: 'hsl(220, 8%, 18%)' }}>
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </>);

  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[800px] md:max-h-[80vh] z-50 flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden"
      style={{ background: 'hsl(220, 8%, 18%)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-xs md:text-sm overflow-hidden shrink-0">
              {tempProfilePicture ?
              <img src={tempProfilePicture} alt="Profile" className="w-full h-full object-cover" /> :
              profilePicture ?
              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" /> :

              user?.full_name?.charAt(0) || '?'
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs md:text-sm truncate">
                {userAddress || user?.full_name || 'Settings'}
              </p>
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="text-[10px] md:text-xs text-muted-foreground font-mono truncate hover:text-foreground transition-colors cursor-pointer"
                title="Click to toggle email visibility">
                
                {showEmail ? user?.email : '••••••••••••••••'}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1 md:p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 md:gap-1 p-1 md:p-1.5 mx-2 md:mx-4 mt-2 md:mt-4 mb-2 md:mb-3 bg-secondary rounded-xl shrink-0 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,30%)] [&::-webkit-scrollbar-thumb]:rounded-full">
          {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'general', label: 'General', icon: Sliders },
          { id: 'customize', label: 'Customize', icon: Palette },
          { id: 'data', label: 'Data & Security', icon: Shield },
          { id: 'upgrade', label: '⚡ Upgrade', icon: Sparkles },
          { id: 'api', label: 'API', icon: Key },
          { id: 'update', label: 'Update', icon: RefreshCw, badge: updateCount > 0 }].
          map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 md:gap-2 py-1.5 md:py-1.5 px-1 md:px-3 rounded-lg text-[8px] md:text-xs font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                
                <span className="relative">
                  <IconComponent className="h-3.5 w-3.5 shrink-0" />
                  {tab.badge && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400" />}
                </span>
                <span className="text-[8px] md:text-xs leading-tight">{tab.label}</span>
              </button>);

          })}
        </div>

        {/* Content - Cozy mobile scrolling */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-3 md:pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,35%)] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[hsl(220,7%,45%)]">
          {activeTab === 'profile' &&
          <div className="py-3 md:py-4 space-y-3 md:space-y-4">
              <div className="bg-card rounded-xl border border-border p-4 md:p-5 space-y-4 md:space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-3 block">Profile Picture</label>
                  <div className="flex items-end gap-3 md:gap-4">
                    <div className="h-16 md:h-20 w-16 md:w-20 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl md:text-2xl font-bold text-white overflow-hidden shrink-0">
                      {tempProfilePicture ?
                    <img src={tempProfilePicture} alt="Profile" className="w-full h-full object-cover" /> :
                    profilePicture ?
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" /> :

                    user?.full_name?.charAt(0) || '?'
                    }
                    </div>
                    <div className="flex-1">
                      <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleUploadPicture} />
                    
                      <div className="flex-1 space-y-2">
                        <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-border bg-background hover:border-primary/40 text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                        
                          <Upload className="h-3.5 md:h-4 w-3.5 md:w-4" />
                          {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        {tempProfilePicture &&
                      <button
                        onClick={handleSaveProfilePicture}
                        className="w-full px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">
                        
                            Save Picture
                          </button>
                      }
                        <p className="text-[10px] md:text-xs text-muted-foreground">PNG or JPG, max 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-3 md:pt-4 space-y-3 md:space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">Address me as</label>
                    <div className="flex gap-2">
                      <input
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddressSave()}
                      placeholder="e.g. my first name, boss, chief..."
                      className="flex-1 text-xs md:text-sm bg-background border border-border rounded-lg px-3 py-1.5 md:py-2 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                    
                      <button onClick={handleAddressSave} className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">
                        <Check className="h-3.5 md:h-4 w-3.5 md:w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-2">How the bot should address you</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">What Quillosofi should Know about You</label>
                    <textarea
                    value={userBio}
                    onChange={(e) => setUserBio(e.target.value)}
                    onBlur={handleBioSave}
                    placeholder="Share your interests, profession, hobbies, goals..."
                    rows={3}
                    className="w-full text-xs md:text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
                  
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-2">This helps personalize your conversations</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Links</label>
                    <p className="text-[10px] md:text-xs text-muted-foreground mb-3">Add your social media links!</p>

                    <div className="space-y-2">
                      {socials.map((link, idx) =>
                    <div key={idx} className="flex items-center gap-2 bg-secondary/50 rounded-lg border border-border p-2 md:p-3">
                          <button className="text-muted-foreground hover:text-foreground cursor-grab shrink-0" title="Drag to reorder">
                            <svg className="h-4 md:h-5 w-4 md:w-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm6-8a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input
                          type="text"
                          value={link.title || ''}
                          onChange={(e) => handleUpdateLink(idx, 'title', e.target.value)}
                          placeholder="Title"
                          className="text-[10px] md:text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        
                            <input
                          type="text"
                          value={link.url || ''}
                          onChange={(e) => handleUpdateLink(idx, 'url', e.target.value)}
                          placeholder="URL"
                          className="text-[10px] md:text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        
                          </div>
                          <button
                        onClick={() => handleRemoveLink(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                        
                            <Trash2 className="h-3.5 md:h-4 w-3.5 md:w-4" />
                          </button>
                        </div>
                    )}
                    </div>

                    {socials.length === 0 ?
                  <p className="text-[10px] md:text-xs text-muted-foreground text-center py-4 md:py-6">No links added yet</p> :
                  null}

                    <button
                    onClick={handleAddLink}
                    disabled={socials.length >= 15}
                    className="text-[10px] md:text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-3 disabled:opacity-50 flex items-center gap-1">
                    
                      <Plus className="h-3 md:h-3.5 w-3 md:w-3.5" /> Add link
                    </button>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-2">{socials.length}/15 links</p>
                  </div>
                </div>
              </div>
            </div>
          }

          {activeTab === 'general' &&
          <div className="py-3 md:py-4 space-y-3 md:space-y-4">
              <BotCustomization />

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-2">
                <Sparkles className="h-3.5 md:h-4 w-3.5 md:w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Say <span className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px]">"remember this"</span> in chat to save anything.
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-3 md:px-4 py-2 md:py-3 border-b border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Brain className="h-3.5 md:h-4 w-3.5 md:w-4 text-primary shrink-0" />
                    <span className="text-xs md:text-sm font-medium truncate">Memory</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">({memories.length})</span>
                  </div>
                  {memories.length > 0 && (confirmClear ?
                <div className="flex items-center gap-1">
                      <span className="text-[10px] md:text-xs text-muted-foreground">Sure?</span>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} className="h-5 md:h-6 text-[9px] md:text-xs px-1.5 md:px-2">No</Button>
                      <Button variant="destructive" size="sm" onClick={handleClearAll} className="h-5 md:h-6 text-[9px] md:text-xs px-1.5 md:px-2">Yes</Button>
                    </div> :

                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} className="text-destructive text-[9px] md:text-xs h-5 md:h-6">Clear</Button>)
                }
                </div>

                {memories.length === 0 ?
              <div className="p-4 md:p-8 text-center">
                    <Sparkles className="h-5 md:h-6 w-5 md:w-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs md:text-sm text-muted-foreground">No memories yet</p>
                  </div> :

              <div>
                    {pinned.length > 0 &&
                <>
                        <div className="px-3 md:px-4 py-1 md:py-1.5 bg-primary/5 border-b border-border">
                          <p className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-primary/70">📌 Pinned</p>
                        </div>
                        {pinned.map((m) => <MemoryRow key={m.id} memory={m} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />)}
                      </>
                }
                    {unpinned.map((m) => <MemoryRow key={m.id} memory={m} onDelete={handleDelete} onPin={handlePin} onEdit={handleEdit} />)}
                  </div>
              }
              </div>
            </div>
          }

          {activeTab === 'customize' &&
          <div className="py-3 md:py-4 space-y-6">
              <ThemeCustomizer />
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Bot Persona</p>
                <BotPersona />
              </div>
            </div>
          }

          {activeTab === 'data' &&
          <div className="py-3 md:py-4 space-y-3 md:space-y-5">
              <div className="bg-card rounded-xl border border-border p-4 md:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs md:text-sm text-foreground">AI Data Retention</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1.5 leading-relaxed">AI Data Retention allows Quillosofi to train your data for AI Models to improve. Disable this if you don't want it to train off your data.</p>
                  </div>
                  <Switch checked={aiDataRetention} onCheckedChange={handleAiDataRetentionChange} className="mt-0.5 shrink-0" />
                </div>
              </div>
              <DataSecurity />
              <div className="border-t border-border pt-3 md:pt-5" />
              <ImportExport />
            </div>
          }

          {activeTab === 'upgrade' && <UpgradeTab />}
          {activeTab === 'api' &&
            <div className="py-3 md:py-4">
              <div className="bg-card rounded-xl border border-border p-4 md:p-5">
                <ApiKeyTab />
              </div>
            </div>
          }
          {activeTab === 'update' && <AppUpdate updateCount={updateCount} />}
        </div>
      </div>
    </>);

}