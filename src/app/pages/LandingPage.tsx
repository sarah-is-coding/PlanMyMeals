import { Link } from "react-router-dom";
import AdSlot from "../../components/ads/AdSlot";

type LandingPageProps = {
  isAuthenticated: boolean;
};

export default function LandingPage({ isAuthenticated }: LandingPageProps) {
  return (
    <main className="landing">
      <div className="landing__glow landing__glow--one" />
      <div className="landing__glow landing__glow--two" />
      <div className="landing__glow landing__glow--three" />

      <header className="topbar reveal">
        <div className="brand">
          <span className="brand__dot" />
          PlanMyMeals
        </div>
        <div className="topbar__actions">
          <Link className="btn btn--ghost" to={isAuthenticated ? "/app" : "/auth"}>
            {isAuthenticated ? "Open App" : "Sign In"}
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy reveal">
          <p className="kicker">Meal planning, minus the chaos</p>
          <h1>Plan a full week of meals in minutes, even seconds.</h1>
          <p>
            Import recipes, arrange your week visually, and generate grocery
            lists instantly. Built for busy households that still want to eat
            well.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" to={isAuthenticated ? "/app" : "/auth"}>
              {isAuthenticated ? "Go to Dashboard" : "Start Free"}
            </Link>
            <a className="btn btn--ghost" href="#features">
              Explore Features
            </a>
          </div>
          <div className="hero__stats">
            <div className="stat-card">
              <strong>10 min</strong>
              <span>average weekly planning time</span>
            </div>
            <div className="stat-card">
              <strong>1 tap</strong>
              <span>to generate your grocery list</span>
            </div>
            <div className="stat-card">
              <strong>100%</strong>
              <span>your data scoped to your account</span>
            </div>
          </div>
        </div>

        <div className="hero__panel reveal">
          <p className="hero-panel__eyebrow">Preview</p>
          <h2>Week of February 16</h2>
          <ul className="plan-list">
            <li>
              <span>Mon Dinner</span>
              <strong>Sheet Pan Salmon + Veggies</strong>
            </li>
            <li>
              <span>Tue Lunch</span>
              <strong>Greek Chickpea Bowls</strong>
            </li>
            <li>
              <span>Wed Dinner</span>
              <strong>Turkey Chili + Cornbread</strong>
            </li>
            <li>
              <span>Thu Dinner</span>
              <strong>Pesto Gnocchi + Spinach</strong>
            </li>
          </ul>
          <div className="hero-panel__footer">
            <p>Grocery list generated from 12 ingredients.</p>
            <Link to={isAuthenticated ? "/app" : "/auth"}>Open Planner</Link>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <article className="feature-card reveal">
          <h3>Recipe Library</h3>
          <p>
            Save favorites from links or manual entry and keep prep details,
            servings, and ingredients in one clean place.
          </p>
        </article>
        <article className="feature-card reveal">
          <h3>Drag-and-Drop Planning</h3>
          <p>
            Build flexible weekly plans for breakfast, lunch, and dinner, then
            adjust your week in seconds when life changes.
          </p>
        </article>
        <article className="feature-card reveal">
          <h3>Smart Grocery Lists</h3>
          <p>
            Convert planned meals into a shopping list instantly, check items
            off on mobile, and stay synchronized across devices.
          </p>
        </article>
      </section>

      <section className="cta reveal">
        <h2>Ready to make meal planning finally stick?</h2>
        <p>Start with your first recipe and build a plan for this week.</p>
        <Link className="btn btn--primary" to={isAuthenticated ? "/app" : "/auth"}>
          {isAuthenticated ? "Continue Planning" : "Create Your Account"}
        </Link>
      </section>

      <footer className="landing__sponsor">
        <AdSlot size="leaderboard" label="Sponsored" className="ad-slot--desktop-only" />
        <AdSlot size="banner" label="Sponsored" className="ad-slot--mobile-only" />
      </footer>
    </main>
  );
}
