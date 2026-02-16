import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { authService } from "../../features/auth/services/authService";

type AppHomePageProps = {
  session: Session;
};

export default function AppHomePage({ session }: AppHomePageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await authService.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
    setLoading(false);
  };

  return (
    <main className="workspace">
      <header className="workspace__header">
        <div>
          <p className="kicker">PlanMyMeals</p>
          <h1>Your meal planning dashboard</h1>
          <p>{session.user.email}</p>
        </div>
        <div className="workspace__actions">
          <Link className="btn btn--ghost" to="/">
            View Landing
          </Link>
          <button className="btn btn--primary" onClick={handleSignOut} disabled={loading}>
            {loading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="workspace__grid">
        <article className="workspace-card">
          <h2>Recipes</h2>
          <p>Next: wire in recipe CRUD and import links.</p>
        </article>
        <article className="workspace-card">
          <h2>Meal Plans</h2>
          <p>Next: week view and drag-and-drop scheduling.</p>
        </article>
        <article className="workspace-card">
          <h2>Grocery Lists</h2>
          <p>Next: generate and check off items on mobile.</p>
        </article>
      </section>
    </main>
  );
}
