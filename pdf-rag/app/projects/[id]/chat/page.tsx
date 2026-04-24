"use client";

import { useEffect, useState, useRef, use } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../../../../firebase/clientApp";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 150 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) router.push("/signin");
      else fetchSessions();
    });
    return () => unsubscribe();
  }, [router]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          selectSession(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat ${sessions.length + 1}` }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions([newSession, ...sessions]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, sending]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      // Auto-create session if none exists
      try {
        const res = await fetch(`/api/projects/${projectId}/chat-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed.substring(0, 30) + "..." }),
        });
        if (res.ok) {
          const newSession = await res.json();
          setSessions([newSession, ...sessions]);
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
        } else return;
      } catch (err) {
        console.error("Failed to auto-create session:", err);
        return;
      }
    }

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      // 1. Save user message to DB
      await fetch(`/api/chat-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userMsg),
      });

      // 2. Get AI Response
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
      const aiMsg: Message = { role: "assistant", content: data.answer || "No response received." };
      
      // 3. Save AI message to DB
      await fetch(`/api/chat-sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiMsg),
      });

      setMessages((prev) => [...prev, aiMsg]);
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
    <div 
      style={{ 
        height: "100vh", 
        overflow: "hidden", 
        display: "flex", 
        background: "#f8fafc",
        userSelect: isResizing ? "none" : "auto" 
      }}
    >
      {/* Sidebar */}
      <aside style={{
        width: isSidebarMinimized ? "0px" : `${sidebarWidth}px`,
        background: "white",
        borderRight: isSidebarMinimized ? "none" : "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
        transition: isResizing ? "none" : "width 0.3s ease, border 0.3s ease",
        overflow: "visible"
      }}>
        {!isSidebarMinimized && (
          <div 
            onMouseDown={startResizing}
            style={{
              position: "absolute",
              right: "-4px",
              top: 0,
              bottom: 0,
              width: "8px",
              cursor: "col-resize",
              zIndex: 10,
              background: isResizing ? "#0ea5e9" : "transparent",
              transition: "background 0.2s"
            }} 
          />
        )}
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
          style={{
            position: "absolute",
            left: isSidebarMinimized ? "0px" : "auto",
            right: isSidebarMinimized ? "auto" : "10px",
            top: "20px",
            zIndex: 1000,
            width: "32px",
            height: "32px",
            borderRadius: isSidebarMinimized ? "0 8px 8px 0" : "8px",
            background: "white",
            border: "1px solid #e2e8f0",
            borderLeft: isSidebarMinimized ? "none" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            color: "#0c4a6e"
          }}
          title={isSidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          {isSidebarMinimized ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          )}
        </button>
        <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", opacity: isSidebarMinimized ? 0 : 1, pointerEvents: isSidebarMinimized ? "none" : "auto", transition: "opacity 0.2s" }}>
          <button 
            onClick={createNewSession}
            style={{
              width: "100%",
              padding: "12px",
              background: "#0c4a6e",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <span>+</span> New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", opacity: isSidebarMinimized ? 0 : 1, pointerEvents: isSidebarMinimized ? "none" : "auto", transition: "opacity 0.2s" }}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s.id)}
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                background: currentSessionId === s.id ? "#f0f9ff" : "transparent",
                border: "none",
                borderRadius: "8px",
                color: currentSessionId === s.id ? "#0c4a6e" : "#475569",
                fontSize: "14px",
                fontWeight: currentSessionId === s.id ? 600 : 500,
                cursor: "pointer",
                marginBottom: "4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
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
            <button onClick={() => router.push(`/projects/${projectId}`)} style={{ fontSize: "14px", fontWeight: 600, color: "#475569", background: "white", padding: "10px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.2s ease" }}>
              ← Back to Project
            </button>
          </div>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "48px 24px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {messages.length === 0 && !sending && (
              <div style={{ textAlign: "center", padding: "100px 0" }}>
                <div style={{ width: "64px", height: "64px", background: "#f0f9ff", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "32px" }}>🤖</div>
                <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#0c4a6e", marginBottom: "12px" }}>Start the conversation</h3>
                <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "400px", margin: "0 auto" }}>
                  Select a chat from the sidebar or start a new one to begin.
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
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 40px", flexShrink: 0, background: "white" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "12px", background: "white", padding: "8px", borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask anything..." disabled={sending}
              style={{ flex: 1, padding: "10px 16px", fontSize: "14px", border: "1px solid rgba(14,165,233,0.1)", borderRadius: "10px", outline: "none", color: "#0c4a6e", backgroundColor: "white", transition: "all 0.2s ease" }}
              onFocus={(e) => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 4px rgba(14,165,233,0.05)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(14,165,233,0.1)"; e.target.style.boxShadow = "none"; }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending} style={{
              padding: "0 20px", fontSize: "14px", fontWeight: 700, color: "#fff",
              background: !input.trim() || sending ? "#cbd5e1" : "#0c4a6e",
              border: "none", borderRadius: "10px", cursor: !input.trim() || sending ? "not-allowed" : "pointer",
              transition: "all 0.2s ease", flexShrink: 0,
              boxShadow: !input.trim() || sending ? "none" : "0 2px 6px rgba(12,74,110,0.2)",
            }}
              onMouseEnter={(e) => { if (input.trim() && !sending) e.currentTarget.style.backgroundColor = "#073b5a"; }}
              onMouseLeave={(e) => { if (input.trim() && !sending) e.currentTarget.style.backgroundColor = "#0c4a6e"; }}>
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

