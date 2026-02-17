import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import AdSlot from "../../components/ads/AdSlot";
import LoadingModal from "../../components/feedback/LoadingModal";
import { authService } from "../../features/auth/services/authService";
import { clearMealPlanItemsCache } from "../../features/meal-plans/utils/mealPlanItemsCache";
import { clearRecipeListViewState } from "../../features/recipes/utils/recipeListViewState";

const appNavItems = [
  { label: "Dashboard", mobileLabel: "Home", to: "/app", end: true },
  { label: "Recipes", mobileLabel: "Recipes", to: "/app/recipes" },
  { label: "Meal Plans", mobileLabel: "Plans", to: "/app/meal-plans" },
  { label: "Grocery Lists", mobileLabel: "Grocery", to: "/app/grocery" },
];

export default function AppWorkspaceLayout() {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location.pathname.startsWith("/app/recipes")) {
      clearRecipeListViewState();
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    const { error: signOutError } = await authService.signOut();
    if (signOutError) {
      setError(signOutError.message);
    } else {
      clearMealPlanItemsCache();
    }
    setLoading(false);
  };

  return (
    <main className="workspace">
      <LoadingModal
        open={loading}
        title="Signing you out..."
        message="Wrapping up your session. You will be redirected shortly."
      />

      <div className="workspace-layout">
        <aside className="workspace-side workspace-side--left" aria-label="Sponsored">
          <AdSlot size="skyscraper" label="Sponsored" />
        </aside>

        <div className="workspace-main">
          <header className="workspace-topbar">
            <Link className="workspace-brand" to="/">
              <span className="brand__dot" />
              PlanMyMeals
            </Link>

            <nav className="workspace-nav workspace-nav--desktop" aria-label="Primary">
              {appNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `workspace-nav__link${isActive ? " workspace-nav__link--active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="workspace__actions">
              <button className="btn btn--primary" onClick={handleSignOut} disabled={loading}>
                {loading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </header>

          {error ? <p className="error workspace__error">{error}</p> : null}

          <Outlet />

          <nav className="workspace-bottom-nav" aria-label="Primary">
            {appNavItems.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `workspace-nav__link${isActive ? " workspace-nav__link--active" : ""}`
                }
              >
                {item.mobileLabel}
              </NavLink>
            ))}
          </nav>

          <footer className="workspace__sponsor">
            <AdSlot size="leaderboard" label="Sponsored" className="ad-slot--desktop-only" />
            <AdSlot size="banner" label="Sponsored" className="ad-slot--mobile-only" />
          </footer>
        </div>

        <aside className="workspace-side workspace-side--right" aria-label="Sponsored">
          <AdSlot size="skyscraper" label="Sponsored" />
        </aside>
      </div>
    </main>
  );
}
