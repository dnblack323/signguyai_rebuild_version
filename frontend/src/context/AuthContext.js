import React, { createContext, useContext } from "react";

const previewUser = {
  id: "preview-owner",
  tenantId: "preview-shop",
  role: "owner",
  email: "owner@signguyai.preview",
};

const AuthContext = createContext({ user: previewUser, permissions: ["*"] });

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={{ user: previewUser, permissions: ["*"] }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
