import { app } from '@/api/localClient';

export async function exportAllGuestData() {
  const safeList = async (entityName, ...args) => {
    try {
      const ent = app.entities?.[entityName];
      if (!ent) return [];
      return (await ent.list(...args)) || [];
    } catch {
      return [];
    }
  };

  const [canvases, spreadsheets, spaces, spaceFiles, customWords] = await Promise.all([
    safeList('Canvas', '-updated_date', 1000),
    safeList('Spreadsheet', '-updated_date', 1000),
    safeList('ProjectSpace', '-updated_date', 500),
    safeList('SpaceFile', '-updated_date', 1000),
    safeList('CustomWord', '-updated_date', 5000),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    version: '2.0',
    app: 'quillosofi',
    canvases,
    spreadsheets,
    spaces,
    space_files: spaceFiles,
    custom_words: customWords,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quillosofi-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
