export default function Custom404() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "4rem", fontWeight: 700, color: "#6b7280" }}>404</h1>
      <p>Page not found</p>
      <a href="/login" style={{ marginTop: "1.5rem", padding: "0.5rem 1.5rem", background: "#3b82f6", color: "#fff", borderRadius: "0.375rem", textDecoration: "none" }}>Back to Login</a>
    </div>
  );
}
