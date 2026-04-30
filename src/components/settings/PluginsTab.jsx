import { useState } from 'react';
import { Plug, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

const AVAILABLE_CONNECTORS = [
  { id: 'notion', name: 'Notion', icon: '📋', description: 'Connect to your Notion workspace' },
  { id: 'googledrive', name: 'Google Drive', icon: '☁️', description: 'Access files from Google Drive' },
  { id: 'gmail', name: 'Gmail', icon: '📧', description: 'Integrate with your Gmail account' },
  { id: 'googlecalendar', name: 'Google Calendar', icon: '📅', description: 'Sync with your calendar' },
  { id: 'slack', name: 'Slack', icon: '💬', description: 'Connect to your Slack workspace' },
  { id: 'github', name: 'GitHub', icon: '🐙', description: 'Access your GitHub repositories' },
  { id: 'airtable', name: 'Airtable', icon: '📊', description: 'Connect to Airtable bases' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', description: 'Access files from Dropbox' },
  { id: 'microsoft_teams', name: 'Microsoft Teams', icon: '👥', description: 'Connect to Microsoft Teams' },
  { id: 'sharepoint', name: 'SharePoint', icon: '📄', description: 'Access SharePoint documents' },
  { id: 'onedrive', name: 'OneDrive', icon: '💾', description: 'Connect to OneDrive storage' },
  { id: 'hubspot', name: 'HubSpot', icon: '📈', description: 'Integrate with HubSpot CRM' },
  { id: 'salesforce', name: 'Salesforce', icon: '🎯', description: 'Connect to Salesforce' },
  { id: 'linear', name: 'Linear', icon: '✓', description: 'Integrate with Linear issues' },
  { id: 'clickup', name: 'ClickUp', icon: '✅', description: 'Connect to ClickUp tasks' },
  { id: 'wrike', name: 'Wrike', icon: '📑', description: 'Manage Wrike projects' },
  { id: 'discord', name: 'Discord', icon: '🎮', description: 'Connect to Discord servers' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Access your LinkedIn profile' },
];

export default function PluginsTab() {
  const [connectedPlugins, setConnectedPlugins] = useState({});

  const handleConnect = (pluginId) => {
    // Placeholder for actual OAuth flow
    setConnectedPlugins(prev => ({
      ...prev,
      [pluginId]: !prev[pluginId]
    }));
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 mb-6 flex items-start gap-3">
        <Plug className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h2 className="font-medium text-sm mb-1">Plugins & Integrations</h2>
          <p className="text-xs text-muted-foreground">
            Connect external services and apps to extend Nexal's capabilities. Connect your favorite tools to unlock new possibilities.
          </p>
        </div>
      </div>

      {/* Plugins List */}
      <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-1">
        {AVAILABLE_CONNECTORS.map(plugin => {
          const isConnected = connectedPlugins[plugin.id];
          return (
            <div
              key={plugin.id}
              className={cn(
                "rounded-xl border p-4 transition-all duration-200",
                isConnected
                  ? "border-primary/30 bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-secondary/40 hover:shadow-md hover:shadow-primary/5"
              )}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-xl sm:text-2xl shrink-0">{plugin.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{plugin.name}</h3>
                    <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{plugin.description}</p>
                  </div>
                </div>
                {isConnected && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                )}
              </div>

              <button
                onClick={() => handleConnect(plugin.id)}
                className={cn(
                  "w-full text-xs sm:text-sm px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
                  isConnected
                    ? "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20"
                    : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                )}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Connected
                  </>
                ) : (
                  <>
                    <Plug className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Connect
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 sm:p-5 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Coming Soon</p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Full OAuth integration and plugin management features are currently in development. Connect buttons are placeholders for the upcoming release.
          </p>
        </div>
      </div>
    </div>
  );
}