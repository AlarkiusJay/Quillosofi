/*
 * Local-only client.
 *
 * Historical name: this file used to wrap the Base44 SDK. As of v0.4.1
 * Quillosofi is fully local-first, so this module just re-exports the
 * desktop helpers in the same shape the rest of the app expects:
 *
 *   base44.entities.<Anything>.create/update/delete/filter/list/get/...
 *   base44.auth.{me,isAuthenticated,logout,redirectToLogin,setToken}
 *   base44.integrations.Core.{InvokeLLM,GenerateImage,UploadFile,ExtractDataFromUploadedFile}
 *   base44.functions.invoke(name, data)
 *
 * 39 files import { base44 } from this path and we don't want to touch
 * each one — preserving the surface as a drop-in shim is the cheapest
 * migration. The export name stays `base44` for the same reason.
 */

import {
  localEntities,
  localAuth,
  localFunctions,
  localIntegrations,
} from '@/lib/desktop';

export const base44 = {
  entities: localEntities,
  auth: localAuth,
  integrations: localIntegrations,
  functions: localFunctions,
};
