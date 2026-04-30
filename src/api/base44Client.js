import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import {
  IS_DESKTOP,
  localEntities,
  localAuth,
  localIntegrations,
  localFunctions,
} from '@/lib/desktop';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Real Base44 client (used on the web build).
const remoteClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

// Desktop client — fully local, no network round-trips.
// Mirrors the shape of the SDK so call sites don't have to branch.
const desktopClient = {
  entities: localEntities,
  auth: localAuth,
  integrations: localIntegrations,
  functions: localFunctions,
};

export const base44 = IS_DESKTOP ? desktopClient : remoteClient;
