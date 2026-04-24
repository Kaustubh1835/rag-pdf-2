"use client";

import { useEffect, useState, useRef, use } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../../../firebase/clientApp";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("• ")) { html += "</ul>"; inList = false; }
    if (inOl && !/^\d+[\.\)]/.test(trimmed)) { html += "</ol>"; inOl = false; }

    if (trimmed === "") {
      html += "<br/>";
    } else if (trimmed.startsWith("### ")) {
      html += `<h4 style="font-size:13px;font-weight:600;color:#111;margin:16px 0 6px 0;text-transform:uppercase;letter-spacing:0.5px">${trimmed.slice(4)}</h4>`;
    } else if (trimmed.startsWith("## ")) {
      html += `<h3 style="font-size:14px;font-weight:600;color:#111;margin:16px 0 6px 0">${trimmed.slice(3)}</h3>`;
    } else if (trimmed.startsWith("# ")) {
      html += `<h2 style="font-size:15px;font-weight:600;color:#111;margin:16px 0 6px 0">${trimmed.slice(2)}</h2>`;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      if (!inList) { html += "<ul style='margin:4px 0;padding-left:18px'>"; inList = true; }
      const content = trimmed.slice(2);
      html += `<li style="margin:3px 0;line-height:1.5">${formatInline(content)}</li>`;
    } else if (/^\d+[\.\)]/.test(trimmed)) {
      if (!inOl) { html += "<ol style='margin:4px 0;padding-left:18px'>"; inOl = true; }
      const content = trimmed.replace(/^\d+[\.\)]\s*/, "");
      html += `<li style="margin:3px 0;line-height:1.5">${formatInline(content)}</li>`;
    } else {
      html += `<p style="margin:4px 0;line-height:1.6">${formatInline(trimmed)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  if (inOl) html += "</ol>";
  return html;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code style="background:#f5f5f5;padding:1px 5px;border-radius:3px;font-size:12px">$1</code>');
}

export default function ProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push("/signin");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: trimmed, project_id: projectId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Chat request failed");
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "No response received." }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ padding: "24px", background: "rgba(255,255,255,0.8)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "#0c4a6e", fontSize: "15px", fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "transparent" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(226,232,240,0.8)", flexShrink: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "16px" }}>I</div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0c4a6e", margin: 0, letterSpacing: "-0.5px" }}>InsightPDF Chat</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#0c4a6e", background: "rgba(14,165,233,0.1)", padding: "6px 12px", borderRadius: "8px" }}>
            {user?.displayName || user?.email?.split("@")[0] || "User"}
          </span>
          <button onClick={() => router.push(`/projects/${projectId}`)} style={{ fontSize: "14px", fontWeight: 600, color: "#475569", background: "white", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}>
            ← Back to Project
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "48px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "100px 0" }}>
              <div style={{ width: "64px", height: "64px", background: "#f0f9ff", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "32px" }}>🤖</div>
              <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0c4a6e", marginBottom: "12px" }}>Start the conversation</h3>
              <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "400px", margin: "0 auto" }}>
                Your PDFs have been indexed. Ask me anything about their contents!
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: "16px", marginBottom: "24px" }}>
              {msg.role === "assistant" && (
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #0ea5e9 0%, #0c4a6e 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", boxShadow: "0 4px 10px rgba(14,165,233,0.2)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="9" cy="16" r="1" /><circle cx="15" cy="16" r="1" /><path d="M12 2v4" /><path d="M8 7h8" /></svg>
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "16px", borderRadius: "16px", fontSize: "15px", lineHeight: "1.6",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: msg.role === "assistant" ? "1px solid rgba(14,165,233,0.15)" : "none",
                ...(msg.role === "user"
                  ? { backgroundColor: "#0c4a6e", color: "#ffffff", borderTopRightRadius: "4px" }
                  : { backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", color: "#1e293b", borderTopLeftRadius: "4px" }),
              }}>
                {msg.role === "assistant" ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                ) : msg.content}
              </div>
              {msg.role === "user" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0c4a6e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px", boxShadow: "0 2px 8px rgba(12,74,110,0.3)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="9" cy="16" r="1" /><circle cx="15" cy="16" r="1" /><path d="M12 2v4" /><path d="M8 7h8" /></svg>
              </div>
              <div style={{ padding: "16px", borderRadius: "16px", borderTopLeftRadius: "4px", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(14,165,233,0.15)", fontSize: "15px", color: "#64748b", backdropFilter: "blur(10px)" }}>
                Thinking…
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.4)", padding: "32px 80px", flexShrink: 0, background: "rgba(255,255,255,0.4)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "16px", background: "rgba(255,255,255,0.8)", padding: "12px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type your question…" disabled={sending}
            style={{ flex: 1, padding: "16px 24px", fontSize: "15px", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "16px", outline: "none", color: "#0c4a6e", backgroundColor: "white", transition: "all 0.2s ease" }}
            onFocus={(e) => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 4px rgba(14,165,233,0.05)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(14,165,233,0.1)"; e.target.style.boxShadow = "none"; }}
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending} style={{
            padding: "0 32px", fontSize: "15px", fontWeight: 700, color: "#fff",
            background: !input.trim() || sending ? "#cbd5e1" : "#0c4a6e",
            border: "none", borderRadius: "16px", cursor: !input.trim() || sending ? "not-allowed" : "pointer",
            transition: "all 0.2s ease", flexShrink: 0,
            boxShadow: !input.trim() || sending ? "none" : "0 4px 12px rgba(12,74,110,0.3)",
          }}
            onMouseEnter={(e) => { if (input.trim() && !sending) e.currentTarget.style.backgroundColor = "#073b5a"; }}
            onMouseLeave={(e) => { if (input.trim() && !sending) e.currentTarget.style.backgroundColor = "#0c4a6e"; }}>
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
