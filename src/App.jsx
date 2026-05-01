import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';

// In the Electron desktop build the app is loaded from a file:// URL, which
// breaks BrowserRouter (it tries to match the full file path as a route and
// renders PageNotFound). HashRouter works with file://, so we use that when
// running inside the desktop shell. The web build keeps BrowserRouter so URLs
// stay clean.
const isDesktop = typeof window !== 'undefined' && !!window.quillosofi?.isDesktop;
const Router = isDesktop ? HashRouter : BrowserRouter;
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Space from './pages/Space';
import SpacesGrid from './components/SpacesGrid';
import AuthCallback from './pages/AuthCallback';
import CanvasVault from './pages/CanvasVault';
import CanvasEditorHub from './pages/CanvasEditorHub';
import SheetsEditorHub from './pages/SheetsEditorHub';
import Research from './pages/Research';
import QuillosofiCentre from './pages/QuillosofiCentre';
import Quillounge from './pages/Quillounge';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Quillounge />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:conversationId" element={<Chat />} />
        <Route path="/spaces" element={<SpacesGrid />} /> {/* loads its own data */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/space/:spaceId" element={<Space />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        {/* Quillibrary — renamed from Canvas Vault in v0.4. Old path kept for back-compat. */}
        <Route path="/quillibrary" element={<CanvasVault />} />
        <Route path="/canvas-vault" element={<CanvasVault />} />
        {/* Canvas & Sheets editor hubs (v0.4.7) — full editor workspaces with multi-doc tabs. */}
        <Route path="/canvas" element={<CanvasEditorHub />} />
        <Route path="/canvas/:id" element={<CanvasEditorHub />} />
        <Route path="/sheets" element={<SheetsEditorHub />} />
        <Route path="/sheets/:id" element={<SheetsEditorHub />} />
        <Route path="/research" element={<Research />} />
        <Route path="/research/:researchId" element={<Research />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
      <Route path="/quillosofi-centre" element={<QuillosofiCentre />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App