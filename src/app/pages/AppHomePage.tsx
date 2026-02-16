export default function AppHomePage() {
  return (
    <section className="workspace-route">
      <article className="workspace-card">
        <h1>Your meal planning dashboard</h1>
        <p>
          This area is reserved for weekly summaries and key metrics. Use the header
          navigation to jump into recipes, meal plans, and grocery lists.
        </p>
      </article>

      <section className="workspace-metrics" aria-label="Dashboard summaries">
        <article className="workspace-card">
          <h2>Meals Planned</h2>
          <p>Summary metric placeholder.</p>
        </article>
        <article className="workspace-card">
          <h2>Recipes Used</h2>
          <p>Summary metric placeholder.</p>
        </article>
        <article className="workspace-card">
          <h2>Grocery Progress</h2>
          <p>Summary metric placeholder.</p>
        </article>
      </section>
    </section>
  );
}
