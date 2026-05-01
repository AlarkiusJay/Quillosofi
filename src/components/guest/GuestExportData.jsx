import { app } from '@/api/localClient';

export async function exportAllGuestData() {
  const [conversations, spaces, memories, botConfigs] = await Promise.all([
    app.entities.Conversation.filter({ is_archived: false }, '-created_date', 500),
    app.entities.ProjectSpace.list('-created_date', 100),
    app.entities.UserMemory.filter({}, '-updated_date', 200),
    app.entities.BotConfig.list('-created_date', 1),
  ]);

  // Fetch all messages for each conversation
  const convoWithMessages = await Promise.all(
    conversations.map(async (c) => {
      const messages = await app.entities.Message.filter({ conversation_id: c.id }, 'created_date', 500);
      return { ...c, messages };
    })
  );

  const exportData = {
    exported_at: new Date().toISOString(),
    bot_config: botConfigs[0] || {},
    memories,
    spaces,
    conversations: convoWithMessages,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zetrylgpt-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}