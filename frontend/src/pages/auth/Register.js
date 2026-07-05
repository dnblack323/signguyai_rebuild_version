import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthError, AuthShell } from "./AuthShell";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await register({ email, password, fullName, companyName });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your SignGuyAI account"
      subtitle="Start your shop workspace. Everything is scoped to your business only."
      footer={
        <span>
          Already have an account? <Link to="/login" data-testid="register-login-link">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" data-testid="register-form">
        <AuthError message={error} />
        <label className="auth-field">
          <span>Full name</span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            data-testid="register-fullname-input"
          />
        </label>
        <label className="auth-field">
          <span>Company name (optional)</span>
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            data-testid="register-company-input"
          />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="register-email-input"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password-wrap">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="register-password-input"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              data-testid="register-toggle-password-visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            data-testid="register-confirm-password-input"
          />
        </label>
        <button type="submit" className="primary-button auth-submit" disabled={submitting} data-testid="register-submit-button">
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}
