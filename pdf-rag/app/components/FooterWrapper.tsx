"use client";

import { usePathname } from "next/navigation";

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // Hide footer on chat pages
  if (pathname?.includes("/chat")) {
    return null;
  }

  return (
    <footer style={{
      flexShrink: 0,
      padding: "32px 24px",
      background: "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(14, 165, 233, 0.2)",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px" }}>
        <div>
          <h3 style={{ color: "#0c4a6e", fontWeight: 800, fontSize: "18px", marginBottom: "12px", letterSpacing: "-0.5px" }}>InsightPDF</h3>
          <p style={{ color: "#475569", fontSize: "13px", lineHeight: "1.5", marginBottom: "0", maxWidth: "300px" }}>
            Revolutionizing how you interact with documents. Our AI-powered platform makes information extraction effortless.
          </p>
        </div>
        <div>
          <h4 style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Product</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "8px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "13px", transition: "color 0.2s" }}>Features</a></li>
            <li style={{ marginBottom: "8px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "13px", transition: "color 0.2s" }}>Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Company</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "8px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "13px", transition: "color 0.2s" }}>About</a></li>
            <li style={{ marginBottom: "8px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "13px", transition: "color 0.2s" }}>Privacy</a></li>
          </ul>
        </div>
      </div>
      <div style={{ maxWidth: "1200px", margin: "24px auto 0", paddingTop: "20px", borderTop: "1px solid rgba(14, 165, 233, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "#94a3b8", fontSize: "11px", margin: 0 }}>
          &copy; {new Date().getFullYear()} InsightPDF Inc.
        </p>
      </div>
    </footer>
  );
}
