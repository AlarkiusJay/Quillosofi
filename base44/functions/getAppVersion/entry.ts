import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ✏️ Update this version string whenever you deploy new features
const APP_VERSION = "1.0.0";
const VERSION_DATE = "April 6, 2026";

Deno.serve(async (req) => {
  try {
    return Response.json({
      version: APP_VERSION,
      date: VERSION_DATE,
      label: `v${APP_VERSION} — ${VERSION_DATE}`,
    });
  } catch (error) {
    console.error("getAppVersion error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});