import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthError, AuthShell, AuthSuccess } from "./AuthShell";

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSuccess("If an account exists for this email, a reset link has been sent.");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <span>
          Remembered it? <Link to="/login" data-testid="forgot-password-login-link">Back to sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form" data-testid="forgot-password-form">
        <AuthError message={error} />
        <AuthSuccess message={success} />
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="forgot-password-email-input"
          />
        </label>
        <button type="submit" className="primary-button auth-submit" disabled={submitting} data-testid="forgot-password-submit-button">
          {submitting ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </AuthShell>
  );
}
