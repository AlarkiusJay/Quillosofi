/*
 * Local-only app client.
 *
 * Quillosofi is a fully local-first desktop app. All entity reads/writes,
 * auth, and integrations are backed by localStorage / IndexedDB / OpenRouter.
 * There is no remote backend, no cloud sync, and no telemetry.
 *
 * The exported `app` object exposes the surface the rest of the codebase
 * uses:
 *
 *   app.entities.<Anything>.create/update/delete/filter/list/get/...
 *   app.auth.{me,isAuthenticated,logout,redirectToLogin,setToken,updateMe}
 *   app.integrations.Core.{InvokeLLM,UploadFile,GenerateImage,ExtractDataFromUploadedFile}
 *   app.functions.invoke(name, data)
 */

import {
  localEntities,
  localAuth,
  localFunctions,
  localIntegrations,
} from '@/lib/desktop';

export const app = {
  entities: localEntities,
  auth: localAuth,
  integrations: localIntegrations,
  functions: localFunctions,
};
