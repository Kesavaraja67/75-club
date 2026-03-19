"use client";

/**
 * Root-level error boundary (required by Next.js App Router).
 * Catches errors that escape the root layout itself.
 * Must render <html> and <body> since the layout fails to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#0a0a0a",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          gap: "16px",
          margin: 0,
        }}
      >
        <div style={{ fontSize: 48 }}>🚨</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
          75 Club — Critical Error
        </h1>
        <p style={{ color: "#888", fontSize: 15, maxWidth: 340, margin: 0 }}>
          {error.message || "The app encountered a critical error. Please reload."}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              background: "#FF6B35",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.replace("/")}
            style={{
              background: "#1a1a1a",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go to home
          </button>
        </div>
      </body>
    </html>
  );
}
