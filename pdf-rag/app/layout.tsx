import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import FooterWrapper from "./components/FooterWrapper";

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
          <FooterWrapper />
        </div>
      </body>
    </html>
  );
}
