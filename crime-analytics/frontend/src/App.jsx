const cards = [
  {
    title: "Data Service",
    path: "/data/health",
    description: "Validates the ingestion and query API.",
  },
  {
    title: "Analytics Service",
    path: "/analytics/health",
    description: "Checks descriptive and spatial analytics endpoints.",
  },
  {
    title: "ML Service",
    path: "/ml/health",
    description: "Verifies the prediction service is reachable.",
  },
  {
    title: "Map Service",
    path: "/map/health",
    description: "Confirms map aggregation and geo endpoints.",
  },
  {
    title: "Gateway",
    path: "/health",
    description: "Ensures the API gateway is online.",
  },
];

function App() {
  const apiBaseUrl = import.meta.env.VITE_API_URL
    || import.meta.env.REACT_APP_API_URL
    || "http://localhost:8000";

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <p style={styles.eyebrow}>Crime Analytics Platform</p>
        <h1 style={styles.title}>Frontend service is running.</h1>
        <p style={styles.subtitle}>
          This starter dashboard gives you quick health links into the backend
          stack while the full UI is still being built.
        </p>
        <a href={`${apiBaseUrl}/health`} style={styles.primaryLink}>
          Open gateway health check
        </a>
      </section>

      <section style={styles.grid}>
        {cards.map((card) => (
          <article key={card.path} style={styles.card}>
            <h2 style={styles.cardTitle}>{card.title}</h2>
            <p style={styles.cardDescription}>{card.description}</p>
            <a href={`${apiBaseUrl}${card.path}`} style={styles.cardLink}>
              {`${apiBaseUrl}${card.path}`}
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "48px 24px",
    fontFamily: "Segoe UI, sans-serif",
    color: "#f5f7fb",
    background:
      "radial-gradient(circle at top left, #224870 0%, #102033 45%, #09111d 100%)",
  },
  hero: {
    maxWidth: "800px",
    margin: "0 auto 32px auto",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    fontSize: "0.75rem",
    color: "#8ec5ff",
    marginBottom: "12px",
  },
  title: {
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
    lineHeight: 1,
    margin: "0 0 16px 0",
  },
  subtitle: {
    maxWidth: "640px",
    fontSize: "1.1rem",
    lineHeight: 1.6,
    color: "#d7e2f2",
    marginBottom: "24px",
  },
  primaryLink: {
    display: "inline-block",
    padding: "14px 20px",
    borderRadius: "999px",
    backgroundColor: "#73e2a7",
    color: "#102033",
    textDecoration: "none",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  card: {
    padding: "20px",
    borderRadius: "20px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(10px)",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "8px",
  },
  cardDescription: {
    color: "#d7e2f2",
    lineHeight: 1.5,
    minHeight: "48px",
  },
  cardLink: {
    color: "#8ec5ff",
    wordBreak: "break-word",
  },
};

export default App;
