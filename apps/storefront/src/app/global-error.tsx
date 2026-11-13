"use client"

// Last-resort 500 page (the root layout itself failed), so it brings its own <html>/<body>
// and inline brand styles — global CSS may not have loaded.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF5E8", fontFamily: "system-ui, sans-serif", color: "#2A1A14", textAlign: "center", padding: 24 }}>
        <div>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#762019", margin: "0 0 8px" }}>Anant Sanatan</p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#762019", margin: "0 0 12px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 20px" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: "#762019", color: "#fff", border: 0, borderRadius: 999, padding: "12px 24px", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
