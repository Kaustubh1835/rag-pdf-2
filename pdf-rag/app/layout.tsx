import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InsightPDF — Chat with your PDFs",
  description:
    "Upload your PDFs and have an intelligent conversation with their contents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased gradient-bg`}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <div style={{ flex: "1 0 auto" }}>
            {children}
          </div>
          <footer style={{
            flexShrink: 0,
            padding: "64px 24px",
            background: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(14, 165, 233, 0.2)",
          }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px" }}>
              <div>
                <h3 style={{ color: "#0c4a6e", fontWeight: 800, fontSize: "20px", marginBottom: "16px", letterSpacing: "-0.5px" }}>InsightPDF</h3>
                <p style={{ color: "#475569", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
                  Revolutionizing how you interact with documents. Our AI-powered platform makes information extraction effortless and conversational.
                </p>
              </div>
              <div>
                <h4 style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "20px" }}>Product</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Features</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Pricing</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Security</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "20px" }}>Company</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>About Us</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Blog</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Careers</a></li>
                </ul>
              </div>
              <div>
                <h4 style={{ color: "#0c4a6e", fontWeight: 700, fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "20px" }}>Support</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Help Center</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Privacy</a></li>
                  <li style={{ marginBottom: "12px" }}><a href="#" style={{ color: "#475569", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }}>Terms</a></li>
                </ul>
              </div>
            </div>
            <div style={{ maxWidth: "1200px", margin: "48px auto 0", pt: "32px", borderTop: "1px solid rgba(14, 165, 233, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
              <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>
                &copy; {new Date().getFullYear()} InsightPDF Inc. Built for document lovers.
              </p>
              <div style={{ display: "flex", gap: "20px" }}>
                {/* Placeholder social icons */}
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0c4a6e", opacity: 0.6 }}></div>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0c4a6e", opacity: 0.6 }}></div>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#0c4a6e", opacity: 0.6 }}></div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
