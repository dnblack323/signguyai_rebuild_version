import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import App from "./App";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ResetPassword } from "./pages/auth/ResetPassword";
import "./index.css";

function ProtectedApp() {
  const { isAuthenticated, isChecking } = useAuth();
  if (isChecking) {
    return <div className="auth-loading" data-testid="auth-checking-session">Loading your workspace...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <App />;
}

function RootRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
