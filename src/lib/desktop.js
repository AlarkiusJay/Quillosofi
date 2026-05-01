/*
 * Desktop runtime helpers for Quillosofi.
 *
 * v0.4.1: Quillosofi is now a fully local-only desktop app. Base44 is gone.
 * Everything routes through localStorage / IndexedDB / OpenRouter. There is
 * no remote backend.
 *
 * isDesktop() still exists for legacy callers but always returns true on the
 * shipped build. The Electron preload bridge exposes window.quillosofi for
 * version info, etc.
 */

export function isDesktop() {
  return true;
}

// Synchronous getter — used outside React render paths.
export const IS_DESKTOP = true;

// =============================================================
// Local key/value store backed by localStorage.
// =============================================================
const STORAGE_PREFIX = 'quillosofi:';
const safeRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const safeWrite = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed', key, e);
  }
};
const uid = () => `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// =============================================================
// Local entity API — mirrors the subset of base44.entities.X that
// the app actually uses. Each "entity" is a list under a single key.
// =============================================================
function makeEntity(key) {
  const all = () => safeRead(key, []);
  const persist = (rows) => safeWrite(key, rows);

  return {
    list: async (orderBy, limit) => {
      const rows = [...all()];
      if (typeof orderBy === 'string' && orderBy.length > 1) {
        const desc = orderBy.startsWith('-');
        const field = desc ? orderBy.slice(1) : orderBy;
        rows.sort((a, b) => {
          const av = a?.[field] ?? 0;
          const bv = b?.[field] ?? 0;
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (desc ? -1 : 1);
        });
      }
      return typeof limit === 'number' ? rows.slice(0, limit) : rows;
    },

    filter: async (where = {}, orderBy, limit) => {
      let rows = all().filter((r) =>
        Object.entries(where).every(([k, v]) => r?.[k] === v)
      );
      if (typeof orderBy === 'string' && orderBy.length > 1) {
        const desc = orderBy.startsWith('-');
        const field = desc ? orderBy.slice(1) : orderBy;
        rows.sort((a, b) => {
          const av = a?.[field] ?? 0;
          const bv = b?.[field] ?? 0;
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (desc ? -1 : 1);
        });
      }
      if (typeof limit === 'number') rows = rows.slice(0, limit);
      return rows;
    },

    get: async (id) => all().find((r) => r.id === id) || null,

    create: async (data = {}) => {
      const now = new Date().toISOString();
      const row = {
        id: uid(),
        created_date: now,
        updated_date: now,
        ...data,
      };
      const rows = all();
      rows.push(row);
      persist(rows);
      return row;
    },

    update: async (id, data = {}) => {
      const rows = all();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...data, updated_date: new Date().toISOString() };
      persist(rows);
      return rows[idx];
    },

    delete: async (id) => {
      const rows = all().filter((r) => r.id !== id);
      persist(rows);
      return { ok: true };
    },

    bulkCreate: async (items = []) => {
      const rows = all();
      const now = new Date().toISOString();
      const created = items.map((data) => ({
        id: uid(),
        created_date: now,
        updated_date: now,
        ...data,
      }));
      rows.push(...created);
      persist(rows);
      return created;
    },
  };
}

// Pre-create the entities the app touches. New ones can be added here.
const ENTITY_KEYS = [
  'UserMemory',
  'BotConfig',
  'Conversation',
  'Message',
  'Project',
  'Canvas',
  'Spreadsheet',
  'Dictionary',
  'CustomDictionary',
  'Persona',
  'Theme',
  'Note',
  'File',
  'Tag',
];
const localEntitiesObj = {};
for (const k of ENTITY_KEYS) localEntitiesObj[k] = makeEntity(k);

// Proxy lets new entity names work transparently — any access creates a new
// localStorage-backed collection on demand.
export const localEntities = new Proxy(localEntitiesObj, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (!target[prop]) target[prop] = makeEntity(prop);
    return target[prop];
  },
});

// =============================================================
// Local auth — returns the synthetic LOCAL_USER instantly.
// =============================================================
const LOCAL_USER_BASE = {
  id: 'local-desktop-user',
  email: 'local@quillosofi.desktop',
  full_name: 'Local User',
  display_name: 'You',
  is_local: true,
};

// Read user profile overlay from localStorage so updates from
// FontSelector / SettingsModal / Persona panels persist between launches.
const readUserOverlay = () => safeRead('userProfile', {});
const writeUserOverlay = (patch) => {
  const current = readUserOverlay();
  const next = { ...current, ...patch };
  safeWrite('userProfile', next);
  return next;
};
const currentUser = () => ({ ...LOCAL_USER_BASE, ...readUserOverlay() });

export const LOCAL_USER = currentUser();

export const localAuth = {
  isAuthenticated: async () => true,
  me: async () => currentUser(),
  logout: () => {},
  redirectToLogin: () => {},
  setToken: () => {},
  updateMe: async (patch = {}) => {
    const overlay = writeUserOverlay(patch);
    return { ...LOCAL_USER_BASE, ...overlay };
  },
};

// =============================================================
// Local integrations — drop-in replacements for the old Base44
// integrations.Core.* surface. Everything is local / OpenRouter.
// =============================================================
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const localIntegrations = {
  Core: {
    // Files become data URLs so they live entirely on the client.
    // Good enough for profile pics, small attachments. For very large blobs
    // a future version could swap this for IndexedDB + idb-keyval.
    UploadFile: async ({ file }) => {
      const file_url = await fileToDataUrl(file);
      return { file_url };
    },

    // Route LLM calls through OpenRouter. Lazy-imported to avoid a circular
    // dep with llm.js (which itself used to import base44).
    InvokeLLM: async (params = {}) => {
      const { invokeLLM } = await import('@/lib/llm');
      return invokeLLM(params);
    },

    // Image generation isn't wired up locally yet. Returning a clear error
    // is better than silently failing.
    GenerateImage: async () => {
      throw new Error(
        'Image generation is not available in the local desktop build. ' +
          'Add an image-capable model + provider in a future update.'
      );
    },

    // Same story for file extraction. The chat already accepts data: URLs as
    // multimodal inputs via OpenRouter, so dedicated extraction is rarely
    // needed. Stub politely instead of crashing.
    ExtractDataFromUploadedFile: async () => ({
      status: 'unsupported',
      data: null,
      message: 'File extraction is disabled in the local desktop build.',
    }),
  },
};

// =============================================================
// Local functions — for app endpoints like getAppVersion.
// =============================================================
export const localFunctions = {
  invoke: async (name) => {
    if (name === 'getAppVersion') {
      // Read the live app version from the preload bridge if available.
      try {
        const v = await window.quillosofi?.getVersion?.();
        return { data: { version: v || '0.0.0', date: 'Desktop' } };
      } catch {
        return { data: { version: '0.0.0', date: 'Desktop' } };
      }
    }
    return { data: null };
  },
};
