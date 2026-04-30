/*
 * Desktop runtime helpers for Quillosofi.
 *
 * On the Electron build the preload bridge exposes window.quillosofi.
 * In the renderer this lets us:
 *   - cleanly detect desktop mode (reactive, no module-load timing issues)
 *   - keep all "user data" in localStorage so we don't need Base44 at all
 *
 * The IS_DESKTOP constant below is evaluated lazily on first call so
 * preload-injected globals are guaranteed to be ready.
 */

let _cachedIsDesktop = null;
export function isDesktop() {
  if (_cachedIsDesktop !== null) return _cachedIsDesktop;
  _cachedIsDesktop = typeof window !== 'undefined' && !!window.quillosofi?.isDesktop;
  return _cachedIsDesktop;
}

// Synchronous getter — used outside React render paths.
export const IS_DESKTOP = isDesktop();

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
export const LOCAL_USER = {
  id: 'local-desktop-user',
  email: 'local@quillosofi.desktop',
  full_name: 'Local User',
  display_name: 'You',
  is_local: true,
};

export const localAuth = {
  isAuthenticated: async () => true,
  me: async () => LOCAL_USER,
  logout: () => {},
  redirectToLogin: () => {},
  setToken: () => {},
};

// =============================================================
// Local integrations — minimal stubs so the modal doesn't crash.
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
    UploadFile: async ({ file }) => {
      // Inline files as data URLs so they survive without a server.
      const file_url = await fileToDataUrl(file);
      return { file_url };
    },
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
