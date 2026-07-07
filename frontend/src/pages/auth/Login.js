import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthError, AuthShell } from "./AuthShell";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password, rememberMe });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to SignGuyAI"
      subtitle="Manage quotes, orders, invoices and production in one place."
      footer={
        <>
          <Link to="/forgot-password" data-testid="login-forgot-password-link">
            Forgot password?
          </Link>
          <span>
            Don&apos;t have an account? <Link to="/register" data-testid="login-register-link">Create one</Link>
          </span>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" data-testid="login-form">
        <AuthError message={error} />
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="login-email-input"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="login-password-input"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              data-testid="login-toggle-password-visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            data-testid="login-remember-me-checkbox"
          />
          <span>Remember me for 30 days</span>
        </label>
        <button type="submit" className="primary-button auth-submit" disabled={submitting} data-testid="login-submit-button">
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthShell>
  );
}
