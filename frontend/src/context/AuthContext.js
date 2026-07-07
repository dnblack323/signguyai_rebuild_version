import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearStoredAuthToken, setStoredAuthToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // identity: null = checking session, false = signed out, object = signed in
  const [identity, setIdentity] = useState(null);

  const loadIdentity = useCallback(async () => {
    try {
      const data = await api("/auth/me");
      setIdentity(data);
    } catch (error) {
      clearStoredAuthToken();
      setIdentity(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const login = useCallback(async ({ email, password, rememberMe }) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, remember_me: !!rememberMe }),
    });
    setStoredAuthToken(data.access_token, !!rememberMe);
    setIdentity(data.identity);
    return data.identity;
  }, []);

  const register = useCallback(async ({ email, password, fullName, companyName }) => {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name: fullName, company_name: companyName || "" }),
    });
    setStoredAuthToken(data.access_token, false);
    setIdentity(data.identity);
    return data.identity;
  }, []);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setIdentity(false);
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  }, []);

  const resetPassword = useCallback(async ({ token, newPassword }) => {
    await api("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }, []);

  const value = useMemo(
    () => ({
      user: identity || null,
      permissions: identity ? identity.permissions || [] : [],
      isAuthenticated: Boolean(identity),
      isChecking: identity === null,
      login,
      register,
      logout,
      requestPasswordReset,
      resetPassword,
    }),
    [identity, login, register, logout, requestPasswordReset, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
