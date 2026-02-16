import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import "./App.css";
import { supabase } from "./supabaseClient";

type AuthMode = "signIn" | "signUp" | "resetRequest" | "resetUpdate";

function App() {
  // Auth/session state
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) {
      setMode("resetUpdate");
      setMessage("Recovery link detected. Enter a new password.");
    }

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };

    syncSession();

    // Keep React state in sync with Supabase auth changes (sign in/out, refresh).
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (event === "PASSWORD_RECOVERY") {
          setMode("resetUpdate");
          setMessage("Recovery link detected. Enter a new password.");
        }
        if (!newSession) {
          setEmail("");
          setPassword("");
        }
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, []);

  // Submit handler for sign in / sign up
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

    // Choose sign up vs sign in based on UI toggle.
    const action =
      mode === "signUp"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin,
      }
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

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
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

  // Explicit sign-out handler
  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
    setLoading(false);
  };

  return (
    <main className="page">
      <div className="panel">
        <header className="panel__header">
          <p className="eyebrow">PlanMyMeals</p>
          <h1>Sign in to manage recipes and meal plans</h1>
          <p className="subhead">
            Accounts are scoped per user via Supabase Auth. Use email/password
            now. Add OAuth later.
          </p>
        </header>

        {mode === "resetUpdate" ? (
          <form className="auth-form" onSubmit={handleUpdatePassword}>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                autoComplete="new-password"
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {message ? <p className="subhead">{message}</p> : null}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
              <button
                type="button"
                className="ghost"
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
        ) : !session && mode === "resetRequest" ? (
          <form className="auth-form" onSubmit={handleRequestPasswordReset}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {message ? <p className="subhead">{message}</p> : null}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <button
                type="button"
                className="ghost"
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
        ) : !session ? (
          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                autoComplete={
                  mode === "signUp" ? "new-password" : "current-password"
                }
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {message ? <p className="subhead">{message}</p> : null}

            <div className="actions">
              <button type="submit" disabled={loading}>
                {loading
                  ? "Working..."
                  : mode === "signUp"
                  ? "Create account"
                  : "Sign in"}
              </button>
              <button
                type="button"
                className="ghost"
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
                className="ghost"
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
        ) : (
          <div className="auth-success">
            <p className="eyebrow">Signed in</p>
            <h2>{session.user.email}</h2>
            <p className="subhead">
              Session is active. Next steps: load recipes, meal plans, and
              grocery lists.
            </p>
            {error ? <p className="error">{error}</p> : null}
            {message ? <p className="subhead">{message}</p> : null}
            <div className="actions">
              <button onClick={handleSignOut} disabled={loading}>
                {loading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
