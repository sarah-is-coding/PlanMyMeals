import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "./services/authService";

type AuthMode = "signIn" | "signUp" | "resetRequest" | "resetUpdate";

export default function AuthPage() {
  const recoveryMode = window.location.hash.includes("type=recovery");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>(
    recoveryMode ? "resetUpdate" : "signIn"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    recoveryMode ? "Recovery link detected. Enter a new password." : null
  );

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    const action =
      mode === "signUp"
        ? authService.signUpWithEmail(email, password)
        : authService.signInWithEmail(email, password);

    const { data, error: authError } = await action;
    if (authError) {
      setError(authError.message);
    } else if (mode === "signUp" && !data.session) {
      setMessage("Account created. Check your email for the confirmation link.");
    }

    setLoading(false);
  };

  const handleRequestPasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Email is required.");
      setLoading(false);
      return;
    }

    const { error: resetError } = await authService.requestPasswordReset(
      email,
      `${window.location.origin}/auth`
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("If this email exists, a reset link has been sent.");
    }

    setLoading(false);
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!password) {
      setError("New password is required.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await authService.updatePassword(password);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await authService.signOut();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    );
    setPassword("");
    setMode("signIn");
    setMessage("Password updated. Sign in with your new password.");
    setLoading(false);
  };

  return (
    <main className="auth-page">
      <div className="auth-page__glow" />
      <div className="auth-shell">
        <section className="auth-intro">
          <Link to="/" className="back-link">
            Back to home
          </Link>
          <p className="kicker">Secure account access</p>
          <h1>Welcome to your meal planning workspace.</h1>
          <p>
            Sign in to access your recipes, weekly plans, and grocery lists.
            Your data is scoped per account with Supabase Auth + RLS.
          </p>
        </section>

        <section className="auth-panel">
          {mode === "resetUpdate" ? (
            <form className="auth-form" onSubmit={handleUpdatePassword}>
              <h2>Set a new password</h2>
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                autoComplete="new-password"
              />

              {error ? <p className="error">{error}</p> : null}
              {message ? <p className="message">{message}</p> : null}

              <div className="actions">
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setMode("signIn");
                    setPassword("");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={loading}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : mode === "resetRequest" ? (
            <form className="auth-form" onSubmit={handleRequestPasswordReset}>
              <h2>Reset your password</h2>
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              {error ? <p className="error">{error}</p> : null}
              {message ? <p className="message">{message}</p> : null}

              <div className="actions">
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setMode("signIn");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={loading}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleAuth}>
              <h2>{mode === "signUp" ? "Create account" : "Sign in"}</h2>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                autoComplete={
                  mode === "signUp" ? "new-password" : "current-password"
                }
              />

              {error ? <p className="error">{error}</p> : null}
              {message ? <p className="message">{message}</p> : null}

              <div className="actions">
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading
                    ? "Working..."
                    : mode === "signUp"
                    ? "Create account"
                    : "Sign in"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setMode(mode === "signUp" ? "signIn" : "signUp");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={loading}
                >
                  {mode === "signUp"
                    ? "Have an account? Sign in"
                    : "Need an account? Sign up"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setMode("resetRequest");
                    setPassword("");
                    setError(null);
                    setMessage(null);
                  }}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
