import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import {
  IS_DESKTOP,
  localEntities,
  localAuth,
  localFunctions,
} from '@/lib/desktop';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Real Base44 client (used on the web build, and on desktop for the
// integration endpoints we don't want to fake — InvokeLLM, GenerateImage,
// UploadFile, etc.).
const remoteClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

// Desktop client — hybrid.
//   entities  → localStorage (instant, offline, private)
//   auth      → synthetic local user (no login round-trip)
//   functions → local stubs (e.g. getAppVersion reads from preload)
//   integrations → REAL Base44 endpoints. Quillosofi's chat needs these:
//     * Core.InvokeLLM       — the LLM that powers chat
//     * Core.GenerateImage   — image generation
//     * Core.UploadFile      — file uploads
//     * Core.ExtractDataFromUploadedFile — file analysis
//   Routing the chat through the real endpoint is the same path the web
//   build uses, so chat speed on desktop = chat speed on web.
const desktopClient = {
  entities: localEntities,
  auth: localAuth,
  integrations: remoteClient.integrations,
  functions: {
    // Wrap functions so getAppVersion (and any future local-only function)
    // resolves locally, and everything else falls through to remote.
    invoke: async (name, data) => {
      const local = await localFunctions.invoke(name, data);
      if (local && local.data !== null && local.data !== undefined) return local;
      return remoteClient.functions.invoke(name, data);
    },
  },
};

export const base44 = IS_DESKTOP ? desktopClient : remoteClient;
