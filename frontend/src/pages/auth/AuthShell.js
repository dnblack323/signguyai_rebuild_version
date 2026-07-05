import React from "react";

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand" aria-label="SignGuyAI">
          <span>SG</span>
          <strong>
            SignGuy<span>AI</span>
          </strong>
        </div>
        <h1 className="auth-title">{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="auth-error" data-testid="auth-error-message" role="alert">
      {message}
    </div>
  );
}

export function AuthSuccess({ message }) {
  if (!message) return null;
  return (
    <div className="auth-success" data-testid="auth-success-message" role="status">
      {message}
    </div>
  );
}
