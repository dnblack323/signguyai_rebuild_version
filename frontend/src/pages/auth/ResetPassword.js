import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthError, AuthShell, AuthSuccess } from "./AuthShell";

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess("Password updated. Redirecting to sign in...");
      window.setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err.message || "This reset link is invalid or has already been used");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <span>
          <Link to="/login" data-testid="reset-password-login-link">Back to sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" data-testid="reset-password-form">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <label className="auth-field">
          <span>New password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            data-testid="reset-password-new-input"
          />
        </label>
        <label className="auth-field">
          <span>Confirm new password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            data-testid="reset-password-confirm-input"
          />
        </label>
        <button type="submit" className="primary-button auth-submit" disabled={submitting} data-testid="reset-password-submit-button">
          {submitting ? "Updating..." : "Reset Password"}
        </button>
      </form>
    </AuthShell>
  );
}
