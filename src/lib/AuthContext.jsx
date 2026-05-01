import React, { createContext, useState, useContext } from 'react';

/*
 * v0.4.1: Quillosofi is local-only. No remote auth, no public-settings round
 * trip, no login wall. Everything resolves to a synthetic LOCAL_USER on mount.
 *
 * The provider keeps the same prop names the rest of the app reads from
 * (user, isAuthenticated, isLoadingAuth, ...) so no consumer needs to change.
 */

const AuthContext = createContext();

const LOCAL_USER = {
  id: 'local-desktop-user',
  email: 'local@quillosofi.desktop',
  full_name: 'Local User',
  display_name: 'You',
  is_local: true,
};

const LOCAL_APP_SETTINGS = { id: 'desktop', public_settings: {} };

export const AuthProvider = ({ children }) => {
  const [user] = useState(LOCAL_USER);
  const [isAuthenticated] = useState(true);
  const [isLoadingAuth] = useState(false);
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [appPublicSettings] = useState(LOCAL_APP_SETTINGS);

  // Logout / login navigation are no-ops in the local build, but kept on the
  // context so any caller that still references them doesn't explode.
  const logout = () => {};
  const navigateToLogin = () => {};
  const checkAppState = async () => {};

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
